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
// On entry, runs a cinematic intro transition (environment
// fade + sigil spin/zoom portal effect), then transitions
// to DIALOGUE state to run the new_game_intro dialogue graph.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.NEW_GAME_PLACEHOLDER, newGamePlaceholderHandler);

const PLACEHOLDER_ID = 'bunbit-newgame-placeholder';
const CINEMATIC_OVERLAY_ID = 'bunbit-cinematic-overlay';
const SIGIL_ID = 'bunbit-cinematic-sigil';
let cleanupFn = null;

/**
 * Handler for the NEW_GAME_PLACEHOLDER state.
 * Runs a cinematic intro transition before entering dialogue.
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

    // Run the cinematic intro transition
    await runCinematicIntro();

    // After cinematic completes, transition to DIALOGUE state
    controller.transitionTo(EngineState.DIALOGUE, {
        dialogueId: 'new_game_intro',
        flags: {},
    });

    // Cleanup function
    cleanupFn = () => {
        const el = document.getElementById(PLACEHOLDER_ID);
        if (el) el.remove();
        const cinematic = document.getElementById(CINEMATIC_OVERLAY_ID);
        if (cinematic) cinematic.remove();
    };

    return cleanupFn;
}

/**
 * Runs the cinematic intro sequence:
 * 1. Dark overlay fades in (environment fade)
 * 2. Sigil appears centered
 * 3. Sigil spins and zooms dramatically (portal effect)
 * 4. Overlay fades out
 * @returns {Promise<void>}
 */
function runCinematicIntro() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = CINEMATIC_OVERLAY_ID;
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #000000;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1s ease-in-out;
        `;
        document.body.appendChild(overlay);

        // Fade in the dark overlay (environment fade)
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Wait for overlay fade-in, then show sigil
        setTimeout(() => {
            const sigil = document.createElement('img');
            sigil.id = SIGIL_ID;
            sigil.src = 'img/logo/logo-ascii-transparent-sigil-blend.png';
            sigil.alt = 'Sigil';
            sigil.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 200px;
                height: 200px;
                max-width: 50vw;
                max-height: 50vh;
                transform: translate(-50%, -50%) rotate(0deg) scale(1);
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
                pointer-events: none;
                z-index: 10000;
            `;
            overlay.appendChild(sigil);

            // Fade in sigil
            requestAnimationFrame(() => {
                sigil.style.opacity = '1';
            });

            // Wait for sigil fade-in, then spin and zoom (portal effect)
            setTimeout(() => {
                sigil.style.transition = 'transform 2s ease-in-out, opacity 2s ease-in-out';
                sigil.style.transform = 'translate(-50%, -50%) rotate(360deg) scale(20)';

                // After spin+zoom, fade out overlay
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, 1000);
                }, 2000);
            }, 500);
        }, 1000);
    });
}

export default newGamePlaceholderHandler;
