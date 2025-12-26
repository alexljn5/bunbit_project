import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';
import { setMenuActive } from '../gamestate.js';
import { gameLoop } from '../game_loop.js';
import { setupMenuClickHandler } from '../menus/menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../rendering/renderengine.js';
import { memCpuGodFunction, stopMemCpuMonitor } from './panels/memcpu.js';
import { debugHandlerGodFunction, stopDebugTerminal } from './debughandler.js';
import { themeManager } from '../themes/thememanager.js';

// Lazy getter to access playerPosition and avoid circular dependency issues
function getPlayerPosition() {
    // Try to get from global first
    if (window.__playerPosition) {
        return window.__playerPosition;
    }
    // Return a safe fallback
    return { x: 100, z: 100, y: 128, angle: 0 };
}

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
    ['calm', 'hacky', 'highcontrast', 'evil'].forEach(themeName => {
        const option = document.createElement('option');
        option.value = themeName;
        option.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        option.selected = themeName === 'calm'; // calm is default
        themeSelector.appendChild(option);
    });

    // Handle theme changes
    themeSelector.addEventListener('change', (e) => {
        themeManager.setTheme(e.target.value);
    });

    // basic styling for readability
    [reloadButton, playButton, stopButton, showDebugButton].forEach(btn => {
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

    // Add an <img> element for the logo so we can brighten and smoothly mask it (no obvious square)
    const _logoSrc = 'img/logo/logo-ascii-transparent.png';
    const logoEl = document.createElement('img');
    logoEl.src = _logoSrc;
    logoEl.alt = '';
    // Position and sizing
    logoEl.style.position = 'absolute';
    logoEl.style.left = '50%';
    logoEl.style.top = '50%';
    logoEl.style.transform = 'translate(-50%, -50%)';
    logoEl.style.width = '512px';
    logoEl.style.height = 'auto';
    logoEl.style.maxWidth = '60%';
    // Visual blending: brighten, increase contrast, and blend with panel color
    logoEl.style.filter = 'brightness(4.90) contrast(10.15) saturate(10.2)';
    logoEl.style.mixBlendMode = 'overlay';
    // So it doesn't show an obvious square: soften edges with borderRadius + clip-path ellipse
    logoEl.style.borderRadius = '18%';
    logoEl.style.clipPath = 'ellipse(48% 40% at 50% 50%)';
    // Subtle shadow for separation
    logoEl.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55)';
    // Non-interactive and behind buttons
    logoEl.style.pointerEvents = 'none';
    logoEl.style.opacity = '0.94';
    logoEl.style.zIndex = '0';
    debugPanel.appendChild(logoEl);
    // Ensure header and buttons render above
    header.style.zIndex = '3';
    // Buttons already set to zIndex 2 above

    // Create a position controller section
    const positionSection = document.createElement('div');
    positionSection.style.marginTop = `${15 * SCALE_Y}px`;
    positionSection.style.padding = `${10 * SCALE_X}px`;
    positionSection.style.borderTop = `1px solid ${DEFAULT_BORDER}`;
    positionSection.style.width = '100%';

    // Helper to create slider with label and value display
    function createSliderControl(label, min, max, step, initialValue, onChange) {
        const container = document.createElement('div');
        container.style.marginBottom = `${8 * SCALE_Y}px`;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = `${4 * SCALE_Y}px`;

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.fontSize = `${11 * SCALE_Y}px`;
        labelEl.style.fontWeight = 'bold';
        labelEl.style.color = DEFAULT_TEXT;

        const controlContainer = document.createElement('div');
        controlContainer.style.display = 'flex';
        controlContainer.style.gap = `${8 * SCALE_X}px`;
        controlContainer.style.alignItems = 'center';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = initialValue;
        slider.style.flex = '1';
        slider.style.cursor = 'pointer';
        slider.style.height = '6px';

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = parseFloat(initialValue).toFixed(1);
        valueDisplay.style.fontSize = `${10 * SCALE_Y}px`;
        valueDisplay.style.color = DEFAULT_TEXT;
        valueDisplay.style.minWidth = '50px';
        valueDisplay.style.textAlign = 'right';

        slider.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            valueDisplay.textContent = newValue.toFixed(1);
            onChange(newValue);
        });

        controlContainer.appendChild(slider);
        controlContainer.appendChild(valueDisplay);
        container.appendChild(labelEl);
        container.appendChild(controlContainer);

        return container;
    }

    // Create X, Y, Z sliders
    positionSection.appendChild(createSliderControl(
        'X Position',
        0,
        2000,
        5,
        getPlayerPosition().x,
        (val) => { getPlayerPosition().x = val; }
    ));

    positionSection.appendChild(createSliderControl(
        'Z Position',
        0,
        2000,
        5,
        getPlayerPosition().z,
        (val) => { getPlayerPosition().z = val; }
    ));

    positionSection.appendChild(createSliderControl(
        'Y Position (Height)',
        0,
        500,
        2,
        getPlayerPosition().y || 128,
        (val) => { getPlayerPosition().y = val; }
    ));

    // Add a label showing current angle
    const angleSection = document.createElement('div');
    angleSection.style.marginTop = `${8 * SCALE_Y}px`;
    angleSection.style.fontSize = `${10 * SCALE_Y}px`;
    angleSection.style.color = DEFAULT_TEXT;
    angleSection.textContent = 'Angle: ' + (getPlayerPosition().angle * (180 / Math.PI)).toFixed(1) + '°';

    // Update angle display periodically
    setInterval(() => {
        if (angleSection.parentElement) {
            angleSection.textContent = 'Angle: ' + (getPlayerPosition().angle * (180 / Math.PI)).toFixed(1) + '°';
        }
    }, 100);

    positionSection.appendChild(angleSection);

    debugPanel.appendChild(header);
    debugPanel.appendChild(reloadButton);
    debugPanel.appendChild(playButton);
    debugPanel.appendChild(stopButton);
    debugPanel.appendChild(showDebugButton);
    debugPanel.appendChild(themeSelector);
    debugPanel.appendChild(positionSection);
    document.body.appendChild(debugPanel);

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
