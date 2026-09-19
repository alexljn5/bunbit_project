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
        this.state = new JimHateState();
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
    setFaceOffset(x, y) { this.state.faceOffsetX = x; this.state.faceOffsetY = y; }
    setHandsOffset(x, y) { this.state.handsOffsetX = x; this.state.handsOffsetY = y; }
    setScales(faceScale, handsScale) { this.state.faceScale = faceScale; this.state.handsScale = handsScale; }
    togglePause() { this.state.paused = !this.state.paused; return this.state.paused; }
    getAnimationState() { return this.animator.getState(); }
    setAnimationState(stateName) { this.animator.setState(stateName); }
}
