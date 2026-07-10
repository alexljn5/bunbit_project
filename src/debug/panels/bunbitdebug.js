import { themeManager } from '../../themes/thememanager.js';
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT, defaultDebugVisible, setDebugVisible } from '../../globals.js';
import { setMenuActive, menuActive } from '../../gamestate.js';
import { gameLoop } from '../../game_loop.js';
import { setupMenuClickHandler } from '../../menus/menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from '../debughandler.js';
import { initControlPanel } from '../controlpanel.js';

// State flags
let initialized = false;

// Expose defaultDebugVisible globally (imported from globals.js)
window.defaultDebugVisible = defaultDebugVisible;

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
        document.addEventListener('DOMContentLoaded', () => initDebugWithRetry());
    } else {
        initDebugWithRetry();
    }
}