// ============================================================
// IN-GAME MENU UI
// ============================================================
// Minimal in-game menu with four buttons:
//   - Play (resume gameplay)
//   - Settings (open settings menu)
//   - Select Map (placeholder for future map selection)
//   - Return to Dashboard
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';
import { GLOBAL_FONT } from '../globals.js';
import { setMenuActive, menuActive } from '../gamestate.js';
import { startMenuLoop, attachSettingsMenuHandlers, initFileInput } from '../menus/ingame_menu/settings/menusettings.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.INGAME_MENU, ingameMenuHandler);

const INGAME_MENU_ID = 'bunbit-ingame-menu';
let cleanupFn = null;

/**
 * Handler for the INGAME_MENU state.
 * Renders a minimal overlay menu.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function ingameMenuHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering INGAME_MENU state');

    // Remove any existing menu
    const existing = document.getElementById(INGAME_MENU_ID);
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = INGAME_MENU_ID;
    menu.dataset.engineIngameMenu = '1';
    menu.style.position = 'fixed';
    menu.style.inset = '0';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.alignItems = 'center';
    menu.style.justifyContent = 'center';
    menu.style.zIndex = '2147483646';
    menu.style.backgroundColor = 'rgba(10,10,10,0.85)';
    menu.style.fontFamily = GLOBAL_FONT;
    menu.style.pointerEvents = 'auto';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'PAUSED';
    title.style.cssText = `
        color: #cccccc;
        font-size: 28px;
        margin: 0 0 24px 0;
        font-weight: bold;
    `;

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '12px';
    buttonContainer.style.alignItems = 'center';

    // Play button
    const playBtn = document.createElement('button');
    playBtn.id = 'bunbit-ingame-play-btn';
    playBtn.textContent = 'Play';
    playBtn.style.cssText = `
        padding: 10px 28px;
        font-family: ${GLOBAL_FONT};
        font-size: 14px;
        font-weight: bold;
        color: #cccccc;
        background: #1a1a1a;
        border: 1px solid #555555;
        border-radius: 4px;
        cursor: pointer;
        min-width: 180px;
    `;
    playBtn.addEventListener('mouseenter', () => {
        playBtn.style.background = '#333333';
        playBtn.style.color = '#ffffff';
    });
    playBtn.addEventListener('mouseleave', () => {
        playBtn.style.background = '#1a1a1a';
        playBtn.style.color = '#cccccc';
    });
    playBtn.addEventListener('click', () => {
        engineController.transitionTo(EngineState.GAMEPLAY);
    });

    // Settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'bunbit-ingame-settings-btn';
    settingsBtn.textContent = 'Settings';
    settingsBtn.style.cssText = `
        padding: 10px 28px;
        font-family: ${GLOBAL_FONT};
        font-size: 14px;
        font-weight: bold;
        color: #cccccc;
        background: #1a1a1a;
        border: 1px solid #555555;
        border-radius: 4px;
        cursor: pointer;
        min-width: 180px;
    `;
    settingsBtn.addEventListener('mouseenter', () => {
        settingsBtn.style.background = '#333333';
        settingsBtn.style.color = '#ffffff';
    });
    settingsBtn.addEventListener('mouseleave', () => {
        settingsBtn.style.background = '#1a1a1a';
        settingsBtn.style.color = '#cccccc';
    });
    settingsBtn.addEventListener('click', () => {
        console.log('[InGameMenu] Settings button clicked');
        // Remove in-game menu so settings menu (canvas-based) is visible
        const ingameMenu = document.getElementById(INGAME_MENU_ID);
        if (ingameMenu) {
            console.log('[InGameMenu] Removing in-game menu DOM overlay');
            ingameMenu.remove();
        } else {
            console.warn('[InGameMenu] In-game menu element not found');
        }
        console.log('[InGameMenu] Setting menuActive=true, was:', menuActive);
        setMenuActive(true);
        console.log('[InGameMenu] Starting settings menu loop');
        startMenuLoop();
        console.log('[InGameMenu] Attaching settings menu handlers');
        attachSettingsMenuHandlers();
        console.log('[InGameMenu] Initializing file input');
        initFileInput();
        console.log('[InGameMenu] Settings button click handler complete');
    });

    // Select Map button (placeholder)
    const mapBtn = document.createElement('button');
    mapBtn.id = 'bunbit-ingame-map-btn';
    mapBtn.textContent = 'Select Map';
    mapBtn.style.cssText = `
        padding: 10px 28px;
        font-family: ${GLOBAL_FONT};
        font-size: 14px;
        font-weight: bold;
        color: #cccccc;
        background: #1a1a1a;
        border: 1px solid #555555;
        border-radius: 4px;
        cursor: pointer;
        min-width: 180px;
        opacity: 0.5;
    `;
    mapBtn.title = 'Map selection not yet implemented';
    mapBtn.addEventListener('click', () => {
        console.log('[In-Game Menu] Map selection not yet implemented.');
    });

    // Return to Dashboard button
    const backBtn = document.createElement('button');
    backBtn.id = 'bunbit-ingame-back-btn';
    backBtn.textContent = 'Return to Dashboard';
    backBtn.style.cssText = `
        padding: 10px 28px;
        font-family: ${GLOBAL_FONT};
        font-size: 14px;
        font-weight: bold;
        color: #cccccc;
        background: #1a1a1a;
        border: 1px solid #555555;
        border-radius: 4px;
        cursor: pointer;
        min-width: 180px;
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
        // Returning to the dashboard means leaving gameplay, so clear the
        // "game active" flag to allow the dashboard to be re-created.
        if (typeof window !== 'undefined') window.__bunbitGameActive = false;
        if (typeof window !== 'undefined' && window.engineController) {
            window.engineController.transitionTo(EngineState.DASHBOARD);
        }
    });

    buttonContainer.appendChild(playBtn);
    buttonContainer.appendChild(settingsBtn);
    buttonContainer.appendChild(mapBtn);
    buttonContainer.appendChild(backBtn);

    menu.appendChild(title);
    menu.appendChild(buttonContainer);

    document.body.appendChild(menu);

    // ESC key handler to resume gameplay directly from the in-game menu
    function handleIngameMenuKeydown(e) {
        if (e.key === 'Escape') {
            engineController.transitionTo(EngineState.GAMEPLAY);
        }
    }
    document.addEventListener('keydown', handleIngameMenuKeydown);

    // Cleanup function
    cleanupFn = () => {
        const el = document.getElementById(INGAME_MENU_ID);
        if (el) el.remove();
        document.removeEventListener('keydown', handleIngameMenuKeydown);
    };

    return cleanupFn;
}

export default ingameMenuHandler;
