// ============================================================
// DASHBOARD UI
// ============================================================
// Renders the main dashboard with the visual atmosphere
// (pillars, spinning sigil, stairs) from the original
// main_dashboard.js, plus two separate interactive sections:
//   - Player Section: New Game button, Saved Game placeholder
//   - Developer Section: DEBUG PLAY button
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';
import { themeManager } from '../themes/thememanager.js';
import { defaultDebugVisible, setDebugVisible, showDebugTools, setShowDebugTools } from '../globals.js';
import { memCpuGodFunction, stopMemCpuMonitor } from '../debug/panels/memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from '../debug/debughandler.js';

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

    // Pillar textures
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
    const pillarRight = createPillarImg('right');

    // Stairs texture
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

    // Spinning sigil
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

    // Face overlay
    const faceSrc = 'img/logo/logo-ascii.png';
    const faceEl = document.createElement('img');
    faceEl.src = faceSrc;
    faceEl.alt = '';
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
    dashboard.style.borderRadius = '8px';
    dashboard.style.border = '2px solid rgba(252,0,0,0.95)';
    dashboard.style.boxShadow = '0 6px 30px rgba(252,0,0,0.35)';
    dashboard.style.isolation = 'isolate';

    // Visual atmosphere layer
    const atmosphere = document.createElement('div');
    atmosphere.style.position = 'absolute';
    atmosphere.style.inset = '0';
    atmosphere.style.pointerEvents = 'none';
    atmosphere.style.zIndex = '0';
    createVisualAtmosphere(atmosphere);
    dashboard.appendChild(atmosphere);

    // ─── Player Section (TOP) ──────────────────────────────
    const playerSection = document.createElement('div');
    playerSection.dataset.engineSection = 'player';
    playerSection.style.pointerEvents = 'auto';
    playerSection.style.position = 'absolute';
    playerSection.style.top = '40px';
    playerSection.style.left = '50%';
    playerSection.style.transform = 'translateX(-50%)';
    playerSection.style.display = 'flex';
    playerSection.style.flexDirection = 'column';
    playerSection.style.alignItems = 'center';
    playerSection.style.gap = '12px';
    playerSection.style.zIndex = '2';

    const playerLabel = document.createElement('h2');
    playerLabel.textContent = 'Player';
    playerLabel.style.color = '#FC0000';
    playerLabel.style.fontSize = '20px';
    playerLabel.style.margin = '0 0 8px 0';
    playerLabel.style.fontFamily = "'Courier New', monospace";
    playerLabel.style.textShadow = '0 0 10px rgba(255,0,0,0.5)';

    // New Game button
    const newGameBtn = document.createElement('button');
    newGameBtn.id = 'bunbit-new-game-btn';
    newGameBtn.textContent = 'New Game';
    newGameBtn.style.cssText = `
        padding: 12px 32px;
        font-family: 'Courier New', monospace;
        font-size: 16px;
        font-weight: bold;
        color: #FC0000;
        background: #1a0000;
        border: 2px solid #FC0000;
        border-radius: 4px;
        cursor: pointer;
        pointer-events: auto;
        transition: background 0.2s, color 0.2s;
        min-width: 200px;
    `;
    newGameBtn.addEventListener('mouseenter', () => {
        newGameBtn.style.background = '#FC0000';
        newGameBtn.style.color = '#000';
    });
    newGameBtn.addEventListener('mouseleave', () => {
        newGameBtn.style.background = '#1a0000';
        newGameBtn.style.color = '#FC0000';
    });
    newGameBtn.addEventListener('click', () => {
        engineController.transitionTo(EngineState.NEW_GAME_PLACEHOLDER);
    });

    // Saved Game placeholder
    const savedGameSection = document.createElement('div');
    savedGameSection.style.cssText = `
        margin-top: 16px;
        padding: 12px 24px;
        border: 1px solid rgba(252,0,0,0.3);
        border-radius: 4px;
        color: #663333;
        font-size: 14px;
        text-align: center;
        min-width: 200px;
    `;
    const savedGameLabel = document.createElement('div');
    savedGameLabel.textContent = 'Saved Game';
    savedGameLabel.style.fontWeight = 'bold';
    savedGameLabel.style.marginBottom = '4px';
    const savedGamePlaceholder = document.createElement('div');
    savedGamePlaceholder.textContent = '(No save system implemented yet)';
    savedGamePlaceholder.style.fontSize = '12px';
    savedGamePlaceholder.style.opacity = '0.6';
    savedGameSection.appendChild(savedGameLabel);
    savedGameSection.appendChild(savedGamePlaceholder);

    playerSection.appendChild(playerLabel);
    playerSection.appendChild(newGameBtn);
    playerSection.appendChild(savedGameSection);

    // ─── Developer Section (BOTTOM) ─────────────────────────
    const devSection = document.createElement('div');
    devSection.dataset.engineSection = 'developer';
    devSection.style.pointerEvents = 'auto';
    devSection.style.position = 'absolute';
    devSection.style.bottom = '40px';
    devSection.style.left = '50%';
    devSection.style.transform = 'translateX(-50%)';
    devSection.style.display = 'flex';
    devSection.style.flexDirection = 'column';
    devSection.style.alignItems = 'center';
    devSection.style.gap = '8px';
    devSection.style.zIndex = '2';

    const devLabel = document.createElement('h2');
    devLabel.textContent = 'Developer';
    devLabel.style.color = '#FC0000';
    devLabel.style.fontSize = '20px';
    devLabel.style.margin = '0 0 8px 0';
    devLabel.style.fontFamily = "'Courier New', monospace";
    devLabel.style.textShadow = '0 0 10px rgba(255,0,0,0.5)';

    // DEBUG PLAY button
    const debugPlayBtn = document.createElement('button');
    debugPlayBtn.id = 'bunbit-debug-play-btn';
    debugPlayBtn.textContent = 'DEBUG PLAY';
    debugPlayBtn.style.cssText = `
        padding: 12px 32px;
        font-family: 'Courier New', monospace;
        font-size: 16px;
        font-weight: bold;
        color: #00FF00;
        background: #001a00;
        border: 2px solid #00FF00;
        border-radius: 4px;
        cursor: pointer;
        pointer-events: auto;
        transition: background 0.2s, color 0.2s;
        min-width: 200px;
    `;
    debugPlayBtn.addEventListener('mouseenter', () => {
        debugPlayBtn.style.background = '#00FF00';
        debugPlayBtn.style.color = '#000';
    });
    debugPlayBtn.addEventListener('mouseleave', () => {
        debugPlayBtn.style.background = '#001a00';
        debugPlayBtn.style.color = '#00FF00';
    });
    debugPlayBtn.addEventListener('click', () => {
        // Show all debug panels and monitoring when DEBUG PLAY is used
        setDebugVisible(true);
        setShowDebugTools(true);
        try { memCpuGodFunction(); } catch (e) { /* memcpu may already be running */ }
        try { debugHandlerGodFunction(); } catch (e) { /* debug terminal may already be running */ }
    });

    devSection.appendChild(devLabel);
    devSection.appendChild(debugPlayBtn);

    // ─── Assemble Dashboard ────────────────────────────────
    dashboard.appendChild(atmosphere);
    dashboard.appendChild(playerSection);
    dashboard.appendChild(devSection);

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

    // Cleanup function
    cleanupFn = () => {
        const el = document.getElementById(DASHBOARD_ID);
        if (el) el.remove();
        if (canvas) canvas.style.display = '';
    };

    return cleanupFn;
}

export default dashboardHandler;
