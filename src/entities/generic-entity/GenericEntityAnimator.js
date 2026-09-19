// Generic Entity Animator
// Lightweight procedural idle animation for generic sprite-component entities.
// Stores animation offsets on state._animOffsets so the renderer can
// apply them to the entity centre independently of component offsets.

import { GENERIC_ENTITY_CONFIG } from './GenericEntityConfig.js';

export class GenericEntityAnimator {
    constructor(state, config = {}) {
        this.state = state;
        this.config = { ...GENERIC_ENTITY_CONFIG, ...config };
        this.speed = config.defaultAnimationSpeed || this.config.defaultAnimationSpeed;
        this._running = false;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    reset() {
        this.state.time = 0;
        this.state._animOffsets = { x: 0, y: 0 };
        this.state.paused = false;
        this._running = false;
    }

    setState(stateName) {
        this.state.activeState = stateName || 'idle';
    }

    getState() {
        return this.state.activeState;
    }

    update(deltaTime) {
        if (this.state.paused) return;

        this.state.time += deltaTime * this.speed;

        const bobSpeed = this.config.idleBobSpeed || 2.0;
        const bobAmplitude = this.config.idleBobAmplitude || 3.0;
        const swaySpeed = this.config.idleSwaySpeed || 1.5;
        const swayAmplitude = this.config.idleSwayAmplitude || 2.0;

        this.state._animOffsets.y = Math.sin(this.state.time * bobSpeed) * bobAmplitude;
        this.state._animOffsets.x = Math.sin(this.state.time * swaySpeed) * swayAmplitude;
    }
}
