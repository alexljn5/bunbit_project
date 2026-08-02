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
const CINEMATIC_MS = 6500;      // total time before entering DIALOGUE
const ENV_FADE_MS = 1000;       // per-element environment fade length
const STAGGER_MS = 450;         // delay between each environment fade

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
@keyframes bunbit-cinematic-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes bunbit-portal-zoom {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(22) rotate(360deg);
    opacity: 1;
  }
}
`;
    document.head.appendChild(style);
}

/**
 * Fades a dashboard element out using an inline opacity transition.
 * Inline styles are required because the elements set their own
 * inline `opacity` (e.g. 0.94 / 0.85 / 1.7) which would otherwise
 * override any CSS class without !important.
 * @param {HTMLElement} el - The element to fade.
 * @param {number} delayMs - Delay before the fade starts.
 */
function fadeOutElement(el, delayMs) {
    if (!el) return;
    // Reset to the element's authored opacity so the transition has a start value.
    el.style.transition = `opacity ${ENV_FADE_MS}ms ease-in-out ${delayMs}ms`;
    // Force a reflow so the transition picks up from the current opacity.
    void el.offsetWidth;
    el.style.opacity = '0';
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

    // ── Phase 1: dissolve the environment (pillars → stairs → face) ──
    // Staggered fade: pillars first, then stairs, then the face overlay.
    const pillars = document.querySelectorAll('[data-dashboard-pillar]');
    pillars.forEach((el) => fadeOutElement(el, 0));

    const stairs = document.querySelector('[data-dashboard-stairs]');
    fadeOutElement(stairs, STAGGER_MS);

    const face = document.querySelector('[data-dashboard-face]');
    fadeOutElement(face, STAGGER_MS * 2);

    // Drop the dashboard chrome so only the sigil remains visible.
    // Fade the border/shadow in step with the face overlay.
    if (dashboard) {
        dashboard.style.transition = `border-color ${ENV_FADE_MS}ms ease-in-out ${STAGGER_MS * 2}ms, box-shadow ${ENV_FADE_MS}ms ease-in-out ${STAGGER_MS * 2}ms`;
        dashboard.style.borderColor = 'transparent';
        dashboard.style.boxShadow = 'none';
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

        // Clear the harsh red overlay filter and blend mode so the sigil
        // reads as a clean glowing portal during the zoom instead of a
        // blown-out red smear.
        sigil.style.filter = 'none';
        sigil.style.mixBlendMode = 'normal';
        sigil.style.boxShadow = '0 0 60px rgba(255, 255, 255, 0.35)';

        // Keep a centered spin animation running while the portal-zoom
        // delay elapses (before the environment has fully faded). The
        // cinematic spin uses translate(-50%, -50%) so the sigil stays
        // perfectly centered at top:50%. When the zoom begins, its
        // transform takes over — rotating while scaling.
        const envFadeComplete = STAGGER_MS * 2 + ENV_FADE_MS; // 1500ms
        sigil.style.animation = `bunbit-cinematic-spin 25s linear infinite, bunbit-portal-zoom 2400ms ease-in-out ${envFadeComplete}ms forwards`;

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

