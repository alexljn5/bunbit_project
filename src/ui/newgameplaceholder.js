// ============================================================
// NEW GAME PLACEHOLDER UI
// ============================================================
// Cinematic transition point for the new-game flow.
//
// The cinematic is an ENGINE transition — not dialogue data.
// On entry this state:
//   1. Fades the dashboard environment away (pillars, stairs,
//      face overlay, dashboard chrome).
//   2. Reuses the EXISTING spinning dashboard sigil element
//      (logo-ascii-transparent-sigil-blend.png) and zooms it
//      toward the camera like entering a portal.
//   3. Transitions to DIALOGUE to run the data-driven intro.
//
// No second sigil element is created. No fake ASCII sigils.
// The cinematic is engine visuals; dialogue remains pure data.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.NEW_GAME_PLACEHOLDER, newGamePlaceholderHandler);

const PLACEHOLDER_ID = 'bunbit-newgame-placeholder';
const CINEMATIC_MS = 2600;
const ENV_FADE_MS = 1500;

let cleanupFn = null;

// ─── Cinematic Keyframes ─────────────────────────────────
// Portal zoom: keeps the existing spin animation running via
// the element's inline `animation` (bunbit-sigil-spin), while
// the placeholder drives the scale toward the camera.
function ensureCinematicStyles() {
    if (document.getElementById('bunbit-newgame-cinematic-style')) return;

    const style = document.createElement('style');
    style.id = 'bunbit-newgame-cinematic-style';
    style.textContent = `
@keyframes bunbit-portal-zoom {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(22);
    opacity: 1;
  }
}

.bunbit-cinematic-dim {
  transition: opacity ${ENV_FADE_MS}ms ease-in-out;
  opacity: 0 !important;
}

.bunbit-cinematic-fade-element {
  transition: opacity ${ENV_FADE_MS}ms ease-in-out;
  opacity: 0;
}
`;
    document.head.appendChild(style);
}

/**
 * Runs the new-game cinematic transition.
 * Fades the dashboard environment, then zooms the existing
 * spinning sigil toward the camera before entering DIALOGUE.
 * @param {object} controller - The engine controller.
 */
function runNewGameCinematic(controller) {
    ensureCinematicStyles();

    const dashboard = document.getElementById('bunbit-main-dashboard');

    // Hide interactive buttons during the cinematic
    const newGameBtn = document.getElementById('bunbit-new-game-btn');
    if (newGameBtn) newGameBtn.style.display = 'none';
    const debugBtn = document.getElementById('bunbit-debug-toggle-btn');
    if (debugBtn) debugBtn.style.display = 'none';

    // ── Phase 1: dissolve the environment (pillars, stairs, face) ──
    document.querySelectorAll('[data-dashboard-pillar]').forEach((el) => {
        el.classList.add('bunbit-cinematic-fade-element');
    });
    const stairs = document.querySelector('[data-dashboard-stairs]');
    if (stairs) stairs.classList.add('bunbit-cinematic-fade-element');
    const face = document.querySelector('[data-dashboard-face]');
    if (face) face.classList.add('bunbit-cinematic-fade-element');

    // Drop the dashboard chrome so only the sigil remains visible
    if (dashboard) {
        dashboard.style.transition = `border-color ${ENV_FADE_MS}ms ease-in-out, box-shadow ${ENV_FADE_MS}ms ease-in-out`;
        dashboard.style.borderColor = 'transparent';
        dashboard.style.boxShadow = 'none';
        dashboard.classList.add('bunbit-cinematic-dim');
    }

    // ── Phase 2: portal zoom on the EXISTING sigil ──
    const sigil = document.querySelector('[data-dashboard-sigil="1"]');
    if (sigil) {
        // Move it to a fixed, centered position (it is currently in the
        // dashboard atmosphere layer). Keep its existing spin animation.
        sigil.style.position = 'fixed';
        sigil.style.left = '50%';
        sigil.style.top = '50%';
        sigil.style.transform = 'translate(-50%, -50%) scale(1)';
        sigil.style.width = '340px';
        sigil.style.height = '340px';
        sigil.style.maxWidth = '70vw';
        sigil.style.maxHeight = '70vh';
        sigil.style.zIndex = '2147483645';
        sigil.style.pointerEvents = 'none';
        sigil.style.opacity = '1';
        // Keep the dashboard spin animation running while we add the zoom
        sigil.style.animation = 'bunbit-sigil-spin 25s linear infinite, bunbit-portal-zoom 2200ms ease-in-out forwards';

        // The dashboard container has overflow:hidden — detach the sigil
        // so it can scale beyond the dashboard frame.
        if (dashboard && sigil.parentNode) {
            dashboard.parentNode.appendChild(sigil);
        }
    }

    // ── Phase 3: enter dialogue after the portal zoom ──
    setTimeout(() => {
        controller.transitionTo(EngineState.DIALOGUE, {
            dialogueId: 'new_game_intro',
            flags: {},
        });
    }, CINEMATIC_MS);
}

/**
 * Handler for the NEW_GAME_PLACEHOLDER state.
 * Runs the engine-driven cinematic transition, then moves to DIALOGUE.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function newGamePlaceholderHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering NEW_GAME_PLACEHOLDER state');

    // Ensure canvas stays hidden — the dashboard is the cinematic surface
    const canvas = document.getElementById('mainGameRender');
    if (canvas) {
        canvas.style.display = 'none';
    }

    // Remove any existing placeholder
    const existing = document.getElementById(PLACEHOLDER_ID);
    if (existing) existing.remove();

    // Run the cinematic transition (reuses the dashboard sigil element)
    runNewGameCinematic(controller);

    // Cleanup function (minimal — dialogue handles its own lifecycle)
    cleanupFn = () => {
        const el = document.getElementById(PLACEHOLDER_ID);
        if (el) el.remove();
    };

    return cleanupFn;
}

export default newGamePlaceholderHandler;

