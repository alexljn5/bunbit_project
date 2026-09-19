// Jim Hate Entity
// Main entity class that ties together state, animation, and rendering.
// Provides update()/render() loop interface suitable for both
// debug preview and future game integration.

import { JimHateState } from './JimHateState.js';
import { JimHateAnimator } from './JimHateAnimator.js';
import { JimHateRenderer } from './JimHateRenderer.js';
import { JIM_HATE_CONFIG } from './JimHateConfig.js';

export class JimHate {
    constructor(canvas, config = {}) {
        this.config = { ...JIM_HATE_CONFIG, ...config };

        // Core systems
        this.state = new JimHateState(config.spriteComponents || []);
        this.animator = new JimHateAnimator(this.state);
        this.renderer = new JimHateRenderer(canvas, config);

        // Loop control
        this.isRunning = false;
        this.rafId = null;
        this.lastTime = 0;

        // Callbacks
        this.onUpdate = null;
        this.onRender = null;
    }

    getPosition() { return { x: this.state.x, y: this.state.y }; }
    setPosition(x, y) { this.state.x = x; this.state.y = y; }

    update(deltaTime) {
        this.state.update(deltaTime);
        this.animator.animate(deltaTime);
        if (this.onUpdate) this.onUpdate(this.state, deltaTime);
    }

    render() {
        if (this.onRender) this.onRender(this.renderer, this.state);
        this.renderer.render(this.state);
    }

    _tick(time) {
        if (!this.isRunning) return;
        const rawDeltaMs = this.lastTime ? (time - this.lastTime) : 1000 / 60;
        this.lastTime = time;
        const deltaSeconds = rawDeltaMs / 1000;
        this.update(deltaSeconds);
        this.render();
        this.rafId = requestAnimationFrame((t) => this._tick(t));
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = 0;
        this.rafId = requestAnimationFrame((t) => this._tick(t));
    }

    stop() {
        this.isRunning = false;
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    }

    reset() { this.state.reset(); this.animator.setState("idle"); }

    // Generic component property setters (no hardcoded component names)
    setComponentOffset(componentId, x, y) {
        this.state.setComponentProp(componentId, 'offsetX', x);
        this.state.setComponentProp(componentId, 'offsetY', y);
    }

    setComponentScale(componentId, scale) {
        this.state.setComponentProp(componentId, 'scale', scale);
    }

    getComponentOffset(componentId) {
        return {
            x: this.state.getComponentProp(componentId, 'offsetX'),
            y: this.state.getComponentProp(componentId, 'offsetY'),
        };
    }

    getComponentScale(componentId) {
        return this.state.getComponentProp(componentId, 'scale');
    }

    togglePause() { this.state.paused = !this.state.paused; return this.state.paused; }
    getAnimationState() { return this.animator.getState(); }
    setAnimationState(stateName) { this.animator.setState(stateName); }
}
