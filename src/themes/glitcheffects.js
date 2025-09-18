import { EVIL_THEME } from '../themes/eviltheme.js'; // If needed, but it's already in eviltheme

// Enhanced glitch effects system
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

    // Update glitch effects based on activity level (optimized: skip some randoms if intensity low)
    updateGlitchEffects(activityLevel = 0) {
        this.intensity = activityLevel;

        if (this.intensity < 0.2) return; // Skip updates if low intensity

        // Random glitch events with higher probability when intensity is high
        if (Math.random() < 0.15 * this.intensity) {
            this.scanlineOffset = (Math.random() - 0.5) * 15;
        }

        if (Math.random() < 0.08 * this.intensity) {
            this.textGlitch = true;
            setTimeout(() => { this.textGlitch = false; }, 150);
        }

        if (Math.random() < 0.1 * this.intensity) {
            this.horizontalShift = (Math.random() - 0.5) * 30;
            setTimeout(() => { this.horizontalShift = 0; }, 80);
        }

        if (Math.random() < 0.1 * this.intensity) {
            this.verticalShift = (Math.random() - 0.5) * 20;
            setTimeout(() => { this.verticalShift = 0; }, 60);
        }

        if (Math.random() < 0.05 * this.intensity) {
            this.corruption = Math.random() * 0.4;
            setTimeout(() => { this.corruption = 0; }, 250);
        }

        if (Math.random() < 0.07 * this.intensity) {
            this.flicker = 0.2 + Math.random() * 0.8;
            setTimeout(() => { this.flicker = 1; }, 120);
        }

        if (Math.random() < 0.03 * this.intensity) {
            this.staticEffect = Math.random() * 0.6;
            setTimeout(() => { this.staticEffect = 0; }, 200);
        }

        if (Math.random() < 0.06 * this.intensity) {
            this.shakeIntensity = Math.random() * 10;
            setTimeout(() => { this.shakeIntensity = 0; }, 300);
        }

        if (Math.random() < 0.04 * this.intensity) {
            this.smearEffect = 0.3 + Math.random() * 0.7;
            setTimeout(() => { this.smearEffect = 0; }, 400);
        }
    }

    // Update performance-based glitch effects
    updatePerformanceGlitchEffects(performanceStress) {
        this.intensity = Math.min(1, performanceStress * 1.5);

        // Random glitch events
        if (Math.random() < 0.1 * this.intensity) {
            this.scanlineOffset = (Math.random() - 0.5) * 10;
        }

        if (Math.random() < 0.05 * this.intensity) {
            this.textGlitch = true;
            setTimeout(() => { this.textGlitch = false; }, 100);
        }

        if (Math.random() < 0.08 * this.intensity) {
            this.horizontalShift = (Math.random() - 0.5) * 20;
            setTimeout(() => { this.horizontalShift = 0; }, 50);
        }

        if (Math.random() < 0.03 * this.intensity) {
            this.corruption = Math.random() * 0.3;
            setTimeout(() => { this.corruption = 0; }, 200);
        }

        if (Math.random() < 0.05 * this.intensity) {
            this.flicker = 0.3 + Math.random() * 0.7;
            setTimeout(() => { this.flicker = 1; }, 100);
        }
    }

    // Reset all glitch effects
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

    // Apply text glitch effect
    applyTextGlitch(text, intensity = this.intensity) {
        if (!this.textGlitch) return text;

        const glitchChance = 0.4 * intensity;
        return text.split('').map(c =>
            Math.random() < glitchChance ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : c
        ).join('');
    }

    // Apply graph value glitch
    applyGraphGlitch(value, intensity = this.intensity) {
        if (Math.random() < intensity * 0.1) {
            return value * (0.9 + Math.random() * 0.2);
        }
        return value;
    }
}

// Create a default glitch system instance
export const evilGlitchSystem = new EvilGlitchSystem();

// Utility function to get text color based on log type
export function getLogColor(type) {
    return {
        debug: '#8b0000',    // Dark blood red
        error: '#ff0000',    // Bright blood red
        warn: '#8b0000',     // Dark blood red
        info: '#8b0000',     // Dark blood red
        log: '#ff0000'       // Bright blood red
    }[type] || '#ff0000';
}

// Utility function to get performance color based on value
export function getPerformanceColor(value, thresholds = [70, 85]) {
    if (value < thresholds[0]) return '#ff0000';
    if (value < thresholds[1]) return '#8b0000';
    return '#300000';
}