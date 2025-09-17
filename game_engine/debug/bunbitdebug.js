import { themeManager } from '../themes/thememanager.js';
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';
import { setMenuActive, menuActive } from '../gamestate.js';
import { gameLoop } from '../main_game.js';
import { setupMenuClickHandler } from '../menus/menu.js';
import { gameRenderEngine, initializeRenderWorkers, cleanupRenderWorkers } from '../rendering/renderengine.js';

// Drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panelStartX = 0;
let panelStartY = 0;
let initialized = false;

// Initialize BunbitDebug panel
export function initBunbitDebug() {
    if (!document.body || initialized) {
        if (!initialized) console.warn('document.body not ready or already initialized, deferring BunbitDebug creation *pouts*');
        return;
    }

    initialized = true;
    console.log("BunbitDebug initializing! *chao chao* Let's help our Chao friends!");

    // Remove existing panel if it exists
    const existingPanel = document.getElementById('bunbit-debug-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'bunbit-debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.padding = `${10 * SCALE_Y}px`;
    debugPanel.style.border = `${2 * SCALE_X}px solid`;
    debugPanel.style.borderRadius = `${5 * SCALE_X}px`;
    debugPanel.style.zIndex = '1000';
    debugPanel.style.display = 'flex';
    debugPanel.style.flexDirection = 'column';
    debugPanel.style.alignItems = 'center';
    debugPanel.style.justifyContent = 'center';
    debugPanel.style.cursor = 'default';
    debugPanel.style.minWidth = `${120 * SCALE_X}px`;
    debugPanel.style.minHeight = `${60 * SCALE_Y}px`;
    debugPanel.style.userSelect = 'none';

    // Create header for dragging
    const header = document.createElement('div');
    header.style.width = '100%';
    header.style.height = `${20 * SCALE_Y}px`;
    header.style.position = 'absolute';
    header.style.top = '0';
    header.style.left = '0';
    header.style.cursor = 'move';

    // Create reload button
    const reloadButton = document.createElement('button');
    reloadButton.id = 'bunbit-reload-button';
    reloadButton.textContent = '🔄 Reload';
    reloadButton.style.padding = `${8 * SCALE_Y}px ${12 * SCALE_X}px`;
    reloadButton.style.cursor = 'pointer';
    reloadButton.style.border = `${1 * SCALE_X}px solid`;
    reloadButton.style.borderRadius = `${4 * SCALE_X}px`;
    reloadButton.style.fontSize = `${12 * SCALE_Y}px`;
    reloadButton.style.fontWeight = 'bold';
    reloadButton.style.marginTop = `${10 * SCALE_Y}px`; // Add margin to account for header

    // Create play button
    const playButton = document.createElement('button');
    playButton.id = 'bunbit-play-button';
    playButton.textContent = '▶ Play';
    playButton.style.padding = `${8 * SCALE_Y}px ${12 * SCALE_X}px`;
    playButton.style.cursor = 'pointer';
    playButton.style.border = `${1 * SCALE_X}px solid`;
    playButton.style.borderRadius = `${4 * SCALE_X}px`;
    playButton.style.fontSize = `${12 * SCALE_Y}px`;
    playButton.style.fontWeight = 'bold';
    playButton.style.marginTop = `${5 * SCALE_Y}px`;

    // Create stop button
    const stopButton = document.createElement('button');
    stopButton.id = 'bunbit-stop-button';
    stopButton.textContent = '⏹ Stop';
    stopButton.style.padding = `${8 * SCALE_Y}px ${12 * SCALE_X}px`;
    stopButton.style.cursor = 'pointer';
    stopButton.style.border = `${1 * SCALE_X}px solid`;
    stopButton.style.borderRadius = `${4 * SCALE_X}px`;
    stopButton.style.fontSize = `${12 * SCALE_Y}px`;
    stopButton.style.fontWeight = 'bold';
    stopButton.style.marginTop = `${5 * SCALE_Y}px`;

    // Append elements to panel
    debugPanel.appendChild(header);
    debugPanel.appendChild(reloadButton);
    debugPanel.appendChild(playButton);
    debugPanel.appendChild(stopButton);
    document.body.appendChild(debugPanel);

    // Drag functionality - only on header
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);

    function startDrag(e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = debugPanel.getBoundingClientRect();
        panelStartX = rect.left;
        panelStartY = rect.top;

        debugPanel.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function handleDrag(e) {
        if (!isDragging) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        debugPanel.style.left = `${panelStartX + dx}px`;
        debugPanel.style.top = `${panelStartY + dy}px`;
        debugPanel.style.right = 'auto';
        debugPanel.style.bottom = 'auto';
    }

    function stopDrag() {
        isDragging = false;
        debugPanel.style.cursor = 'default';
        header.style.cursor = 'move';
    }

    // Apply theme
    function applyTheme() {
        const theme = themeManager.getCurrentTheme() || {
            background: '#000000',
            text: '#FC0000',
            border: '#FC0000',
            buttonBg: '#1a0000',
            buttonHover: '#300000',
            headerBg: '#1a0000'
        };

        debugPanel.style.backgroundColor = theme.background;
        debugPanel.style.color = theme.text;
        debugPanel.style.borderColor = theme.border;

        header.style.backgroundColor = theme.headerBg || theme.buttonBg || theme.background;

        reloadButton.style.backgroundColor = theme.buttonBg || theme.background;
        reloadButton.style.color = theme.text;
        reloadButton.style.borderColor = theme.border;

        playButton.style.backgroundColor = theme.buttonBg || theme.background;
        playButton.style.color = theme.text;
        playButton.style.borderColor = theme.border;

        stopButton.style.backgroundColor = theme.buttonBg || theme.background;
        stopButton.style.color = theme.text;
        stopButton.style.borderColor = theme.border;

        // Hover effects for all buttons
        const buttons = [reloadButton, playButton, stopButton];
        buttons.forEach(button => {
            button.onmouseover = () => {
                button.style.backgroundColor = theme.buttonHover || '#300000';
            };
            button.onmouseout = () => {
                button.style.backgroundColor = theme.buttonBg || theme.background;
            };
        });
    }
    applyTheme();

    // Update on theme change
    window.addEventListener('themeChanged', () => {
        console.log('*chao chao* Updating debug panel theme!');
        applyTheme();
    });

    // Add reload functionality
    reloadButton.addEventListener('click', () => {
        console.log('*twirls* Reloading the Chao garden!');

        if (typeof window.__electron_bridge !== 'undefined' && window.__electron_bridge.reload) {
            window.__electron_bridge.reload();
        } else if (window.electronAPI && typeof window.electronAPI.send === 'function') {
            window.electronAPI.send('reload-window');
        } else if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('reload-window');
            } catch (e) {
                window.location.reload();
            }
        } else if (window.location && typeof window.location.reload === 'function') {
            window.location.reload();
        } else {
            console.error('*pouts* Could not find a way to reload the page');
            alert('Reload functionality not available in this environment');
        }
    });

    // Add play functionality with retry mechanism
    async function tryPlayGame(maxRetries = 10, delayMs = 100) {
        let retries = 0;
        while (retries < maxRetries) {
            if (typeof setMenuActive === 'function' &&
                typeof gameLoop === 'function' &&
                typeof setupMenuClickHandler === 'function' &&
                typeof gameRenderEngine === 'function' &&
                typeof initializeRenderWorkers === 'function') {
                console.log('*giggles* Starting the Chao adventure!');
                try {
                    setMenuActive(true);
                    setupMenuClickHandler();
                    if (!window.game) {
                        // Initialize canvas
                        const canvas = document.getElementById('mainGameRender');
                        if (canvas && (canvas.width === 0 || canvas.height === 0)) {
                            canvas.width = CANVAS_WIDTH;
                            canvas.height = CANVAS_HEIGHT;
                        }
                        // Create game instance with gameRenderEngine
                        window.game = gameLoop(gameRenderEngine);
                        initializeRenderWorkers();
                    }
                    if (window.game && typeof window.game.start === 'function') {
                        window.game.start();
                        console.log('Game started successfully! *chao chao*');
                        return true;
                    } else {
                        console.warn('Game instance not ready yet, retrying... *tilts head*');
                    }
                } catch (e) {
                    console.error('Play button error:', e);
                }
            } else {
                console.warn('Dependencies not ready (setMenuActive, gameLoop, setupMenuClickHandler, gameRenderEngine, or initializeRenderWorkers), retrying... *pouts*');
            }
            retries++;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        console.error('Failed to start game after retries! *sad chao*');
        alert('Could not start game: dependencies not loaded. Please try again.');
        return false;
    }

    playButton.addEventListener('click', () => {
        tryPlayGame();
    });

    // Add stop functionality with safety checks
    function tryStopGame() {
        console.log('*waves* Stopping the Chao adventure!');
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
                    if (renderEngine) {
                        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    } else {
                        console.warn('Canvas context not available! *tilts head*');
                    }
                } else {
                    console.warn('Canvas element not found or invalid! *pouts*');
                }
                cleanupRenderWorkers();
                console.log('Game stopped via debug panel! *chao chao*');
            } else {
                console.warn('No game instance to stop or stop method missing! *tilts head*');
            }
        } catch (e) {
            console.error('Stop button error:', e);
        }
    }

    stopButton.addEventListener('click', () => {
        tryStopGame();
    });

    console.log('BunbitDebug ready with reload, play, and stop buttons! *twirls*');

    // Return the debug panel element
    return debugPanel;
}

// Export cleanup function
export function cleanupBunbitDebug() {
    const debugPanel = document.getElementById('bunbit-debug-panel');
    if (debugPanel) {
        // Remove event listeners
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
        debugPanel.remove();
    }
    isDragging = false;
    initialized = false;
}

// Handle drag functions (need to be defined at module level)
function handleDrag(e) {
    if (!isDragging) return;

    const debugPanel = document.getElementById('bunbit-debug-panel');
    if (!debugPanel) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    debugPanel.style.left = `${panelStartX + dx}px`;
    debugPanel.style.top = `${panelStartY + dy}px`;
    debugPanel.style.right = 'auto';
    debugPanel.style.bottom = 'auto';
}

function stopDrag() {
    isDragging = false;
    const debugPanel = document.getElementById('bunbit-debug-panel');
    if (debugPanel) {
        debugPanel.style.cursor = 'default';
        const header = debugPanel.querySelector('div');
        if (header) {
            header.style.cursor = 'move';
        }
    }
}

// Initialize debug panel on page load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initBunbitDebug, 100);
        });
    } else {
        setTimeout(initBunbitDebug, 100);
    }
}