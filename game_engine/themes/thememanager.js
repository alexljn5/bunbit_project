// File: game_engine/themes/thememanager.js

import { EVIL_THEME, evilGlitchSystem, getLogColor as getEvilLogColor, getPerformanceColor as getEvilPerformanceColor } from './eviltheme.js';
import { HIGH_CONTRAST_THEME, getLogColor as getHighContrastLogColor, getPerformanceColor as getHighContrastPerformanceColor } from './highcontrast.js';

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
            }
        ];
        this.currentThemeIndex = 0;
        this.currentTheme = this.themes[this.currentThemeIndex];
    }

    getCurrentTheme() {
        return this.currentTheme.theme;
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
            // Notify listeners (debughandler.js and memcpu.js will redraw)
            window.dispatchEvent(new CustomEvent('themeChanged'));
        }
    }

    toggleTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
        this.currentTheme = this.themes[this.currentThemeIndex];
        window.dispatchEvent(new CustomEvent('themeChanged'));
    }
}

export const themeManager = new ThemeManager();