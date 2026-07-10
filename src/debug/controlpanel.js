import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';
import { setMenuActive } from '../gamestate.js';
import { gameLoop } from '../game_loop.js';
import { setupMenuClickHandler } from '../menus/menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './panels/memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from './debughandler.js';
import { themeManager } from '../themes/thememanager.js';
import { defaultThemeName, DEBUG_START_INTRO_ANIMATION } from '../globals.js';


import { togglePositionPanel } from './panels/positionpanel.js';
import { initMainDashboard } from '../menus/main_dashboard.js';


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
    // Compact panel: 220x300px self-contained box
    const panelWidth = 220;
    const panelHeight = 300;
    const edgeGap = 20; // px from viewport edges
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = `${edgeGap}px`;
    debugPanel.style.left = `${edgeGap}px`;
    debugPanel.style.width = `${panelWidth * SCALE_X}px`;
    debugPanel.style.height = `${panelHeight * SCALE_Y}px`;
    debugPanel.style.padding = `${12 * SCALE_Y}px ${12 * SCALE_X}px`;
    debugPanel.style.border = `${2 * SCALE_X}px solid ${DEFAULT_BORDER}`;
    debugPanel.style.borderRadius = `${8 * SCALE_X}px`;
    debugPanel.style.zIndex = '2147483646';
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


    // basic styling for readability - compact buttons
    [reloadButton, playButton, stopButton, showDebugButton, positionButton].forEach(btn => {
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
    debugPanel.appendChild(themeSelector);
    document.body.appendChild(debugPanel);

    // Initialize the main dashboard (decorative background with pillars/sigil/stairs)
    try { initMainDashboard(); } catch (e) { console.warn('Main dashboard init failed:', e); }

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
    reloadButton.addEventListener('click', () => {
        if (typeof window.__electron_bridge !== 'undefined' && window.__electron_bridge.reload) {
            window.__electron_bridge.reload();
        } else if (window.electronAPI && typeof window.electronAPI.send === 'function') {
            window.electronAPI.send('reload-window');
        } else if (window.require) {
            try { const { ipcRenderer } = window.require('electron'); ipcRenderer.send('reload-window'); }
            catch (e) { window.location.reload(); }
        } else if (window.location && typeof window.location.reload === 'function') {
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
                    if (!window.game) {
                        const canvas = document.getElementById('mainGameRender');
                        if (canvas && (canvas.width === 0 || canvas.height === 0)) {
                            canvas.width = CANVAS_WIDTH;
                            canvas.height = CANVAS_HEIGHT;
                        }
                        // Ensure canvas stacks above control panel
                        try { if (canvas) canvas.style.zIndex = '2147483647'; } catch (e) { console.warn('Could not set canvas z-index', e); }
                        window.game = gameLoop(gameRenderEngine);
                        initializeRenderWorkers();
                    }
                    if (window.game && typeof window.game.start === 'function') {
                        window.game.start();

                        // (Removed) Intro placeholder trigger here; game-load should be handled elsewhere.


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
            // Stop active game loop first
            if (window.game && typeof window.game.stop === 'function') {
                window.game.stop();
            }

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
