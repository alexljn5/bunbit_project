// File: /debug/memcpu.js

// --- CONFIG ---
let perfCanvas = null;
let perfCtx = null;
let perfContainer = null;
let perfHeader = null;
let perfResizeHandle = null;
let isPerfVisible = false;

let PERF_WIDTH = 350; // Increased width for more graphs
let PERF_HEIGHT = 220; // Increased height for more stats

// Resize and drag state
let isResizing = false;
let isDragging = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

let updateInterval = null;
let glitchInterval = null;

// Enhanced performance monitoring state
let performanceData = {
    memory: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        allocationRate: 0,
        lastUsedSize: 0
    },
    cpu: {
        usage: 0,
        lastTime: 0,
        lastUsage: 0,
        peakUsage: 0,
        averageUsage: 0
    },
    fps: {
        current: 0,
        min: 999,
        max: 0,
        average: 0
    },
    frameTime: {
        current: 0,
        min: 999,
        max: 0,
        average: 0
    },
    frameCount: 0,
    lastFpsUpdate: 0,
    history: {
        memory: [],
        cpu: [],
        fps: [],
        frameTime: [],
        allocationRate: []
    },
    stats: {
        totalFrames: 0,
        runningTime: 0,
        startTime: 0,
    }
};

// Enhanced glitch effects state
let glitchEffects = {
    intensity: 0,
    scanlineOffset: 0,
    textGlitch: false,
    horizontalShift: 0,
    verticalShift: 0,
    corruption: 0,
    flicker: 1,
    staticEffect: 0,
    shakeIntensity: 0,
    lastFrame: null
};

// Check if performance API is available
const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;
const hasPerformanceAPI = !!performance;
const hasMemoryAPI = hasPerformanceAPI && performance.memory;

// Extreme evil red & black theme with enhanced glitch effects
const EVIL_THEME = {
    background: '#0a0000', // Almost pure black with hint of red
    headerBg: '#000000',   // Pure black
    border: '#8b0000',     // Dark blood red
    text: '#ff0000',       // Bright blood red
    danger: '#ff0000',     // Bright blood red
    warning: '#8b0000',    // Dark blood red  
    good: '#8b0000',       // Dark blood red (everything is evil)
    graphBg: 'rgba(139, 0, 0, 0.2)', // Dark blood red
    resizeHandle: '#300000', // Deep blood red
    resizeBorder: '#8b0000', // Dark blood red
    scanlines: 'rgba(255, 0, 0, 0.03)', // Blood red scanlines
    corruption: 'rgba(255, 0, 0, 0.1)',  // Data corruption effect
    graph1: '#ff0000',     // Bright red for primary graphs
    graph2: '#8b0000',     // Dark red for secondary graphs
    graph3: '#300000',     // Very dark red for tertiary graphs
    graph4: '#450000'      // Medium dark red for additional graphs
};

// --- Create resize handle ---
function createResizeHandle() {
    if (perfResizeHandle) perfResizeHandle.remove();

    perfResizeHandle = document.createElement('div');
    perfResizeHandle.style.position = 'absolute';
    perfResizeHandle.style.right = '0';
    perfResizeHandle.style.bottom = '0';
    perfResizeHandle.style.width = '15px';
    perfResizeHandle.style.height = '15px';
    perfResizeHandle.style.backgroundColor = EVIL_THEME.resizeHandle;
    perfResizeHandle.style.cursor = 'nwse-resize';
    perfResizeHandle.style.zIndex = '212';
    perfResizeHandle.style.borderTop = `2px solid ${EVIL_THEME.resizeBorder}`;
    perfResizeHandle.style.borderLeft = `2px solid ${EVIL_THEME.resizeBorder}`;

    // Add glitch effect on hover
    perfResizeHandle.addEventListener('mouseover', () => {
        perfResizeHandle.style.boxShadow = '0 0 5px #ff0000';
    });
    perfResizeHandle.addEventListener('mouseout', () => {
        perfResizeHandle.style.boxShadow = 'none';
    });

    // Mouse events for resizing
    perfResizeHandle.addEventListener('mousedown', startResize);
    perfContainer.appendChild(perfResizeHandle);
}

// --- Resize functions ---
function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = PERF_WIDTH;
    resizeStartHeight = PERF_HEIGHT;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
}

function handleResize(e) {
    if (!isResizing) return;

    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    PERF_WIDTH = Math.max(300, resizeStartWidth + dx);
    PERF_HEIGHT = Math.max(180, resizeStartHeight + dy);

    resizePerfMonitor(PERF_WIDTH, PERF_HEIGHT);
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// --- Drag functions ---
function startDrag(e) {
    if (e.target.tagName === 'BUTTON') return; // Don't drag if clicking buttons

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = perfContainer.getBoundingClientRect();
    containerStartX = rect.left;
    containerStartY = rect.top;

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    perfContainer.style.cursor = 'grabbing';
}

function handleDrag(e) {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    perfContainer.style.left = `${containerStartX + dx}px`;
    perfContainer.style.top = `${containerStartY + dy}px`;
    perfContainer.style.right = 'auto';
    perfContainer.style.bottom = 'auto';
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    perfContainer.style.cursor = '';
}

// --- Enhanced Glitch effects ---
function updateGlitchEffects() {
    // Calculate intensity based on performance stress
    const cpuStress = performanceData.cpu.usage / 100;
    const memoryStress = performanceData.memory.usedJSHeapSize / performanceData.memory.jsHeapSizeLimit;
    const performanceStress = (cpuStress * 0.6) + (memoryStress * 0.4);

    glitchEffects.intensity = Math.min(1, performanceStress * 1.8);

    // Random glitch events with higher probability when intensity is high
    if (Math.random() < 0.15 * glitchEffects.intensity) {
        glitchEffects.scanlineOffset = (Math.random() - 0.5) * 12;
    }

    if (Math.random() < 0.08 * glitchEffects.intensity) {
        glitchEffects.textGlitch = true;
        setTimeout(() => { glitchEffects.textGlitch = false; }, 120);
    }

    if (Math.random() < 0.1 * glitchEffects.intensity) {
        glitchEffects.horizontalShift = (Math.random() - 0.5) * 25;
        setTimeout(() => { glitchEffects.horizontalShift = 0; }, 70);
    }

    if (Math.random() < 0.1 * glitchEffects.intensity) {
        glitchEffects.verticalShift = (Math.random() - 0.5) * 15;
        setTimeout(() => { glitchEffects.verticalShift = 0; }, 60);
    }

    if (Math.random() < 0.06 * glitchEffects.intensity) {
        glitchEffects.corruption = Math.random() * 0.4;
        setTimeout(() => { glitchEffects.corruption = 0; }, 250);
    }

    if (Math.random() < 0.09 * glitchEffects.intensity) {
        glitchEffects.flicker = 0.2 + Math.random() * 0.8;
        setTimeout(() => { glitchEffects.flicker = 1; }, 130);
    }

    if (Math.random() < 0.04 * glitchEffects.intensity) {
        glitchEffects.staticEffect = Math.random() * 0.7;
        setTimeout(() => { glitchEffects.staticEffect = 0; }, 220);
    }

    if (Math.random() < 0.07 * glitchEffects.intensity) {
        glitchEffects.shakeIntensity = Math.random() * 8;
        setTimeout(() => { glitchEffects.shakeIntensity = 0; }, 350);
    }
}

// --- Main setup ---
export function memCpuGodFunction() {
    if (isPerfVisible) return; // Already running

    perfContainer = document.createElement("div");
    perfContainer.id = "perfMonitorContainer";
    perfContainer.style.position = "absolute";
    perfContainer.style.left = "310px"; // Position next to debug terminal
    perfContainer.style.bottom = "0";
    perfContainer.style.zIndex = "210";
    perfContainer.style.backgroundColor = EVIL_THEME.background;
    perfContainer.style.border = `2px solid ${EVIL_THEME.border}`;
    perfContainer.style.boxSizing = "border-box";
    perfContainer.style.overflow = "hidden";
    perfContainer.style.boxShadow = "0 0 15px rgba(255, 0, 0, 0.5)";
    document.body.appendChild(perfContainer);

    // Create header with title and close button
    perfHeader = document.createElement("div");
    perfHeader.style.display = "flex";
    perfHeader.style.justifyContent = "space-between";
    perfHeader.style.alignItems = "center";
    perfHeader.style.padding = "5px 10px";
    perfHeader.style.backgroundColor = EVIL_THEME.headerBg;
    perfHeader.style.borderBottom = `1px solid ${EVIL_THEME.border}`;
    perfHeader.style.color = EVIL_THEME.text;
    perfHeader.style.fontFamily = "Courier New, monospace";
    perfHeader.style.fontSize = "12px";
    perfHeader.style.cursor = "move";
    perfHeader.style.textShadow = "0 0 8px #ff0000"; // Blood red glow

    // Add drag handle for moving the monitor
    perfHeader.addEventListener('mousedown', startDrag);

    const title = document.createElement("div");
    title.textContent = "SYSTEM MONITOR ++";
    title.style.fontWeight = "bold";
    title.style.color = "#ff0000"; // Bright blood red
    title.style.letterSpacing = "1px";

    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    closeButton.style.background = "none";
    closeButton.style.border = `1px solid ${EVIL_THEME.danger}`;
    closeButton.style.color = EVIL_THEME.danger;
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "2px 5px";
    closeButton.style.fontWeight = "bold";
    closeButton.style.fontFamily = "Courier New, monospace";
    closeButton.addEventListener("click", stopMemCpuMonitor);
    closeButton.addEventListener("mouseover", () => {
        closeButton.style.backgroundColor = EVIL_THEME.danger;
        closeButton.style.color = "#000";
        closeButton.style.boxShadow = "0 0 8px #ff0000";
    });
    closeButton.addEventListener("mouseout", () => {
        closeButton.style.backgroundColor = "transparent";
        closeButton.style.color = EVIL_THEME.danger;
        closeButton.style.boxShadow = "none";
    });

    perfHeader.appendChild(title);
    perfHeader.appendChild(closeButton);
    perfContainer.appendChild(perfHeader);

    perfCanvas = document.createElement("canvas");
    perfCanvas.width = PERF_WIDTH;
    perfCanvas.height = PERF_HEIGHT - 25; // Account for header
    perfCanvas.style.display = "block";
    perfContainer.appendChild(perfCanvas);

    perfCtx = perfCanvas.getContext("2d");
    perfCtx.imageSmoothingEnabled = false;

    // Create resize handle
    createResizeHandle();

    // Update container size
    perfContainer.style.width = `${PERF_WIDTH}px`;
    perfContainer.style.height = `${PERF_HEIGHT}px`;

    isPerfVisible = true;

    // Initialize performance data
    performanceData.cpu.lastTime = performance.now();
    performanceData.lastFpsUpdate = performance.now();
    performanceData.stats.startTime = performance.now();
    performanceData.memory.lastUsedSize = performance.memory ? performance.memory.usedJSHeapSize : 0;

    // Start updating stats
    updateInterval = setInterval(updatePerformanceData, 1000);
    glitchInterval = setInterval(updateGlitchEffects, 450);
    requestAnimationFrame(drawPerfMonitor);
}

// --- Enhanced performance data update ---
function updatePerformanceData() {
    if (!isPerfVisible) return;

    // Get memory metrics if available
    if (hasMemoryAPI) {
        const currentUsed = performance.memory.usedJSHeapSize;
        const allocationRate = (currentUsed - performanceData.memory.lastUsedSize) / 1048576; // MB per second

        performanceData.memory = {
            usedJSHeapSize: currentUsed / 1048576, // Convert to MB
            totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576,
            allocationRate: allocationRate,
            lastUsedSize: currentUsed
        };

        performanceData.history.allocationRate.push(allocationRate);
        if (performanceData.history.allocationRate.length > 30) {
            performanceData.history.allocationRate.shift();
        }
    }

    // Calculate FPS and frame time stats
    const now = performance.now();
    if (now - performanceData.lastFpsUpdate >= 1000) {
        const elapsedSeconds = (now - performanceData.lastFpsUpdate) / 1000;
        performanceData.fps.current = Math.round(performanceData.frameCount / elapsedSeconds);

        // Update FPS stats
        performanceData.fps.min = Math.min(performanceData.fps.min, performanceData.fps.current);
        performanceData.fps.max = Math.max(performanceData.fps.max, performanceData.fps.current);
        performanceData.fps.average = (performanceData.fps.average * 0.8) + (performanceData.fps.current * 0.2);

        // Calculate average frame time
        const frameTime = 1000 / performanceData.fps.current;
        performanceData.frameTime.current = frameTime;
        performanceData.frameTime.min = Math.min(performanceData.frameTime.min, frameTime);
        performanceData.frameTime.max = Math.max(performanceData.frameTime.max, frameTime);
        performanceData.frameTime.average = (performanceData.frameTime.average * 0.8) + (frameTime * 0.2);

        performanceData.frameCount = 0;
        performanceData.lastFpsUpdate = now;

        // Update CPU stats
        performanceData.cpu.peakUsage = Math.max(performanceData.cpu.peakUsage, performanceData.cpu.usage);
        performanceData.cpu.averageUsage = (performanceData.cpu.averageUsage * 0.7) + (performanceData.cpu.usage * 0.3);

        // Update running stats
        performanceData.stats.totalFrames += performanceData.frameCount;
        performanceData.stats.runningTime = (now - performanceData.stats.startTime) / 1000;

        // Add to history
        performanceData.history.memory.push(performanceData.memory.usedJSHeapSize || 0);
        performanceData.history.cpu.push(performanceData.cpu.usage);
        performanceData.history.fps.push(performanceData.fps.current);
        performanceData.history.frameTime.push(performanceData.frameTime.current);

        // Keep history length limited
        const maxHistory = 40;
        if (performanceData.history.memory.length > maxHistory) {
            performanceData.history.memory.shift();
            performanceData.history.cpu.shift();
            performanceData.history.fps.shift();
            performanceData.history.frameTime.shift();
        }
    }
}

// --- Draw stats with enhanced metrics ---
function drawPerfMonitor() {
    if (!isPerfVisible || !perfCtx) return;

    performanceData.frameCount++;

    // Calculate CPU usage (simplified)
    const now = performance.now();
    const timeDiff = now - performanceData.cpu.lastTime;

    if (timeDiff > 100) {
        const usage = Math.min(100, Math.max(0, (timeDiff - 16) / timeDiff * 100));
        performanceData.cpu.usage = usage;
        performanceData.cpu.lastTime = now;
    }

    const width = perfCanvas.width;
    const height = perfCanvas.height;

    // Apply flicker effect
    perfCtx.globalAlpha = glitchEffects.flicker;

    // Apply shake effect
    const shakeX = glitchEffects.shakeIntensity > 0 ?
        (Math.random() - 0.5) * glitchEffects.shakeIntensity : 0;
    const shakeY = glitchEffects.shakeIntensity > 0 ?
        (Math.random() - 0.5) * glitchEffects.shakeIntensity : 0;

    // Draw pure black background with blood red hint
    perfCtx.fillStyle = EVIL_THEME.background;
    perfCtx.fillRect(shakeX, shakeY, width, height);

    // Draw corruption effect
    if (glitchEffects.corruption > 0) {
        perfCtx.fillStyle = EVIL_THEME.corruption;
        for (let i = 0; i < width; i += 5) {
            if (Math.random() < glitchEffects.corruption) {
                const h = Math.random() * height;
                perfCtx.fillRect(i + shakeX, shakeY, 3, h);
            }
        }
    }

    // Draw blood red scanlines with offset glitch
    perfCtx.fillStyle = EVIL_THEME.scanlines;
    for (let i = glitchEffects.scanlineOffset; i < height; i += 2) {
        perfCtx.fillRect(shakeX, i + shakeY, width, 1);
    }

    // Draw text with glitch effects
    perfCtx.font = "11px 'Courier New', monospace";
    perfCtx.textBaseline = "top";
    let y = 15;

    // Apply horizontal and vertical shift if active
    perfCtx.translate(glitchEffects.horizontalShift + shakeX, glitchEffects.verticalShift + shakeY);

    // Draw first row of stats
    const col1 = 10;
    const col2 = width / 2;

    // FPS stats
    let fpsText = `FPS: ${performanceData.fps.current} (${performanceData.fps.min}-${performanceData.fps.max})`;
    if (glitchEffects.textGlitch) {
        fpsText = `FPS: ${Math.floor(Math.random() * 100)} (${Math.floor(Math.random() * 50)}-${Math.floor(Math.random() * 150)})`;
    }
    perfCtx.fillStyle = performanceData.fps.current > 50 ? EVIL_THEME.graph1 :
        performanceData.fps.current > 30 ? EVIL_THEME.graph2 : EVIL_THEME.graph3;
    perfCtx.fillText(fpsText, col1, y);

    // Frame time stats
    let frameTimeText = `FRM: ${performanceData.frameTime.current.toFixed(1)}ms`;
    if (glitchEffects.textGlitch) {
        frameTimeText = `FRM: ${(Math.random() * 50).toFixed(1)}ms`;
    }
    perfCtx.fillStyle = performanceData.frameTime.current < 20 ? EVIL_THEME.graph1 :
        performanceData.frameTime.current < 35 ? EVIL_THEME.graph2 : EVIL_THEME.graph3;
    perfCtx.fillText(frameTimeText, col2, y);
    y += 16;

    // CPU stats
    let cpuText = `CPU: ${performanceData.cpu.usage.toFixed(1)}% (Avg: ${performanceData.cpu.averageUsage.toFixed(1)}%)`;
    if (glitchEffects.textGlitch) {
        cpuText = `CPU: ${(Math.random() * 100).toFixed(1)}% (Avg: ${(Math.random() * 100).toFixed(1)}%)`;
    }
    perfCtx.fillStyle = performanceData.cpu.usage < 70 ? EVIL_THEME.graph1 :
        performanceData.cpu.usage < 85 ? EVIL_THEME.graph2 : EVIL_THEME.graph3;
    perfCtx.fillText(cpuText, col1, y);

    // Memory stats (if available)
    if (hasMemoryAPI) {
        const memoryPercent = (performanceData.memory.usedJSHeapSize / performanceData.memory.jsHeapSizeLimit) * 100;
        let memText = `MEM: ${performanceData.memory.usedJSHeapSize.toFixed(1)}MB (${memoryPercent.toFixed(1)}%)`;
        if (glitchEffects.textGlitch) {
            memText = `MEM: ${(Math.random() * 100).toFixed(1)}MB (${(Math.random() * 100).toFixed(1)}%)`;
        }
        perfCtx.fillStyle = memoryPercent < 70 ? EVIL_THEME.graph1 :
            memoryPercent < 85 ? EVIL_THEME.graph2 : EVIL_THEME.graph3;
        perfCtx.fillText(memText, col2, y);
    }
    y += 16;

    // Allocation rate and limit stats
    if (hasMemoryAPI) {
        let allocText = `ALLOC: ${performanceData.memory.allocationRate.toFixed(2)}MB/s`;
        if (glitchEffects.textGlitch) {
            allocText = `ALLOC: ${(Math.random() * 10).toFixed(2)}MB/s`;
        }
        perfCtx.fillStyle = Math.abs(performanceData.memory.allocationRate) < 1 ? EVIL_THEME.graph1 :
            Math.abs(performanceData.memory.allocationRate) < 5 ? EVIL_THEME.graph2 : EVIL_THEME.graph3;
        perfCtx.fillText(allocText, col1, y);

        let limitText = `LIMIT: ${performanceData.memory.jsHeapSizeLimit.toFixed(1)}MB`;
        if (glitchEffects.textGlitch) {
            limitText = `LIMIT: ${(Math.random() * 1000).toFixed(1)}MB`;
        }
        perfCtx.fillStyle = EVIL_THEME.graph4;
        perfCtx.fillText(limitText, col2, y);
    }
    y += 16;

    // Runtime stats
    let runtimeText = `TIME: ${Math.floor(performanceData.stats.runningTime)}s`;
    let framesText = `FRAMES: ${performanceData.stats.totalFrames.toLocaleString()}`;
    if (glitchEffects.textGlitch) {
        runtimeText = `TIME: ${Math.floor(Math.random() * 1000)}s`;
        framesText = `FRAMES: ${Math.floor(Math.random() * 1000000).toLocaleString()}`;
    }
    perfCtx.fillStyle = EVIL_THEME.graph1;
    perfCtx.fillText(runtimeText, col1, y);
    perfCtx.fillStyle = EVIL_THEME.graph2;
    perfCtx.fillText(framesText, col2, y);
    y += 20;

    // Reset translation
    perfCtx.translate(-glitchEffects.horizontalShift - shakeX, -glitchEffects.verticalShift - shakeY);

    // Draw multiple graphs if we have history
    const graphHeight = 28;
    const graphSpacing = 5;
    const graphsPerRow = 2;
    const graphWidth = (width - 20 - (graphsPerRow - 1) * graphSpacing) / graphsPerRow;

    if (performanceData.history.memory.length > 1) {
        // Row 1: Memory and CPU
        drawGraph(perfCtx, performanceData.history.memory, 10, y, graphWidth, graphHeight, EVIL_THEME.graph1, "MEM", "MB");
        drawGraph(perfCtx, performanceData.history.cpu, 15 + graphWidth, y, graphWidth, graphHeight, EVIL_THEME.graph2, "CPU", "%");
        y += graphHeight + graphSpacing + 5;

        // Row 2: FPS and Frame Time
        drawGraph(perfCtx, performanceData.history.fps, 10, y, graphWidth, graphHeight, EVIL_THEME.graph3, "FPS", "");
        drawGraph(perfCtx, performanceData.history.frameTime, 15 + graphWidth, y, graphWidth, graphHeight, EVIL_THEME.graph4, "MS", "ms");
        y += graphHeight + graphSpacing;

        // Row 3: Allocation Rate (if available)
        if (hasMemoryAPI && performanceData.history.allocationRate.length > 1) {
            drawGraph(perfCtx, performanceData.history.allocationRate, 10, y, width - 20, graphHeight, EVIL_THEME.graph1, "ALLOC", "MB/s");
        }
    }

    // Draw evil blood red border with glow
    perfCtx.strokeStyle = EVIL_THEME.border;
    perfCtx.lineWidth = 1;
    perfCtx.strokeRect(shakeX, shakeY, width, height);

    // Draw inner glow
    perfCtx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    perfCtx.strokeRect(1 + shakeX, 1 + shakeY, width - 2, height - 2);

    // Draw static effect
    if (glitchEffects.staticEffect > 0) {
        perfCtx.fillStyle = `rgba(255, 0, 0, ${glitchEffects.staticEffect * 0.1})`;
        for (let i = 0; i < width * height * 0.01; i++) {
            const x = Math.floor(Math.random() * width) + shakeX;
            const y = Math.floor(Math.random() * height) + shakeY;
            perfCtx.fillRect(x, y, 1, 1);
        }
    }

    // Reset alpha
    perfCtx.globalAlpha = 1;

    requestAnimationFrame(drawPerfMonitor);
}

// --- Enhanced graph drawing function ---
function drawGraph(ctx, values, x, y, width, height, color, label, unit = "") {
    if (values.length < 2) return;

    // Find max value for scaling with some padding
    const maxValue = Math.max(...values, 1) * 1.15;

    // Draw graph background
    ctx.fillStyle = EVIL_THEME.graphBg;
    ctx.fillRect(x, y, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(139, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    for (let i = 1; i < 4; i++) {
        const lineY = y + height - (i / 4) * height;
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(x + width, lineY);
        ctx.stroke();
    }

    // Draw graph line with glitch effect
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < values.length; i++) {
        const xPos = x + (i / (values.length - 1)) * width;

        // Add slight random glitches to graph values
        let value = values[i];
        if (Math.random() < glitchEffects.intensity * 0.15) {
            value = value * (0.8 + Math.random() * 0.4);
        }

        const yPos = y + height - (value / maxValue) * height;

        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }

    ctx.stroke();

    // Draw fill under graph
    ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < values.length; i++) {
        const xPos = x + (i / (values.length - 1)) * width;
        const value = values[i];
        const yPos = y + height - (value / maxValue) * height;
        ctx.lineTo(xPos, yPos);
    }
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();

    // Draw label with blood red glow
    const currentValue = values[values.length - 1];
    let labelText = `${label}: ${currentValue.toFixed(unit === "MB/s" ? 2 : 1)}${unit}`;

    if (glitchEffects.textGlitch) {
        const glitchValue = currentValue * (0.7 + Math.random() * 0.6);
        labelText = `${label}: ${glitchValue.toFixed(unit === "MB/s" ? 2 : 1)}${unit}`;
    }

    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff0000';
    ctx.font = "9px Courier New";
    ctx.fillText(labelText, x + 3, y + 10);
    ctx.shadowBlur = 0;
}

// --- Toggle visibility ---
export function togglePerfMonitor() {
    if (isPerfVisible) {
        stopMemCpuMonitor();
    } else {
        memCpuGodFunction();
    }
}

// --- Cleanup ---
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

    // Reset glitch effects
    glitchEffects = {
        intensity: 0,
        scanlineOffset: 0,
        textGlitch: false,
        horizontalShift: 0,
        verticalShift: 0,
        corruption: 0,
        flicker: 1,
        staticEffect: 0,
        shakeIntensity: 0,
        lastFrame: null
    };
}

// --- Resize function ---
export function resizePerfMonitor(width, height) {
    PERF_WIDTH = width;
    PERF_HEIGHT = height;

    if (perfCanvas && perfContainer) {
        perfCanvas.width = PERF_WIDTH;
        perfCanvas.height = PERF_HEIGHT - 25;
        perfContainer.style.width = `${PERF_WIDTH}px`;
        perfContainer.style.height = `${PERF_HEIGHT}px`;

        // Update resize handle position
        if (perfResizeHandle) {
            perfResizeHandle.style.right = '0';
            perfResizeHandle.style.bottom = '0';
        }
    }
}

// --- Expose manual resize globally ---
window.resizePerfMonitor = resizePerfMonitor;
window.togglePerfMonitor = togglePerfMonitor;