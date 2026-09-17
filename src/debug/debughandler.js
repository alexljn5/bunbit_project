// File: src/debug/debughandler.js

import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, MAX_LOGS, DEBUG_WIDTH, DEBUG_HEIGHT, MIN_WIDTH, MIN_HEIGHT, MAX_CHARS_PER_LINE, logBuffer, logFilters, isDebugVisible, scrollOffsetX, virtualScrollY, autoScroll, buttons, resizeArea, HEADER_HEIGHT, ENABLE_DEBUG_TERMINAL, setDebugVisible, setVirtualScrollY, setScrollOffsetX, setLogBuffer, setAutoScroll, GLOBAL_FONT } from '../globals.js';
import { evilGlitchSystem, EvilUIState } from '../themes/eviltheme.js';
import { themeManager } from '../themes/thememanager.js';
import { memCpuGodFunction, togglePerfMonitor } from './panels/memcpu.js';

const consoleOriginal = {
    debug: console.debug,
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log
};

// --- CONFIG ---
// Note: MAX_LOGS, DEBUG_WIDTH, DEBUG_HEIGHT, MIN_WIDTH, MIN_HEIGHT, logBuffer, logFilters,
// isDebugVisible, scrollOffsetX, virtualScrollY, autoScroll, buttons, resizeArea, HEADER_HEIGHT
// are now imported from globals.js

let debugCanvas = null;
let debugCtx = null;
let debugContainer = null;
export let filteredLogs = [];

let glitchInterval = null;
let lastDrawTime = 0;
let rafId = null;  // For throttling RAF

//God Function
export function debugHandlerGodFunction() {
    // Only initialize debug terminal and perf monitor when the global flag is true
    try {
        if (!window || !window.defaultDebugVisible) return;
    } catch (e) {
        return;
    }

    // Initialize features
    debugHandlerMainFunction();
    memCpuGodFunction();
}

// Exported helper to start debug features on demand (used by control panel)
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
    // Avoid reassigning built-in console methods if some other system is also patching console.
    // Also, never capture immutable bindings.
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
    // buttons is exported from globals.js as a mutable reference; avoid reassigning it.
    buttons.length = 0;
    const paddingX = 4 * SCALE_X;
    const paddingY = 4 * SCALE_Y;
    const gap = 2 * SCALE_X;
    const buttonH = HEADER_HEIGHT - 2 * paddingY;
    const types = ['perf', 'log', 'error', 'warn', 'info', 'debug', 'clear', 'theme'];
    const flexes = { perf: 0.5, clear: 0.5, theme: 0.5, default: 1 };
    let totalFlex = types.reduce((sum, t) => sum + (flexes[t] || flexes.default), 0);
    const availableWidth = DEBUG_WIDTH - 2 * paddingX - (types.length - 1) * gap;
    const unit = availableWidth / totalFlex;

    let x = paddingX;
    types.forEach(type => {
        const flex = flexes[type] || flexes.default;
        const w = unit * flex;
        const text = type === 'perf' ? 'CREAM' : type === 'clear' ? 'CLEAR' : type === 'theme' ? 'THEME' : type.charAt(0).toUpperCase() + type.slice(1);
        buttons.push({
            x, y: paddingY, w, h: buttonH,
            text, type, hovered: false
        });
        x += w + gap;
    });
}

// --- Manual resize helper ---
export function resizeDebugCanvas(width, height) {
    // Note: DEBUG_WIDTH/DEBUG_HEIGHT are now in globals.js, but we need to update them
    // This function is kept for compatibility
    if (!debugCanvas || !debugContainer) return;

    const totalHeight = height + HEADER_HEIGHT;
    debugCanvas.width = width;
    debugCanvas.height = totalHeight;

    // Update container size to match canvas
    debugContainer.style.width = `${width}px`;
    debugContainer.style.height = `${totalHeight}px`;

    updateButtonPositions();
    drawDebugTerminal();
}

// --- Main debug setup ---
function debugHandlerMainFunction() {
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
    debugContainer.style.position = 'fixed';
    debugContainer.style.left = '0';
    debugContainer.style.bottom = '0';
    // Ensure debug terminal is above the control panel (one level above game canvas)
    debugContainer.style.zIndex = '2147483649';
    debugContainer.style.backgroundColor = 'transparent';
    debugContainer.style.border = 'none';
    debugContainer.style.boxSizing = 'border-box';
    debugContainer.style.overflow = 'hidden';
    debugContainer.style.resize = 'none';
    // Only apply glow boxShadow for evil theme
    if (themeManager.getCurrentThemeName && themeManager.getCurrentThemeName() === 'evil') {
        debugContainer.style.boxShadow = `0 0 15px ${themeManager.getCurrentTheme().border}`;
    } else {
        debugContainer.style.boxShadow = 'none';
    }
    document.body.appendChild(debugContainer);

    debugCanvas = document.createElement('canvas');
    debugCanvas.id = 'debugTerminal';
    debugCanvas.style.display = 'block';
    debugContainer.appendChild(debugCanvas);

    debugCtx = debugCanvas.getContext('2d');
    debugCtx.imageSmoothingEnabled = false;

    setDebugVisible(true);

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
                setScrollOffsetX(Math.max(0, Math.min(scrollOffsetX + e.deltaY, 1000)));
            } else {
                const newScrollY = Math.max(-10000, virtualScrollY + e.deltaY);
                setVirtualScrollY(newScrollY);
                const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
                setAutoScroll(newScrollY >= Math.max(0, filteredLogs.length * lineHeight - logAreaHeight));
            }

            drawDebugTerminal();
        });

        // Keyboard navigation
        debugCanvas.tabIndex = 0;
        debugCanvas.addEventListener('keydown', (e) => {
            const lineHeight = 18 * SCALE_Y;
            const logAreaHeight = debugCanvas.height - HEADER_HEIGHT;
            const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);

            let newScrollY = virtualScrollY;
            switch (e.key) {
                case 'ArrowUp':
                    newScrollY = Math.max(0, virtualScrollY - lineHeight);
                    setVirtualScrollY(newScrollY);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    newScrollY = Math.min(maxScrollY, virtualScrollY + lineHeight);
                    setVirtualScrollY(newScrollY);
                    e.preventDefault();
                    break;
                case 'PageUp':
                    newScrollY = Math.max(0, virtualScrollY - logAreaHeight);
                    setVirtualScrollY(newScrollY);
                    e.preventDefault();
                    break;
                case 'PageDown':
                    newScrollY = Math.min(maxScrollY, virtualScrollY + logAreaHeight);
                    setVirtualScrollY(newScrollY);
                    e.preventDefault();
                    break;
                case 'Home':
                    newScrollY = 0;
                    setVirtualScrollY(newScrollY);
                    e.preventDefault();
                    break;
                case 'End':
                    newScrollY = maxScrollY;
                    setVirtualScrollY(newScrollY);
                    e.preventDefault();
                    break;
            }

            setAutoScroll(newScrollY >= maxScrollY);
            drawDebugTerminal();
        });
    }).catch(err => {
        console.error('Failed to load eventhandlers.js:', err);
    });

    // Listen for theme changes
    window.addEventListener('themeChanged', () => {
        drawDebugTerminal();
    });

    if (window.debugAPI && window.debugAPI.requestLogs) {
        window.debugAPI.requestLogs((log) => {
            if (Array.isArray(log)) {
                setLogBuffer(log.slice(-MAX_LOGS));
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
    try {
        togglePerfMonitor(); // Auto-toggle perf on start
    } catch (err) {
        console.error('Failed to toggle perf monitor:', err);
    }
}

// --- Draw debug logs with enhanced effects (using shared system) ---

// --- Compatibility exports (some modules expect these named exports) ---
export { DEBUG_WIDTH, DEBUG_HEIGHT, MIN_WIDTH, MIN_HEIGHT };
export { HEADER_HEIGHT, buttons, resizeArea, debugCanvas, debugContainer };


export function drawDebugTerminal() {
    if (!isDebugVisible || !debugCtx || !debugCanvas) return;


    const termWidth = debugCanvas.width;
    const termHeight = debugCanvas.height;
    const logAreaHeight = termHeight - HEADER_HEIGHT;
    const now = performance.now();
    const deltaTime = Math.min(100, now - lastDrawTime) / 1000;
    lastDrawTime = now;

    // Removed throttling to ensure logs update in real-time
    // The throttling was causing "static and buggy" behavior

    // Reset transform each frame to prevent accumulated translate/scale from previous draws
    debugCtx.setTransform(1, 0, 0, 1, 0, 0);

    // Apply flicker effect (but ensure minimum visibility)
    debugCtx.globalAlpha = Math.max(0.7, evilGlitchSystem.flicker);

    // Apply shake effect
    const shakeX = evilGlitchSystem.shakeIntensity > 0 ?
        (Math.random() - 0.5) * evilGlitchSystem.shakeIntensity : 0;
    const shakeY = evilGlitchSystem.shakeIntensity > 0 ?
        (Math.random() - 0.5) * evilGlitchSystem.shakeIntensity : 0;

    debugCtx.clearRect(0, 0, termWidth, termHeight);

    // Draw background with shake offset
    debugCtx.fillStyle = themeManager.getCurrentTheme().background;
    debugCtx.fillRect(shakeX, shakeY, termWidth, termHeight);

    // Draw corruption effect (optimized)
    if (evilGlitchSystem.corruption > 0) {
        debugCtx.fillStyle = themeManager.getCurrentTheme().corruption;
        for (let i = 0; i < termWidth; i += 8) {
            if (Math.random() < evilGlitchSystem.corruption) {
                const h = Math.random() * termHeight;
                debugCtx.fillRect(i + shakeX, shakeY, 3, h);
            }
        }
    }

    // Draw outer border with glow and shake
    debugCtx.strokeStyle = themeManager.getCurrentTheme().border;
    debugCtx.lineWidth = 2;
    debugCtx.strokeRect(shakeX, shakeY, termWidth, termHeight);
    debugCtx.strokeStyle = `rgba(${themeManager.getCurrentTheme().border.slice(1, 3)}, ${themeManager.getCurrentTheme().border.slice(3, 5)}, ${themeManager.getCurrentTheme().border.slice(5, 7)}, 0.3)`;
    debugCtx.strokeRect(1 + shakeX, 1 + shakeY, termWidth - 2, termHeight - 2);

    // Draw header with shake
    debugCtx.fillStyle = themeManager.getCurrentTheme().headerBg;
    debugCtx.fillRect(shakeX, shakeY, termWidth, HEADER_HEIGHT);
    debugCtx.strokeStyle = themeManager.getCurrentTheme().border;
    debugCtx.lineWidth = 1;
    debugCtx.beginPath();
    debugCtx.moveTo(shakeX, HEADER_HEIGHT - 0.5 + shakeY);
    debugCtx.lineTo(termWidth + shakeX, HEADER_HEIGHT - 0.5 + shakeY);
    debugCtx.stroke();

    // Draw buttons with shake
    const buttonFontSize = 10 * SCALE_Y;
    debugCtx.font = `${buttonFontSize}px ${GLOBAL_FONT}`;
    debugCtx.textAlign = 'center';
    debugCtx.textBaseline = 'middle';
    buttons.forEach(btn => {
        const isFilter = btn.type !== 'perf' && btn.type !== 'clear' && btn.type !== 'theme';
        const active = isFilter ? logFilters[btn.type] : false;
        const bg = btn.hovered ? themeManager.getCurrentTheme().buttonHover : (active ? themeManager.getCurrentTheme().buttonHover : themeManager.getCurrentTheme().buttonBg);
        debugCtx.fillStyle = bg;
        debugCtx.fillRect(btn.x + shakeX, btn.y + shakeY, btn.w, btn.h);

        const borderColor = active ? themeManager.getCurrentTheme().danger : themeManager.getCurrentTheme().border;
        debugCtx.strokeStyle = borderColor;
        debugCtx.lineWidth = 1;
        debugCtx.strokeRect(btn.x + shakeX, btn.y + shakeY, btn.w, btn.h);

        const textColor = (btn.type === 'perf' || btn.type === 'clear' || btn.type === 'theme') ? themeManager.getCurrentTheme().danger : (active ? themeManager.getCurrentTheme().danger : themeManager.getCurrentTheme().text);
        debugCtx.fillStyle = textColor;
        debugCtx.fillText(btn.text, btn.x + btn.w / 2 + shakeX, btn.y + btn.h / 2 + shakeY);
    });
    debugCtx.textAlign = 'left';
    debugCtx.textBaseline = 'alphabetic';

    // Draw resize handle with shake
    resizeArea.x = termWidth - resizeArea.w;
    resizeArea.y = termHeight - resizeArea.h;
    debugCtx.fillStyle = themeManager.getCurrentTheme().resizeHandle;
    debugCtx.fillRect(resizeArea.x + shakeX, resizeArea.y + shakeY, resizeArea.w, resizeArea.h);
    debugCtx.strokeStyle = themeManager.getCurrentTheme().resizeBorder;
    debugCtx.lineWidth = 2;
    debugCtx.beginPath();
    debugCtx.moveTo(resizeArea.x + 2 + shakeX, resizeArea.y + resizeArea.h - 2 + shakeY);
    debugCtx.lineTo(resizeArea.x + resizeArea.w - 2 + shakeX, resizeArea.y + resizeArea.h - 2 + shakeY);
    debugCtx.moveTo(resizeArea.x + 2 + shakeX, resizeArea.y + resizeArea.h - 2 + shakeY);
    debugCtx.lineTo(resizeArea.x + 2 + shakeX, resizeArea.y + 2 + shakeY);
    debugCtx.stroke();

    // Draw scanlines in log area with offset glitch and shake (optimized)
    debugCtx.fillStyle = themeManager.getCurrentTheme().scanlines;
    for (let i = HEADER_HEIGHT + evilGlitchSystem.scanlineOffset; i < termHeight; i += 3) {
        debugCtx.fillRect(shakeX, i + shakeY, termWidth, 1);
    }

    const fontSize = 14 * SCALE_Y;
    debugCtx.font = `${fontSize}px ${GLOBAL_FONT}`;
    const lineHeight = 18 * SCALE_Y;

    // Auto-scroll
    let currentScrollY = virtualScrollY;
    if (autoScroll) {
        const maxScrollY = Math.max(0, filteredLogs.length * lineHeight - logAreaHeight);
        setVirtualScrollY(maxScrollY);
        currentScrollY = maxScrollY;
    }

    const firstLine = Math.floor(currentScrollY / lineHeight);
    const yOffset = currentScrollY % lineHeight;
    const visibleLines = Math.min(filteredLogs.length - firstLine, Math.ceil(logAreaHeight / lineHeight) + 1);

    const charLimit = MAX_CHARS_PER_LINE;

    // Apply horizontal and vertical shift if active
    debugCtx.translate(evilGlitchSystem.horizontalShift + shakeX,
        evilGlitchSystem.verticalShift + shakeY);

    // Ensure all later draws happen in the base coordinate space
    // (buttons + header use the un-translated coords)
    debugCtx.setTransform(1, 0, 0, 1, 0, 0);

    for (let i = 0; i < visibleLines; i++) {
        const log = filteredLogs[firstLine + i];
        if (!log) continue;


        // Use shared log color
        debugCtx.fillStyle = themeManager.getLogColor(log.type);

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
            HEADER_HEIGHT + (i + 0.5) * lineHeight - yOffset
        );
    }
}

// --- Stop debug terminal ---
export function stopDebugTerminal() {
    setDebugVisible(false);
    if (glitchInterval) {
        clearInterval(glitchInterval);
        glitchInterval = null;
    }
    if (debugContainer) {
        debugContainer.remove();
        debugContainer = null;
    }
    if (debugCanvas) {
        debugCanvas = null;
    }
    if (debugCtx) {
        debugCtx = null;
    }
}