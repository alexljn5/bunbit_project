// File: game_engine/themes/eviltheme.js

// Extreme evil red & black theme with enhanced glitch effects
export const EVIL_THEME = {
    background: '#0a0000', // Almost pure black with hint of red
    headerBg: '#000000',   // Pure black
    border: '#8b0000',     // Dark blood red
    text: '#ff0000',       // Bright blood red
    danger: '#ff0000',     // Bright blood red
    warning: '#8b0000',    // Dark blood red  
    good: '#8b0000',       // Dark blood red (everything is evil)
    graphBg: 'rgba(139, 0, 0, 0.2)', // Dark blood red
    resizeHandle: '#300000', // Deep blood red
    resizeBorder: '#8b0000', // Dark blood red
    scanlines: 'rgba(255, 0, 0, 0.03)', // Blood red scanlines
    corruption: 'rgba(255, 0, 0, 0.1)',  // Data corruption effect
    buttonBg: '#1a0000',   // Dark red-black (for debughandler buttons)
    buttonHover: '#300000', // Darker blood red
    smear: 'rgba(255, 0, 0, 0.2)',       // Smear effect for advanced glitches
    glow: true
};

// --- UI STATE MANAGER ---
// Keeps track of dragging, resizing, and button interactions
export const EvilUIState = {
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,

    isResizing: false,
    resizeStartX: 0,
    resizeStartY: 0,

    activeButton: null, // ID or name of currently pressed button
    hoveredButton: null,

    reset() {
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.activeButton = null;
        this.hoveredButton = null;
    }
};

// --- Enhanced glitch effects system ---
export class EvilGlitchSystem {
    constructor() {
        this.intensity = 0;
        this.scanlineOffset = 0;
        this.textGlitch = false;
        this.horizontalShift = 0;
        this.verticalShift = 0;
        this.corruption = 0;
        this.flicker = 1;
        this.staticEffect = 0;
        this.shakeIntensity = 0;
        this.smearEffect = 0;
        this.lastFrame = null;
        this.trails = [];
        this.active = false;
    }

    // Update glitch effects based on activity level
    updateGlitchEffects(activityLevel = 0) {
        this.intensity = activityLevel;

        if (Math.random() < 0.075 * this.intensity) {  // Optimized lower prob
            this.scanlineOffset = (Math.random() - 0.5) * 15;
        }

        if (Math.random() < 0.04 * this.intensity) {
            this.textGlitch = true;
            setTimeout(() => { this.textGlitch = false; }, 300);
        }

        if (Math.random() < 0.05 * this.intensity) {
            this.horizontalShift = (Math.random() - 0.5) * 30;
            setTimeout(() => { this.horizontalShift = 0; }, 160);
        }

        if (Math.random() < 0.05 * this.intensity) {
            this.verticalShift = (Math.random() - 0.5) * 20;
            setTimeout(() => { this.verticalShift = 0; }, 120);
        }

        if (Math.random() < 0.025 * this.intensity) {
            this.corruption = Math.random() * 0.4;
            setTimeout(() => { this.corruption = 0; }, 500);
        }

        if (Math.random() < 0.035 * this.intensity) {
            this.flicker = 0.2 + Math.random() * 0.8;
            setTimeout(() => { this.flicker = 1; }, 240);
        }

        if (Math.random() < 0.015 * this.intensity) {
            this.staticEffect = Math.random() * 0.6;
            setTimeout(() => { this.staticEffect = 0; }, 400);
        }

        if (Math.random() < 0.03 * this.intensity) {
            this.shakeIntensity = Math.random() * 10;
            setTimeout(() => { this.shakeIntensity = 0; }, 600);
        }

        if (Math.random() < 0.02 * this.intensity) {
            this.smearEffect = 0.3 + Math.random() * 0.7;
            setTimeout(() => { this.smearEffect = 0; }, 800);
        }
    }

    updatePerformanceGlitchEffects(performanceStress) {
        this.intensity = Math.min(1, performanceStress * 1.5);

        if (Math.random() < 0.05 * this.intensity) {
            this.scanlineOffset = (Math.random() - 0.5) * 10;
        }

        if (Math.random() < 0.025 * this.intensity) {
            this.textGlitch = true;
            setTimeout(() => { this.textGlitch = false; }, 200);
        }

        if (Math.random() < 0.04 * this.intensity) {
            this.horizontalShift = (Math.random() - 0.5) * 20;
            setTimeout(() => { this.horizontalShift = 0; }, 100);
        }

        if (Math.random() < 0.015 * this.intensity) {
            this.corruption = Math.random() * 0.3;
            setTimeout(() => { this.corruption = 0; }, 400);
        }

        if (Math.random() < 0.025 * this.intensity) {
            this.flicker = 0.3 + Math.random() * 0.7;
            setTimeout(() => { this.flicker = 1; }, 200);
        }
    }

    reset() {
        this.intensity = 0;
        this.scanlineOffset = 0;
        this.textGlitch = false;
        this.horizontalShift = 0;
        this.verticalShift = 0;
        this.corruption = 0;
        this.flicker = 1;
        this.staticEffect = 0;
        this.shakeIntensity = 0;
        this.smearEffect = 0;
        this.lastFrame = null;
        this.trails = [];
    }

    applyTextGlitch(text, intensity = this.intensity) {
        if (!this.textGlitch) return text;
        const glitchChance = 0.4 * intensity;
        return text.split('').map(c =>
            Math.random() < glitchChance ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : c
        ).join('');
    }

    applyGraphGlitch(value, intensity = this.intensity) {
        if (Math.random() < intensity * 0.1) {
            return value * (0.9 + Math.random() * 0.2);
        }
        return value;
    }
}

export const evilGlitchSystem = new EvilGlitchSystem();

export function getLogColor(type) {
    return {
        debug: '#8b0000',
        error: '#ff0000',
        warn: '#8b0000',
        info: '#8b0000',
        log: '#ff0000'
    }[type] || '#ff0000';
}

export function getPerformanceColor(value, thresholds = [70, 85]) {
    if (value < thresholds[0]) return '#8b0000';
    if (value < thresholds[1]) return '#ff0000';
    return '#300000';
}