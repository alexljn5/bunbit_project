// File: game_engine/themes/thememanager.js

import { EVIL_THEME, evilGlitchSystem, getLogColor as getEvilLogColor, getPerformanceColor as getEvilPerformanceColor } from './eviltheme.js';
import { HIGH_CONTRAST_THEME, getLogColor as getHighContrastLogColor, getPerformanceColor as getHighContrastPerformanceColor } from './highcontrast.js';
import { CALM_THEME, getLogColor as getCalmLogColor, getPerformanceColor as getCalmPerformanceColor } from './calmtheme.js';
import { HACKY_THEME, getLogColor as getHackyLogColor, getPerformanceColor as getHackyPerformanceColor } from './hackytheme.js';

export class ThemeManager {
    constructor() {
        this.themes = [
            {
                name: 'evil',
                theme: EVIL_THEME,
                getLogColor: getEvilLogColor,
                getPerformanceColor: getEvilPerformanceColor
            },
            {
                name: 'highcontrast',
                theme: HIGH_CONTRAST_THEME,
                getLogColor: getHighContrastLogColor,
                getPerformanceColor: getHighContrastPerformanceColor
            },
            { name: 'calm', theme: CALM_THEME, getLogColor: getCalmLogColor, getPerformanceColor: getCalmPerformanceColor },
            { name: 'hacky', theme: HACKY_THEME, getLogColor: getHackyLogColor, getPerformanceColor: getHackyPerformanceColor }
        ];
        // Default to 'calm' theme for nicer visuals
        const calmIndex = this.themes.findIndex(t => t.name === 'calm');
        this.currentThemeIndex = calmIndex !== -1 ? calmIndex : 0;
        this.currentTheme = this.themes[this.currentThemeIndex];

        // Defer applying theme until DOM is available to avoid timing issues
        const applyNow = () => { try { this.applyThemeToPage(); } catch (e) { console.warn('Theme apply failed', e); } };
        if (typeof document !== 'undefined' && document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', applyNow, { once: true });
            // also try on full load as a fallback
            window.addEventListener('load', applyNow, { once: true });
        } else {
            applyNow();
        }

        // Re-apply theme when the control panel is created later (it can be dynamically inserted)
        try {
            window.addEventListener('controlPanelReady', () => { try { this.applyThemeToPage(); } catch (e) { /* ignore */ } });
        } catch (e) {
            // ignore in non-browser environments
        }
    }

    getCurrentTheme() {
        return this.currentTheme.theme;
    }

    // Return the current theme name (e.g. 'evil', 'highcontrast')
    getCurrentThemeName() {
        return this.currentTheme?.name;
    }

    getLogColor(type) {
        return this.currentTheme.getLogColor(type);
    }

    getPerformanceColor(value, thresholds) {
        return this.currentTheme.getPerformanceColor(value, thresholds);
    }

    setTheme(themeName) {
        const index = this.themes.findIndex(t => t.name === themeName);
        if (index !== -1) {
            this.currentThemeIndex = index;
            this.currentTheme = this.themes[index];
            // Apply theme colors to the page
            this.applyThemeToPage();
            // Notify listeners (debughandler.js and memcpu.js will redraw)
            window.dispatchEvent(new CustomEvent('themeChanged'));
        }
    }

    toggleTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        this.currentTheme = this.themes[this.currentThemeIndex];
        // Apply theme colors to the page
        this.applyThemeToPage();
        window.dispatchEvent(new CustomEvent('themeChanged'));
    }

    /**
     * Apply theme colors to the main page elements
     */
    applyThemeToPage() {
        const theme = this.currentTheme.theme;
        if (!theme) return;

        // Resolve a sensible container to theme: prefer .game-container, then canvas parent, then body
        const canvasEl = (typeof document !== 'undefined') ? document.getElementById('mainGameRender') : null;
        const gameContainer = (typeof document !== 'undefined') ? document.querySelector('.game-container') : null;
        const container = gameContainer || (canvasEl && canvasEl.closest('.game-container')) || (canvasEl && canvasEl.parentElement) || (typeof document !== 'undefined' ? document.body : null);

        // Ensure global background on documentElement and body
        try {
            if (typeof document !== 'undefined' && document.documentElement) {
                document.documentElement.style.backgroundColor = theme.background || '';
                document.documentElement.style.color = theme.text || '';
            }
            if (typeof document !== 'undefined' && document.body) {
                document.body.style.backgroundColor = theme.background || '';
                document.body.style.color = theme.text || '';
            }
        } catch (e) {
            // ignore
        }

        // Inline-apply styles to chosen container (strongest, immediate)
        if (container) {
            container.style.backgroundColor = theme.background || '';
            container.style.borderColor = theme.border || '';
            container.style.borderStyle = 'solid';
            container.style.borderWidth = theme.glow === true ? '3px' : '2px';
            container.style.boxSizing = 'border-box';
            container.style.padding = '0';
            if (theme.glow === true) {
                container.style.boxShadow = `0 0 40px ${theme.border}, 0 0 80px ${theme.border}, inset 0 0 20px ${theme.border}`;
            } else {
                container.style.boxShadow = 'none';
            }
        }

        // Also apply directly to canvas if present
        if (canvasEl) {
            canvasEl.style.borderColor = theme.border || '';
            canvasEl.style.boxShadow = theme.glow === true ? `0 0 20px ${theme.border}` : 'none';
        }

        // Inject CSS rules as backup (keeps other UI elements themed)
        let styleEl = null;
        try {
            styleEl = document.getElementById('bunbit-theme-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'bunbit-theme-styles';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                html, body { background-color: ${theme.background} !important; color: ${theme.text} !important; }
                .game-container { background-color: ${theme.background} !important; border-color: ${theme.border} !important; border-style: solid !important; border-width: ${theme.glow === true ? '3px' : '2px'} !important; box-shadow: ${theme.glow === true ? `0 0 40px ${theme.border}, 0 0 80px ${theme.border}, inset 0 0 20px ${theme.border}` : 'none'} !important; }
                canvas#mainGameRender { border-color: ${theme.border} !important; box-shadow: ${theme.glow === true ? `0 0 20px ${theme.border}` : 'none'} !important; }
                .gameMenu { background-color: ${theme.headerBg || theme.background} !important; color: ${theme.text} !important; }
            `;
        } catch (e) {
            // ignore if head/body not available
        }

        // Explicitly theme the debug dashboard if it exists and style its children (buttons/logo)
        try {
            if (typeof document !== 'undefined') {
                const panel = document.getElementById('bunbit-debug-panel');
                if (panel) {
                    panel.style.backgroundColor = theme.headerBg || theme.background || '';
                    panel.style.borderColor = theme.border || '';
                    panel.style.borderStyle = 'solid';
                    panel.style.borderWidth = theme.glow === true ? '3px' : '2px';
                    panel.style.boxShadow = theme.glow === true ? `0 6px 30px ${theme.border}` : 'none';
                    panel.style.color = theme.text || '';

                    const controls = panel.querySelectorAll('button, select, input');
                    controls.forEach((el) => {
                        try {
                            el.style.backgroundColor = theme.buttonBg || theme.headerBg || '';
                            el.style.color = theme.text || '';
                            el.style.borderColor = theme.border || '';
                        } catch (inner) { /* ignore per-element errors */ }
                    });

                    const logo = panel.querySelector('img');
                    if (logo) {
                        logo.style.filter = theme.logoFilter || 'brightness(1.6) contrast(1.2)';
                        logo.style.mixBlendMode = theme.mixBlendMode || 'overlay';
                    }
                }
            }
        } catch (e) {
            // ignore theming errors
        }
    }
}

export const themeManager = new ThemeManager();