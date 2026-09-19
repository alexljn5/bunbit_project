import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT, skyboxEnabled, skyColorTop, skyColorHorizon } from '../globals.js';
import { setMenuActive } from '../gamestate.js';
import { gameLoop } from '../game_loop.js';
import { setupMenuClickHandler } from '../menus/ingame_menu/game_menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './panels/memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from './debughandler.js';
import { themeManager } from '../themes/thememanager.js';
import { defaultThemeName, DEBUG_START_INTRO_ANIMATION } from '../globals.js';
import { mapHandler } from '../mapdata/maphandler.js';
import { mapTable } from '../mapdata/maps.js';
import { transparentWallTextureKeys } from '../mapdata/maptexturesloader.js';

import { togglePositionPanel } from './panels/positionpanel.js';
import { toggleEntityEditor } from './jimhatepreview.js';



// Local defaults to avoid importing theme manager (prevents load-order/circular issues)

const DEFAULT_BORDER = '#FC0000';
const DEFAULT_BACKGROUND = '#0a0000';
const DEFAULT_TEXT = '#FC0000';
const DEFAULT_BUTTON_BG = '#1a0000';

// Lightweight standalone control panel module
export function initControlPanel() {
    // Remove existing panel if present
    const existingPanel = document.getElementById('bunbit-debug-panel');
    if (existingPanel) existingPanel.remove();

    const debugPanel = document.createElement('div');
    debugPanel.id = 'bunbit-debug-panel';
    // Compact panel: 220x420px self-contained box (extra height for new controls)
    const panelWidth = 220;
    const panelHeight = 420;
    const edgeGap = 20; // px from viewport edges
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = `${edgeGap}px`;
    debugPanel.style.left = `${edgeGap}px`;
    debugPanel.style.width = `${panelWidth * SCALE_X}px`;
    debugPanel.style.height = `${panelHeight * SCALE_Y}px`;
    debugPanel.style.padding = `${12 * SCALE_Y}px ${12 * SCALE_X}px`;
    debugPanel.style.border = `${2 * SCALE_X}px solid ${DEFAULT_BORDER}`;
    debugPanel.style.borderRadius = `${8 * SCALE_X}px`;
    debugPanel.style.zIndex = '2147483648';
    debugPanel.style.display = 'flex';
    debugPanel.style.flexDirection = 'column';
    debugPanel.style.alignItems = 'flex-start';
    debugPanel.style.justifyContent = 'flex-start';
    debugPanel.style.cursor = 'default';
    debugPanel.style.pointerEvents = 'auto';
    debugPanel.style.minWidth = 'auto';
    debugPanel.style.minHeight = 'auto';
    debugPanel.style.userSelect = 'none';
    // Prevent transform inheritance from fullscreen scaling
    debugPanel.style.isolation = 'isolate';
    debugPanel.style.overflow = 'hidden';
    // Ensure no inherited transforms affect the panel
    debugPanel.style.transform = 'none';
    debugPanel.style.transformOrigin = 'top left';

    const header = document.createElement('div');
    header.style.width = '100%';
    header.style.height = `${24 * SCALE_Y}px`;
    header.style.position = 'relative';
    header.style.cursor = 'move';
    header.style.backgroundColor = '#1a0000';
    header.style.borderBottom = `${1 * SCALE_X}px solid ${DEFAULT_BORDER}`;
    header.style.marginBottom = `${8 * SCALE_Y}px`;
    header.style.flexShrink = '0';
    // Header title
    const headerTitle = document.createElement('span');
    headerTitle.textContent = 'DEBUG PANEL';
    headerTitle.style.color = DEFAULT_TEXT;
    headerTitle.style.fontSize = `${12 * SCALE_Y}px`;
    headerTitle.style.fontWeight = 'bold';
    headerTitle.style.display = 'block';
    headerTitle.style.textAlign = 'center';
    headerTitle.style.lineHeight = `${24 * SCALE_Y}px`;
    header.appendChild(headerTitle);

    const reloadButton = document.createElement('button');
    reloadButton.id = 'bunbit-reload-button';
    reloadButton.textContent = 'Reload';

    const playButton = document.createElement('button');
    playButton.id = 'bunbit-play-button';
    playButton.textContent = '▶ Play';

    const stopButton = document.createElement('button');
    stopButton.id = 'bunbit-stop-button';
    stopButton.textContent = '⏹ Stop';

    const showDebugButton = document.createElement('button');
    showDebugButton.id = 'bunbit-debug-toggle';
    showDebugButton.textContent = 'Show Debug';

    // Debug-only: replay the intro ASCII animation without restarting the script
    const replayIntroButton = document.createElement('button');
    replayIntroButton.id = 'bunbit-replay-intro';
    replayIntroButton.textContent = '↻ Replay Intro';

    const positionButton = document.createElement('button');
    positionButton.id = 'bunbit-position-toggle';
    positionButton.textContent = 'Scale';

    // Entity Editor button
    const jimHatePreviewButton = document.createElement('button');
    jimHatePreviewButton.id = 'bunbit-entity-editor';
    jimHatePreviewButton.textContent = 'Entity Editor';

    // Theme selector dropdown
    const themeSelector = document.createElement('select');
    themeSelector.id = 'bunbit-theme-selector';
    themeSelector.style.padding = `${6 * SCALE_Y}px ${10 * SCALE_X}px`;
    themeSelector.style.cursor = 'pointer';
    themeSelector.style.border = `${1 * SCALE_X}px solid ${DEFAULT_BORDER}`;
    themeSelector.style.borderRadius = `${4 * SCALE_X}px`;
    themeSelector.style.fontSize = `${11 * SCALE_Y}px`;
    themeSelector.style.fontWeight = 'bold';
    themeSelector.style.marginTop = `${4 * SCALE_Y}px`;
    themeSelector.style.backgroundColor = DEFAULT_BUTTON_BG;
    themeSelector.style.color = DEFAULT_TEXT;
    themeSelector.style.width = '100%';
    themeSelector.style.boxSizing = 'border-box';

    // Populate theme options
    window.defaultThemeName = window.defaultThemeName || defaultThemeName;
    ['calm', 'hacky', 'highcontrast', 'evil'].forEach(themeName => {
        const option = document.createElement('option');

        option.value = themeName;
        option.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        option.selected = themeName === (window.defaultThemeName || 'evil');
        themeSelector.appendChild(option);
    });


    // Handle theme changes
    themeSelector.addEventListener('change', (e) => {
        themeManager.setTheme(e.target.value);
    });

    // Apply default theme immediately
    try { themeManager.setTheme(defaultThemeName); } catch (e) { /* ignore */ }

    // ─── Map Selector ─────────────────────────────────────
    const mapSelector = document.createElement('select');
    mapSelector.id = 'bunbit-debug-map-selector';
    mapSelector.title = 'Select map (debug)';
    mapSelector.style.cssText = `
        padding: ${6 * SCALE_Y}px ${10 * SCALE_X}px;
        cursor: pointer;
        border: ${1 * SCALE_X}px solid ${DEFAULT_BORDER};
        border-radius: ${4 * SCALE_X}px;
        font-size: ${11 * SCALE_Y}px;
        font-weight: bold;
        margin-top: ${4 * SCALE_Y}px;
        background-color: ${DEFAULT_BUTTON_BG};
        color: ${DEFAULT_TEXT};
        width: 100%;
        box-sizing: border-box;
    `;

    // Populate map options using actual map keys
    for (const [key] of mapTable.entries()) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        if (mapHandler.activeMapKey === key) option.selected = true;
        mapSelector.appendChild(option);
    }

    mapSelector.addEventListener('change', async (e) => {
        const selectedMap = e.target.value;
        if (selectedMap && mapHandler.activeMapKey !== selectedMap) {
            try {
                const p = window.__playerPosition || { x: 75, z: 75, angle: 0 };
                await mapHandler.loadMap(selectedMap, p);
                console.log(`[DebugPanel] Switched to map: ${selectedMap}`);
            } catch (err) {
                console.error(`[DebugPanel] Failed to load map ${selectedMap}:`, err);
            }
        }
    });

    // ─── Skybox Toggle ────────────────────────────────────
    const skyboxButton = document.createElement('button');
    skyboxButton.id = 'bunbit-skybox-toggle';
    skyboxButton.textContent = `Skybox: ${skyboxEnabled ? 'ON' : 'OFF'}`;
    skyboxButton.style.cssText = `
        padding: ${6 * SCALE_Y}px ${10 * SCALE_X}px;
        cursor: pointer;
        border: ${1 * SCALE_X}px solid ${DEFAULT_BORDER};
        border-radius: ${4 * SCALE_X}px;
        font-size: ${11 * SCALE_Y}px;
        font-weight: bold;
        margin-top: ${4 * SCALE_Y}px;
        background-color: ${DEFAULT_BUTTON_BG};
        color: ${DEFAULT_TEXT};
        width: 100%;
        box-sizing: border-box;
    `;
    skyboxButton.addEventListener('click', () => {
        skyboxEnabled = !skyboxEnabled;
        skyboxButton.textContent = `Skybox: ${skyboxEnabled ? 'ON' : 'OFF'}`;
        console.log(`[DebugPanel] Skybox ${skyboxEnabled ? 'enabled' : 'disabled'}`);
    });

    // ─── Transparent Wall Toggle ─────────────────────────
    const transparentWallButton = document.createElement('button');
    transparentWallButton.id = 'bunbit-transparent-wall-toggle';
    transparentWallButton.textContent = 'Transparent Walls: OFF';
    transparentWallButton.style.cssText = `
        padding: ${6 * SCALE_Y}px ${10 * SCALE_X}px;
        cursor: pointer;
        border: ${1 * SCALE_X}px solid ${DEFAULT_BORDER};
        border-radius: ${4 * SCALE_X}px;
        font-size: ${11 * SCALE_Y}px;
        font-weight: bold;
        margin-top: ${4 * SCALE_Y}px;
        background-color: ${DEFAULT_BUTTON_BG};
        color: ${DEFAULT_TEXT};
        width: 100%;
        box-sizing: border-box;
    `;
    transparentWallButton.addEventListener('click', () => {
        const isCurrentlyTransparent = transparentWallTextureKeys.has('wall_creamlol');
        if (isCurrentlyTransparent) {
            transparentWallTextureKeys.delete('wall_creamlol');
            transparentWallButton.textContent = 'Transparent Walls: OFF';
            console.log('[DebugPanel] Transparent walls disabled');
        } else {
            transparentWallTextureKeys.add('wall_creamlol');
            transparentWallButton.textContent = 'Transparent Walls: ON';
            console.log('[DebugPanel] Transparent walls enabled (wall_creamlol)');
        }
    });

    // basic styling for readability - compact buttons
    [reloadButton, playButton, stopButton, showDebugButton, positionButton, jimHatePreviewButton, mapSelector, skyboxButton, transparentWallButton].forEach(btn => {
        btn.style.padding = `${6 * SCALE_Y}px ${10 * SCALE_X}px`;
        btn.style.cursor = 'pointer';
        btn.style.border = `${1 * SCALE_X}px solid ${DEFAULT_BORDER}`;
        btn.style.borderRadius = `${4 * SCALE_X}px`;
        btn.style.fontSize = `${11 * SCALE_Y}px`;
        btn.style.fontWeight = 'bold';
        btn.style.marginTop = `${4 * SCALE_Y}px`;
        btn.style.backgroundColor = DEFAULT_BUTTON_BG;
        btn.style.color = DEFAULT_TEXT;
        btn.style.width = '100%';
        btn.style.boxSizing = 'border-box';
    });

    // Theme selector - compact
    themeSelector.style.padding = `${6 * SCALE_Y}px ${10 * SCALE_X}px`;
    themeSelector.style.fontSize = `${11 * SCALE_Y}px`;
    themeSelector.style.marginTop = `${4 * SCALE_Y}px`;
    themeSelector.style.width = '100%';
    themeSelector.style.boxSizing = 'border-box';
    themeSelector.style.position = 'relative';
    themeSelector.style.top = 'auto';
    themeSelector.style.right = 'auto';

    // Set panel background
    debugPanel.style.backgroundColor = DEFAULT_BACKGROUND;

    // Ensure header and buttons render above
    header.style.zIndex = '3';

    debugPanel.appendChild(header);

    debugPanel.appendChild(reloadButton);
    debugPanel.appendChild(playButton);
    debugPanel.appendChild(stopButton);
    debugPanel.appendChild(showDebugButton);
    debugPanel.appendChild(replayIntroButton);
    debugPanel.appendChild(positionButton);
    debugPanel.appendChild(jimHatePreviewButton);
    debugPanel.appendChild(themeSelector);
    debugPanel.appendChild(mapSelector);
    debugPanel.appendChild(skyboxButton);
    debugPanel.appendChild(transparentWallButton);
    document.body.appendChild(debugPanel);

    // Notify other systems that the control panel exists now (ThemeManager listens for this)
    try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new Event('controlPanelReady'));
        }
    } catch (e) {
        // ignore in restricted environments
    }

    // Defensive: if another script removes the panel, re-create it up to N times
    let removalRetries = 0;
    const maxRemovalRetries = 5;
    const observer = new MutationObserver((mutations) => {
        const exists = !!document.getElementById('bunbit-debug-panel');
        if (!exists && removalRetries < maxRemovalRetries) {
            removalRetries++;
            console.warn('bunbit-debug-panel removed externally — re-inserting (attempt', removalRetries, ')');
            try {
                // Re-create by calling initControlPanel again
                // Avoid infinite recursion by scheduling next tick
                setTimeout(() => initControlPanel(), 50);
            } catch (e) {
                console.error('Failed to re-init control panel:', e);
            }
        }
        if (removalRetries >= maxRemovalRetries) {
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: false });

    // Button handlers
    reloadButton.addEventListener('click', async () => {
        // Try Tauri API first
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('reload_window');
                return;
            } catch (e) {
                console.warn('Tauri reload failed, falling back to window reload');
            }
        }
        // Fallback to window reload
        if (window.location && typeof window.location.reload === 'function') {
            window.location.reload();
        }
    });

    // Replay button: runs intro placeholder from src/intro.html-like logic
    replayIntroButton.addEventListener('click', async () => {
        try {
            const mod = await import('../animations/introplaceholder.js');

            // Reset intro placeholder state so it can run again.
            // (The module uses internal `hasRun`, so we force a full reload by bypassing autorun and calling maybeShowIntroPlaceholders directly.)
            if (typeof window !== 'undefined' && typeof window.setIntroActive === 'function') {
                window.setIntroActive(true);
            }
            if (typeof window !== 'undefined') window.introActive = true;

            // Load intro.html to get the correct fullscreen black page + intro script lifecycle,
            // then load main_game.html again after the animation completes.
            await new Promise(async (resolve, reject) => {
                try {
                    if (typeof window !== 'undefined') {
                        // Ensure we don't reuse an already-loaded module instance
                        // by doing a full page reload cycle.
                        window.location.href = 'intro.html';
                    }
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            console.error('Replay Intro failed:', e);
        }
    });

    async function tryPlayGame(maxRetries = 10, delayMs = 100) {
        let retries = 0;
        while (retries < maxRetries) {
            if (typeof setMenuActive === 'function' && typeof gameLoop === 'function' && typeof setupMenuClickHandler === 'function' && typeof gameRenderEngine === 'function' && typeof initializeRenderWorkers === 'function') {
                try {
                    setMenuActive(true);
                    setupMenuClickHandler();

                    // Ensure canvas is visible (may be hidden by dashboard)
                    const canvas = document.getElementById('mainGameRender');
                    if (canvas) {
                        canvas.style.display = '';

                        // ─── HARD RESET CANVAS DISPLAY ─────────────────────
                        // The intro animation (introplaceholder.js) resizes the
                        // backing store to fullscreen and injects a `100vw/100vh
                        // !important` stylesheet. Fix both so the render is
                        // exactly CANVAS_WIDTH x CANVAS_HEIGHT and centered.
                        //
                        // 1) Remove the intro-injected fullscreen stylesheet.
                        const introStyle = document.getElementById('bunbit-intro-styles');
                        if (introStyle) introStyle.remove();
                        // 2) Remove intro overlay elements.
                        document.querySelectorAll('.intro-static, .intro-loading').forEach(el => el.remove());
                        const introMarker = document.getElementById('intro-styles-injected');
                        if (introMarker) introMarker.remove();

                        // 3) Reset the backing store unconditionally.
                        canvas.width = CANVAS_WIDTH;
                        canvas.height = CANVAS_HEIGHT;

                        // 4) Reset all inline display styles so no leftover
                        //    transform/position/size from the intro or scaling
                        //    panel can interfere.
                        canvas.style.position = 'fixed';
                        canvas.style.top = '50%';
                        canvas.style.left = '50%';
                        canvas.style.right = 'auto';
                        canvas.style.bottom = 'auto';
                        canvas.style.transform = 'translate(-50%, -50%)';
                        canvas.style.transformOrigin = 'center';
                        canvas.style.zIndex = '2147483650';
                        canvas.style.width = CANVAS_WIDTH + 'px';
                        canvas.style.height = CANVAS_HEIGHT + 'px';
                        canvas.style.maxWidth = 'none';
                        canvas.style.maxHeight = 'none';
                        canvas.style.aspectRatio = 'auto';
                        canvas.style.objectFit = 'contain';
                        canvas.style.imageRendering = 'pixelated';
                        canvas.style.border = 'none';
                        canvas.style.boxShadow = 'none';
                    }

                    // Remove dashboard overlay so it doesn't cover the game canvas
                    const dashboard = document.getElementById('bunbit-main-dashboard');
                    if (dashboard) dashboard.remove();

                    // Mark the game as active so the dashboard handler does not
                    // re-create the pillars/sigil overlay while the game runs.
                    if (typeof window !== 'undefined') window.__bunbitGameActive = true;

                    // Also transition the engine to GAMEPLAY so the DASHBOARD
                    // state handler cleanup runs properly.
                    try {
                        const engineMod = await import('../engine/engine.js');
                        if (engineMod.engineController &&
                            typeof engineMod.engineController.transitionTo === 'function' &&
                            engineMod.engineController.currentState !== 'GAMEPLAY') {
                            // Only transition if a valid transition exists.
                            await engineMod.engineController.transitionTo('GAMEPLAY');
                        }
                    } catch (e) {
                        console.warn('Could not transition engine to GAMEPLAY:', e);
                    }

                    if (!window.game) {
                        window.game = gameLoop(gameRenderEngine);
                        initializeRenderWorkers();
                    }
                    if (window.game && typeof window.game.start === 'function') {
                        window.game.start();
                        return true;
                    }

                } catch (e) { console.error('Play button error:', e); }
            }
            retries++;
            await new Promise(r => setTimeout(r, delayMs));
        }
        alert('Could not start game: dependencies not loaded.');
        return false;
    }
    playButton.addEventListener('click', () => tryPlayGame());

    function tryStopGame() {
        try {
            // Remove the gameplay marker so the neon border disappears when
            // the debug Stop button halts the game.
            if (typeof document !== 'undefined' && document.body) {
                document.body.classList.remove('bunbit-gameplay');
            }

            // Stop active game loop first
            if (window.game && typeof window.game.stop === 'function') {
                window.game.stop();
            }

            // Mark game as no longer active so the dashboard can be re-created
            // when returning to the dashboard state.
            if (typeof window !== 'undefined') window.__bunbitGameActive = false;

            // Always reset menu state + UI
            setMenuActive(true);

            const canvas = document.getElementById('mainGameRender');
            if (canvas && canvas.getContext) {
                if (canvas.width === 0 || canvas.height === 0) {
                    canvas.width = CANVAS_WIDTH;
                    canvas.height = CANVAS_HEIGHT;
                }
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }

            // Cleanup workers + lighting regardless of whether game.stop() existed
            cleanupRenderWorkers();
        } catch (e) { console.error('Stop button error:', e); }
    }

    stopButton.addEventListener('click', () => tryStopGame());

    // Show Debug toggles other debug features but keeps the control panel visible
    showDebugButton.addEventListener('click', () => {
        window.defaultDebugVisible = !window.defaultDebugVisible;
        showDebugButton.textContent = window.defaultDebugVisible ? 'Hide Debug' : 'Show Debug';
        if (window.defaultDebugVisible) {
            memCpuGodFunction();
            // Use start helper if available
            try { debugHandlerGodFunction(); } catch (e) { console.warn('debug init failed', e); }
        } else {
            stopMemCpuMonitor();
            stopDebugTerminal();
        }
    });

    // Position panel toggle
    positionButton.addEventListener('click', () => {
        togglePositionPanel();
    });

    // Entity Editor toggle
    jimHatePreviewButton.addEventListener('click', () => {
        toggleEntityEditor();
    });

    // Drag handlers (panel is independent). We ONLY drag the panel element.
    // To prevent the main canvas from reacting to drag gestures,
    // we capture pointer events and stop propagation on move/up.
    let dragging = false;
    let sx = 0, sy = 0;
    let ox = 0, oy = 0;
    let pointerId = null;

    function onHeaderPointerDown(e) {
        if (e.type === 'mousedown' && typeof e.button === 'number' && e.button !== 0) return;
        if (dragging) return;

        dragging = true;
        pointerId = e.pointerId;

        sx = e.clientX;
        sy = e.clientY;
        const r = debugPanel.getBoundingClientRect();
        ox = r.left;
        oy = r.top;

        debugPanel.style.cursor = 'grabbing';

        e.preventDefault();
        e.stopImmediatePropagation();

        // Capture pointer so other listeners (canvas/game) don't see drag move.
        if (typeof header.setPointerCapture === 'function' && pointerId !== null) {
            try { header.setPointerCapture(pointerId); } catch (_) { /* ignore */ }
        }
    }

    function onHeaderPointerMove(e) {
        if (!dragging) return;

        // Block bubbling so the game/canvas doesn't treat drag as camera move.
        e.preventDefault();
        e.stopImmediatePropagation();

        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        debugPanel.style.left = `${ox + dx}px`;
        debugPanel.style.top = `${oy + dy}px`;
        debugPanel.style.right = 'auto';
        debugPanel.style.bottom = 'auto';
    }

    function onHeaderPointerUp(e) {
        if (!dragging) return;
        dragging = false;
        pointerId = null;
        debugPanel.style.cursor = 'default';

        e.preventDefault();
        e.stopImmediatePropagation();
    }

    // Use pointer events for better capture
    header.addEventListener('pointerdown', onHeaderPointerDown);
    document.addEventListener('pointermove', onHeaderPointerMove, { passive: false });
    document.addEventListener('pointerup', onHeaderPointerUp, { passive: false });
    // Also handle mouse events for compatibility
    header.addEventListener('mousedown', onHeaderPointerDown);
    document.addEventListener('mousemove', onHeaderPointerMove, { passive: false });
    document.addEventListener('mouseup', onHeaderPointerUp, { passive: false });


    return debugPanel;
}
