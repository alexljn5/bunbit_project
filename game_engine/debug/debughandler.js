import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from '../globals.js';
import { memCpuGodFunction } from './memcpu.js';

const consoleOriginal = {
    debug: console.debug,
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log
};

// --- CONFIG ---
// Maximum logs to keep in buffer
let MAX_LOGS = 50000;

// Default canvas size (relative to main game canvas)
let DEBUG_WIDTH = CANVAS_WIDTH * 0.75;   // 75% of game width
let DEBUG_HEIGHT = CANVAS_HEIGHT * 0.5;  // 50% of game height

// Minimum size limits
const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

// Maximum characters per line (horizontal clipping)
let MAX_CHARS_PER_LINE = 120; // tweak this

let logBuffer = [];
let isDebugVisible = false;
let debugCanvas = null;
let debugCtx = null;
let debugContainer = null;

let scrollOffsetX = 0;
let virtualScrollY = 0;
let autoScroll = true;

let logFilters = { log: true, error: true, warn: true, info: true, debug: true };
let filteredLogs = [];

// Resize state
let isResizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

// Drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

// Extreme evil red & black theme - NO PINK
const EVIL_THEME = {
    background: '#0a0000', // Almost pure black with hint of red
    headerBg: '#000000',   // Pure black
    border: '#8b0000',     // Dark blood red
    text: '#ff0000',       // Bright blood red
    danger: '#ff0000',     // Bright blood red
    warning: '#8b0000',    // Dark blood red  
    good: '#8b0000',       // Dark blood red
    resizeHandle: '#300000', // Deep blood red
    resizeBorder: '#8b0000', // Dark blood red
    buttonBg: '#1a0000',   // Dark red-black
    buttonHover: '#300000' // Darker blood red
};

const ENABLE_DEBUG_TERMINAL = (() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const debugTerminalParam = urlParams ? urlParams.get('debugTerminal') : null;
    if (debugTerminalParam === 'false') return false;
    return !(window.debugAPI && window.debugAPI.isProduction && window.debugAPI.isProduction());
})();

const HEADER_HEIGHT = 30 * SCALE_Y;

// Button definitions
let buttons = [];
let resizeArea = { x: 0, y: 0, w: 15 * SCALE_X, h: 15 * SCALE_Y, hovered: false };

// --- Update filtered logs ---
function updateFilteredLogs() {
    filteredLogs = logBuffer.filter(log => logFilters[log.type]);
}

// --- Console override ---
function overrideConsole() {
    function logHelper(type, args) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');

        const error = new Error();
        const stackLines = error.stack ? error.stack.split('\n') : [];
        const callerLine = stackLines[3] || stackLines[2] || '';
        let sourceInfo = { file: 'unknown', line: '0', column: '0' };

        const stackMatch = callerLine.match(/at\s+.*\s+\((.*):(\d+):(\d+)\)/) ||
            callerLine.match(/at\s+(.*):(\d+):(\d+)/);
        if (stackMatch) {
            let file = stackMatch[1];
            file = file.split('/').pop().split('?')[0];
            sourceInfo = { file, line: stackMatch[2], column: stackMatch[3] };
        }

        const log = { type, message, timestamp: new Date().toLocaleTimeString(), source: `${sourceInfo.file}:${sourceInfo.line}` };

        logBuffer.push(log);
        if (logBuffer.length > MAX_LOGS) logBuffer.shift();

        if (window.debugAPI && window.debugAPI.sendLog) window.debugAPI.sendLog(log);
        consoleOriginal[type](...args);

        if (isDebugVisible) {
            updateFilteredLogs();
            drawDebugTerminal();
        }
    }

    ['debug', 'error', 'warn', 'info', 'log'].forEach(type => {
        console[type] = (...args) => logHelper(type, args);
    });
    console.verbose = console.verbose || ((...args) => logHelper('debug', args));
}

// --- Update button positions ---
function updateButtonPositions() {
    buttons = [];
    const paddingX = 4 * SCALE_X;
    const paddingY = 4 * SCALE_Y;
    const gap = 2 * SCALE_X;
    const buttonH = HEADER_HEIGHT - 2 * paddingY;
    const types = ['perf', 'log', 'error', 'warn', 'info', 'debug', 'clear'];
    const flexes = { perf: 0.5, clear: 0.5, default: 1 };
    let totalFlex = types.reduce((sum, t) => sum + (flexes[t] || flexes.default), 0);
    const availableWidth = DEBUG_WIDTH - 2 * paddingX - (types.length - 1) * gap;
    const unit = availableWidth / totalFlex;

    let x = paddingX;
    types.forEach(type => {
        const flex = flexes[type] || flexes.default;
        const w = unit * flex;
        const text = type === 'perf' ? 'CREAM' : type === 'clear' ? 'CLEAR' : type.charAt(0).toUpperCase() + type.slice(1);
        buttons.push({
            x, y: paddingY, w, h: buttonH,
            text, type, hovered: false
        });
        x += w + gap;
    });
}

// --- Handle mouse down ---
function handleMouseDown(e) {
    e.preventDefault();
    const rect = debugCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check resize
    if (mx >= resizeArea.x && mx < resizeArea.x + resizeArea.w && my >= resizeArea.y && my < resizeArea.y + resizeArea.h) {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = DEBUG_WIDTH;
        resizeStartHeight = DEBUG_HEIGHT;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        return;
    }

    // Check header for drag or button
    if (my < HEADER_HEIGHT) {
        const clickedButton = buttons.find(btn => mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h);
        if (clickedButton) {
            const type = clickedButton.type;
            if (type === 'perf') {
                import('./memcpu.js').then(module => {
                    module.togglePerfMonitor();
                });
            } else if (type === 'clear') {
                logBuffer = [];
                updateFilteredLogs();
                scrollOffsetX = 0;
                virtualScrollY = 0;
                drawDebugTerminal();
            } else {
                logFilters[type] = !logFilters[type];
                updateFilteredLogs();
                const lineHeight = 18 * SCALE_Y;
                const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
                const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
                virtualScrollY = Math.min(virtualScrollY, maxScrollY);
                drawDebugTerminal();
            }
            return;
        }

        // Start drag if not on button
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const contRect = debugContainer.getBoundingClientRect();
        containerStartX = contRect.left;
        containerStartY = contRect.top;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
    }
}

// --- Handle mouse move ---
function handleMouseMove(e) {
    const rect = debugCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let needsRedraw = false;

    // Update button hovers
    buttons.forEach(btn => {
        const isHovered = mx >= btn.x && mx < btn.x + btn.w && my >= btn.y && my < btn.y + btn.h;
        if (isHovered !== btn.hovered) {
            btn.hovered = isHovered;
            needsRedraw = true;
        }
    });

    // Update resize hover
    const isResizeHovered = mx >= resizeArea.x && mx < resizeArea.x + resizeArea.w && my >= resizeArea.y && my < resizeArea.y + resizeArea.h;
    if (isResizeHovered !== resizeArea.hovered) {
        resizeArea.hovered = isResizeHovered;
        needsRedraw = true;
    }

    if (needsRedraw) {
        drawDebugTerminal();
    }

    // Set cursor
    if (isResizeHovered) {
        debugCanvas.style.cursor = 'nwse-resize';
    } else if (buttons.some(btn => btn.hovered)) {
        debugCanvas.style.cursor = 'pointer';
    } else if (my < HEADER_HEIGHT) {
        debugCanvas.style.cursor = 'move';
    } else {
        debugCanvas.style.cursor = 'default';
    }
}

// --- Handle mouse leave ---
function handleMouseLeave() {
    let needsRedraw = false;
    buttons.forEach(btn => {
        if (btn.hovered) {
            btn.hovered = false;
            needsRedraw = true;
        }
    });
    if (resizeArea.hovered) {
        resizeArea.hovered = false;
        needsRedraw = true;
    }
    if (needsRedraw) {
        drawDebugTerminal();
    }
    debugCanvas.style.cursor = 'default';
}

// --- Handle resize ---
function handleResize(e) {
    if (!isResizing) return;

    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    DEBUG_WIDTH = Math.max(MIN_WIDTH, resizeStartWidth + dx);
    DEBUG_HEIGHT = Math.max(MIN_HEIGHT, resizeStartHeight + dy);

    resizeDebugCanvas(DEBUG_WIDTH, DEBUG_HEIGHT);
}

// --- Stop resize ---
function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// --- Handle drag ---
function handleDrag(e) {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    debugContainer.style.left = `${containerStartX + dx}px`;
    debugContainer.style.top = `${containerStartY + dy}px`;
    debugContainer.style.right = 'auto';
    debugContainer.style.bottom = 'auto';
}

// --- Stop drag ---
function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// --- Manual resize helper ---
function resizeDebugCanvas(width, height) {
    DEBUG_WIDTH = width;
    DEBUG_HEIGHT = height;

    if (!debugCanvas || !debugContainer) return;

    const totalHeight = DEBUG_HEIGHT + HEADER_HEIGHT;
    debugCanvas.width = DEBUG_WIDTH;
    debugCanvas.height = totalHeight;

    // Update container size to match canvas
    debugContainer.style.width = `${DEBUG_WIDTH}px`;
    debugContainer.style.height = `${totalHeight}px`;

    updateButtonPositions();
    drawDebugTerminal();
}

// --- Main debug setup ---
export function debugHandlerGodFunction() {
    if (!ENABLE_DEBUG_TERMINAL) return console.log('Debug terminal disabled *chao chao*');

    overrideConsole();

    if (!document.body) return console.warn('document.body not ready, deferring debug canvas creation *pouts*');

    // Remove existing container if it exists to prevent duplicates
    const existingContainer = document.getElementById('debugTerminalContainer');
    if (existingContainer) {
        existingContainer.remove();
    }

    debugContainer = document.createElement('div');
    debugContainer.id = 'debugTerminalContainer';
    debugContainer.style.position = 'absolute';
    debugContainer.style.left = '0';
    debugContainer.style.bottom = '0';
    debugContainer.style.zIndex = '200';
    debugContainer.style.backgroundColor = 'transparent';
    debugContainer.style.border = 'none';
    debugContainer.style.boxSizing = 'border-box';
    debugContainer.style.overflow = 'hidden';
    debugContainer.style.resize = 'none';
    document.body.appendChild(debugContainer);

    debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugTerminal';
    debugCanvas.style.display = 'block';
    debugContainer.appendChild(debugCanvas);

    debugCtx = debugCanvas.getContext('2d');
    debugCtx.imageSmoothingEnabled = false;

    isDebugVisible = true;

    // Initialize size
    resizeDebugCanvas(DEBUG_WIDTH, DEBUG_HEIGHT);

    // Mouse events
    debugCanvas.addEventListener('mousedown', handleMouseDown);
    debugCanvas.addEventListener('mousemove', handleMouseMove);
    debugCanvas.addEventListener('mouseleave', handleMouseLeave);

    // Scroll handling
    debugCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const lineHeight = 18 * SCALE_Y;

        if (e.shiftKey) {
            scrollOffsetX += e.deltaY;
            scrollOffsetX = Math.max(0, Math.min(scrollOffsetX, 1000));
        } else {
            virtualScrollY += e.deltaY;
            virtualScrollY = Math.max(-10000, virtualScrollY);
            const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
            autoScroll = virtualScrollY >= Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
        }

        drawDebugTerminal();
    });

    // Keyboard navigation
    debugCanvas.tabIndex = 0;
    debugCanvas.addEventListener('keydown', (e) => {
        const lineHeight = 18 * SCALE_Y;
        const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
        const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);

        switch (e.key) {
            case 'ArrowUp':
                virtualScrollY = Math.max(0, virtualScrollY - lineHeight);
                e.preventDefault();
                break;
            case 'ArrowDown':
                virtualScrollY = Math.min(maxScrollY, virtualScrollY + lineHeight);
                e.preventDefault();
                break;
            case 'PageUp':
                virtualScrollY = Math.max(0, virtualScrollY - logAreaHeight);
                e.preventDefault();
                break;
            case 'PageDown':
                virtualScrollY = Math.min(maxScrollY, virtualScrollY + logAreaHeight);
                e.preventDefault();
                break;
            case 'Home':
                virtualScrollY = 0;
                e.preventDefault();
                break;
            case 'End':
                virtualScrollY = maxScrollY;
                e.preventDefault();
                break;
        }

        autoScroll = virtualScrollY >= maxScrollY;
        drawDebugTerminal();
    });

    if (window.debugAPI && window.debugAPI.requestLogs) {
        window.debugAPI.requestLogs((log) => {
            if (Array.isArray(log)) {
                logBuffer = log.slice(-MAX_LOGS);
            } else {
                logBuffer.push(log);
                if (logBuffer.length > MAX_LOGS) logBuffer.shift();
            }
            updateFilteredLogs();
            drawDebugTerminal();
        });
    }

    updateFilteredLogs();
    drawDebugTerminal();
    memCpuGodFunction();
}

// --- Draw debug logs ---
export function drawDebugTerminal() {
    if (!isDebugVisible || !debugCtx || !debugCanvas) return;

    const termWidth = debugCanvas.width;
    const termHeight = debugCanvas.height;
    const logAreaHeight = termHeight - HEADER_HEIGHT;

    debugCtx.clearRect(0, 0, termWidth, termHeight);
    debugCtx.fillStyle = EVIL_THEME.background;
    debugCtx.fillRect(0, 0, termWidth, termHeight);

    // Draw outer border
    debugCtx.strokeStyle = EVIL_THEME.border;
    debugCtx.lineWidth = 2;
    debugCtx.strokeRect(0, 0, termWidth, termHeight);

    // Draw header
    debugCtx.fillStyle = EVIL_THEME.headerBg;
    debugCtx.fillRect(0, 0, termWidth, HEADER_HEIGHT);
    debugCtx.strokeStyle = EVIL_THEME.border;
    debugCtx.lineWidth = 1;
    debugCtx.beginPath();
    debugCtx.moveTo(0, HEADER_HEIGHT - 0.5);
    debugCtx.lineTo(termWidth, HEADER_HEIGHT - 0.5);
    debugCtx.stroke();

    // Draw buttons
    const buttonFontSize = 10 * SCALE_Y;
    debugCtx.font = `${buttonFontSize}px Courier New`;
    debugCtx.textAlign = 'center';
    debugCtx.textBaseline = 'middle';
    buttons.forEach(btn => {
        const isFilter = btn.type !== 'perf' && btn.type !== 'clear';
        const active = isFilter ? logFilters[btn.type] : false;
        const bg = btn.hovered ? EVIL_THEME.buttonHover : (active ? EVIL_THEME.buttonHover : EVIL_THEME.buttonBg);
        debugCtx.fillStyle = bg;
        debugCtx.fillRect(btn.x, btn.y, btn.w, btn.h);

        const borderColor = active ? EVIL_THEME.danger : EVIL_THEME.border;
        debugCtx.strokeStyle = borderColor;
        debugCtx.lineWidth = 1;
        debugCtx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        const textColor = (btn.type === 'perf' || btn.type === 'clear') ? EVIL_THEME.danger : (active ? EVIL_THEME.danger : EVIL_THEME.text);
        debugCtx.fillStyle = textColor;
        debugCtx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    });
    debugCtx.textAlign = 'left';
    debugCtx.textBaseline = 'alphabetic';

    // Draw resize handle
    resizeArea.x = termWidth - resizeArea.w;
    resizeArea.y = termHeight - resizeArea.h;
    debugCtx.fillStyle = EVIL_THEME.resizeHandle;
    debugCtx.fillRect(resizeArea.x, resizeArea.y, resizeArea.w, resizeArea.h);
    debugCtx.strokeStyle = EVIL_THEME.resizeBorder;
    debugCtx.lineWidth = 2;
    debugCtx.beginPath();
    debugCtx.moveTo(resizeArea.x + 2, resizeArea.y + resizeArea.h - 2);
    debugCtx.lineTo(resizeArea.x + resizeArea.w - 2, resizeArea.y + resizeArea.h - 2);
    debugCtx.moveTo(resizeArea.x + 2, resizeArea.y + resizeArea.h - 2);
    debugCtx.lineTo(resizeArea.x + 2, resizeArea.y + 2);
    debugCtx.stroke();

    // Draw blood red scanlines in log area
    debugCtx.fillStyle = 'rgba(255, 0, 0, 0.03)';
    for (let i = HEADER_HEIGHT; i < termHeight; i += 2) {
        debugCtx.fillRect(0, i, termWidth, 1);
    }

    const fontSize = 14 * SCALE_Y;
    debugCtx.font = `${fontSize}px Courier New`;
    const lineHeight = 18 * SCALE_Y;

    // Auto-scroll
    if (autoScroll) {
        const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
        virtualScrollY = maxScrollY;
    }

    const firstLine = Math.floor(virtualScrollY / lineHeight);
    const yOffset = virtualScrollY % lineHeight;
    const visibleLines = Math.min(filteredLogs.length - firstLine, Math.ceil(logAreaHeight / lineHeight) + 1);

    const charLimit = MAX_CHARS_PER_LINE;

    for (let i = 0; i < visibleLines; i++) {
        const log = filteredLogs[firstLine + i];
        if (!log) continue;

        // Blood red text colors for different log types
        debugCtx.fillStyle = {
            debug: '#8b0000',    // Dark blood red
            error: '#ff0000',    // Bright blood red
            warn: '#8b0000',     // Dark blood red
            info: '#8b0000',     // Dark blood red
            log: '#ff0000'       // Bright blood red
        }[log.type] || '#ff0000';

        let text = `[${log.timestamp}] ${log.type.toUpperCase()} (${log.source}): ${log.message}`;
        if (text.length > charLimit) text = text.slice(0, charLimit) + '…';

        debugCtx.fillText(
            text,
            10 * SCALE_X - scrollOffsetX,
            HEADER_HEIGHT + (i + 1) * lineHeight - yOffset
        );
    }

    // Draw scroll indicators in blood red
    const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
    if (maxScrollY > 0) {
        const scrollbarHeight = Math.max(20 * SCALE_Y, logAreaHeight * (logAreaHeight / (filteredLogs.length * lineHeight)));
        const scrollbarPosition = (virtualScrollY / maxScrollY) * (logAreaHeight - scrollbarHeight);

        debugCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        debugCtx.fillRect(termWidth - 8 * SCALE_X, HEADER_HEIGHT + scrollbarPosition, 6 * SCALE_X, scrollbarHeight);
    }

    if (scrollOffsetX > 0) {
        debugCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        debugCtx.fillRect(0, termHeight - 4 * SCALE_Y, termWidth, 2 * SCALE_Y);
        debugCtx.fillRect(termWidth * (scrollOffsetX / 1000), termHeight - 6 * SCALE_Y, 4 * SCALE_X, 6 * SCALE_Y);
    }
}

// --- Expose manual resize globally ---
window.resizeDebugCanvas = resizeDebugCanvas;

// --- Initialize ---
debugHandlerGodFunction();