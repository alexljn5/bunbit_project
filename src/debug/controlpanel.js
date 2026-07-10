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
    // Make the panel span most of the viewport with a padding margin so the border looks "cool"
    const edgeGap = 20; // px from viewport edges
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = `${edgeGap}px`;
    debugPanel.style.left = `${edgeGap}px`;
    //debugPanel.style.right = `${edgeGap}px`;
    //debugPanel.style.bottom = `${edgeGap}px`;
    // Span almost the entire viewport (edgeGap inset) so the panel visually stretches across the screen
    debugPanel.style.right = `${edgeGap}px`;
    debugPanel.style.bottom = `${edgeGap}px`;
    debugPanel.style.padding = `${12 * SCALE_Y}px ${20 * SCALE_X}px`;
    debugPanel.style.border = `${2 * SCALE_X}px solid ${DEFAULT_BORDER}`;
    debugPanel.style.borderRadius = `${8 * SCALE_X}px`;
    debugPanel.style.zIndex = '2147483646';
    debugPanel.style.display = 'flex';
    debugPanel.style.flexDirection = 'column';
    // Keep buttons stacked at top-left of the panel so their positions remain familiar
    debugPanel.style.alignItems = 'flex-start';
    debugPanel.style.justifyContent = 'flex-start';
    debugPanel.style.cursor = 'default';
    debugPanel.style.pointerEvents = 'auto';
    debugPanel.style.minWidth = 'auto';
    debugPanel.style.minHeight = `${60 * SCALE_Y}px`;
    debugPanel.style.userSelect = 'none';

    // Prevent this panel from swallowing pointer interactions meant for other overlays.
    // We only treat clicks on the panel's header/button bar as drag/click targets.
    debugPanel.style.backgroundColor = DEFAULT_BACKGROUND;
    // Slightly translucent themed background so you can still see the game behind it
    debugPanel.style.backgroundColor = DEFAULT_BACKGROUND;
    debugPanel.style.color = DEFAULT_TEXT;
    debugPanel.style.boxShadow = `0 6px 30px ${DEFAULT_BORDER}`;
    // Make scaling predictable when using SCALE_X/Y elsewhere
    debugPanel.style.transformOrigin = 'top left';
    debugPanel.style.transform = `scale(1)`;

    const header = document.createElement('div');
    header.style.width = '100%';
    header.style.height = `${20 * SCALE_Y}px`;
    header.style.position = 'absolute';
    header.style.top = '0';
    header.style.left = '0';
    header.style.cursor = 'move';

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
    themeSelector.style.padding = `${8 * SCALE_Y}px ${12 * SCALE_X}px`;
    themeSelector.style.cursor = 'pointer';
    themeSelector.style.border = `${1 * SCALE_X}px solid ${DEFAULT_BORDER}`;
    themeSelector.style.borderRadius = `${4 * SCALE_X}px`;
    themeSelector.style.fontSize = `${12 * SCALE_Y}px`;
    themeSelector.style.fontWeight = 'bold';
    themeSelector.style.marginTop = `${5 * SCALE_Y}px`;
    themeSelector.style.backgroundColor = DEFAULT_BUTTON_BG;
    themeSelector.style.color = DEFAULT_TEXT;
    themeSelector.style.position = 'absolute';
    themeSelector.style.top = `${12 * SCALE_Y}px`;
    themeSelector.style.right = `${20 * SCALE_X}px`;
    themeSelector.style.zIndex = '2';

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


    // basic styling for readability
    [reloadButton, playButton, stopButton, showDebugButton, positionButton].forEach(btn => {
        btn.style.padding = `${8 * SCALE_Y}px ${12 * SCALE_X}px`;
        btn.style.cursor = 'pointer';
        btn.style.border = `${1 * SCALE_X}px solid`;
        btn.style.borderRadius = `${4 * SCALE_X}px`;
        btn.style.fontSize = `${12 * SCALE_Y}px`;
        btn.style.fontWeight = 'bold';
        btn.style.marginTop = `${5 * SCALE_Y}px`;
        btn.style.backgroundColor = DEFAULT_BUTTON_BG;
        btn.style.color = DEFAULT_TEXT;
        btn.style.borderColor = DEFAULT_BORDER;
        // make sure buttons render above the logo canvas
        btn.style.position = 'relative';
        btn.style.zIndex = '2';
    });
    reloadButton.style.marginTop = `${10 * SCALE_Y}px`;

    // Main dashboard visuals moved to src/menus/main_dashboard.js (separate box)
    // Keep this module as the pure debug control panel UI.

    // (dashboard DOM removed)

    function createPillarImg(side) {
        const el = document.createElement('img');
        el.src = pillarSrc;
        el.alt = '';
        el.style.position = 'absolute';

        // Span top-to-bottom
        el.style.top = '0%';
        el.style.bottom = '0%';
        el.style.transform = 'translate(-50%, 0%)';

        el.style.width = '512px';
        el.style.height = '100%';
        el.style.maxWidth = '60%';

        // same visual blending as logo
        el.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
        el.style.mixBlendMode = 'overlay';
        el.style.borderRadius = '18%';
        el.style.clipPath = 'ellipse(48% 40% at 50% 50%)';
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55)';
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.94';
        el.style.zIndex = '0';

        // Place left/right using calc with percentage + pixel-ish proportion.
        const direction = side === 'left' ? -1 : 1;
        el.style.left = `calc(50% + (${direction} * ${pillarOffsetFactor} * 60vw))`;
        return el;
    }

    function createLogoLayers() {
        const sigilSrc = 'img/logo/logo-ascii-transparent-sigil-blend.png';
        const faceSrc = 'img/logo/logo-ascii.png';

        // === Layer 1: Sigil (background) ===
        // === SPINNING SIGIL ===
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
            //borderRadius: '18%',
            clipPath: 'ellipse(50% 50% at 50% 50%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            pointerEvents: 'none',
            //opacity: '1.34',
            zIndex: '0'
        });

        // Add spinning animation
        sigilEl.style.animation = 'bunbit-sigil-spin 25s linear infinite';

        // Create the keyframe animation (only once)
        if (!document.getElementById('bunbit-sigil-style')) {
            const style = document.createElement('style');
            style.id = 'bunbit-sigil-style';
            style.textContent = `
        @keyframes bunbit-sigil-spin {
            from {
                transform: translate(-50%, 0) rotate(0deg);
            }
            to {
                transform: translate(-50%, 0) rotate(360deg);
            }
        }
    `;
            document.head.appendChild(style);
        }

        // === Layer 2: Bunny Face (on top) ===
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
            filter: 'brightness(105.5) contrast(120) saturate(18)', // You can tweak this separately
            mixBlendMode: 'overlay',
            //borderRadius: '18%',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            pointerEvents: 'none',
            opacity: '1.7',
            zIndex: '1' // On top of the sigil
        });

        return { sigilEl, faceEl };
    }

    function createStairsImg() {
        const el = document.createElement('img');
        el.src = stairsSrc;
        el.alt = '';

        el.style.position = 'absolute';
        el.style.left = '50%';
        el.style.bottom = '8%';
        el.style.transform = 'translate(-50%, 0)';
        el.style.width = '640px';
        el.style.height = 'auto';
        el.style.maxWidth = '45%';
        el.style.zIndex = '1';

        el.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
        el.style.mixBlendMode = 'overlay';
        el.style.opacity = '0.85';
        el.style.pointerEvents = 'none';

        el.style.transform = 'translate(-50%, 0) perspective(600px) rotateX(12deg)';
        return el;
    }

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

    // Mount the main dashboard visuals as an independent box (not inside bunbit-debug-panel)
    try {
        initMainDashboard();
    } catch (e) {
        console.error('Failed to initMainDashboard:', e);
    }

    // Ensure visible in stacking contexts and preserve spanning (do not collapse to top-left)
    setTimeout(() => {
        const p = document.getElementById('bunbit-debug-panel');
        if (!p) return;
        p.style.zIndex = '2147483646';
        p.style.display = 'flex';
        p.style.visibility = 'visible';
        p.style.pointerEvents = 'auto';
        p.style.top = `${edgeGap}px`;
        p.style.left = `${edgeGap}px`;
        p.style.right = `${edgeGap}px`;
        p.style.bottom = `${edgeGap}px`;
        try { document.body.appendChild(p); } catch (e) { /* ignore */ }
    }, 150);

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

    function onHeaderMouseDown(e) {
        if (typeof e.button === 'number' && e.button !== 0) return;
        if (dragging) return;

        dragging = true;
        pointerId = (typeof e.pointerId !== 'undefined') ? e.pointerId : null;

        sx = e.clientX;
        sy = e.clientY;
        const r = debugPanel.getBoundingClientRect();
        ox = r.left;
        oy = r.top;

        debugPanel.style.cursor = 'grabbing';

        e.preventDefault();
        e.stopPropagation();

        // Capture pointer so other listeners (canvas/game) don't see drag move.
        if (typeof header.setPointerCapture === 'function' && pointerId !== null) {
            try { header.setPointerCapture(pointerId); } catch (_) { /* ignore */ }
        }
    }

    function onHeaderMouseMove(e) {
        if (!dragging) return;

        // Block bubbling so the game/canvas doesn't treat drag as camera move.
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        debugPanel.style.left = `${ox + dx}px`;
        debugPanel.style.top = `${oy + dy}px`;
        debugPanel.style.right = 'auto';
        debugPanel.style.bottom = 'auto';
    }

    function onHeaderMouseUp(e) {
        if (!dragging) return;
        dragging = false;
        pointerId = null;
        debugPanel.style.cursor = 'default';

        e.preventDefault();
        e.stopPropagation();
    }

    header.addEventListener('mousedown', onHeaderMouseDown);
    document.addEventListener('mousemove', onHeaderMouseMove, { passive: false });
    document.addEventListener('mouseup', onHeaderMouseUp, { passive: false });


    return debugPanel;
}
