import { themeManager } from '../themes/thememanager.js';
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';
import { setMenuActive } from '../gamestate.js';
import { gameLoop } from '../main_game.js';
import { setupMenuClickHandler } from '../menus/menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from './debughandler.js';

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
    debugPanel.style.border = `${2 * SCALE_X}px solid ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
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
    // Slightly translucent themed background so you can still see the game behind it
    debugPanel.style.backgroundColor = themeManager.getCurrentTheme()?.background || 'rgba(0,0,0,0.7)';
    debugPanel.style.color = themeManager.getCurrentTheme()?.text || '#FC0000';
    debugPanel.style.boxShadow = `0 6px 30px ${themeManager.getCurrentTheme()?.border || '#FC0000'}`;
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
    reloadButton.textContent = '🔄 Reload';

    const playButton = document.createElement('button');
    playButton.id = 'bunbit-play-button';
    playButton.textContent = '▶ Play';

    const stopButton = document.createElement('button');
    stopButton.id = 'bunbit-stop-button';
    stopButton.textContent = '⏹ Stop';

    const showDebugButton = document.createElement('button');
    showDebugButton.id = 'bunbit-debug-toggle';
    showDebugButton.textContent = '🐛 Show Debug';

    // basic styling for readability
    [reloadButton, playButton, stopButton, showDebugButton].forEach(btn => {
        btn.style.padding = `${8 * SCALE_Y}px ${12 * SCALE_X}px`;
        btn.style.cursor = 'pointer';
        btn.style.border = `${1 * SCALE_X}px solid`;
        btn.style.borderRadius = `${4 * SCALE_X}px`;
        btn.style.fontSize = `${12 * SCALE_Y}px`;
        btn.style.fontWeight = 'bold';
        btn.style.marginTop = `${5 * SCALE_Y}px`;
        btn.style.backgroundColor = themeManager.getCurrentTheme()?.buttonBg || '#1a0000';
        btn.style.color = themeManager.getCurrentTheme()?.text || '#FC0000';
        btn.style.borderColor = themeManager.getCurrentTheme()?.border || '#FC0000';
    });
    reloadButton.style.marginTop = `${10 * SCALE_Y}px`;

    debugPanel.appendChild(header);
    debugPanel.appendChild(reloadButton);
    debugPanel.appendChild(playButton);
    debugPanel.appendChild(stopButton);
    debugPanel.appendChild(showDebugButton);
    document.body.appendChild(debugPanel);

    // Ensure visible in stacking contexts and preserve spanning (do not collapse to top-left)
    setTimeout(() => {
        const p = document.getElementById('bunbit-debug-panel');
        if (!p) return;
        p.style.zIndex = '2147483646';
        p.style.display = 'flex';
        p.style.visibility = 'visible';
        p.style.pointerEvents = 'auto';
        // preserve spanning from edgeGap (do not set right/bottom to 'auto')
        //p.style.top = `${edgeGap}px`;
        //p.style.left = `${edgeGap}px`;
        //p.style.right = `${edgeGap}px`;
        //p.style.bottom = `${edgeGap}px`;
        // Preserve spanning inset so panel remains full-window-like
        p.style.top = `${edgeGap}px`;
        p.style.left = `${edgeGap}px`;
        p.style.right = `${edgeGap}px`;
        p.style.bottom = `${edgeGap}px`;
        try { document.body.appendChild(p); } catch (e) { /* ignore */ }
    }, 150);

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
            if (window.game && typeof window.game.stop === 'function') {
                window.game.stop();
                setMenuActive(true);
                const canvas = document.getElementById('mainGameRender');
                if (canvas && canvas.getContext) {
                    if (canvas.width === 0 || canvas.height === 0) {
                        canvas.width = CANVAS_WIDTH;
                        canvas.height = CANVAS_HEIGHT;
                    }
                    const renderEngine = canvas.getContext('2d');
                    if (renderEngine) renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    cleanupRenderWorkers();
                }
            }
        } catch (e) { console.error('Stop button error:', e); }
    }
    stopButton.addEventListener('click', () => tryStopGame());

    // Show Debug toggles other debug features but keeps the control panel visible
    showDebugButton.addEventListener('click', () => {
        window.defaultDebugVisible = !window.defaultDebugVisible;
        showDebugButton.textContent = window.defaultDebugVisible ? '🐛 Hide Debug' : '🐛 Show Debug';
        if (window.defaultDebugVisible) {
            memCpuGodFunction();
            // Use start helper if available
            try { debugHandlerGodFunction(); } catch (e) { console.warn('debug init failed', e); }
        } else {
            stopMemCpuMonitor();
            stopDebugTerminal();
        }
    });

    // Drag handlers (simple)
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    header.addEventListener('mousedown', (e) => {
        dragging = true; sx = e.clientX; sy = e.clientY; const r = debugPanel.getBoundingClientRect(); ox = r.left; oy = r.top; debugPanel.style.cursor = 'grabbing';
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return; const dx = e.clientX - sx; const dy = e.clientY - sy; debugPanel.style.left = `${ox + dx}px`; debugPanel.style.top = `${oy + dy}px`; debugPanel.style.right = 'auto'; debugPanel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; debugPanel.style.cursor = 'default'; });

    return debugPanel;
}
