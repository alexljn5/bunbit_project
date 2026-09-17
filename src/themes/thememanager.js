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
        // Default to 'evil' theme
        const evilIndex = this.themes.findIndex(t => t.name === 'evil');
        this.currentThemeIndex = evilIndex !== -1 ? evilIndex : 0;
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
            // Remove any outer border so the main debug panel remains the primary framed element
            try {
                container.style.border = 'none';
                container.style.boxShadow = 'none';
            } catch (e) { /* ignore */ }
            container.style.boxSizing = 'border-box';
            container.style.padding = '0';
        }

        // Also apply directly to canvas if present.
        // The neon border/glow is gated behind body.bunbit-gameplay so it
        // ONLY appears when the player is actually spawned inside the game
        // (GAMEPLAY state). It must never show during INTRO, DASHBOARD, or
        // DIALOGUE, where the canvas is either hidden or is a cinematic surface.
        if (canvasEl) {
            const isGameplay = !!(typeof document !== 'undefined' && document.body
                && document.body.classList.contains('bunbit-gameplay'));
            canvasEl.style.borderColor = isGameplay ? (theme.border || '') : 'none';
            canvasEl.style.boxShadow = (isGameplay && theme.glow === true) ? `0 0 20px ${theme.border}` : 'none';
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
                .game-container { background-color: ${theme.background} !important; }
                body.bunbit-gameplay canvas#mainGameRender { border-color: ${theme.border} !important; box-shadow: ${theme.glow === true ? `0 0 20px ${theme.border}` : 'none'} !important; }
                .gameMenu { background-color: ${theme.headerBg || theme.background} !important; color: ${theme.text} !important; }
            `;
        } catch (e) {
            // ignore if head/body not available
        }

        // Explicitly theme the debug dashboard if it exists and style its children (buttons/logo)
        try {
            if (typeof document !== 'undefined') {
                // Helper: treat exact pure black/white as "neutral" header colors we don't want
                const isNeutralHex = (h) => typeof h === 'string' && (h.toLowerCase() === '#000000' || h.toLowerCase() === '#ffffff');
                const hexToRgba = (hex, alpha = 1) => {
                    try {
                        const h = hex.replace('#', '');
                        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
                        const r = (bigint >> 16) & 255;
                        const g = (bigint >> 8) & 255;
                        const b = bigint & 255;
                        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    } catch (e) {
                        return hex;
                    }
                };

                const panel = document.getElementById('bunbit-debug-panel');
                if (panel) {
                    // Choose a panel background that avoids pure black/white when headerBg is neutral
                    let panelBg = theme.headerBg || theme.background || '';
                    if (isNeutralHex(theme.headerBg) && theme.background) {
                        // Use a subtle gradient blending the theme border and the page background.
                        // This preserves evil's red tint (border is red) and prevents highcontrast
                        // from producing a solid white block.
                        const borderColor = theme.border || theme.background;
                        panelBg = `linear-gradient(180deg, ${hexToRgba(borderColor, 0.08)}, ${hexToRgba(theme.background, 0.95)})`;
                    }

                    // Apply as background (use background to support gradients)
                    panel.style.background = panelBg || '';
                    // Clear any leftover backgroundColor to avoid conflicts
                    try { panel.style.backgroundColor = ''; } catch (e) { /* ignore */ }

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
                        // If the theme explicitly provides a logoFilter, apply it. Otherwise
                        // preserve the control panel's default filter so the logo doesn't vanish.
                        if (theme.logoFilter) {
                            logo.style.filter = theme.logoFilter;
                        }

                        // Apply mixBlendMode only if the theme specifies one. If not, keep
                        // whatever the control panel set (or fall back to 'normal') to avoid
                        // unexpected disappearance when 'overlay' interacts with similar backgrounds.
                        if (theme.mixBlendMode) {
                            logo.style.mixBlendMode = theme.mixBlendMode;
                        } else if (!logo.style.mixBlendMode) {
                            logo.style.mixBlendMode = 'normal';
                        }

                        // Allow theme to override opacity, otherwise preserve existing value
                        if (typeof theme.logoOpacity !== 'undefined') {
                            logo.style.opacity = String(theme.logoOpacity);
                        }

                        // Prevent the logo's blend mode from interacting with elements outside
                        // the panel by creating an isolation stacking context on the panel.
                        try { panel.style.isolation = 'isolate'; } catch (e) { /* ignore */ }

                        // Best-effort: if no theme filter was provided and mixBlendMode is set to
                        // something potentially destructive, ensure a minimum brightness so the
                        // logo remains visible.
                        try {
                            const computed = (typeof window !== 'undefined' && window.getComputedStyle) ? window.getComputedStyle(logo) : null;
                            const effectiveMix = logo.style.mixBlendMode || (computed && computed.mixBlendMode) || 'normal';
                            if (!theme.logoFilter && effectiveMix !== 'normal') {
                                const baseFilter = (logo.style.filter && logo.style.filter !== '') ? logo.style.filter : (computed && computed.filter && computed.filter !== 'none' ? computed.filter : '');
                                if (!baseFilter.includes('brightness')) {
                                    logo.style.filter = baseFilter ? `${baseFilter} brightness(1.6) contrast(1.2)` : 'brightness(1.6) contrast(1.2)';
                                }
                            }
                        } catch (inner) { /* ignore */ }
                    }
                }
            }
        } catch (e) {
            // ignore theming errors
        }
    }
}

export const themeManager = new ThemeManager();