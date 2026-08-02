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
//
// IMPORTANT: The sigil is NEVER re-parented or re-animated. It
// stays in its exact dashboard position (top: 30%, left: 50%)
// with its original `bunbit-sigil-spin` animation running. The
// zoom is driven by the separate CSS `scale` property, which
// composes with `transform` and does NOT restart the spin, so
// the sigil never snaps or jumps.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.NEW_GAME_PLACEHOLDER, newGamePlaceholderHandler);

const PLACEHOLDER_ID = 'bunbit-newgame-placeholder';
const CINEMATIC_MS = 6500;      // total time before entering DIALOGUE
const ENV_FADE_MS = 1000;       // per-element environment fade length
const STAGGER_MS = 450;         // delay between each environment fade
const ZOOM_MS = 3000;           // sigil portal-zoom duration

let cleanupFn = null;

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
    const dashboard = document.getElementById('bunbit-main-dashboard');

    // Hide interactive buttons during the cinematic
    const newGameBtn = document.getElementById('bunbit-new-game-btn');
    if (newGameBtn) newGameBtn.style.display = 'none';
    const debugBtn = document.getElementById('bunbit-debug-toggle-btn');
    if (debugBtn) debugBtn.style.display = 'none';

    // ── Phase 1: dissolve the environment (pillars → stairs → face) ──
    // Staggered fade: pillars first, then stairs, then the face overlay.
    // The sigil is deliberately LAST — it is the only thing that remains.
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

        // The dashboard container has overflow:hidden. Make it visible so the
        // sigil can scale beyond the dashboard frame WITHOUT moving the sigil
        // out of the DOM (moving would restart its CSS spin animation).
        dashboard.style.overflow = 'visible';
    }

    // ── Phase 2: portal zoom on the EXISTING sigil ──
    const sigil = document.querySelector('[data-dashboard-sigil="1"]');
    if (sigil) {
        // Keep the sigil EXACTLY where it is. Do not touch position, do not
        // re-parent, do not restart the spin animation. The zoom uses the
        // independent CSS `scale` property, which composes with the running
        // `bunbit-sigil-spin` transform without resetting its timeline.
        sigil.style.zIndex = '2147483645';
        sigil.style.pointerEvents = 'none';
        sigil.style.opacity = '1';

        // Clear the harsh red overlay filter and blend mode so the sigil
        // reads as a clean glowing portal during the zoom instead of a
        // blown-out red smear.
        sigil.style.filter = 'none';
        sigil.style.mixBlendMode = 'normal';
        sigil.style.boxShadow = '0 0 60px rgba(255, 255, 255, 0.35)';

        // Start the zoom AFTER all environment elements have fully faded.
        // `scale` is a transition (not an animation), so the spin keeps
        // running seamlessly and the sigil scales in place about its centre.
        const envFadeComplete = STAGGER_MS * 2 + ENV_FADE_MS; // 1900ms
        sigil.style.transition = `scale ${ZOOM_MS}ms ease-in-out ${envFadeComplete}ms`;
        sigil.style.scale = '22';
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

