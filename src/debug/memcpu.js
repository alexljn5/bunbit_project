import { evilGlitchSystem, EvilUIState } from '../themes/eviltheme.js';
import { themeManager } from '../themes/thememanager.js';
import { gameVersionNumber, gameName, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';

// Fallback for Node.js os module in browser
const os = typeof require === 'function' ? require('os') : {
    totalmem: () => 8 * 1024 * 1024 * 1024, // Default: 8GB
    freemem: () => 4 * 1024 * 1024 * 1024,  // Default: 4GB free
    cpus: () => ({ length: navigator.hardwareConcurrency || 4 }) // Browser fallback
};

let perfCanvas = null;
let perfCtx = null;
let perfContainer = null;
let perfHeader = null;
let perfResizeHandle = null;
let isPerfVisible = false;

let PERF_WIDTH = (CANVAS_WIDTH || 800) * 0.375;
let PERF_HEIGHT = (CANVAS_HEIGHT || 600) * 0.333;

let updateInterval = null;
let glitchInterval = null;

// Performance monitoring state
let performanceData = {
    jsHeap: {
        used: 0,
        total: 0,
        limit: 0
    },
    systemMemory: {
        used: 0,
        total: 0,
        percent: 0
    },
    cpu: {
        usage: 0,
        cores: os.cpus().length,
        lastExecutionTime: null,
        executionSamples: []
    },
    fps: 0,
    frameTime: 0,
    renderWorkerLoad: null, // null = unknown / no data
    networkLatency: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    lastFrameTime: 0,
    // Smoothed values container to prevent NaN/uninitialized access
    smoothed: {
        cpu: 0,
        fps: 0,
        frameTime: 0,
        renderWorkerLoad: 0
    },
    history: {
        jsHeap: [],
        systemMemory: [],
        cpu: [],
        fps: [],
        frameTime: [],
        renderWorkerLoad: [],
        networkLatency: []
    }
};

// Check performance APIs
const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;
const hasPerformanceAPI = !!performance;
const hasMemoryAPI = hasPerformanceAPI && performance.memory;
const glCanvas = document.createElement('canvas');
const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
const hasGpuMemoryAPI = gl && gl.getExtension('WEBGL_debug_renderer_info');

// Target frame rate
const TARGET_FRAME_TIME = 1000 / 60; // 16.67ms for 60 FPS

// Worker CPU tracking
let workerCpuUsages = [];

// Use BroadcastChannel so workers can post their usage directly (works from workers and main)
const perfChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('perf_monitor') : null;
if (perfChannel) {
    perfChannel.onmessage = (e) => {
        try {
            if (e.data && e.data.type === 'worker_cpu') {
                workerCpuUsages = Array.isArray(e.data.usages) ? e.data.usages : [];
            }
        } catch (err) {
            console.error('Error in perfChannel message handler:', err);
        }
    };
} else {
    // Fallback: accept window messages (requires workers or other code to post to window)
    window.addEventListener('message', (e) => {
        try {
            if (e.data && e.data.type === 'worker_cpu') {
                workerCpuUsages = Array.isArray(e.data.usages) ? e.data.usages : [];
            }
        } catch (err) {
            console.error('Error in worker CPU message handler:', err);
        }
    });
}

// Helper to allow main thread code to push worker usage manually if needed
window.reportWorkerCpuUsage = function (usages) {
    try {
        workerCpuUsages = Array.isArray(usages) ? usages : [];
    } catch (err) {
        console.error('Error in reportWorkerCpuUsage:', err);
    }
};

// Create resize handle
function createResizeHandle() {
    try {
        if (perfResizeHandle) perfResizeHandle.remove();

        perfResizeHandle = document.createElement('div');
        perfResizeHandle.style.position = 'absolute';
        perfResizeHandle.style.right = '0';
        perfResizeHandle.style.bottom = '0';
        perfResizeHandle.style.width = '15px';
        perfResizeHandle.style.height = '15px';
        perfResizeHandle.style.backgroundColor = themeManager.getCurrentTheme()?.resizeHandle || '#666666';
        perfResizeHandle.style.cursor = 'nwse-resize';
        perfResizeHandle.style.zIndex = '212';
        perfResizeHandle.style.borderTop = `2px solid ${themeManager.getCurrentTheme()?.resizeBorder || '#FC0000'}`;
        perfResizeHandle.style.borderLeft = `2px solid ${themeManager.getCurrentTheme()?.resizeBorder || '#FC0000'}`;

        perfResizeHandle.addEventListener('mouseover', () => {
            perfResizeHandle.style.boxShadow = `0 0 5px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
        });
        perfResizeHandle.addEventListener('mouseout', () => {
            perfResizeHandle.style.boxShadow = 'none';
        });

        perfResizeHandle.addEventListener('mousedown', startResize);
        perfContainer.appendChild(perfResizeHandle);
    } catch (err) {
        console.error('Error in createResizeHandle:', err);
    }
}

// Resize functions
function startResize(e) {
    try {
        e.preventDefault();
        e.stopPropagation();
        EvilUIState.isResizing = true;
        EvilUIState.resizeStartX = e.clientX;
        EvilUIState.resizeStartY = e.clientY;
        EvilUIState.resizeStartWidth = PERF_WIDTH;
        EvilUIState.resizeStartHeight = PERF_HEIGHT;

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    } catch (err) {
        console.error('Error in startResize:', err);
    }
}

function handleResize(e) {
    try {
        if (!EvilUIState.isResizing) return;

        const dx = e.clientX - EvilUIState.resizeStartX;
        const dy = e.clientY - EvilUIState.resizeStartY;

        PERF_WIDTH = Math.max(200, EvilUIState.resizeStartWidth + dx);
        PERF_HEIGHT = Math.max(160, EvilUIState.resizeStartHeight + dy);

        resizePerfMonitor(PERF_WIDTH, PERF_HEIGHT);
    } catch (err) {
        console.error('Error in handleResize:', err);
    }
}

function stopResize() {
    try {
        EvilUIState.isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    } catch (err) {
        console.error('Error in stopResize:', err);
    }
}

// Drag functions
function startDrag(e) {
    try {
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
    } catch (err) {
        console.error('Error in startDrag:', err);
    }
}

function handleDrag(e) {
    try {
        if (!EvilUIState.isDragging) return;

        const dx = e.clientX - EvilUIState.dragOffsetX;
        const dy = e.clientY - EvilUIState.dragOffsetY;

        perfContainer.style.left = `${EvilUIState.containerStartX + dx}px`;
        perfContainer.style.top = `${EvilUIState.containerStartY + dy}px`;
        perfContainer.style.right = 'auto';
        perfContainer.style.bottom = 'auto';
    } catch (err) {
        console.error('Error in handleDrag:', err);
    }
}

function stopDrag() {
    try {
        EvilUIState.isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
        perfContainer.style.cursor = '';
    } catch (err) {
        console.error('Error in stopDrag:', err);
    }
}

// Glitch effects
function updateGlitchEffects() {
    try {
        const performanceStress = Math.min(1, (performanceData.cpu.usage / 100) * 0.4 +
            (performanceData.systemMemory.percent / 100) * 0.3 +
            (performanceData.frameTime / 16.67) * 0.2 +
            (performanceData.renderWorkerLoad / 100) * 0.1);

        evilGlitchSystem.updatePerformanceGlitchEffects(performanceStress);
    } catch (err) {
        console.error('Error in updateGlitchEffects:', err);
    }
}

// Add runtime detection and smoothing helpers
const isElectron = typeof process !== 'undefined' && !!process.versions?.electron;
const EMA_ALPHA = 0.18; // smoothing factor for noisy metrics
function smooth(prev, next) {
    if (prev == null || isNaN(prev)) return next;
    return prev + EMA_ALPHA * (next - prev);
}

// Main setup
export function memCpuGodFunction() {
    try {
        if (isPerfVisible) return;

        perfContainer = document.createElement("div");
        perfContainer.id = "perfMonitorContainer";
        perfContainer.style.position = "absolute";
        perfContainer.style.right = "0";
        perfContainer.style.bottom = "0";
        // Ensure perf monitor appears above control panel and debug terminal
        perfContainer.style.zIndex = "2147483649";
        perfContainer.style.backgroundColor = themeManager.getCurrentTheme()?.background || '#000000';
        perfContainer.style.border = `2px solid ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
        perfContainer.style.boxSizing = "border-box";
        perfContainer.style.overflow = "hidden";
        // Only apply glow boxShadow for evil theme
        if (themeManager.getCurrentThemeName && themeManager.getCurrentThemeName() === 'evil') {
            perfContainer.style.boxShadow = `0 0 15px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
        } else {
            perfContainer.style.boxShadow = 'none';
        }
        document.body.appendChild(perfContainer);

        perfHeader = document.createElement("div");
        perfHeader.style.display = "flex";
        perfHeader.style.justifyContent = "space-between";
        perfHeader.style.alignItems = "center";
        perfHeader.style.padding = "5px 10px";
        perfHeader.style.backgroundColor = themeManager.getCurrentTheme()?.headerBg || '#1a0000';
        perfHeader.style.borderBottom = `1px solid ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
        perfHeader.style.color = themeManager.getCurrentTheme()?.text || '#FFFFFF';
        perfHeader.style.fontFamily = "Courier New, monospace";
        perfHeader.style.fontSize = "12px";
        perfHeader.style.cursor = "move";
        perfHeader.style.textShadow = `0 0 8px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;

        perfHeader.addEventListener('mousedown', startDrag);

        const title = document.createElement("div");
        title.textContent = `${gameName} Engine v${gameVersionNumber} Performance Monitor`;
        title.style.fontWeight = "bold";
        title.style.color = themeManager.getCurrentTheme()?.danger || '#FC0000';
        title.style.letterSpacing = "1px";

        const closeButton = document.createElement("button");
        closeButton.textContent = "X";
        closeButton.style.background = "none";
        closeButton.style.border = `1px solid ${themeManager.getCurrentTheme()?.danger || '#FC0000'}`;
        closeButton.style.color = themeManager.getCurrentTheme()?.danger || '#FC0000';
        closeButton.style.cursor = "pointer";
        closeButton.style.padding = "2px 5px";
        closeButton.style.fontWeight = "bold";
        closeButton.style.fontFamily = "Courier New, monospace";
        closeButton.addEventListener("click", stopMemCpuMonitor);
        closeButton.addEventListener("mouseover", () => {
            closeButton.style.backgroundColor = themeManager.getCurrentTheme()?.danger || '#FC0000';
            closeButton.style.color = "#000";
            closeButton.style.boxShadow = `0 0 8px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
        });
        closeButton.addEventListener("mouseout", () => {
            closeButton.style.backgroundColor = "transparent";
            closeButton.style.color = themeManager.getCurrentTheme()?.danger || '#FC0000';
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
        if (!perfCtx) {
            console.error('Failed to get 2D context for perfCanvas *sad chao*');
            return;
        }
        perfCtx.imageSmoothingEnabled = false;

        createResizeHandle();

        perfContainer.style.width = `${PERF_WIDTH}px`;
        perfContainer.style.height = `${PERF_HEIGHT}px`;

        isPerfVisible = true;

        performanceData.cpu.lastExecutionTime = performance.now();
        performanceData.lastFpsUpdate = performance.now();
        performanceData.lastFrameTime = performance.now();

        updateInterval = setInterval(updatePerformanceData, 1000);
        glitchInterval = setInterval(updateGlitchEffects, 1000); // Throttled to 1s
        requestAnimationFrame(drawPerfMonitor);

        window.addEventListener('themeChanged', () => {
            try {
                perfContainer.style.backgroundColor = themeManager.getCurrentTheme()?.background || '#000000';
                perfContainer.style.border = `2px solid ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
                perfContainer.style.boxShadow = `0 0 15px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
                perfHeader.style.backgroundColor = themeManager.getCurrentTheme()?.headerBg || '#1a0000';
                perfHeader.style.borderBottom = `1px solid ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
                perfHeader.style.color = themeManager.getCurrentTheme()?.text || '#FFFFFF';
                perfHeader.style.textShadow = `0 0 8px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
                title.style.color = themeManager.getCurrentTheme()?.danger || '#FC0000';
                closeButton.style.border = `1px solid ${themeManager.getCurrentTheme()?.danger || '#FC0000'}`;
                closeButton.style.color = themeManager.getCurrentTheme()?.danger || '#FC0000';
                perfResizeHandle.style.backgroundColor = themeManager.getCurrentTheme()?.resizeHandle || '#666666';
                perfResizeHandle.style.borderTop = `2px solid ${themeManager.getCurrentTheme()?.resizeBorder || '#FC0000'}`;
                perfResizeHandle.style.borderLeft = `2px solid ${themeManager.getCurrentTheme()?.resizeBorder || '#FC0000'}`;
                drawPerfMonitor();
            } catch (err) {
                console.error('Error in themeChanged handler:', err);
            }
        });
    } catch (err) {
        console.error('Error in memCpuGodFunction:', err);
    }
}

// Replace the updatePerformanceData function with a more robust, smoothed implementation
function updatePerformanceData() {
    try {
        if (!isPerfVisible) return;

        const now = (hasPerformanceAPI ? performance.now() : Date.now());

        // System Memory (best-effort)
        let totalMemBytes = null;
        let freeMemBytes = null;
        try {
            if (isElectron && typeof os.totalmem === 'function' && typeof os.freemem === 'function') {
                totalMemBytes = os.totalmem();
                freeMemBytes = os.freemem();
            } else if (typeof navigator !== 'undefined' && navigator.deviceMemory) {
                // navigator.deviceMemory is GB approximate
                totalMemBytes = navigator.deviceMemory * 1024 * 1024 * 1024;
                // No reliable free mem in browsers — estimate conservatively
                freeMemBytes = totalMemBytes * 0.5;
            } else if (typeof os.totalmem === 'function') {
                totalMemBytes = os.totalmem();
                freeMemBytes = os.freemem();
            } else {
                // Last resort fallback (keeps previous behavior but acknowledged as estimate)
                totalMemBytes = 8 * 1024 * 1024 * 1024;
                freeMemBytes = totalMemBytes * 0.5;
            }
        } catch (err) {
            console.warn('Could not query system memory precisely, using estimates:', err);
            totalMemBytes = totalMemBytes || 8 * 1024 * 1024 * 1024;
            freeMemBytes = freeMemBytes || totalMemBytes * 0.5;
        }

        const usedMemBytes = Math.max(0, (totalMemBytes - (freeMemBytes || 0)));
        const totalMB = Math.round((totalMemBytes || 0) / 1048576);
        const usedMB = Math.round(usedMemBytes / 1048576);
        const percentMem = totalMemBytes ? Math.round((usedMemBytes / totalMemBytes) * 1000) / 10 : 0;

        performanceData.systemMemory = {
            used: usedMB,
            total: totalMB,
            percent: percentMem
        };

        // CPU usage
        if (typeof process !== 'undefined' && process.cpuUsage) {
            try {
                const currentCpuUsage = process.cpuUsage(performanceData.cpu.lastCpuUsage);
                const totalCpuTime = (currentCpuUsage.user + currentCpuUsage.system) / 10000; // to ms-ish scale
                // Sanity clamp and smooth
                const instantCpu = Math.min(100, Math.max(0, Math.round(totalCpuTime * 10) / 10));
                performanceData.smoothed.cpu = smooth(performanceData.smoothed.cpu, instantCpu);
                performanceData.cpu.usage = Math.round(performanceData.smoothed.cpu * 10) / 10;
                performanceData.cpu.lastCpuUsage = process.cpuUsage();
            } catch (err) {
                console.warn('Error reading process.cpuUsage(), falling back to heuristic:', err);
                performanceData.cpu.lastExecutionTime = performanceData.cpu.lastExecutionTime || now;
                const deltaTime = now - performanceData.cpu.lastExecutionTime;
                performanceData.cpu.executionSamples.push(deltaTime);
                if (performanceData.cpu.executionSamples.length > 10) performanceData.cpu.executionSamples.shift();
                const avgExecutionTime = performanceData.cpu.executionSamples.reduce((s, t) => s + t, 0) / performanceData.cpu.executionSamples.length;
                const instantCpu = Math.min(100, (avgExecutionTime / TARGET_FRAME_TIME) * 100);
                performanceData.smoothed.cpu = smooth(performanceData.smoothed.cpu, instantCpu);
                performanceData.cpu.usage = Math.round(performanceData.smoothed.cpu * 10) / 10;
                performanceData.cpu.lastExecutionTime = now;
            }
        } else {
            // Browser heuristic: use execution time samples and smooth
            performanceData.cpu.lastExecutionTime = performanceData.cpu.lastExecutionTime || now;
            const deltaTime = now - performanceData.cpu.lastExecutionTime;
            performanceData.cpu.executionSamples.push(deltaTime);
            if (performanceData.cpu.executionSamples.length > 10) performanceData.cpu.executionSamples.shift();
            const avgExecutionTime = performanceData.cpu.executionSamples.reduce((s, t) => s + t, 0) / performanceData.cpu.executionSamples.length;
            const instantCpu = Math.min(100, (avgExecutionTime / TARGET_FRAME_TIME) * 100);
            performanceData.smoothed.cpu = smooth(performanceData.smoothed.cpu, instantCpu);
            performanceData.cpu.usage = Math.round(performanceData.smoothed.cpu * 10) / 10;
            performanceData.cpu.lastExecutionTime = now;
        }

        // Worker CPU Load - average reported worker usage (expect worker to post messages)
        if (workerCpuUsages.length > 0) {
            const avg = workerCpuUsages.reduce((s, w) => s + (w.usage || 0), 0) / workerCpuUsages.length;
            const instantWorkerLoad = Math.min(100, Math.max(0, avg));
            performanceData.smoothed.renderWorkerLoad = smooth(performanceData.smoothed.renderWorkerLoad, instantWorkerLoad);
            performanceData.renderWorkerLoad = Math.round(performanceData.smoothed.renderWorkerLoad * 10) / 10;
        } else {
            // No worker reports available - mark as unknown
            performanceData.renderWorkerLoad = null;
            performanceData.smoothed.renderWorkerLoad = 0;
        }

        // JS Heap
        if (hasMemoryAPI) {
            const mem = performance.memory;
            performanceData.jsHeap = {
                used: mem.usedJSHeapSize / 1048576,
                total: mem.totalJSHeapSize / 1048576,
                limit: mem.jsHeapSizeLimit / 1048576
            };
        }

        // FPS/Frame Time - update once per second, apply smoothing
        if (now - performanceData.lastFpsUpdate >= 1000) {
            const rawFps = performanceData.frameCount > 0 ? Math.min(60, Math.round((performanceData.frameCount * 1000) / (now - performanceData.lastFpsUpdate))) : 0;
            const rawFrameTime = performanceData.frameCount > 0 ? ((now - performanceData.lastFpsUpdate) / performanceData.frameCount) : 0;

            performanceData.smoothed.fps = smooth(performanceData.smoothed.fps, rawFps);
            performanceData.smoothed.frameTime = smooth(performanceData.smoothed.frameTime, rawFrameTime);

            performanceData.fps = Math.round(performanceData.smoothed.fps);
            performanceData.frameTime = Math.round(performanceData.smoothed.frameTime * 100) / 100;

            performanceData.frameCount = 0;
            performanceData.lastFpsUpdate = now;

            // Network latency remains simulated here — smooth it to reduce jitter
            const rawLatency = Math.random() * 100;
            performanceData.networkLatency = Math.round(smooth(performanceData.networkLatency || 0, rawLatency) * 10) / 10;

            // Update history (use smoothed values where appropriate)
            performanceData.history.jsHeap.push(performanceData.jsHeap.used || 0);
            performanceData.history.systemMemory.push(performanceData.systemMemory.percent || 0);
            performanceData.history.cpu.push(performanceData.cpu.usage);
            performanceData.history.fps.push(performanceData.fps);
            performanceData.history.frameTime.push(performanceData.frameTime);
            performanceData.history.renderWorkerLoad.push(performanceData.renderWorkerLoad != null ? performanceData.renderWorkerLoad : 0);
            performanceData.history.networkLatency.push(performanceData.networkLatency);

            const maxHistory = 30;
            Object.keys(performanceData.history).forEach(key => {
                if (performanceData.history[key].length > maxHistory) performanceData.history[key].shift();
            });
        }
    } catch (err) {
        console.error('Error in updatePerformanceData:', err);
    }
}

// Draw stats
function drawPerfMonitor(time) {
    try {
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

        perfCtx.globalAlpha = evilGlitchSystem.flicker || 1;
        perfCtx.fillStyle = themeManager.getCurrentTheme()?.background || '#000000';
        perfCtx.fillRect(0, 0, width, height);

        if (evilGlitchSystem.corruption > 0) {
            perfCtx.fillStyle = themeManager.getCurrentTheme()?.corruption || '#FF0000';
            for (let i = 0; i < width; i += 10) {
                if (Math.random() < evilGlitchSystem.corruption) {
                    const h = Math.random() * height;
                    perfCtx.fillRect(i, 0, 3, h);
                }
            }
        }

        perfCtx.fillStyle = themeManager.getCurrentTheme()?.scanlines || 'rgba(255,255,255,0.1)';
        for (let i = evilGlitchSystem.scanlineOffset || 0; i < height; i += 4) {
            perfCtx.fillRect(0, i, width, 1);
        }

        perfCtx.font = "12px 'Courier New', monospace";
        perfCtx.textBaseline = "top";
        let y = 10;

        perfCtx.translate(evilGlitchSystem.horizontalShift || 0, 0);

        let fpsText = `FPS: ${performanceData.fps}`;
        if (evilGlitchSystem.textGlitch) {
            fpsText = evilGlitchSystem.applyTextGlitch(fpsText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor?.(performanceData.fps, [30, 50]) || '#FFFFFF';
        perfCtx.fillText(fpsText, 10, y);
        y += 15;

        let frameTimeText = `Frame Time: ${performanceData.frameTime.toFixed(2)}ms`;
        if (evilGlitchSystem.textGlitch) {
            frameTimeText = evilGlitchSystem.applyTextGlitch(frameTimeText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor?.(performanceData.frameTime, [20, 16.67], true) || '#FFFFFF';
        perfCtx.fillText(frameTimeText, 10, y);
        y += 15;

        if (hasMemoryAPI) {
            const heapPercent = (performanceData.jsHeap.used / performanceData.jsHeap.limit) * 100;
            let heapText = `JS Heap: ${performanceData.jsHeap.used.toFixed(1)}/${performanceData.jsHeap.limit.toFixed(1)}MB`;
            if (evilGlitchSystem.textGlitch) {
                heapText = evilGlitchSystem.applyTextGlitch(heapText);
            }
            perfCtx.fillStyle = themeManager.getPerformanceColor?.(heapPercent) || '#FFFFFF';
            perfCtx.fillText(heapText, 10, y);
            y += 15;
        }

        let sysMemText = `SYS MEM: ${performanceData.systemMemory.used}/${performanceData.systemMemory.total}MB (${performanceData.systemMemory.percent}%)`;
        if (evilGlitchSystem.textGlitch) {
            sysMemText = evilGlitchSystem.applyTextGlitch(sysMemText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor?.(performanceData.systemMemory.percent) || '#FFFFFF';
        perfCtx.fillText(sysMemText, 10, y);
        y += 15;

        let cpuText = `Game CPU: ${performanceData.cpu.usage.toFixed(1)}% (${performanceData.cpu.cores} cores)`;
        if (evilGlitchSystem.textGlitch) {
            cpuText = evilGlitchSystem.applyTextGlitch(cpuText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor?.(performanceData.cpu.usage, [80, 50]) || '#FFFFFF';
        perfCtx.fillText(cpuText, 10, y);
        y += 15;

        // Worker load display - show N/A when unknown
        let workerText = performanceData.renderWorkerLoad != null ? `Worker Load: ${performanceData.renderWorkerLoad.toFixed(1)}%` : 'Worker Load: N/A';
        if (evilGlitchSystem.textGlitch) {
            workerText = evilGlitchSystem.applyTextGlitch(workerText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor?.(performanceData.renderWorkerLoad || 0, [80, 50]) || '#FFFFFF';
        perfCtx.fillText(workerText, 10, y);
        y += 15;

        let latencyText = `Latency: ${performanceData.networkLatency.toFixed(1)}ms`;
        if (evilGlitchSystem.textGlitch) {
            latencyText = evilGlitchSystem.applyTextGlitch(latencyText);
        }
        perfCtx.fillStyle = themeManager.getPerformanceColor?.(performanceData.networkLatency, [100, 50], true) || '#FFFFFF';
        perfCtx.fillText(latencyText, 10, y);
        y += 15;

        perfCtx.translate(-(evilGlitchSystem.horizontalShift || 0), 0);

        if (performanceData.history.systemMemory.length > 1) {
            const graphHeight = 25;
            drawGraph(perfCtx, performanceData.history.fps, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.danger || '#FC0000', "FPS");
            y += graphHeight + 10;
            drawGraph(perfCtx, performanceData.history.frameTime, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.warning || '#FFFF00', "Frame Time");
            y += graphHeight + 10;
            if (hasMemoryAPI) {
                drawGraph(perfCtx, performanceData.history.jsHeap, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.danger || '#FC0000', "JS Heap");
                y += graphHeight + 10;
            }
            drawGraph(perfCtx, performanceData.history.systemMemory, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.danger || '#FC0000', "SYS MEM %");
            y += graphHeight + 10;
            drawGraph(perfCtx, performanceData.history.cpu, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.warning || '#FFFF00', "Game CPU %");
            y += graphHeight + 10;
            drawGraph(perfCtx, performanceData.history.renderWorkerLoad, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.danger || '#FC0000', "Worker Load");
            y += graphHeight + 10;
            drawGraph(perfCtx, performanceData.history.networkLatency, 10, y, width - 20, graphHeight, themeManager.getCurrentTheme()?.warning || '#FFFF00', "Latency");
            y += graphHeight + 10;
        }

        perfCtx.strokeStyle = themeManager.getCurrentTheme()?.border || '#FC0000';
        perfCtx.lineWidth = 1;
        perfCtx.strokeRect(0, 0, width, height);

        perfCtx.strokeStyle = `rgba(${themeManager.getCurrentTheme()?.border.slice(1, 3) || 'FC'}, ${themeManager.getCurrentTheme()?.border.slice(3, 5) || '00'}, ${themeManager.getCurrentTheme()?.border.slice(5, 7) || '00'}, 0.3)`;
        perfCtx.strokeRect(1, 1, width - 2, height - 2);

        perfCtx.globalAlpha = 1;

        requestAnimationFrame(drawPerfMonitor);
    } catch (err) {
        console.error('Error in drawPerfMonitor:', err);
    }
}

// Draw graph
function drawGraph(ctx, values, x, y, width, height, color, label) {
    try {
        if (values.length < 2) return;

        const maxValue = Math.max(...values, 1) * 1.1;

        ctx.fillStyle = themeManager.getCurrentTheme()?.graphBg || '#1a0000';
        ctx.fillRect(x, y, width, height);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        for (let i = 0; i < values.length; i++) {
            const xPos = x + (i / (values.length - 1)) * width;
            let value = evilGlitchSystem.applyGraphGlitch?.(values[i]) || values[i];
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
            labelText = evilGlitchSystem.applyTextGlitch?.(labelText) || labelText;
        }

        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = themeManager.getCurrentTheme()?.danger || '#FC0000';
        ctx.fillText(labelText, x + 5, y + 12);
        ctx.shadowBlur = 0;
    } catch (err) {
        console.error('Error in drawGraph:', err);
    }
}

// Toggle visibility
export function togglePerfMonitor() {
    try {
        if (isPerfVisible) {
            stopMemCpuMonitor();
        } else {
            memCpuGodFunction();
        }
    } catch (err) {
        console.error('Error in togglePerfMonitor:', err);
    }
}

// Cleanup
export function stopMemCpuMonitor() {
    try {
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

        evilGlitchSystem.reset?.();
        EvilUIState.reset?.();
    } catch (err) {
        console.error('Error in stopMemCpuMonitor:', err);
    }
}

// Resize function
export function resizePerfMonitor(width, height) {
    try {
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
    } catch (err) {
        console.error('Error in resizePerfMonitor:', err);
    }
}

// Expose globally
window.resizePerfMonitor = resizePerfMonitor;
window.togglePerfMonitor = togglePerfMonitor;