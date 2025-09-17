// File: game_engine/debug/bunbitdebug.js

import { themeManager } from '../themes/thememanager.js';

// Initialize BunbitDebug panel
export function initBunbitDebug() {
    if (!document.body) {
        console.warn('document.body not ready, deferring BunbitDebug creation *pouts*');
        return;
    }

    console.log("BunbitDebug initializing! *chao chao* Let's help our Chao friends!");

    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'bunbit-debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.padding = '10px';
    debugPanel.style.border = '2px solid';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '1000';
    debugPanel.style.maxWidth = '300px';
    debugPanel.style.maxHeight = '200px';
    debugPanel.style.overflowY = 'auto';

    // Create reload button
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Reload (Chao Style!)';
    reloadButton.style.width = '100%';
    reloadButton.style.padding = '5px';
    reloadButton.style.marginBottom = '10px';
    reloadButton.style.cursor = 'pointer';
    reloadButton.addEventListener('click', () => {
        console.log('*twirls* Reloading the Chao garden!');
        window.electronAPI.send('reload-window');
    });

    // Create log area
    const logArea = document.createElement('pre');
    logArea.id = 'bunbit-debug-log';
    logArea.style.margin = '0';
    logArea.style.whiteSpace = 'pre-wrap';
    logArea.style.fontFamily = 'Courier, monospace';
    logArea.style.fontSize = '12px';

    // Append elements
    debugPanel.appendChild(reloadButton);
    debugPanel.appendChild(logArea);
    document.body.appendChild(debugPanel);

    // Apply theme
    function applyTheme() {
        const theme = themeManager.getCurrentTheme() || {
            background: '#000000',
            text: '#FC0000',
            border: '#FC0000'
        };
        debugPanel.style.backgroundColor = theme.background;
        debugPanel.style.color = theme.text;
        debugPanel.style.borderColor = theme.border;
        reloadButton.style.backgroundColor = theme.background;
        reloadButton.style.color = theme.text;
        reloadButton.style.border = `1px solid ${theme.border}`;
    }
    applyTheme();

    // Update on theme change
    window.addEventListener('themeChanged', () => {
        console.log('*chao chao* Updating debug panel theme!');
        applyTheme();
    });

    // Override console.log to show in panel
    const originalConsoleLog = console.log;
    console.log = function (...args) {
        originalConsoleLog.apply(console, args);
        const message = args.join(' ') + '\n';
        logArea.textContent += message;
        logArea.scrollTop = logArea.scrollHeight; // Auto-scroll
    };

    console.log('BunbitDebug ready! *twirls* Ready to debug with Cream and Cheese!');
}