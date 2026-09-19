// Jim Hate Animator
// Handles animation timing, state transitions, and procedural animation
// (bobbing, swaying, etc.) for the Jim Hate entity.
//
// This is intentionally lightweight — full animation states, attack
// animations, and behaviour logic will be added later.

import { JIM_HATE_CONFIG } from './JimHateConfig.js';

export class JimHateAnimator {
    constructor(state) {
        this.state = state;
    }

    // Update animation-driven state modifications
    // Called after state.update(deltaTime) in the entity loop
    animate(deltaTime) {
        if (this.state.paused) return;

        const t = this.state.time;
        const speed = this.state.animationSpeed;

        // Apply procedural idle animation to offsets
        // These are temporary; real animation will use keyframes
        switch (this.state.activeState) {
            case 'idle':
                this._animateIdle(t, speed);
                break;
            // Future: 'walk', 'attack', 'death', etc.
            default:
                break;
        }
    }

    _animateIdle(t, speed) {
        const bobSpeed = JIM_HATE_CONFIG.idleBobSpeed;
        const bobAmp = JIM_HATE_CONFIG.idleBobAmplitude;
        const swaySpeed = JIM_HATE_CONFIG.idleSwaySpeed;
        const swayAmp = JIM_HATE_CONFIG.idleSwayAmplitude;

        // Gentle vertical bob on the whole entity
        const bob = Math.sin(t * bobSpeed * speed) * bobAmp;
        // Gentle horizontal sway
        const sway = Math.sin(t * swaySpeed * speed) * swayAmp;

        // Store animation offsets on the state so the renderer can read them
        if (!this.state._animOffsets) this.state._animOffsets = { x: 0, y: 0 };
        this.state._animOffsets.x = sway;
        this.state._animOffsets.y = bob;
    }

    // Get the current animation offset to apply on top of base position
    getAnimationOffset() {
        if (!this.state._animOffsets) return { x: 0, y: 0 };
        return { ...this.state._animOffsets };
    }

    // Set animation speed multiplier
    setSpeed(speed) {
        this.state.animationSpeed = speed;
    }

    // Reset animator to initial state
    reset() {
        this.state._animOffsets = { x: 0, y: 0 };
        this.state.time = 0;
    }

    // Set animation state
    setState(stateName) {
        if (this.state.activeState === stateName) return;
        this.state.activeState = stateName;
        // Reset animation offsets on state change
        this.state._animOffsets = { x: 0, y: 0 };
    }

    getState() {
        return this.state.activeState;
    }
}
