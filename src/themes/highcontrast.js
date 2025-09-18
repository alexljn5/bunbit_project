// File: game_engine/themes/highcontrast.js

// High-contrast theme optimized for colorblind accessibility
export const HIGH_CONTRAST_THEME = {
    background: '#000000', // Pure black for maximum contrast
    headerBg: '#1a1a1a',   // Dark gray for header
    border: '#ffffff',     // Bright white for outlines
    text: '#ffffff',       // White for primary text
    danger: '#ffff00',     // Bright yellow for errors/highlights
    warning: '#00b7eb',    // Cyan for warnings (avoid red-green)
    good: '#ffffff',       // White for neutral/good states
    graphBg: 'rgba(255, 255, 255, 0.2)', // Light gray for graphs
    resizeHandle: '#4d4d4d', // Medium gray for resize handle
    resizeBorder: '#ffffff', // White for resize border
    scanlines: 'rgba(255, 255, 255, 0.05)', // Subtle white scanlines
    corruption: 'rgba(255, 255, 255, 0.15)', // White corruption effect
    buttonBg: '#333333',   // Dark gray for buttons
    buttonHover: '#666666', // Lighter gray for button hover
    smear: 'rgba(255, 255, 255, 0.25)' // White smear effect
};

// Reuse EvilUIState and EvilGlitchSystem from eviltheme.js
import { EvilUIState, EvilGlitchSystem, evilGlitchSystem } from './eviltheme.js';

export function getLogColor(type) {
    return {
        debug: '#ffffff',   // White
        error: '#ffff00',   // Yellow
        warn: '#00b7eb',    // Cyan
        info: '#ffffff',    // White
        log: '#ffffff'      // White
    }[type] || '#ffffff';
}

export function getPerformanceColor(value, thresholds = [70, 85]) {
    if (value < thresholds[0]) return '#ffffff'; // White for good
    if (value < thresholds[1]) return '#00b7eb'; // Cyan for warning
    return '#ffff00'; // Yellow for danger
}

export { EvilUIState, evilGlitchSystem };