// File: src/debug/debughandler.js

import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from '../globals.js';
import { evilGlitchSystem, EvilUIState } from '../themes/eviltheme.js';
import { themeManager } from '../themes/thememanager.js';
import { initBunbitDebug } from './panels/bunbitdebug.js';
import { memCpuGodFunction, togglePerfMonitor } from './panels/memcpu.js';

const consoleOriginal = {
    debug: console.debug,
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log
};

// --- CONFIG ---
export let MAX_LOGS = 50000;
export let DEBUG_WIDTH = CANVAS_WIDTH * 0.75;
export let DEBUG_HEIGHT = CANVAS_HEIGHT * 0.5;
export const MIN_WIDTH = 300;
export const MIN_HEIGHT = 200;
export let MAX_CHARS_PER_LINE = 120;

export let logBuffer = [];
export let isDebugVisible = false;
export let debugCanvas = null;
export let debugCtx = null;
export let debugContainer = null;

export let scrollOffsetX = 0;
export let virtualScrollY = 0;
export let autoScroll = true;

export let logFilters = { log: true, error: true, warn: true, info: true, debug: true };
export let filteredLogs = [];

// Buttons
export let buttons = [];
export let resizeArea = { x: 0, y: 0, w: 15 * SCALE_X, h: 15 * SCALE_Y, hovered: false };
let buttonsCanvas = null; // Offscreen cache

let glitchInterval = null;
let lastDrawTime = 0;
let rafId = null;
let needsRedraw = true; // Dirty flag

export const ENABLE_DEBUG_TERMINAL = (() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const debugTerminalParam = urlParams ? urlParams.get('debugTerminal') : null;
    if (debugTerminalParam === 'false') return false;
    return !(window.debugAPI && window.debugAPI.isProduction && window.debugAPI.isProduction());
})();

export const HEADER_HEIGHT = 30 * SCALE_Y;

// God Function
export function debugHandlerGodFunction() {
    try {
        if (!window || !window.defaultDebugVisible) return;
    } catch { return; }

    debugHandlerMainFunction();
    memCpuGodFunction();
}

// Exported helper
export function startDebugFeatures() {
    try {
        debugHandlerMainFunction();
        memCpuGodFunction();
    } catch (err) {
        console.error('Failed to start debug features:', err);
    }
}

// --- Update filtered logs ---
export function updateFilteredLogs() {
    filteredLogs = logBuffer.filter(log => logFilters[log.type]);
    needsRedraw = true;
}

// --- Glitch effects ---
export function updateGlitchEffects() {
    const logActivity = Math.min(1, (logBuffer.length / 1000) * 0.5 + (filteredLogs.length > 0 ? 0.2 : 0));
    evilGlitchSystem.updateGlitchEffects(logActivity);
    needsRedraw = true;
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

        if (logBuffer.length >= MAX_LOGS) logBuffer.shift();
        logBuffer.push(log);

        if (window.debugAPI && window.debugAPI.sendLog) window.debugAPI.sendLog(log);
        consoleOriginal[type](...args);

        updateFilteredLogs();
        if (isDebugVisible) {
            if (Math.random() < 0.15) {
                evilGlitchSystem.shakeIntensity = 5 + Math.random() * 5;
                setTimeout(() => { evilGlitchSystem.shakeIntensity = 0; }, 400);
            }
            needsRedraw = true;
        }
    }

    ['debug', 'error', 'warn', 'info', 'log'].forEach(type => {
        console[type] = (...args) => logHelper(type, args);
    });
    console.verbose = console.verbose || ((...args) => logHelper('debug', args));
}

// --- Update buttons ---
function updateButtonPositions() {
    buttons = [];
    const paddingX = 4 * SCALE_X;
    const paddingY = 4 * SCALE_Y;
    const gap = 2 * SCALE_X;
    const buttonH = HEADER_HEIGHT - 2 * paddingY;
    const types = ['perf', 'log', 'error', 'warn', 'info', 'debug', 'clear', 'theme'];
    const flexes = { perf: 0.5, clear: 0.5, theme: 0.5, default: 1 };
    const totalFlex = types.reduce((sum, t) => sum + (flexes[t] || flexes.default), 0);
    const availableWidth = DEBUG_WIDTH - 2 * paddingX - (types.length - 1) * gap;
    const unit = availableWidth / totalFlex;

    let x = paddingX;
    types.forEach(type => {
        const flex = flexes[type] || flexes.default;
        const w = unit * flex;
        const text = type === 'perf' ? 'CREAM' : type === 'clear' ? 'CLEAR' : type === 'theme' ? 'THEME' : type.charAt(0).toUpperCase() + type.slice(1);
        buttons.push({ x, y: paddingY, w, h: buttonH, text, type, hovered: false });
        x += w + gap;
    });

    // Always resize the offscreen canvas to match current DEBUG_WIDTH
    if (!buttonsCanvas) buttonsCanvas = document.createElement('canvas');
    buttonsCanvas.width = DEBUG_WIDTH;
    buttonsCanvas.height = HEADER_HEIGHT;

    const btnCtx = buttonsCanvas.getContext('2d');
    drawButtonsToCanvas(btnCtx);
}


// --- Draw buttons to offscreen canvas ---
function drawButtonsToCanvas(ctx) {
    ctx.clearRect(0, 0, DEBUG_WIDTH, HEADER_HEIGHT);
    const buttonFontSize = 10 * SCALE_Y;
    ctx.font = `${buttonFontSize}px Courier New`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    buttons.forEach(btn => {
        const isFilter = btn.type !== 'perf' && btn.type !== 'clear' && btn.type !== 'theme';
        const active = isFilter ? logFilters[btn.type] : false;
        const bg = btn.hovered ? themeManager.getCurrentTheme().buttonHover : (active ? themeManager.getCurrentTheme().buttonHover : themeManager.getCurrentTheme().buttonBg);
        ctx.fillStyle = bg;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = active ? themeManager.getCurrentTheme().danger : themeManager.getCurrentTheme().border;
        ctx.lineWidth = 1;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        const textColor = (btn.type === 'perf' || btn.type === 'clear' || btn.type === 'theme') ? themeManager.getCurrentTheme().danger : (active ? themeManager.getCurrentTheme().danger : themeManager.getCurrentTheme().text);
        ctx.fillStyle = textColor;
        ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    });
}

// --- Resize ---
export function resizeDebugCanvas(width, height) {
    DEBUG_WIDTH = width;
    DEBUG_HEIGHT = height;
    if (!debugCanvas || !debugContainer) return;

    const totalHeight = DEBUG_HEIGHT + HEADER_HEIGHT;
    debugCanvas.width = DEBUG_WIDTH;
    debugCanvas.height = totalHeight;
    debugContainer.style.width = `${DEBUG_WIDTH}px`;
    debugContainer.style.height = `${totalHeight}px`;

    updateButtonPositions();
    needsRedraw = true;
}

// --- Main setup ---
function debugHandlerMainFunction() {
    if (!ENABLE_DEBUG_TERMINAL) return console.log('Debug terminal disabled *chao chao*');

    overrideConsole();

    if (!document.body) return console.warn('document.body not ready *pouts*');

    const existingContainer = document.getElementById('debugTerminalContainer');
    if (existingContainer) existingContainer.remove();

    debugContainer = document.createElement('div');
    debugContainer.id = 'debugTerminalContainer';
    debugContainer.style.position = 'absolute';
    debugContainer.style.left = '0';
    debugContainer.style.bottom = '0';
    debugContainer.style.zIndex = '2147483649';
    debugContainer.style.backgroundColor = 'transparent';
    debugContainer.style.boxSizing = 'border-box';
    debugContainer.style.overflow = 'hidden';
    debugContainer.style.resize = 'both'; // allow manual resizing
    debugContainer.style.overflow = 'auto'; // needed for 'both'

    debugContainer.style.boxShadow = themeManager.getCurrentThemeName?.() === 'evil' ? `0 0 15px ${themeManager.getCurrentTheme().border}` : 'none';
    document.body.appendChild(debugContainer);

    debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugTerminal';
    debugCanvas.style.display = 'block';
    debugContainer.appendChild(debugCanvas);
    // --- Drag + Resize Handle ---
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialX = 0;
    let initialY = 0;

    let isResizing = false;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let initialWidth = 0;
    let initialHeight = 0;

    // Resize handle area
    const resizeHandleSize = 16 * SCALE_X;

    // Mouse down
    debugContainer.addEventListener('mousedown', e => {
        const rect = debugContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        if (offsetX >= rect.width - resizeHandleSize && offsetY >= rect.height - resizeHandleSize) {
            // Start resizing
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            initialWidth = rect.width;
            initialHeight = rect.height;
            e.preventDefault();
        } else {
            // Start dragging
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialX = rect.left;
            initialY = rect.top;
            e.preventDefault();
        }
    });

    // Mouse move
    window.addEventListener('mousemove', e => {
        if (isDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            debugContainer.style.left = `${initialX + dx}px`;
            debugContainer.style.bottom = 'auto';
            debugContainer.style.top = `${initialY + dy}px`;
            e.preventDefault();
        }
        if (isResizing) {
            const dw = e.clientX - resizeStartX;
            const dh = e.clientY - resizeStartY;
            const newWidth = Math.max(MIN_WIDTH, initialWidth + dw);
            const newHeight = Math.max(MIN_HEIGHT, initialHeight + dh);
            resizeDebugCanvas(newWidth, newHeight - HEADER_HEIGHT); // header is separate
            e.preventDefault();
        }
    });

    // Mouse up
    window.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
    });

    // Optional: Show cursor for resize handle
    debugContainer.addEventListener('mousemove', e => {
        const rect = debugContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        if (offsetX >= rect.width - resizeHandleSize && offsetY >= rect.height - resizeHandleSize) {
            debugContainer.style.cursor = 'nwse-resize';
        } else {
            debugContainer.style.cursor = 'grab';
        }
    });


    debugCtx = debugCanvas.getContext('2d');
    debugCtx.imageSmoothingEnabled = false;

    isDebugVisible = true;

    resizeDebugCanvas(DEBUG_WIDTH, DEBUG_HEIGHT);

    import('./eventhandlers.js').then(module => {
        debugCanvas.addEventListener('mousedown', module.handleMouseDown);
        debugCanvas.addEventListener('mousemove', module.handleMouseMove);
        debugCanvas.addEventListener('mouseleave', module.handleMouseLeave);

        debugCanvas.addEventListener('wheel', e => {
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
            needsRedraw = true;
        });

        debugCanvas.tabIndex = 0;
        debugCanvas.addEventListener('keydown', e => {
            const lineHeight = 18 * SCALE_Y;
            const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
            const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
            switch (e.key) {
                case 'ArrowUp': virtualScrollY = Math.max(0, virtualScrollY - lineHeight); e.preventDefault(); break;
                case 'ArrowDown': virtualScrollY = Math.min(maxScrollY, virtualScrollY + lineHeight); e.preventDefault(); break;
                case 'PageUp': virtualScrollY = Math.max(0, virtualScrollY - logAreaHeight); e.preventDefault(); break;
                case 'PageDown': virtualScrollY = Math.min(maxScrollY, virtualScrollY + logAreaHeight); e.preventDefault(); break;
                case 'Home': virtualScrollY = 0; e.preventDefault(); break;
                case 'End': virtualScrollY = maxScrollY; e.preventDefault(); break;
            }
            autoScroll = virtualScrollY >= maxScrollY;
            needsRedraw = true;
        });
    }).catch(err => console.error('Failed to load eventhandlers.js:', err));

    window.addEventListener('themeChanged', () => { needsRedraw = true; });

    if (window.debugAPI?.requestLogs) {
        window.debugAPI.requestLogs(log => {
            if (Array.isArray(log)) logBuffer = log.slice(-MAX_LOGS);
            else logBuffer.push(log);
            updateFilteredLogs();
        });
    }

    glitchInterval = setInterval(updateGlitchEffects, 600);
    lastDrawTime = performance.now();

    updateFilteredLogs();
    needsRedraw = true;
    drawDebugTerminal();
    // Initial log so terminal isn’t empty
    console.log('Bunbit Debug Terminal initialized! *chao chao*');



    try { togglePerfMonitor(); } catch (err) { console.error(err); }
}

// --- Draw debug terminal ---
export function drawDebugTerminal() {
    if (!isDebugVisible || !debugCtx || !debugCanvas) return;

    if (!needsRedraw) {
        rafId = requestAnimationFrame(drawDebugTerminal);
        return;
    }
    needsRedraw = false;

    const termWidth = debugCanvas.width;
    const termHeight = debugCanvas.height;
    const logAreaHeight = termHeight - HEADER_HEIGHT;
    const now = performance.now();
    const deltaTime = Math.min(100, now - lastDrawTime) / 1000;
    lastDrawTime = now;

    debugCtx.clearRect(0, 0, termWidth, termHeight);
    debugCtx.globalAlpha = evilGlitchSystem.flicker;

    // Shake
    const shakeX = evilGlitchSystem.shakeIntensity ? (Math.random() - 0.5) * evilGlitchSystem.shakeIntensity : 0;
    const shakeY = evilGlitchSystem.shakeIntensity ? (Math.random() - 0.5) * evilGlitchSystem.shakeIntensity : 0;

    debugCtx.save();
    debugCtx.translate(evilGlitchSystem.horizontalShift + shakeX, evilGlitchSystem.verticalShift + shakeY);

    // Background
    debugCtx.fillStyle = themeManager.getCurrentTheme().background;
    debugCtx.fillRect(0, 0, termWidth, termHeight);

    // Buttons (cached)
    if (buttonsCanvas) debugCtx.drawImage(buttonsCanvas, 0, 0);

    // Logs
    const fontSize = 14 * SCALE_Y;
    debugCtx.font = `${fontSize}px Courier New`;
    const lineHeight = 18 * SCALE_Y;
    if (autoScroll) virtualScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);

    const firstLine = Math.floor(virtualScrollY / lineHeight);
    const yOffset = virtualScrollY % lineHeight;
    const visibleLines = Math.min(filteredLogs.length - firstLine, Math.ceil(logAreaHeight / lineHeight) + 1);

    const charLimit = MAX_CHARS_PER_LINE;
    for (let i = 0; i < visibleLines; i++) {
        const log = filteredLogs[firstLine + i];
        if (!log) continue;

        debugCtx.fillStyle = themeManager.getLogColor(log.type);
        let text = `[${log.timestamp}] ${log.type.toUpperCase()} (${log.source}): ${log.message}`;
        if (text.length > charLimit) text = text.slice(0, charLimit) + '…';

        if (evilGlitchSystem.textGlitch) {
            if (!log.glitchedText || log.timestamp !== log.glitchTimestamp) {
                log.glitchedText = evilGlitchSystem.applyTextGlitch(text);
                log.glitchTimestamp = log.timestamp;
            }
            text = log.glitchedText;
        }

        debugCtx.fillText(text, 10 * SCALE_X - scrollOffsetX, HEADER_HEIGHT + buttons[0].h + 4 * SCALE_Y + (i + 1) * lineHeight - yOffset);
    }

    debugCtx.restore();
    debugCtx.globalAlpha = 1;

    rafId = requestAnimationFrame(drawDebugTerminal);
}

// --- Expose resize ---
window.resizeDebugCanvas = resizeDebugCanvas;

// --- Cleanup ---
export function stopDebugTerminal() {
    isDebugVisible = false;
    if (glitchInterval) { clearInterval(glitchInterval); glitchInterval = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (debugContainer) { debugContainer.remove(); debugContainer = null; }
    debugCanvas = null;
    debugCtx = null;
    buttonsCanvas = null;

    evilGlitchSystem.reset();
    EvilUIState.reset();
}
