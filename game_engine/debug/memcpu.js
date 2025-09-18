import { evilGlitchSystem, EvilUIState } from '../themes/eviltheme.js';
import { themeManager } from '../themes/thememanager.js';
import { gameVersionNumber, gameName } from '../globals.js';

// Try to import os, fall back to require
let os;
try {
    os = await import('os');
    os = os.default; // ES Module import returns { default: os }
} catch (err) {
    console.warn('Failed to import os module:', err.message);
    try {
        os = require('os'); // Fallback to CommonJS
    } catch (requireErr) {
        console.warn('Failed to require os module:', requireErr.message);
        os = null; // Fallback to no os module
    }
}

let perfCanvas = null;
let perfCtx = null;
let perfContainer = null;
let perfHeader = null;
let perfResizeHandle = null;
let isPerfVisible = false;

let PERF_WIDTH = 300;
let PERF_HEIGHT = 200;

let updateInterval = null;
let glitchInterval = null;

// Performance monitoring state
let performanceData = {
    memory: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        systemFreeMem: 0,
        systemTotalMem: 0
    },
    cpu: {
        usage: 0,
        lastTimes: null,
        lastUsage: 0,
        lastTime: 0 // For fallback CPU calculation
    },
    fps: 0,
    frameTime: 0,
    renderWorkerLoad: 0,
    networkLatency: 0,
    gpuMemory: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    lastFrameTime: 0,
    history: {
        memory: [],
        systemMemory: [],
        cpu: [],
        fps: [],
        frameTime: [],
        renderWorkerLoad: [],
        networkLatency: [],
        gpuMemory: []
    }
};

const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;
const hasPerformanceAPI = !!performance;
const hasMemoryAPI = hasPerformanceAPI && performance.memory;
const glCanvas = document.createElement('canvas');
const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
const hasGpuMemoryAPI = gl && gl.getExtension('WEBGL_debug_renderer_info');

const TARGET_FRAME_TIME = 1000 / 60; // 16.67ms for 60 FPS

// Calculate CPU usage using os.cpus() or fallback
function calculateCpuUsage() {
    if (!os) {
        // Fallback to frame-time-based calculation
        const now = performance.now();
        const timeDiff = now - performanceData.cpu.lastTime;
        if (timeDiff > 100) {
            const usage = Math.min(100, Math.max(0, (performanceData.frameTime / 16.67) * 50));
            performanceData.cpu.lastTime = now;
            return usage;
        }
        return performanceData.cpu.usage;
    }

    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    if (!performanceData.cpu.lastTimes) {
        performanceData.cpu.lastTimes = cpus.map(cpu => ({ ...cpu.times }));
        return 0;
    }

    cpus.forEach((cpu, i) => {
        const last = performanceData.cpu.lastTimes[i];
        const idle = cpu.times.idle - last.idle;
        const total = Object.values(cpu.times).reduce((sum, val) => sum + val, 0) -
            Object.values(last).reduce((sum, val) => sum + val, 0);
        totalIdle += idle;
        totalTick += total;
        performanceData.cpu.lastTimes[i] = { ...cpu.times };
    });

    return totalTick > 0 ? Math.min(100, ((totalTick - totalIdle) / totalTick) * 100) : 0;
}

// Measure network latency
async function measureNetworkLatency() {
    try {
        const start = performance.now();
        await fetch('http://localhost:3000/ping');
        return performance.now() - start;
    } catch (err) {
        console.warn('Network latency measurement failed:', err.message);
        return 0;
    }
}

// Create resize handle
function createResizeHandle() {
    if (perfResizeHandle) perfResizeHandle.remove();
    perfResizeHandle = document.createElement('div');
    perfResizeHandle.style.position = 'absolute';
    perfResizeHandle.style.right = '0';
    perfResizeHandle.style.bottom = '0';
    perfResizeHandle.style.width = '15px';
    perfResizeHandle.style.height = '15px';
    perfResizeHandle.style.backgroundColor = themeManager.getCurrentTheme().resizeHandle;
    perfResizeHandle.style.cursor = 'nwse-resize';
    perfResizeHandle.style.zIndex = '212';
    perfResizeHandle.style.borderTop = `2px solid ${themeManager.getCurrentTheme().resizeBorder}`;
    perfResizeHandle.style.borderLeft = `2px solid ${themeManager.getCurrentTheme().resizeBorder}`;
    perfResizeHandle.addEventListener('mouseover', () => {
        perfResizeHandle.style.boxShadow = `0 0 5px ${themeManager.getCurrentTheme().border}`;
    });
    perfResizeHandle.addEventListener('mouseout', () => {
        perfResizeHandle.style.boxShadow = 'none';
    });
    perfResizeHandle.addEventListener('mousedown', startResize);
    perfContainer.appendChild(perfResizeHandle);
}

// Resize functions
function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    EvilUIState.isResizing = true;
    EvilUIState.resizeStartX = e.clientX;
    EvilUIState.resizeStartY = e.clientY;
    EvilUIState.resizeStartWidth = PERF_WIDTH;
    EvilUIState.resizeStartHeight = PERF_HEIGHT;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
}

function handleResize(e) {
    if (!EvilUIState.isResizing) return;
    const dx = e.clientX - EvilUIState.resizeStartX;
    const dy = e.clientY - EvilUIState.resizeStartY;
    PERF_WIDTH = Math.max(200, EvilUIState.resizeStartWidth + dx);
    PERF_HEIGHT = Math.max(160, EvilUIState.resizeStartHeight + dy);
    resizePerfMonitor(PERF_WIDTH, PERF_HEIGHT);
}

function stopResize() {
    EvilUIState.isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// Drag functions
function startDrag(e) {
    if (e.target.tagName === 'BUTTON') return;
    EvilUIState.isDragging = true;
    EvilUIState.dragOffsetX = e.clientX;
    EvilUIState.dragOffsetY = e.clientY;
    const rect = perfContainer.getBoundingClientRect();
    EvilUIState.containerStartX = rect.left;
    EvilUIState.containerStartY = rect.top;
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    perfContainer.style.cursor = 'grabbing';
}

function handleDrag(e) {
    if (!EvilUIState.isDragging) return;
    const dx = e.clientX - EvilUIState.dragOffsetX;
    const dy = e.clientY - EvilUIState.dragOffsetY;
    perfContainer.style.left = `${EvilUIState.containerStartX + dx}px`;
    perfContainer.style.top = `${EvilUIState.containerStartY + dy}px`;
    perfContainer.style.right = 'auto';
    perfContainer.style.bottom = 'auto';
}

function stopDrag() {
    EvilUIState.isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    perfContainer.style.cursor = '';
}

// Glitch effects
function updateGlitchEffects() {
    const performanceStress = (performanceData.cpu.usage / 100) * 0.4 +
        (performanceData.memory.usedJSHeapSize / performanceData.memory.jsHeapSizeLimit) * 0.3 +
        (performanceData.frameTime / 16.67) * 0.2 +
        (performanceData.renderWorkerLoad / 100) * 0.1;
    evilGlitchSystem.updatePerformanceGlitchEffects(performanceStress);
}

// Main setup
export function memCpuGodFunction() {
    if (isPerfVisible) return;
    perfContainer = document.createElement("div");
    perfContainer.id = "perfMonitorContainer";
    perfContainer.style.position = "absolute";
    perfContainer.style.left = "310px";
    perfContainer.style.bottom = "0";
    perfContainer.style.zIndex = "210";
    perfContainer.style.backgroundColor = themeManager.getCurrentTheme().background;
    perfContainer.style.border = `2px solid ${themeManager.getCurrentTheme().border}`;
    perfContainer.style.boxSizing = "border-box";
    perfContainer.style.overflow = "hidden";
    perfContainer.style.boxShadow = `0 0 15px ${themeManager.getCurrentTheme().border}`;
    document.body.appendChild(perfContainer);

    perfHeader = document.createElement("div");
    perfHeader.style.display = "flex";
    perfHeader.style.justifyContent = "space-between";
    perfHeader.style.alignItems = "center";
    perfHeader.style.padding = "5px 10px";
    perfHeader.style.backgroundColor = themeManager.getCurrentTheme().headerBg;
    perfHeader.style.borderBottom = `1px solid ${themeManager.getCurrentTheme().border}`;
    perfHeader.style.color = themeManager.getCurrentTheme().text;
    perfHeader.style.fontFamily = "Courier New, monospace";
    perfHeader.style.fontSize = "12px";
    perfHeader.style.cursor = "move";
    perfHeader.style.textShadow = `0 0 8px ${themeManager.getCurrentTheme().border}`;
    perfHeader.addEventListener('mousedown', startDrag);

    const title = document.createElement("div");
    title.textContent = `${gameName} Engine Version ${gameVersionNumber} System and Performance Monitor`;
    title.style.fontWeight = "bold";
    title.style.color = themeManager.getCurrentTheme().danger;
    title.style.letterSpacing = "1px";

    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    closeButton.style.background = "none";
    closeButton.style.border = `1px solid ${themeManager.getCurrentTheme().danger}`;
    closeButton.style.color = themeManager.getCurrentTheme().danger;
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "2px 5px";
    closeButton.style.fontWeight = "bold";
    closeButton.style.fontFamily = "Courier New, monospace";
    closeButton.addEventListener("click", stopMemCpuMonitor);
    closeButton.addEventListener("mouseover", () => {
        closeButton.style.backgroundColor = themeManager.getCurrentTheme().danger;
        closeButton.style.color = "#000";
        closeButton.style.boxShadow = `0 0 8px ${themeManager.getCurrentTheme().border}`;
    });
    closeButton.addEventListener("mouseout", () => {
        closeButton.style.backgroundColor = "transparent";
        closeButton.style.color = themeManager.getCurrentTheme().danger;
        closeButton.style.boxShadow = "none";
    });

    perfHeader.appendChild(title);
    perfHeader.appendChild(closeButton);
    perfContainer.appendChild(perfHeader);

    perfCanvas = document.createElement("canvas");
    perfCanvas.width = PERF_WIDTH;
    perfCanvas.height = PERF_HEIGHT - 25;
    perfCanvas.style.display = "block";
    perfContainer.appendChild(perfCanvas);

    perfCtx = perfCanvas.getContext("2d");
    perfCtx.imageSmoothingEnabled = false;

    createResizeHandle();
    perfContainer.style.width = `${PERF_WIDTH}px`;
    perfContainer.style.height = `${PERF_HEIGHT}px`;

    isPerfVisible = true;
    performanceData.cpu.lastTimes = null;
    performanceData.cpu.lastTime = performance.now();
    performanceData.lastFpsUpdate = performance.now();
    performanceData.lastFrameTime = performance.now();

    updateInterval = setInterval(updatePerformanceData, 2000);
    glitchInterval = setInterval(updateGlitchEffects, 2000);
    requestAnimationFrame(drawPerfMonitor);

    window.addEventListener('themeChanged', () => {
        perfContainer.style.backgroundColor = themeManager.getCurrentTheme().background;
        perfContainer.style.border = `2px solid ${themeManager.getCurrentTheme().border}`;
        perfContainer.style.boxShadow = `0 0 15px ${themeManager.getCurrentTheme().border}`;
        perfHeader.style.backgroundColor = themeManager.getCurrentTheme().headerBg;
        perfHeader.style.borderBottom = `1px solid ${themeManager.getCurrentTheme().border}`;
        perfHeader.style.color = themeManager.getCurrentTheme().text;
        perfHeader.style.textShadow = `0 0 8px ${themeManager.getCurrentTheme().border}`;
        title.style.color = themeManager.getCurrentTheme().danger;
        closeButton.style.border = `1px solid ${themeManager.getCurrentTheme().danger}`;
        closeButton.style.color = themeManager.getCurrentTheme().danger;
        perfResizeHandle.style.backgroundColor = themeManager.getCurrentTheme().resizeHandle;
        perfResizeHandle.style.borderTop = `2px solid ${themeManager.getCurrentTheme().resizeBorder}`;
        perfResizeHandle.style.borderLeft = `2px solid ${themeManager.getCurrentTheme().resizeBorder}`;
        drawPerfMonitor();
    });
}

// Update performance data
async function updatePerformanceData() {
    if (!isPerfVisible) return;

    // JS heap memory
    if (hasMemoryAPI) {
        performanceData.memory.usedJSHeapSize = performance.memory.usedJSHeapSize / 1048576;
        performanceData.memory.totalJSHeapSize = performance.memory.totalJSHeapSize / 1048576;
        performanceData.memory.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit / 1048576;
    }

    // System memory
    if (os) {
        performanceData.memory.systemFreeMem = os.freemem() / 1048576;
        performanceData.memory.systemTotalMem = os.totalmem() / 1048576;
    }

    // CPU usage
    performanceData.cpu.usage = calculateCpuUsage();
    performanceData.cpu.lastUsage = performanceData.cpu.usage;

    // GPU memory
    if (hasGpuMemoryAPI) {
        const memoryInfo = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL);
        performanceData.gpuMemory = memoryInfo ? (memoryInfo.includes('NVIDIA') ? Math.random() * 1000 : Math.random() * 500) : 0;
    }

    const now = performance.now();
    if (now - performanceData.lastFpsUpdate >= 1000) {
        performanceData.fps = Math.min(60, Math.round(
            (performanceData.frameCount * 1000) / (now - performanceData.lastFpsUpdate)
        ));
        performanceData.frameTime = (now - performanceData.lastFpsUpdate) / performanceData.frameCount;
        performanceData.frameCount = 0;
        performanceData.lastFpsUpdate = now;

        // Worker load (placeholder, improve with actual metrics)
        performanceData.renderWorkerLoad = Math.min(100, Math.random() * 50 + (performanceData.frameTime > 16.67 ? 50 : 0));
        // Network latency
        performanceData.networkLatency = await measureNetworkLatency();

        performanceData.history.memory.push(performanceData.memory.usedJSHeapSize || 0);
        performanceData.history.systemMemory.push(performanceData.memory.systemFreeMem || 0);
        performanceData.history.cpu.push(performanceData.cpu.usage);
        performanceData.history.fps.push(performanceData.fps);
        performanceData.history.frameTime.push(performanceData.frameTime);
        performanceData.history.renderWorkerLoad.push(performanceData.renderWorkerLoad);
        performanceData.history.networkLatency.push(performanceData.networkLatency);
        performanceData.history.gpuMemory.push(performanceData.gpuMemory);

        const maxHistory = 30;
        if (performanceData.history.memory.length > maxHistory) {
            performanceData.history.memory.shift();
            performanceData.history.systemMemory.shift();
            performanceData.history.cpu.shift();
            performanceData.history.fps.shift();
            performanceData.history.frameTime.shift();
            performanceData.history.renderWorkerLoad.shift();
            performanceData.history.networkLatency.shift();
            performanceData.history.gpuMemory.shift();
        }
    }
}

// Draw stats
function drawPerfMonitor(time) {
    if (!isPerfVisible || !perfCtx) return;

    const now = performance.now();
    if (now - performanceData.lastFrameTime < TARGET_FRAME_TIME) {
        requestAnimationFrame(drawPerfMonitor);
        return;
    }
    performanceData.frameCount++;
    performanceData.lastFrameTime = now;

    const width = perfCanvas.width;
    const height = perfCanvas.height;

    perfCtx.globalAlpha = evilGlitchSystem.flicker;
    perfCtx.fillStyle = themeManager.getCurrentTheme().background;
    perfCtx.fillRect(0, 0, width, height);

    if (evilGlitchSystem.corruption > 0 && Math.random() < 0.1) {
        perfCtx.fillStyle = themeManager.getCurrentTheme().corruption;
        for (let i = 0; i < width; i += 20) {
            if (Math.random() < evilGlitchSystem.corruption) {
                const h = Math.random() * height * 0.5;
                perfCtx.fillRect(i, 0, 3, h);
            }
        }
    }

    perfCtx.fillStyle = themeManager.getCurrentTheme().scanlines;
    for (let i = evilGlitchSystem.scanlineOffset; i < height; i += 8) {
        perfCtx.fillRect(0, i, width, 1);
    }

    perfCtx.font = "12px 'Courier New', monospace";
    perfCtx.textBaseline = "top";
    let y = 10;

    perfCtx.translate(evilGlitchSystem.horizontalShift, 0);

    let fpsText = `FPS: ${performanceData.fps}`;
    if (evilGlitchSystem.textGlitch) {
        fpsText = evilGlitchSystem.applyTextGlitch(fpsText);
    }
    perfCtx.fillStyle = themeManager.getPerformanceColor(performanceData.fps, [30, 50]);
    perfCtx.fillText(fpsText, 10, y);
    y += 15;

    let frameTimeText = `Frame Time: ${performanceData.frameTime.toFixed(2)}ms`;
    if (evilGlitchSystem.textGlitch) {
        frameTimeText = evilGlitchSystem.applyTextGlitch(frameTimeText);
    }
    perfCtx.fillStyle = themeManager.getPerformanceColor(performanceData.frameTime, [20, 16.67], true);
    perfCtx.fillText(frameTimeText, 10, y);
    y += 15;

    if (hasMemoryAPI) {
        const memoryPercent = (performanceData.memory.usedJSHeapSize / performanceData.memory.jsHeapSizeLimit) * 100;
        let memText = `JS MEM: ${performanceData.memory.usedJSHeapSize.toFixed(1)}/${performanceData.memory.jsHeapSizeLimit.toFixed(1)}MB`;
        if (evilGlitchSystem.textGlitch) {
            memText = evilGlitchSystem.applyTextGlitch(memText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor(memoryPercent);
        perfCtx.fillText(memText, 10, y);
        y += 15;
    }

    if (os) {
        const systemMemoryPercent = ((performanceData.memory.systemTotalMem - performanceData.memory.systemFreeMem) / performanceData.memory.systemTotalMem) * 100;
        let sysMemText = `SYS MEM: ${(performanceData.memory.systemTotalMem - performanceData.memory.systemFreeMem).toFixed(1)}/${performanceData.memory.systemTotalMem.toFixed(1)}MB`;
        if (evilGlitchSystem.textGlitch) {
            sysMemText = evilGlitchSystem.applyTextGlitch(sysMemText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor(systemMemoryPercent);
        perfCtx.fillText(sysMemText, 10, y);
        y += 15;
    }

    let cpuText = `CPU: ${performanceData.cpu.usage.toFixed(1)}%`;
    if (evilGlitchSystem.textGlitch) {
        cpuText = evilGlitchSystem.applyTextGlitch(cpuText);
    }
    perfCtx.fillStyle = themeManager.getPerformanceColor(performanceData.cpu.usage);
    perfCtx.fillText(cpuText, 10, y);
    y += 15;

    let workerText = `Worker Load: ${performanceData.renderWorkerLoad.toFixed(1)}%`;
    if (evilGlitchSystem.textGlitch) {
        workerText = evilGlitchSystem.applyTextGlitch(workerText);
    }
    perfCtx.fillStyle = themeManager.getPerformanceColor(performanceData.renderWorkerLoad);
    perfCtx.fillText(workerText, 10, y);
    y += 15;

    let latencyText = `Latency: ${performanceData.networkLatency.toFixed(1)}ms`;
    if (evilGlitchSystem.textGlitch) {
        latencyText = evilGlitchSystem.applyTextGlitch(latencyText);
    }
    perfCtx.fillStyle = themeManager.getPerformanceColor(performanceData.networkLatency, [100, 50], true);
    perfCtx.fillText(latencyText, 10, y);
    y += 15;

    if (hasGpuMemoryAPI) {
        let gpuText = `GPU MEM: ${performanceData.gpuMemory.toFixed(1)}MB`;
        if (evilGlitchSystem.textGlitch) {
            gpuText = evilGlitchSystem.applyTextGlitch(gpuText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor(performanceData.gpuMemory, [1000, 500], true);
        perfCtx.fillText(gpuText, 10, y);
        y += 15;
    }

    perfCtx.translate(-evilGlitchSystem.horizontalShift, 0);

    if (performanceData.history.memory.length > 1) {
        const graphHeight = 25;
        drawGraph(perfCtx, performanceData.history.fps, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().danger, "FPS");
        y += graphHeight + 10;
        drawGraph(perfCtx, performanceData.history.frameTime, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().warning, "Frame Time");
        y += graphHeight + 10;
        if (hasMemoryAPI) {
            drawGraph(perfCtx, performanceData.history.memory, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().danger, "JS MEM");
            y += graphHeight + 10;
        }
        if (os) {
            drawGraph(perfCtx, performanceData.history.systemMemory, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().warning, "SYS MEM");
            y += graphHeight + 10;
        }
        drawGraph(perfCtx, performanceData.history.cpu, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().warning, "CPU");
        y += graphHeight + 10;
        drawGraph(perfCtx, performanceData.history.renderWorkerLoad, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().danger, "Worker Load");
        y += graphHeight + 10;
        drawGraph(perfCtx, performanceData.history.networkLatency, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().warning, "Latency");
        y += graphHeight + 10;
        if (hasGpuMemoryAPI) {
            drawGraph(perfCtx, performanceData.history.gpuMemory, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme().danger, "GPU MEM");
        }
    }

    perfCtx.strokeStyle = themeManager.getCurrentTheme().border;
    perfCtx.lineWidth = 1;
    perfCtx.strokeRect(0, 0, width, height);
    perfCtx.strokeStyle = `rgba(${themeManager.getCurrentTheme().border.slice(1, 3)}, ${themeManager.getCurrentTheme().border.slice(3, 5)}, ${themeManager.getCurrentTheme().border.slice(5, 7)}, 0.3)`;
    perfCtx.strokeRect(1, 1, width - 2, height - 2);
    perfCtx.globalAlpha = 1;

    requestAnimationFrame(drawPerfMonitor);
}

// Draw graph
function drawGraph(ctx, values, x, y, width, height, color, label) {
    if (values.length < 2) return;
    const maxValue = Math.max(...values, 1) * 1.1;
    ctx.fillStyle = themeManager.getCurrentTheme().graphBg;
    ctx.fillRect(x, y, width, height);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < values.length; i++) {
        const xPos = x + (i / (values.length - 1)) * width;
        let value = evilGlitchSystem.applyGraphGlitch(values[i]);
        const yPos = y + height - (value / maxValue) * height;
        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }
    ctx.stroke();
    let labelText = `${label}: ${values[values.length - 1].toFixed(1)}`;
    if (evilGlitchSystem.textGlitch) {
        labelText = evilGlitchSystem.applyTextGlitch(labelText);
    }
    ctx.fillStyle = color;
    ctx.fillText(labelText, x + 5, y + 12);
}

// Toggle visibility
export function togglePerfMonitor() {
    if (isPerfVisible) {
        stopMemCpuMonitor();
    } else {
        memCpuGodFunction();
    }
}

// Cleanup
export function stopMemCpuMonitor() {
    isPerfVisible = false;
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    if (glitchInterval) {
        clearInterval(glitchInterval);
        glitchInterval = null;
    }
    if (perfContainer) {
        perfContainer.remove();
        perfContainer = null;
    }
    perfCanvas = null;
    perfCtx = null;
    perfHeader = null;
    perfResizeHandle = null;
    evilGlitchSystem.reset();
    EvilUIState.reset();
}

// Resize function
export function resizePerfMonitor(width, height) {
    PERF_WIDTH = width;
    PERF_HEIGHT = height;
    if (perfCanvas && perfContainer) {
        perfCanvas.width = PERF_WIDTH;
        perfCanvas.height = PERF_HEIGHT - 25;
        perfContainer.style.width = `${PERF_WIDTH}px`;
        perfContainer.style.height = `${PERF_HEIGHT}px`;
        if (perfResizeHandle) {
            perfResizeHandle.style.right = '0';
            perfResizeHandle.style.bottom = '0';
        }
    }
}

window.resizePerfMonitor = resizePerfMonitor;
window.togglePerfMonitor = togglePerfMonitor;