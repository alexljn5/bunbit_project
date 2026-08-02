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
//   3. Fades the sigil out to pure black.
//   4. Transitions to DIALOGUE to run the data-driven intro.
//
// No second sigil element is created. No fake ASCII sigils.
// The cinematic is engine visuals; dialogue remains pure data.
//
// IMPORTANT: The zoom is driven by a WRAPPER around the existing
// sigil. The wrapper is pinned to the sigil's exact current
// centre and does the scaling (transform: scale), while the
// inner sigil keeps spinning via a resumed CSS animation. Scaling
// the wrapper never composes with the sigil's translate, so the
// sigil zooms in place and never slides off-centre.
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
const SIGIL_FADE_MS = 800;      // sigil fade-out length at the end
const SPIN_MS = 25000;          // sigil spin duration (matches dashboard)

let cleanupFn = null;

// ─── Cinematic Keyframes ─────────────────────────────────
// The sigil's spin is resumed inside the wrapper using this
// keyframe (rotate only, NO translate). The wrapper handles
// positioning + scale, so the two never fight.
function ensureCinematicStyles() {
    if (document.getElementById('bunbit-newgame-cinematic-style')) return;

    const style = document.createElement('style');
    style.id = 'bunbit-newgame-cinematic-style';
    style.textContent = `
@keyframes bunbit-sigil-cinematic-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
    document.head.appendChild(style);
}

/**
 * Reads the current rotation (deg) of an element from its
 * computed transform matrix. Falls back to 0.
 * @param {HTMLElement} el - The element.
 * @returns {number} Rotation in degrees.
 */
function getCurrentRotation(el) {
    try {
        const computed = getComputedStyle(el).transform;
        if (!computed || computed === 'none') return 0;
        const m = new DOMMatrixReadOnly(computed);
        return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    } catch (_) {
        return 0;
    }
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
 * Fades the dashboard environment, zooms the existing spinning
 * sigil toward the camera, fades it out, then enters DIALOGUE.
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
        dashboard.style.background = 'transparent';
    }

    // ── Phase 2: portal zoom on the EXISTING sigil ──
    const sigil = document.querySelector('[data-dashboard-sigil="1"]');
    if (sigil) {
        // Capture the sigil's current visual centre and its layout size.
        // (getBoundingClientRect includes the rotate(θ) transform, but its
        //  centre is still the element's true centre since rotation is about
        //  the element's own centre.)
        const rect = sigil.getBoundingClientRect();
        const centreX = rect.left + rect.width / 2;
        const centreY = rect.top + rect.height / 2;
        const sigilW = sigil.offsetWidth || 320;
        const sigilH = sigil.offsetHeight || 320;

        // Read the current spin angle so the sigil resumes seamlessly
        // (no rotation jump) once it is moved into the wrapper.
        const currentDeg = getCurrentRotation(sigil);
        const resumeDelayMs = -(currentDeg / 360) * SPIN_MS;

        // Freeze the old spin animation before moving the element.
        sigil.style.animation = 'none';

        // Build a fixed wrapper pinned to the sigil's exact centre.
        const wrapper = document.createElement('div');
        wrapper.dataset.sigilWrapper = '1';
        wrapper.style.position = 'fixed';
        wrapper.style.left = `${centreX}px`;
        wrapper.style.top = `${centreY}px`;
        wrapper.style.width = `${sigilW}px`;
        wrapper.style.height = `${sigilH}px`;
        wrapper.style.margin = '0';
        wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
        wrapper.style.transformOrigin = 'center';
        wrapper.style.opacity = '1';
        wrapper.style.zIndex = '2147483645';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.overflow = 'visible';

        // Move the sigil into the wrapper (removes it from the dashboard).
        wrapper.appendChild(sigil);
        document.body.appendChild(wrapper);

        // Reset the sigil so it fills the wrapper and spins in place.
        sigil.style.position = 'absolute';
        sigil.style.left = '0';
        sigil.style.top = '0';
        sigil.style.width = '100%';
        sigil.style.height = '100%';
        sigil.style.maxWidth = 'none';
        sigil.style.maxHeight = 'none';
        sigil.style.margin = '0';
        sigil.style.transform = 'none';
        sigil.style.transformOrigin = 'center';
        sigil.style.zIndex = '1';
        sigil.style.pointerEvents = 'none';
        sigil.style.opacity = '1';

        // Clean portal look: drop the harsh red overlay blend.
        sigil.style.filter = 'none';
        sigil.style.mixBlendMode = 'normal';
        sigil.style.boxShadow = '0 0 60px rgba(255, 255, 255, 0.35)';

        // Resume the spin at the exact same angle (no jump).
        sigil.style.animation = `bunbit-sigil-cinematic-spin ${SPIN_MS}ms linear infinite`;
        sigil.style.animationDelay = `${resumeDelayMs}ms`;

        // ── Phase 3: zoom + fade out ──
        // Zoom starts once the environment has fully dissolved. The wrapper
        // scales in place about its pinned centre (translate is NOT scaled).
        // After the zoom completes, the sigil fades out to pure black before
        // the dialogue state begins.
        const envFadeComplete = STAGGER_MS * 2 + ENV_FADE_MS; // 1900ms
        const fadeOutStart = envFadeComplete + ZOOM_MS;       // 4900ms

        // Force a reflow so the transition picks up from scale(1)/opacity(1).
        void wrapper.offsetWidth;

        wrapper.style.transition =
            `transform ${ZOOM_MS}ms ease-in-out ${envFadeComplete}ms, ` +
            `opacity ${SIGIL_FADE_MS}ms ease-in-out ${fadeOutStart}ms`;
        wrapper.style.transform = 'translate(-50%, -50%) scale(22)';
        wrapper.style.opacity = '0';
    }

    // ── Phase 4: enter dialogue after the portal zoom + fade ──
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

