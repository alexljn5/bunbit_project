import { themeManager } from '../../themes/thememanager.js';
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT, defaultDebugVisible, setDebugVisible, setShowDebugTools } from '../../globals.js';
import { setMenuActive, menuActive } from '../../gamestate.js';
import { gameLoop } from '../../game_loop.js';
import { setupMenuClickHandler } from '../../menus/ingame_menu/game_menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from '../debughandler.js';
import { initControlPanel } from '../controlpanel.js';
import { togglePositionPanel } from './positionpanel.js';

// State flags
let initialized = false;
let panelsVisible = false;

// Expose defaultDebugVisible globally (imported from globals.js)
window.defaultDebugVisible = defaultDebugVisible;

// Initialize BunbitDebug panel (control panel only)
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

// Toggle all debug panels on/off
export function toggleDebugPanels() {
    if (panelsVisible) {
        // Hide all panels — use CSS display:none so MutationObserver doesn't recreate them
        stopMemCpuMonitor();
        stopDebugTerminal();
        togglePositionPanel();
        const panel = document.getElementById('bunbit-debug-panel');
        if (panel) panel.style.display = 'none';
        setDebugVisible(false);
        setShowDebugTools(false);
        panelsVisible = false;
    } else {
        // Show all panels
        setDebugVisible(true);
        setShowDebugTools(true);
        initBunbitDebug();
        // Ensure panel is visible (in case it was hidden previously)
        const panel = document.getElementById('bunbit-debug-panel');
        if (panel) panel.style.display = 'flex';
        try { memCpuGodFunction(); } catch (e) { /* may already be running */ }
        try { debugHandlerGodFunction(); } catch (e) { /* may already be running */ }
        try { togglePositionPanel(); } catch (e) { /* position panel may already be running */ }
        panelsVisible = true;
    }
    return panelsVisible;
}

// Expose toggle function globally for HTML entry points
window.toggleDebugPanels = toggleDebugPanels;