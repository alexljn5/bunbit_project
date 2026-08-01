// ============================================================
// NEW GAME PLACEHOLDER UI
// ============================================================
// Reserves the future location for:
//   - intro dialogue
//   - Patches
//   - Vesper
//   - save slot creation
//   - cinematic transitions
// No gameplay or dialogue is implemented yet.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.NEW_GAME_PLACEHOLDER, newGamePlaceholderHandler);

const PLACEHOLDER_ID = 'bunbit-newgame-placeholder';
let cleanupFn = null;

/**
 * Handler for the NEW_GAME_PLACEHOLDER state.
 * Renders a minimal placeholder screen.
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

    const placeholder = document.createElement('div');
    placeholder.id = PLACEHOLDER_ID;
    placeholder.dataset.enginePlaceholder = '1';
    placeholder.style.position = 'fixed';
    placeholder.style.inset = '0';
    placeholder.style.display = 'flex';
    placeholder.style.flexDirection = 'column';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.zIndex = '2147483644';
    placeholder.style.backgroundColor = '#0a0000';
    placeholder.style.fontFamily = "'Courier New', monospace";
    placeholder.style.pointerEvents = 'auto';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'NEW GAME';
    title.style.cssText = `
        color: #FC0000;
        font-size: 32px;
        margin: 0 0 8px 0;
        text-shadow: 0 0 20px rgba(255,0,0,0.5);
    `;

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Placeholder';
    subtitle.style.cssText = `
        color: #663333;
        font-size: 16px;
        margin: 0 0 24px 0;
    `;

    // Future content note
    const note = document.createElement('p');
    note.textContent = 'Future intro sequence starts here.';
    note.style.cssText = `
        color: #442222;
        font-size: 12px;
        margin: 0;
        opacity: 0.5;
    `;

    // Return to dashboard button
    const backBtn = document.createElement('button');
    backBtn.id = 'bunbit-placeholder-back-btn';
    backBtn.textContent = 'Return to Dashboard';
    backBtn.style.cssText = `
        margin-top: 32px;
        padding: 10px 24px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #FC0000;
        background: #1a0000;
        border: 1px solid #FC0000;
        border-radius: 4px;
        cursor: pointer;
    `;
    backBtn.addEventListener('mouseenter', () => {
        backBtn.style.background = '#FC0000';
        backBtn.style.color = '#000';
    });
    backBtn.addEventListener('mouseleave', () => {
        backBtn.style.background = '#1a0000';
        backBtn.style.color = '#FC0000';
    });
    backBtn.addEventListener('click', () => {
        engineController.transitionTo(EngineState.DASHBOARD);
    });

    placeholder.appendChild(title);
    placeholder.appendChild(subtitle);
    placeholder.appendChild(note);
    placeholder.appendChild(backBtn);

    document.body.appendChild(placeholder);

    // Cleanup function
    cleanupFn = () => {
        const el = document.getElementById(PLACEHOLDER_ID);
        if (el) el.remove();
    };

    return cleanupFn;
}

export default newGamePlaceholderHandler;
