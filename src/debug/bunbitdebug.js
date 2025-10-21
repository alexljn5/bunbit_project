import { themeManager } from '../themes/thememanager.js';
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';
import { setMenuActive, menuActive } from '../gamestate.js';
import { gameLoop } from '../main_game.js';
import { setupMenuClickHandler } from '../menus/menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from './debughandler.js';
import { initControlPanel } from './controlpanel.js';

// State flags
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panelStartX = 0;
let panelStartY = 0;
let initialized = false;
export let defaultDebugVisible = false; // Debug features hidden by default
window.defaultDebugVisible = defaultDebugVisible; // expose globally

// Initialize BunbitDebug panel
export function initBunbitDebug() {
    if (initialized) return;
    if (typeof document === 'undefined') return;

    // Create control panel via new module
    initControlPanel();
    initialized = true;
    return document.getElementById('bunbit-debug-panel');
}

export function cleanupBunbitDebug() {
    const debugPanel = document.getElementById('bunbit-debug-panel');
    if (debugPanel) debugPanel.remove();
    initialized = false;
}

// Handle drag functions (need to be defined at module level)
function handleDrag(e) {
    if (!isDragging) return;

    const debugPanel = document.getElementById('bunbit-debug-panel');
    if (!debugPanel) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    debugPanel.style.left = `${panelStartX + dx}px`;
    debugPanel.style.top = `${panelStartY + dy}px`;
    debugPanel.style.right = 'auto';
    debugPanel.style.bottom = 'auto';
}

function stopDrag() {
    isDragging = false;
    const debugPanel = document.getElementById('bunbit-debug-panel');
    if (debugPanel) {
        debugPanel.style.cursor = 'default';
        const header = debugPanel.querySelector('div');
        if (header) {
            header.style.cursor = 'move';
        }
    }
}

// Initialize debug panel on page load
if (typeof document !== 'undefined') {
    const initDebugWithRetry = () => {
        if (!document.body) {
            // If body is not available, retry after a short delay
            setTimeout(initDebugWithRetry, 100);
            return;
        }
        initBunbitDebug();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDebugWithRetry);
    } else {
        initDebugWithRetry();
    }
}