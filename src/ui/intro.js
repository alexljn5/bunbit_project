// ============================================================
// INTRO SCREEN UI
// ============================================================
// The intro animation is handled by src/animations/introplaceholder.js,
// which has its own auto-run on module load. This handler simply
// manages the state transition: when the intro completes, it ensures
// the engine transitions to DASHBOARD.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.INTRO, introHandler);

let cleanupFn = null;

/**
 * Handler for the INTRO state.
 * The intro animation is managed by introplaceholder.js auto-run.
 * This handler ensures the engine transitions to DASHBOARD when
 * the intro completes or when the intro is skipped.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function introHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering INTRO state');

    // If intro was already shown (e.g., main_game.html loaded after intro.html),
    // skip directly to dashboard.
    if (typeof window !== 'undefined' && window.introActive === false) {
        console.log('[Intro] Intro already shown, skipping to DASHBOARD');
        controller.transitionTo(EngineState.DASHBOARD);
        return () => { };
    }

    // Ensure introActive is set so introplaceholder.js auto-run executes
    if (typeof window !== 'undefined') {
        window.introActive = true;
    }

    // The introplaceholder.js module auto-runs on import and handles
    // the animation. When it completes, it calls engineController
    // transitionTo('DASHBOARD') via the updated onComplete callback.
    // We just need to ensure the module is loaded.
    try {
        await import('../animations/introplaceholder.js');
    } catch (e) {
        console.error('[Intro] Failed to load intro animation:', e);
        controller.transitionTo(EngineState.DASHBOARD);
    }

    // Cleanup function
    cleanupFn = () => {
        if (typeof window !== 'undefined') {
            window.introActive = false;
        }
    };

    return cleanupFn;
}

export default introHandler;
