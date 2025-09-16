// File: /debug/memcpu.js

// --- CONFIG ---
let perfCanvas = null;
let perfCtx = null;
let perfContainer = null;
let perfHeader = null;
let perfResizeHandle = null;
let isPerfVisible = false;

let PERF_WIDTH = 300;
let PERF_HEIGHT = 150;

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

// Performance monitoring state
let performanceData = {
    memory: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
    },
    cpu: {
        usage: 0,
        lastTime: 0,
        lastUsage: 0
    },
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: 0,
    history: {
        memory: [],
        cpu: [],
        fps: []
    }
};

// Check if performance API is available
const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;
const hasPerformanceAPI = !!performance;
const hasMemoryAPI = hasPerformanceAPI && performance.memory;

// Extreme evil red & black theme - NO PINK
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
    scanlines: 'rgba(255, 0, 0, 0.03)' // Blood red scanlines
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

    PERF_WIDTH = Math.max(200, resizeStartWidth + dx);
    PERF_HEIGHT = Math.max(120, resizeStartHeight + dy);

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
    title.textContent = "Peformance Monitor";
    title.style.fontWeight = "bold";
    title.style.color = "#ff0000"; // Bright blood red

    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    closeButton.style.background = "none";
    closeButton.style.border = `1px solid ${EVIL_THEME.danger}`;
    closeButton.style.color = EVIL_THEME.danger;
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "2px 5px";
    closeButton.style.fontWeight = "bold";
    closeButton.addEventListener("click", stopMemCpuMonitor);
    closeButton.addEventListener("mouseover", () => {
        closeButton.style.backgroundColor = EVIL_THEME.danger;
        closeButton.style.color = "#000";
    });
    closeButton.addEventListener("mouseout", () => {
        closeButton.style.backgroundColor = "transparent";
        closeButton.style.color = EVIL_THEME.danger;
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

    // Start updating stats
    updateInterval = setInterval(updatePerformanceData, 1000);
    requestAnimationFrame(drawPerfMonitor);
}

// --- Update performance data ---
function updatePerformanceData() {
    if (!isPerfVisible) return;

    // Get memory metrics if available
    if (hasMemoryAPI) {
        performanceData.memory = {
            usedJSHeapSize: performance.memory.usedJSHeapSize / 1048576, // Convert to MB
            totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576
        };
    }

    // Calculate FPS
    const now = performance.now();
    if (now - performanceData.lastFpsUpdate >= 1000) {
        performanceData.fps = Math.round(
            (performanceData.frameCount * 1000) / (now - performanceData.lastFpsUpdate)
        );
        performanceData.frameCount = 0;
        performanceData.lastFpsUpdate = now;

        // Add to history
        performanceData.history.memory.push(performanceData.memory.usedJSHeapSize || 0);
        performanceData.history.cpu.push(performanceData.cpu.usage);
        performanceData.history.fps.push(performanceData.fps);

        // Keep history length limited
        const maxHistory = 30;
        if (performanceData.history.memory.length > maxHistory) {
            performanceData.history.memory.shift();
            performanceData.history.cpu.shift();
            performanceData.history.fps.shift();
        }
    }
}

// --- Draw stats ---
function drawPerfMonitor() {
    if (!isPerfVisible || !perfCtx) return;

    performanceData.frameCount++;

    // Calculate CPU usage (simplified)
    const now = performance.now();
    const timeDiff = now - performanceData.cpu.lastTime;

    if (timeDiff > 100) {
        const usage = Math.min(100, Math.max(0, (timeDiff - 16) / timeDiff * 100));
        performanceData.cpu = {
            usage: usage,
            lastTime: now,
            lastUsage: performanceData.cpu.usage
        };
    }

    const width = perfCanvas.width;
    const height = perfCanvas.height;

    // Draw pure black background with blood red hint
    perfCtx.fillStyle = EVIL_THEME.background;
    perfCtx.fillRect(0, 0, width, height);

    // Draw blood red scanlines
    perfCtx.fillStyle = EVIL_THEME.scanlines;
    for (let i = 0; i < height; i += 2) {
        perfCtx.fillRect(0, i, width, 1);
    }

    // Draw text
    perfCtx.font = "12px Courier New";
    perfCtx.textBaseline = "top";
    let y = 20;

    // FPS - Everything in blood red, different intensities
    perfCtx.fillStyle = performanceData.fps > 50 ? '#ff0000' :
        performanceData.fps > 30 ? '#8b0000' : '#300000';
    perfCtx.fillText(`FPS: ${performanceData.fps}`, 10, y);
    y += 20;

    // Memory (if available)
    if (hasMemoryAPI) {
        const memoryPercent = (performanceData.memory.usedJSHeapSize / performanceData.memory.jsHeapSizeLimit) * 100;
        perfCtx.fillStyle = memoryPercent < 70 ? '#ff0000' :
            memoryPercent < 85 ? '#8b0000' : '#300000';
        perfCtx.fillText(`MEM: ${performanceData.memory.usedJSHeapSize.toFixed(1)}/${performanceData.memory.jsHeapSizeLimit.toFixed(1)}MB`, 10, y);
        y += 20;
    }

    // CPU
    perfCtx.fillStyle = performanceData.cpu.usage < 70 ? '#300000' :
        performanceData.cpu.usage < 85 ? '#8b0000' : '#ff0000';
    perfCtx.fillText(`CPU: ${performanceData.cpu.usage.toFixed(1)}%`, 10, y);
    y += 20;

    // Draw graphs if we have history
    if (performanceData.history.memory.length > 1) {
        drawGraph(perfCtx, performanceData.history.memory, 10, y, width - 20, 30, '#ff0000', "MEM");
        drawGraph(perfCtx, performanceData.history.cpu, 10, y + 40, width - 20, 30, '#8b0000', "CPU");
    }

    // Draw evil blood red border
    perfCtx.strokeStyle = EVIL_THEME.border;
    perfCtx.lineWidth = 1;
    perfCtx.strokeRect(0, 0, width, height);

    requestAnimationFrame(drawPerfMonitor);
}

// --- Draw graph ---
function drawGraph(ctx, values, x, y, width, height, color, label) {
    if (values.length < 2) return;

    // Find max value for scaling
    const maxValue = Math.max(...values, 1) * 1.1; // Add 10% padding

    // Draw graph background
    ctx.fillStyle = EVIL_THEME.graphBg;
    ctx.fillRect(x, y, width, height);

    // Draw graph line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (let i = 0; i < values.length; i++) {
        const xPos = x + (i / (values.length - 1)) * width;
        const yPos = y + height - (values[i] / maxValue) * height;

        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }

    ctx.stroke();

    // Draw label with blood red glow
    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff0000';
    ctx.fillText(`${label}: ${values[values.length - 1].toFixed(1)}`, x + 5, y + 12);
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
    if (perfContainer) {
        perfContainer.remove();
        perfContainer = null;
    }
    perfCanvas = null;
    perfCtx = null;
    perfHeader = null;
    perfResizeHandle = null;
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