// --- Debug terminal with scaling + scroll ---
const consoleOriginal = {
    debug: console.debug,
    error: console.error,
    warn: console.warn,
    info: console.info
};

let logBuffer = [];
const MAX_LOGS = 100;
let isDebugVisible = false;
let debugCanvas = null;
let debugCtx = null;
let debugContainer = null;
let debugWrapper = null;

// Scroll state
let scrollOffsetY = 0;
let scrollOffsetX = 0;

// Internal variable to control debug terminal (disable for production builds)
const ENABLE_DEBUG_TERMINAL = (() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const debugTerminalParam = urlParams ? urlParams.get('debugTerminal') : null;
    if (debugTerminalParam === 'false') return false;
    return !(window.debugAPI && window.debugAPI.isProduction && window.debugAPI.isProduction());
})();

function overrideConsole() {
    function logHelper(type, args) {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : arg
        ).join(' ');

        // Capture stack trace, skip to the caller of the console method
        const error = new Error();
        const stackLines = error.stack ? error.stack.split('\n') : [];
        // Skip Error, logHelper, and console override (usually 3rd or 4th line)
        const callerLine = stackLines[3] || stackLines[2] || '';
        let sourceInfo = { file: 'unknown', line: '0', column: '0' };

        // Try parsing stack trace for file:line:column
        const stackMatch = callerLine.match(/at\s+.*\s+\((.*):(\d+):(\d+)\)/) ||
            callerLine.match(/at\s+(.*):(\d+):(\d+)/);
        if (stackMatch) {
            let file = stackMatch[1];
            // Simplify file path to just the file name for readability
            file = file.split('/').pop().split('?')[0];
            sourceInfo = { file, line: stackMatch[2], column: stackMatch[3] };
        } else {
            consoleOriginal.warn('Failed to parse stack trace for log:', message, callerLine);
        }

        const log = {
            type,
            message,
            timestamp: new Date().toLocaleTimeString(),
            source: `${sourceInfo.file}:${sourceInfo.line}`
        };

        logBuffer.push(log);
        if (logBuffer.length > MAX_LOGS) logBuffer.shift();
        if (window.debugAPI && window.debugAPI.sendLog) {
            window.debugAPI.sendLog(log);
        }
        consoleOriginal[type](...args);
    }

    console.debug = (...args) => logHelper("debug", args);
    console.error = (...args) => logHelper("error", args);
    console.warn = (...args) => logHelper("warn", args);
    console.info = (...args) => logHelper("info", args);
}

export function debugHandlerGodFunction() {
    if (!ENABLE_DEBUG_TERMINAL) {
        console.log('Debug terminal disabled *chao chao*');
        return;
    }

    overrideConsole();

    if (!document.body) {
        console.warn('document.body not ready, deferring debug canvas creation *pouts*');
        return;
    }

    // Create outer container
    debugContainer = document.createElement('div');
    debugContainer.id = 'debugTerminalContainer';
    debugContainer.style.position = 'absolute';
    debugContainer.style.left = '0';
    debugContainer.style.bottom = '0';
    debugContainer.style.zIndex = '200';
    debugContainer.style.border = '2px solid white';
    debugContainer.style.backgroundColor = 'rgba(0,0,0,0.6)';
    debugContainer.style.boxSizing = 'border-box'; // Ensure border is included in size
    debugContainer.style.overflow = 'hidden'; // Wrapper handles scroll
    document.body.appendChild(debugContainer);

    // Log container styles for debugging
    console.log('Debug container styles:', getComputedStyle(debugContainer));

    // Create scrollable wrapper
    debugWrapper = document.createElement('div');
    debugWrapper.style.overflow = 'auto';
    debugWrapper.style.width = '100%';
    debugWrapper.style.height = '100%';
    debugWrapper.style.boxSizing = 'border-box';
    debugContainer.appendChild(debugWrapper);

    // Create canvas
    debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugTerminal';
    debugWrapper.appendChild(debugCanvas);

    function resizeCanvas() {
        const baseWidth = 400;
        const scaledWidth = baseWidth * SCALE_X;
        const scaledHeight = (window.innerHeight / 1.3) * SCALE_Y;

        debugCanvas.width = scaledWidth;
        debugCanvas.height = scaledHeight;

        // Ensure container includes border width
        debugContainer.style.width = `${scaledWidth + 4}px`; // +4 for 2px border on each side
        debugContainer.style.height = `${scaledHeight + 4}px`;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    debugCtx = debugCanvas.getContext('2d');
    if (!debugCtx) {
        console.error('Failed to get 2D context for debug canvas');
        return;
    }
    debugCtx.imageSmoothingEnabled = false;

    isDebugVisible = ENABLE_DEBUG_TERMINAL;
    debugContainer.style.display = isDebugVisible ? 'block' : 'none';

    // Mouse wheel scroll
    debugWrapper.addEventListener("wheel", (e) => {
        if (e.shiftKey) {
            scrollOffsetX += e.deltaY; // shift+wheel scrolls sideways
        } else {
            scrollOffsetY += e.deltaY;
        }
        drawDebugTerminal();
    });

    if (window.debugAPI && window.debugAPI.requestLogs) {
        window.debugAPI.requestLogs((log) => {
            if (Array.isArray(log)) {
                logBuffer = log;
            } else {
                logBuffer.push(log);
                if (logBuffer.length > MAX_LOGS) logBuffer.shift();
            }
            if (isDebugVisible) drawDebugTerminal();
        });
    }
}

export function drawDebugTerminal() {
    if (!isDebugVisible || !debugCtx || !debugCanvas) return;

    const termWidth = debugCanvas.width;
    const termHeight = debugCanvas.height;

    debugCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    debugCtx.fillRect(0, 0, termWidth, termHeight);

    debugCtx.font = `${14 * SCALE_Y}px Courier New`;
    const lineHeight = 18 * SCALE_Y;

    const totalLines = logBuffer.length;
    const maxLines = Math.floor(termHeight / lineHeight);

    // Vertical scroll clamp
    const maxScrollY = Math.max(0, totalLines * lineHeight - termHeight);
    if (scrollOffsetY < 0) scrollOffsetY = 0;
    if (scrollOffsetY > maxScrollY) scrollOffsetY = maxScrollY;

    // Horizontal scroll clamp based on longest line
    let maxLineWidth = 0;
    for (const log of logBuffer) {
        const fullText = `[${log.timestamp}] ${log.type.toUpperCase()} (${log.source}): ${log.message}`;
        const width = debugCtx.measureText(fullText).width;
        if (width > maxLineWidth) maxLineWidth = width;
    }
    const maxScrollX = Math.max(0, maxLineWidth + 20 - termWidth); // +20 padding
    if (scrollOffsetX < 0) scrollOffsetX = 0;
    if (scrollOffsetX > maxScrollX) scrollOffsetX = maxScrollX;

    const firstVisibleLine = Math.floor(scrollOffsetY / lineHeight);
    const yOffsetWithinLine = scrollOffsetY % lineHeight;
    const endLine = Math.min(totalLines, firstVisibleLine + maxLines + 1);

    for (let i = firstVisibleLine; i < endLine; i++) {
        const log = logBuffer[i];
        debugCtx.fillStyle = {
            debug: '#a0aec0',
            error: '#f56565',
            warn: '#ecc94b',
            info: '#48bb78'
        }[log.type];

        const fullText = `[${log.timestamp}] ${log.type.toUpperCase()} (${log.source}): ${log.message}`;
        debugCtx.fillText(
            fullText,
            (10 * SCALE_X) - scrollOffsetX,
            ((i - firstVisibleLine + 1) * lineHeight) - yOffsetWithinLine
        );
    }
}

// --- Game globals + scaling ---
const gameInfo = {
    name: "Bunbit",
    version: "0.0.5"
};

const isRenderer = typeof window !== "undefined" && typeof document !== "undefined";

// Only do DOM + window stuff in the renderer
export const gameName = gameInfo.name;
export const gameVersionNumber = gameInfo.version;

export const domElements = {
    mainGameRender: typeof document !== 'undefined' ? document.getElementById("mainGameRender") : null,
    _2DMainGameRender: typeof document !== 'undefined' ? document.getElementById("_2DMainGameRender") : null,
};

export let HIGH_RES_ENABLED = true;
export let CANVAS_WIDTH;
export let CANVAS_HEIGHT;
export let SCALE_X;
export let SCALE_Y;

export const REF_CANVAS_WIDTH = 800;
export const REF_CANVAS_HEIGHT = 800;

// Debug toggle via URL param (?debug=true for high-res)
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        HIGH_RES_ENABLED = true;
        console.log("Debug mode: High-res enabled! *chao chao*");
    }
}

export function updateCanvasResolution(highResEnabled) {
    HIGH_RES_ENABLED = highResEnabled;
    const renderResolution = highResEnabled ? 800 : 400;

    if (domElements.mainGameRender) {
        domElements.mainGameRender.width = renderResolution;
        domElements.mainGameRender.height = renderResolution;
        const scale = highResEnabled ? 1 : 2;
        domElements.mainGameRender.style.transform = `scale(${scale})`;
        domElements.mainGameRender.style.transformOrigin = 'center';
    }

    CANVAS_WIDTH = renderResolution;
    CANVAS_HEIGHT = renderResolution;
    SCALE_X = renderResolution / REF_CANVAS_WIDTH;
    SCALE_Y = renderResolution / REF_CANVAS_HEIGHT;
}

if (domElements.mainGameRender) {
    updateCanvasResolution(HIGH_RES_ENABLED);
} else {
    CANVAS_WIDTH = 400;
    CANVAS_HEIGHT = 400;
    SCALE_X = 400 / REF_CANVAS_WIDTH;
    SCALE_Y = 400 / REF_CANVAS_HEIGHT;
}