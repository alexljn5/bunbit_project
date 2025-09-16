// --- Debug terminal with scaling + unlimited virtual scroll + manual resize + text limit ---
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
let buttonContainer = null;
let resizeHandle = null;

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

// --- Create resize handle ---
function createResizeHandle() {
    if (resizeHandle) resizeHandle.remove();

    resizeHandle = document.createElement('div');
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.width = '15px';
    resizeHandle.style.height = '15px';
    resizeHandle.style.backgroundColor = EVIL_THEME.resizeHandle;
    resizeHandle.style.cursor = 'nwse-resize';
    resizeHandle.style.zIndex = '202';
    resizeHandle.style.borderTop = `2px solid ${EVIL_THEME.resizeBorder}`;
    resizeHandle.style.borderLeft = `2px solid ${EVIL_THEME.resizeBorder}`;

    // Mouse events for resizing
    resizeHandle.addEventListener('mousedown', startResize);
    debugContainer.appendChild(resizeHandle);
}

function startResize(e) {
    e.preventDefault();
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = DEBUG_WIDTH;
    resizeStartHeight = DEBUG_HEIGHT;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
}

function handleResize(e) {
    if (!isResizing) return;

    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    DEBUG_WIDTH = Math.max(MIN_WIDTH, resizeStartWidth + dx);
    DEBUG_HEIGHT = Math.max(MIN_HEIGHT, resizeStartHeight + dy);

    resizeDebugCanvas(DEBUG_WIDTH, DEBUG_HEIGHT);
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

// --- Filter buttons ---
function createFilterButtons() {
    if (buttonContainer) buttonContainer.remove();

    buttonContainer = document.createElement('div');
    buttonContainer.id = 'debugFilterButtons';
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.top = '0';
    buttonContainer.style.left = '0';
    buttonContainer.style.width = '100%';
    buttonContainer.style.height = '30px';
    buttonContainer.style.backgroundColor = EVIL_THEME.headerBg;
    buttonContainer.style.borderBottom = `1px solid ${EVIL_THEME.border}`;
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '2px';
    buttonContainer.style.padding = '4px';
    buttonContainer.style.boxSizing = 'border-box';
    buttonContainer.style.zIndex = '201';
    debugContainer.appendChild(buttonContainer);

    // Add drag handle for moving the terminal - MOVE THIS TO THE MAIN CONTAINER
    const dragHandle = document.createElement('div');
    dragHandle.style.width = '100%';
    dragHandle.style.height = '100%';
    dragHandle.style.cursor = 'move';
    dragHandle.style.position = 'absolute';
    dragHandle.style.top = '0';
    dragHandle.style.left = '0';
    dragHandle.addEventListener('mousedown', startDrag);
    buttonContainer.appendChild(dragHandle);

    // Add performance monitor button
    const perfButton = document.createElement('button');
    perfButton.textContent = 'CREAM';
    perfButton.style.backgroundColor = EVIL_THEME.buttonBg;
    perfButton.style.color = EVIL_THEME.danger;
    perfButton.style.border = `1px solid ${EVIL_THEME.border}`;
    perfButton.style.padding = '2px 4px';
    perfButton.style.fontSize = '10px';
    perfButton.style.cursor = 'pointer';
    perfButton.style.flex = '0.5';
    perfButton.style.textAlign = 'center';
    perfButton.style.position = 'relative';
    perfButton.style.zIndex = '203';
    perfButton.addEventListener('click', () => {
        import('./memcpu.js').then(module => {
            module.togglePerfMonitor();
        });
    });
    perfButton.addEventListener('mouseover', () => {
        perfButton.style.backgroundColor = EVIL_THEME.buttonHover;
    });
    perfButton.addEventListener('mouseout', () => {
        perfButton.style.backgroundColor = EVIL_THEME.buttonBg;
    });
    buttonContainer.appendChild(perfButton);

    ['log', 'error', 'warn', 'info', 'debug'].forEach(type => {
        const button = document.createElement('button');
        button.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        const updateButtonStyle = () => {
            button.style.backgroundColor = logFilters[type] ? EVIL_THEME.buttonHover : EVIL_THEME.buttonBg;
            button.style.color = logFilters[type] ? EVIL_THEME.danger : EVIL_THEME.text;
            button.style.border = `1px solid ${logFilters[type] ? EVIL_THEME.danger : EVIL_THEME.border}`;
        };
        updateButtonStyle();
        button.style.padding = '2px 4px';
        button.style.fontSize = '10px';
        button.style.cursor = 'pointer';
        button.style.flex = '1';
        button.style.textAlign = 'center';
        button.style.position = 'relative';
        button.style.zIndex = '203';
        button.addEventListener('click', () => {
            logFilters[type] = !logFilters[type];
            updateFilteredLogs();

            const lineHeight = 18 * SCALE_Y;
            const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - debugCanvas.height);
            virtualScrollY = Math.min(virtualScrollY, maxScrollY);

            updateButtonStyle();
            drawDebugTerminal();
        });
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = EVIL_THEME.buttonHover;
        });
        button.addEventListener('mouseout', () => {
            updateButtonStyle();
        });
        buttonContainer.appendChild(button);
    });

    // Add clear button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'CLEAR';
    clearButton.style.backgroundColor = EVIL_THEME.buttonBg;
    clearButton.style.color = EVIL_THEME.danger;
    clearButton.style.border = `1px solid ${EVIL_THEME.border}`;
    clearButton.style.padding = '2px 4px';
    clearButton.style.fontSize = '10px';
    clearButton.style.cursor = 'pointer';
    clearButton.style.flex = '0.5';
    clearButton.style.textAlign = 'center';
    clearButton.style.position = 'relative';
    clearButton.style.zIndex = '203';
    clearButton.addEventListener('click', () => {
        logBuffer = [];
        updateFilteredLogs();
        scrollOffsetX = 0;
        virtualScrollY = 0;
        drawDebugTerminal();
    });
    clearButton.addEventListener('mouseover', () => {
        clearButton.style.backgroundColor = EVIL_THEME.buttonHover;
    });
    clearButton.addEventListener('mouseout', () => {
        clearButton.style.backgroundColor = EVIL_THEME.buttonBg;
    });
    buttonContainer.appendChild(clearButton);
}

// Drag functionality
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let containerStartX = 0;
let containerStartY = 0;

function startDrag(e) {
    if (e.target.tagName === 'BUTTON') return; // Don't drag if clicking buttons

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = debugContainer.getBoundingClientRect();
    containerStartX = rect.left;
    containerStartY = rect.top;

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    debugContainer.style.cursor = 'grabbing';
}

function handleDrag(e) {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    debugContainer.style.left = `${containerStartX + dx}px`;
    debugContainer.style.top = `${containerStartY + dy}px`;
    debugContainer.style.right = 'auto';
    debugContainer.style.bottom = 'auto';
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    debugContainer.style.cursor = '';
}

// --- Manual resize helper ---
function resizeDebugCanvas(width, height) {
    DEBUG_WIDTH = width;
    DEBUG_HEIGHT = height;

    if (!debugCanvas || !debugContainer) return;

    debugCanvas.width = DEBUG_WIDTH;
    debugCanvas.height = DEBUG_HEIGHT;

    // Update container size to match canvas
    debugContainer.style.width = `${DEBUG_WIDTH}px`;
    debugContainer.style.height = `${DEBUG_HEIGHT + 30}px`; // +30 for button bar

    // Also update the resize handle position
    if (resizeHandle) {
        resizeHandle.style.right = '0';
        resizeHandle.style.bottom = '0';
    }

    drawDebugTerminal();
}

// --- Main debug setup ---
export function debugHandlerGodFunction() {
    if (!ENABLE_DEBUG_TERMINAL) return console.log('Debug terminal disabled *chao chao*');

    overrideConsole();

    if (!document.body) return console.warn('document.body not ready, deferring debug canvas creation *pouts*');

    debugContainer = document.createElement('div');
    debugContainer.id = 'debugTerminalContainer';
    debugContainer.style.position = 'absolute';
    debugContainer.style.left = '0';
    debugContainer.style.bottom = '0';
    debugContainer.style.zIndex = '200';
    debugContainer.style.backgroundColor = EVIL_THEME.background;
    debugContainer.style.border = `2px solid ${EVIL_THEME.border}`;
    debugContainer.style.boxSizing = 'border-box';
    debugContainer.style.overflow = 'hidden';
    debugContainer.style.resize = 'none';
    document.body.appendChild(debugContainer);

    // ADD DRAG HANDLE TO THE ENTIRE CONTAINER, NOT JUST BUTTON AREA
    debugContainer.style.cursor = 'move';
    debugContainer.addEventListener('mousedown', function (e) {
        // Only start drag if not clicking on buttons or resize handle
        if (!e.target.closest('button') && !e.target.closest('[style*="cursor: nwse-resize"]')) {
            startDrag(e);
        }
    });

    createFilterButtons();
    createResizeHandle();
    debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugTerminal';
    debugCanvas.style.display = 'block';
    debugContainer.appendChild(debugCanvas);

    debugCtx = debugCanvas.getContext('2d');
    debugCtx.imageSmoothingEnabled = false;

    isDebugVisible = true;

    // Initialize size
    resizeDebugCanvas(DEBUG_WIDTH, DEBUG_HEIGHT);

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
            autoScroll = virtualScrollY >= Math.max(0, filteredLogs.length * lineHeight - debugCanvas.height);
        }

        drawDebugTerminal();
    });

    // Keyboard navigation
    debugCanvas.tabIndex = 0;
    debugCanvas.addEventListener('keydown', (e) => {
        const lineHeight = 18 * SCALE_Y;
        const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - debugCanvas.height);

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
                virtualScrollY = Math.max(0, virtualScrollY - debugCanvas.height);
                e.preventDefault();
                break;
            case 'PageDown':
                virtualScrollY = Math.min(maxScrollY, virtualScrollY + debugCanvas.height);
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

    debugCtx.clearRect(0, 0, termWidth, termHeight);
    debugCtx.fillStyle = EVIL_THEME.background;
    debugCtx.fillRect(0, 0, termWidth, termHeight);

    // Draw blood red scanlines
    debugCtx.fillStyle = 'rgba(255, 0, 0, 0.03)';
    for (let i = 0; i < termHeight; i += 2) {
        debugCtx.fillRect(0, i, termWidth, 1);
    }

    const fontSize = 14 * SCALE_Y;
    debugCtx.font = `${fontSize}px Courier New`;
    const lineHeight = 18 * SCALE_Y;

    // Auto-scroll
    if (autoScroll) {
        const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - termHeight);
        virtualScrollY = maxScrollY;
    }

    const firstLine = Math.floor(virtualScrollY / lineHeight);
    const yOffset = virtualScrollY % lineHeight;
    const visibleLines = Math.min(filteredLogs.length - firstLine, Math.ceil(termHeight / lineHeight) + 1);

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
            (i + 1) * lineHeight - yOffset
        );
    }

    // Draw scroll indicators in blood red
    if (filteredLogs.length * lineHeight > termHeight) {
        const scrollbarHeight = Math.max(20, termHeight * (termHeight / (filteredLogs.length * lineHeight)));
        const scrollbarPosition = (virtualScrollY / (filteredLogs.length * lineHeight)) * (termHeight - scrollbarHeight);

        debugCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        debugCtx.fillRect(termWidth - 8, scrollbarPosition, 6, scrollbarHeight);
    }

    if (scrollOffsetX > 0) {
        debugCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        debugCtx.fillRect(0, termHeight - 4, termWidth, 2);
        debugCtx.fillRect(termWidth * (scrollOffsetX / 1000), termHeight - 6, 4, 6);
    }
}

// --- Expose manual resize globally ---
window.resizeDebugCanvas = resizeDebugCanvas;

// --- Initialize ---
debugHandlerGodFunction();