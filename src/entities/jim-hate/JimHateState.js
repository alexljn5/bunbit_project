// Jim Hate Entity State
// Manages all mutable state for the Jim Hate entity.
// This is the data layer — no rendering or animation logic here.

import { JIM_HATE_CONFIG } from './JimHateConfig.js';

export class JimHateState {
    constructor() {
        this.reset();
    }

    reset() {
        // Face component position offsets (pixels, relative to center)
        this.faceOffsetX = JIM_HATE_CONFIG.defaultFaceOffsetX;
        this.faceOffsetY = JIM_HATE_CONFIG.defaultFaceOffsetY;

        // Hands component position offsets (pixels, relative to center)
        this.handsOffsetX = JIM_HATE_CONFIG.defaultHandsOffsetX;
        this.handsOffsetY = JIM_HATE_CONFIG.defaultHandsOffsetY;

        // Component scales
        this.faceScale = JIM_HATE_CONFIG.defaultFaceScale;
        this.handsScale = JIM_HATE_CONFIG.defaultHandsScale;

        // Entity position (for future movement)
        this.x = 0;
        this.y = 0;

        // Animation
        this.animationSpeed = JIM_HATE_CONFIG.defaultAnimationSpeed;
        this.time = 0;
        this.paused = false;

        // Entity state
        this.activeState = 'idle'; // idle, walk, attack, etc. (future)

        // Entity dimensions
        this.width = JIM_HATE_CONFIG.entityWidth;
        this.height = JIM_HATE_CONFIG.entityHeight;
    }

    // Update time-based state
    update(deltaTime) {
        if (this.paused) return;
        this.time += deltaTime * this.animationSpeed;
    }

    // Get face world position (center + offset)
    getFacePosition() {
        return {
            x: this.x + this.faceOffsetX,
            y: this.y + this.faceOffsetY,
        };
    }

    // Get hands world position (center + offset)
    getHandsPosition() {
        return {
            x: this.x + this.handsOffsetX,
            y: this.y + this.handsOffsetY,
        };
    }
}
