// ============================================================
// GAMEPLAY UI STATE HANDLER
// ============================================================
// Handles the GAMEPLAY engine state.
// On entry:
//   - Removes any dashboard / sigil / dialogue overlays so the
//     gameplay canvas is unobstructed.
//   - Shows the render canvas.
//   - Sets menu inactive so the canvas menu isn't rendered.
//   - Initialises and starts the game loop.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';
import { setMenuActive } from '../gamestate.js';
import { gameLoop } from '../game_loop.js';
import { gameRenderEngine, initializeRenderWorkers } from '../rendering/renderengine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.GAMEPLAY, gameplayHandler);

let cleanupFn = null;

/**
 * Ensures the game loop is running.
 * Reuses an existing window.game loop if present; otherwise creates one.
 */
function ensureGameLoop() {
    if (typeof window !== 'undefined' && window.game && typeof window.game.start === 'function') {
        window.game.start();
        return;
    }

    try {
        const loop = gameLoop(gameRenderEngine);
        window.game = loop;
        initializeRenderWorkers();
        loop.start();
    } catch (e) {
        console.error('[Gameplay] Failed to start game loop:', e);
    }
}

/**
 * Removes overlay DOM from previous states so the canvas is unobstructed.
 */
function removeOverlays() {
    // Dashboard overlay (pillars, sigil, stairs, buttons)
    const dashboard = document.getElementById('bunbit-main-dashboard');
    if (dashboard) dashboard.remove();

    // Stray sigil element (may have been detached during cinematic)
    const sigil = document.querySelector('[data-dashboard-sigil="1"]');
    if (sigil) sigil.remove();

    // Dialogue container
    const dialogue = document.getElementById('bunbit-dialogue-container');
    if (dialogue) dialogue.remove();

    // New-game placeholder (if any)
    const placeholder = document.getElementById('bunbit-newgame-placeholder');
    if (placeholder) placeholder.remove();

    // In-game menu overlay
    const ingameMenu = document.getElementById('bunbit-ingame-menu');
    if (ingameMenu) ingameMenu.remove();

    // Remove cinematic helper classes
    document.body.classList.remove('cinematic-dim-environment', 'dimmed');
}

/**
 * Shows and resets the main render canvas for gameplay.
 */
function prepareCanvas() {
    const canvas = document.getElementById('mainGameRender');
    if (!canvas) return;

    canvas.style.display = '';
    canvas.style.position = 'fixed';
    canvas.style.top = '50%';
    canvas.style.left = '50%';
    canvas.style.right = 'auto';
    canvas.style.bottom = 'auto';
    canvas.style.transform = 'translate(-50%, -50%)';
    canvas.style.transformOrigin = 'center';
    canvas.style.zIndex = '0';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    canvas.style.aspectRatio = 'auto';
}

/**
 * Handler for the GAMEPLAY state.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function gameplayHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering GAMEPLAY state');

    // The game is now active — dashboard handler should not re-create overlays.
    if (typeof window !== 'undefined') {
        window.__bunbitGameActive = true;
    }

    removeOverlays();
    prepareCanvas();

    // Ensure the menu is off so the canvas renders the game world, not the menu.
    setMenuActive(false);

    // Start / reuse the game loop.
    ensureGameLoop();

    // Cleanup function — called when leaving GAMEPLAY.
    cleanupFn = () => {
        if (typeof window !== 'undefined' && window.game && typeof window.game.stop === 'function') {
            window.game.stop();
        }
    };

    return cleanupFn;
}

export default gameplayHandler;

