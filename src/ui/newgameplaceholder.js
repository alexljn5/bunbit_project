// ============================================================
// NEW GAME PLACEHOLDER UI
// ============================================================
// Reserves the future location for:
//   - intro dialogue
//   - Patches
//   - Vesper
//   - save slot creation
//   - cinematic transitions
//
// On entry, immediately transitions to DIALOGUE state
// to run the new_game_intro dialogue graph.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.NEW_GAME_PLACEHOLDER, newGamePlaceholderHandler);

const PLACEHOLDER_ID = 'bunbit-newgame-placeholder';
let cleanupFn = null;

/**
 * Handler for the NEW_GAME_PLACEHOLDER state.
 * Immediately transitions to DIALOGUE to run the intro dialogue.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function newGamePlaceholderHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering NEW_GAME_PLACEHOLDER state');

    // Ensure canvas is visible for this state
    const canvas = document.getElementById('mainGameRender');
    if (canvas) {
        canvas.style.display = '';
    }

    // Remove any existing placeholder
    const existing = document.getElementById(PLACEHOLDER_ID);
    if (existing) existing.remove();

    // Immediately transition to DIALOGUE state to run the intro dialogue
    controller.transitionTo(EngineState.DIALOGUE, {
        dialogueId: 'new_game_intro',
        flags: {},
    });

    // Cleanup function (minimal — dialogue handles its own lifecycle)
    cleanupFn = () => {
        const el = document.getElementById(PLACEHOLDER_ID);
        if (el) el.remove();
    };

    return cleanupFn;
}

export default newGamePlaceholderHandler;
