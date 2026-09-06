// ============================================================
// DASHBOARD UI
// ============================================================
// Renders the main dashboard with the visual atmosphere
// (pillars, spinning sigil, stairs) from the original
// main_dashboard.js.
//
// The New Game button starts the intro dialogue flow.
// The Back to Game button resumes gameplay if the game is active.
// The debug button is hidden in the bottom-right corner
// to avoid accidental clicks.
//
// Layout note:
//   - The dashboard is a FULL-VIEWPORT overlay. The pillars and
//     stairs are spread across the viewport using vw units to
//     keep the original "wide perspective" look (pillars far
//     apart, stairs receding into the centre).
//   - NO neon border / glow is applied here. The glowing neon
//     border is applied by the theme manager to the gameplay
//     canvas ONLY when inside the actual game.
//   - The New Game button and sigil are centred on the viewport.
// ============================================================

import { GLOBAL_FONT } from "../globals.js";

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';
import { themeManager } from '../themes/thememanager.js';
import { toggleDebugPanels } from '../debug/panels/bunbitdebug.js';
import { setMenuActive, menuActive } from '../gamestate.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.DASHBOARD, dashboardHandler);

const DASHBOARD_ID = 'bunbit-main-dashboard';
let cleanupFn = null;

// ─── Visual Atmosphere (from original main_dashboard.js) ──

function ensureKeyframes() {
    if (document.getElementById('bunbit-sigil-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'bunbit-sigil-spin-style';
    style.textContent = `
@keyframes bunbit-sigil-spin {
  from { transform: translate(-50%, 0) rotate(0deg); }
  to { transform: translate(-50%, 0) rotate(360deg); }
}
`;
    document.head.appendChild(style);
}

function createVisualAtmosphere(container) {
    const edgeGap = 20;

    // Pillar textures — spread across the viewport for perspective
    const pillarSrc = 'img/menu/main/pillar.png';
    const pillarOffsetFactor = 0.35;

    function createPillarImg(side) {
        const img = document.createElement('img');
        img.src = pillarSrc;
        img.alt = '';
        img.style.position = 'absolute';
        img.style.top = '0%';
        img.style.bottom = '0%';
        img.style.width = '512px';
        img.style.height = '100%';
        img.style.maxWidth = '60%';
        img.style.transform = 'translate(-50%, 0)';
        img.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
        img.style.mixBlendMode = 'overlay';
        img.style.borderRadius = '18%';
        img.style.clipPath = 'ellipse(48% 40% at 50% 50%)';
        img.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55)';
        img.style.pointerEvents = 'none';
        img.style.opacity = '0.94';
        img.style.zIndex = '0';

        const direction = side === 'left' ? -1 : 1;
        img.style.left = `calc(50% + (${direction} * ${pillarOffsetFactor} * 60vw))`;
        return img;
    }

    const pillarLeft = createPillarImg('left');
    pillarLeft.dataset.dashboardPillar = 'left';
    const pillarRight = createPillarImg('right');
    pillarRight.dataset.dashboardPillar = 'right';

    // Stairs texture — centred, receding for perspective
    const stairsSrc = 'img/menu/main/stairs.png';
    const stairsEl = document.createElement('img');
    stairsEl.src = stairsSrc;
    stairsEl.alt = '';
    stairsEl.style.position = 'absolute';
    stairsEl.style.left = '50%';
    stairsEl.style.bottom = '8%';
    stairsEl.style.transform = 'translate(-50%, 0) perspective(600px) rotateX(12deg)';
    stairsEl.style.width = '640px';
    stairsEl.style.height = 'auto';
    stairsEl.style.maxWidth = '45%';
    stairsEl.style.zIndex = '1';
    stairsEl.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
    stairsEl.style.mixBlendMode = 'overlay';
    stairsEl.style.opacity = '0.85';
    stairsEl.style.pointerEvents = 'none';
    stairsEl.dataset.dashboardStairs = '1';

    // Spinning sigil — centred
    const sigilSrc = 'img/logo/logo-ascii-transparent-sigil-blend.png';
    const sigilEl = document.createElement('img');
    sigilEl.src = sigilSrc;
    sigilEl.alt = '';
    Object.assign(sigilEl.style, {
        position: 'absolute',
        left: '50%',
        top: '30%',
        transform: 'translate(-50%, 0)',
        width: '320px',
        height: '320px',
        maxWidth: '50%',
        filter: 'brightness(4.90) contrast(10.15) saturate(10.2)',
        mixBlendMode: 'overlay',
        clipPath: 'ellipse(50% 50% at 50% 50%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        pointerEvents: 'none',
        zIndex: '0'
    });
    sigilEl.style.animation = 'bunbit-sigil-spin 25s linear infinite';
    sigilEl.dataset.dashboardSigil = '1';

    // Face overlay — centred
    const faceSrc = 'img/logo/logo-ascii.png';
    const faceEl = document.createElement('img');
    faceEl.src = faceSrc;
    faceEl.alt = '';
    faceEl.dataset.dashboardFace = '1';
    Object.assign(faceEl.style, {
        position: 'absolute',
        left: '50%',
        top: '38%',
        transform: 'translate(-50%, 0)',
        width: '128px',
        height: '128px',
        maxWidth: '55%',
        filter: 'brightness(105.5) contrast(120) saturate(18)',
        mixBlendMode: 'overlay',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        pointerEvents: 'none',
        opacity: '1.7',
        zIndex: '1'
    });

    container.appendChild(pillarLeft);
    container.appendChild(pillarRight);
    container.appendChild(stairsEl);
    container.appendChild(sigilEl);
    container.appendChild(faceEl);
}

function applyThemeTint(box) {
    try {
        const t = themeManager?.getCurrentTheme?.();
        if (t?.border) box.style.borderColor = t.border;
    } catch (_) { }
}

// ─── Dashboard Layout ─────────────────────────────────────

function createDashboard() {
    // Remove existing dashboard if present
    const existing = document.getElementById(DASHBOARD_ID);
    if (existing) existing.remove();

    ensureKeyframes();

    const dashboard = document.createElement('div');
    dashboard.id = DASHBOARD_ID;
    dashboard.dataset.engineDashboard = '1';
    dashboard.style.position = 'fixed';
    dashboard.style.left = '20px';
    dashboard.style.top = '20px';
    dashboard.style.right = '20px';
    dashboard.style.bottom = '20px';
    dashboard.style.pointerEvents = 'none';
    dashboard.style.userSelect = 'none';
    dashboard.style.zIndex = '2147483644';
    dashboard.style.overflow = 'hidden';
    // NO neon border here — the glowing neon border is applied by the
    // theme manager to the gameplay canvas ONLY when inside the game.
    dashboard.style.background = 'transparent';
    dashboard.style.border = 'none';
    dashboard.style.boxShadow = 'none';
    dashboard.style.isolation = 'isolate';

    // Visual atmosphere layer
    const atmosphere = document.createElement('div');
    atmosphere.style.position = 'absolute';
    atmosphere.style.inset = '0';
    atmosphere.style.pointerEvents = 'none';
    atmosphere.style.zIndex = '0';
    createVisualAtmosphere(atmosphere);
    dashboard.appendChild(atmosphere);

    // ─── New Game Button (BOTTOM — keeps the spinning sigil visible) ──
    const newGameBtn = document.createElement('button');
    newGameBtn.id = 'bunbit-new-game-btn';
    newGameBtn.textContent = 'New Game';
    newGameBtn.style.cssText = `
        position: absolute;
        bottom: 7%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 16px 48px;
        font-family: ${GLOBAL_FONT};
        font-size: 20px;
        font-weight: bold;
        color: #cccccc;
        background: #1a1a1a;
        border: 1px solid #555555;
        border-radius: 4px;
        cursor: pointer;
        pointer-events: auto;
        transition: background 0.2s, color 0.2s;
        z-index: 2;
        letter-spacing: 2px;
    `;
    newGameBtn.addEventListener('mouseenter', () => {
        newGameBtn.style.background = '#333333';
        newGameBtn.style.color = '#ffffff';
    });
    newGameBtn.addEventListener('mouseleave', () => {
        newGameBtn.style.background = '#1a1a1a';
        newGameBtn.style.color = '#cccccc';
    });
    newGameBtn.addEventListener('click', () => {
        // Disable the button immediately to prevent a second click from
        // firing an invalid transition (e.g. DIALOGUE → NEW_GAME_PLACEHOLDER).
        newGameBtn.disabled = true;
        newGameBtn.style.opacity = '0.5';
        newGameBtn.style.pointerEvents = 'none';
        engineController.transitionTo(EngineState.NEW_GAME_PLACEHOLDER);
    });

    dashboard.appendChild(newGameBtn);

    // ─── Back to Game Button (only visible when game is active) ──
    const backToGameBtn = document.createElement('button');
    backToGameBtn.id = 'bunbit-back-to-game-btn';
    backToGameBtn.textContent = 'Back to Game';
    backToGameBtn.style.cssText = `
        position: absolute;
        bottom: 14%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 12px 36px;
        font-family: ${GLOBAL_FONT};
        font-size: 16px;
        font-weight: bold;
        color: #cccccc;
        background: #1a1a1a;
        border: 1px solid #555555;
        border-radius: 4px;
        cursor: pointer;
        pointer-events: auto;
        transition: background 0.2s, color 0.2s;
        z-index: 2;
        letter-spacing: 2px;
        display: none;
    `;
    backToGameBtn.addEventListener('mouseenter', () => {
        backToGameBtn.style.background = '#333333';
        backToGameBtn.style.color = '#ffffff';
    });
    backToGameBtn.addEventListener('mouseleave', () => {
        backToGameBtn.style.background = '#1a1a1a';
        backToGameBtn.style.color = '#cccccc';
    });
    backToGameBtn.addEventListener('click', () => {
        if (typeof window !== 'undefined' && window.__bunbitGameActive) {
            window.__bunbitGameActive = false;
            const dashboard = document.getElementById(DASHBOARD_ID);
            if (dashboard) dashboard.remove();
            engineController.transitionTo(EngineState.GAMEPLAY);
        }
    });

    dashboard.appendChild(backToGameBtn);

    // ─── Debug Button (bottom-right, subtle) ──────────────
    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.id = 'bunbit-debug-toggle-btn';
    debugToggleBtn.textContent = '⚙';
    debugToggleBtn.title = 'Toggle debug panels';
    debugToggleBtn.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 32px;
        height: 32px;
        font-size: 16px;
        color: #333333;
        background: transparent;
        border: 1px solid rgba(85,85,85,0.3);
        border-radius: 4px;
        cursor: pointer;
        pointer-events: auto;
        z-index: 2;
        opacity: 0.4;
        transition: opacity 0.3s, color 0.3s, border-color 0.3s;
    `;
    debugToggleBtn.addEventListener('mouseenter', () => {
        debugToggleBtn.style.opacity = '0.8';
        debugToggleBtn.style.color = '#cccccc';
        debugToggleBtn.style.borderColor = 'rgba(85,85,85,0.6)';
    });
    debugToggleBtn.addEventListener('mouseleave', () => {
        debugToggleBtn.style.opacity = '0.4';
        debugToggleBtn.style.color = '#333333';
        debugToggleBtn.style.borderColor = 'rgba(85,85,85,0.3)';
    });
    debugToggleBtn.addEventListener('click', () => {
        toggleDebugPanels();
    });

    dashboard.appendChild(debugToggleBtn);

    // ─── Assemble Dashboard ────────────────────────────────
    document.body.appendChild(dashboard);

    // Theme tint
    applyThemeTint(dashboard);
    window.addEventListener('themeChanged', () => applyThemeTint(dashboard));
}

/**
 * Handler for the DASHBOARD state.
 * Renders the dashboard UI with visual atmosphere and interactive sections.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function dashboardHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering DASHBOARD state');

    // Hide the canvas during dashboard (dashboard is HTML overlay)
    const canvas = document.getElementById('mainGameRender');
    if (canvas) {
        canvas.style.display = 'none';
    }

    createDashboard();

    // Show/hide Back to Game button based on whether game is active
    const backToGameBtn = document.getElementById('bunbit-back-to-game-btn');
    if (backToGameBtn) {
        if (typeof window !== 'undefined' && window.__bunbitGameActive) {
            backToGameBtn.style.display = '';
        } else {
            backToGameBtn.style.display = 'none';
        }
    }

    // Cleanup function
    // NOTE: The dashboard is NOT removed here so that the New Game cinematic
    // can reuse the existing sigil element. The dialogue handler removes
    // the dashboard after the cinematic completes.
    cleanupFn = () => {
        if (canvas) canvas.style.display = '';
    };

    return cleanupFn;
}

export default dashboardHandler;

