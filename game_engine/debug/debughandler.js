// File: game_engine/debug/debughandler.js

import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from '../globals.js';
import { EVIL_THEME, evilGlitchSystem, getLogColor, EvilUIState } from '../themes/eviltheme.js';
import { togglePerfMonitor, memCpuGodFunction } from './memcpu.js';

const consoleOriginal = {
    debug: console.debug,
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log
};

// --- CONFIG ---
// Maximum logs to keep in buffer
export let MAX_LOGS = 50000;

// Default canvas size (relative to main game canvas)
export let DEBUG_WIDTH = CANVAS_WIDTH * 0.75;   // 75% of game width
export let DEBUG_HEIGHT = CANVAS_HEIGHT * 0.5;  // 50% of game height

// Minimum size limits
export const MIN_WIDTH = 300;
export const MIN_HEIGHT = 200;

// Maximum characters per line (horizontal clipping)
export let MAX_CHARS_PER_LINE = 120; // tweak this

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

// Button definitions
export let buttons = [];
export let resizeArea = { x: 0, y: 0, w: 15 * SCALE_X, h: 15 * SCALE_Y, hovered: false };

let glitchInterval = null;
let lastDrawTime = 0;
let rafId = null;  // For throttling RAF

export const ENABLE_DEBUG_TERMINAL = (() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const debugTerminalParam = urlParams ? urlParams.get('debugTerminal') : null;
    if (debugTerminalParam === 'false') return false;
    return !(window.debugAPI && window.debugAPI.isProduction && window.debugAPI.isProduction());
})();

export const HEADER_HEIGHT = 30 * SCALE_Y;

// --- Update filtered logs ---
export function updateFilteredLogs() {
    filteredLogs = logBuffer.filter(log => logFilters[log.type]);
}

// --- Enhanced Glitch effects (using shared system) ---
export function updateGlitchEffects() {
    // Calculate intensity based on log activity (more logs = more intense glitches)
    const logActivity = Math.min(1, (logBuffer.length / 1000) * 0.5 +
        (filteredLogs.length > 0 ? 0.2 : 0));

    evilGlitchSystem.updateGlitchEffects(logActivity);
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
            // Trigger more intense glitches when new logs arrive (reduced chance)
            if (Math.random() < 0.15) {
                evilGlitchSystem.shakeIntensity = 5 + Math.random() * 5;
                setTimeout(() => { evilGlitchSystem.shakeIntensity = 0; }, 400);
            }
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

// --- Manual resize helper ---
export function resizeDebugCanvas(width, height) {
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
    debugContainer.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.5)';
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

    // Import and attach event handlers from eventhandlers.js
    import('./eventhandlers.js').then(module => {
        debugCanvas.addEventListener('mousedown', module.handleMouseDown);
        debugCanvas.addEventListener('mousemove', module.handleMouseMove);
        debugCanvas.addEventListener('mouseleave', module.handleMouseLeave);

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

    // Start glitch effects (slower interval)
    glitchInterval = setInterval(updateGlitchEffects, 600);
    lastDrawTime = performance.now();

    updateFilteredLogs();
    drawDebugTerminal();
    togglePerfMonitor();  // Auto-toggle perf on start
    memCpuGodFunction();
}

// --- Draw debug logs with enhanced effects (using shared system) ---
export function drawDebugTerminal() {
    if (!isDebugVisible || !debugCtx || !debugCanvas) return;

    const termWidth = debugCanvas.width;
    const termHeight = debugCanvas.height;
    const logAreaHeight = termHeight - HEADER_HEIGHT;
    const now = performance.now();
    const deltaTime = Math.min(100, now - lastDrawTime) / 1000;
    lastDrawTime = now;

    // Throttle to ~60fps: skip if delta <16ms
    if (deltaTime < 0.016) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(drawDebugTerminal);
        return;
    }

    // Apply flicker effect
    debugCtx.globalAlpha = evilGlitchSystem.flicker;

    // Apply shake effect
    const shakeX = evilGlitchSystem.shakeIntensity > 0 ?
        (Math.random() - 0.5) * evilGlitchSystem.shakeIntensity : 0;
    const shakeY = evilGlitchSystem.shakeIntensity > 0 ?
        (Math.random() - 0.5) * evilGlitchSystem.shakeIntensity : 0;

    debugCtx.clearRect(0, 0, termWidth, termHeight);

    // Draw smear trails if effect is active (conditional)
    if (evilGlitchSystem.smearEffect > 0.5 && evilGlitchSystem.lastFrame) {
        debugCtx.globalAlpha = 0.1 * evilGlitchSystem.smearEffect;
        debugCtx.drawImage(evilGlitchSystem.lastFrame,
            shakeX, shakeY,
            termWidth, termHeight);
        debugCtx.globalAlpha = evilGlitchSystem.flicker;
    }

    // Store current frame for smear effect
    if (evilGlitchSystem.smearEffect > 0.5) {
        if (!evilGlitchSystem.lastFrame) {
            evilGlitchSystem.lastFrame = document.createElement('canvas');
            evilGlitchSystem.lastFrame.width = termWidth;
            evilGlitchSystem.lastFrame.height = termHeight;
        }
        const tempCtx = evilGlitchSystem.lastFrame.getContext('2d');
        tempCtx.clearRect(0, 0, termWidth, termHeight);
        tempCtx.drawImage(debugCanvas, 0, 0);
    }

    // Draw background with shake offset
    debugCtx.fillStyle = EVIL_THEME.background;
    debugCtx.fillRect(shakeX, shakeY, termWidth, termHeight);

    // Draw corruption effect (optimized)
    if (evilGlitchSystem.corruption > 0) {
        debugCtx.fillStyle = EVIL_THEME.corruption;
        for (let i = 0; i < termWidth; i += 8) {
            if (Math.random() < evilGlitchSystem.corruption) {
                const h = Math.random() * termHeight;
                debugCtx.fillRect(i + shakeX, shakeY, 3, h);
            }
        }
    }

    // Draw outer border with glow and shake
    debugCtx.strokeStyle = EVIL_THEME.border;
    debugCtx.lineWidth = 2;
    debugCtx.strokeRect(shakeX, shakeY, termWidth, termHeight);
    debugCtx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    debugCtx.strokeRect(1 + shakeX, 1 + shakeY, termWidth - 2, termHeight - 2);

    // Draw header with shake
    debugCtx.fillStyle = EVIL_THEME.headerBg;
    debugCtx.fillRect(shakeX, shakeY, termWidth, HEADER_HEIGHT);
    debugCtx.strokeStyle = EVIL_THEME.border;
    debugCtx.lineWidth = 1;
    debugCtx.beginPath();
    debugCtx.moveTo(shakeX, HEADER_HEIGHT - 0.5 + shakeY);
    debugCtx.lineTo(termWidth + shakeX, HEADER_HEIGHT - 0.5 + shakeY);
    debugCtx.stroke();

    // Draw buttons with shake
    const buttonFontSize = 10 * SCALE_Y;
    debugCtx.font = `${buttonFontSize}px Courier New`;
    debugCtx.textAlign = 'center';
    debugCtx.textBaseline = 'middle';
    buttons.forEach(btn => {
        const isFilter = btn.type !== 'perf' && btn.type !== 'clear';
        const active = isFilter ? logFilters[btn.type] : false;
        const bg = btn.hovered ? EVIL_THEME.buttonHover : (active ? EVIL_THEME.buttonHover : EVIL_THEME.buttonBg);
        debugCtx.fillStyle = bg;
        debugCtx.fillRect(btn.x + shakeX, btn.y + shakeY, btn.w, btn.h);

        const borderColor = active ? EVIL_THEME.danger : EVIL_THEME.border;
        debugCtx.strokeStyle = borderColor;
        debugCtx.lineWidth = 1;
        debugCtx.strokeRect(btn.x + shakeX, btn.y + shakeY, btn.w, btn.h);

        const textColor = (btn.type === 'perf' || btn.type === 'clear') ? EVIL_THEME.danger : (active ? EVIL_THEME.danger : EVIL_THEME.text);
        debugCtx.fillStyle = textColor;
        debugCtx.fillText(btn.text, btn.x + btn.w / 2 + shakeX, btn.y + btn.h / 2 + shakeY);
    });
    debugCtx.textAlign = 'left';
    debugCtx.textBaseline = 'alphabetic';

    // Draw resize handle with shake
    resizeArea.x = termWidth - resizeArea.w;
    resizeArea.y = termHeight - resizeArea.h;
    debugCtx.fillStyle = EVIL_THEME.resizeHandle;
    debugCtx.fillRect(resizeArea.x + shakeX, resizeArea.y + shakeY, resizeArea.w, resizeArea.h);
    debugCtx.strokeStyle = EVIL_THEME.resizeBorder;
    debugCtx.lineWidth = 2;
    debugCtx.beginPath();
    debugCtx.moveTo(resizeArea.x + 2 + shakeX, resizeArea.y + resizeArea.h - 2 + shakeY);
    debugCtx.lineTo(resizeArea.x + resizeArea.w - 2 + shakeX, resizeArea.y + resizeArea.h - 2 + shakeY);
    debugCtx.moveTo(resizeArea.x + 2 + shakeX, resizeArea.y + resizeArea.h - 2 + shakeY);
    debugCtx.lineTo(resizeArea.x + 2 + shakeX, resizeArea.y + 2 + shakeY);
    debugCtx.stroke();

    // Draw blood red scanlines in log area with offset glitch and shake (optimized)
    debugCtx.fillStyle = EVIL_THEME.scanlines;
    for (let i = HEADER_HEIGHT + evilGlitchSystem.scanlineOffset; i < termHeight; i += 3) {
        debugCtx.fillRect(shakeX, i + shakeY, termWidth, 1);
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

    // Apply horizontal and vertical shift if active
    debugCtx.translate(evilGlitchSystem.horizontalShift + shakeX,
        evilGlitchSystem.verticalShift + shakeY);

    for (let i = 0; i < visibleLines; i++) {
        const log = filteredLogs[firstLine + i];
        if (!log) continue;

        // Use shared log color
        debugCtx.fillStyle = getLogColor(log.type);

        let text = `[${log.timestamp}] ${log.type.toUpperCase()} (${log.source}): ${log.message}`;
        if (text.length > charLimit) text = text.slice(0, charLimit) + '…';

        // Apply text glitch
        if (evilGlitchSystem.textGlitch) {
            text = evilGlitchSystem.applyTextGlitch(text);

            // Occasionally add extra glitch lines
            if (Math.random() < 0.2) {
                const glitchText = 'ERROR_CORRUPTION_'.repeat(Math.floor(Math.random() * 3) + 1);
                debugCtx.fillText(glitchText, 10 * SCALE_X - scrollOffsetX,
                    HEADER_HEIGHT + (i + 0.5) * lineHeight - yOffset);
            }
        }

        debugCtx.fillText(
            text,
            10 * SCALE_X - scrollOffsetX,
            HEADER_HEIGHT + (i + 1) * lineHeight - yOffset
        );
    }

    // Reset translation
    debugCtx.translate(-evilGlitchSystem.horizontalShift - shakeX,
        -evilGlitchSystem.verticalShift - shakeY);

    // Draw scroll indicators in blood red with shake
    const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
    if (maxScrollY > 0) {
        const scrollbarHeight = Math.max(20 * SCALE_Y, logAreaHeight * (logAreaHeight / (filteredLogs.length * lineHeight)));
        const scrollbarPosition = (virtualScrollY / maxScrollY) * (logAreaHeight - scrollbarHeight);

        debugCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        debugCtx.fillRect(termWidth - 8 * SCALE_X + shakeX,
            HEADER_HEIGHT + scrollbarPosition + shakeY,
            6 * SCALE_X, scrollbarHeight);
    }

    if (scrollOffsetX > 0) {
        debugCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        debugCtx.fillRect(shakeX, termHeight - 4 * SCALE_Y + shakeY, termWidth, 2 * SCALE_Y);
        debugCtx.fillRect(termWidth * (scrollOffsetX / 1000) + shakeX,
            termHeight - 6 * SCALE_Y + shakeY,
            4 * SCALE_X, 6 * SCALE_Y);
    }

    // Draw static effect with shake (optimized)
    if (evilGlitchSystem.staticEffect > 0) {
        debugCtx.fillStyle = `rgba(255, 0, 0, ${evilGlitchSystem.staticEffect * 0.1})`;
        const particleCount = termWidth * termHeight * 0.01;
        for (let i = 0; i < particleCount; i++) {
            const x = Math.floor(Math.random() * termWidth) + shakeX;
            const y = Math.floor(Math.random() * termHeight) + shakeY;
            debugCtx.fillRect(x, y, 1, 1);
        }
    }

    // Reset alpha
    debugCtx.globalAlpha = 1;

    // Schedule next frame
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(drawDebugTerminal);
}

// --- Expose manual resize globally ---
window.resizeDebugCanvas = resizeDebugCanvas;

// --- Cleanup ---
export function stopDebugTerminal() {
    isDebugVisible = false;
    if (glitchInterval) {
        clearInterval(glitchInterval);
        glitchInterval = null;
    }
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (debugContainer) {
        debugContainer.remove();
        debugContainer = null;
    }
    debugCanvas = null;
    debugCtx = null;

    // Reset shared systems
    evilGlitchSystem.reset();
    EvilUIState.reset();
}

// --- Initialize ---
debugHandlerGodFunction();