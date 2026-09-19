// Generic Entity
// A configurable game entity composed of independent sprite layers.
// This is the base implementation for entities that are built from
// sprite components (face, hands, etc.) and can be visualised
// independently through the debug editor or embedded in the game.
//
// Architecture:
//   GenericEntity
//     |--> GenericEntityState (data)
//     |--> GenericEntityAnimator (procedural idle animation)
//     |--> GenericEntityRenderer (canvas rendering)

import { GENERIC_ENTITY_CONFIG } from './GenericEntityConfig.js';
import { GenericEntityState } from './GenericEntityState.js';
import { GenericEntityAnimator } from './GenericEntityAnimator.js';
import { GenericEntityRenderer } from './GenericEntityRenderer.js';

export class GenericEntity {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.config = { ...GENERIC_ENTITY_CONFIG, ...config };

        this.state = new GenericEntityState();
        this.animator = new GenericEntityAnimator(this.state, this.config);
        this.renderer = new GenericEntityRenderer(canvas, this.config);
    }

    update(deltaTime) {
        this.state.update(deltaTime);
        this.animator.update(deltaTime);
    }

    render() {
        this.renderer.render(this.state);
    }

    start() {
        this.animator._running = true;
    }

    stop() {
        this.animator._running = false;
    }

    reset() {
        this.state.reset();
        this.animator.reset();
    }

    // Component-level helpers
    setComponentOffset(componentId, x, y) {
        this.state.setComponentProp(componentId, 'offsetX', x);
        this.state.setComponentProp(componentId, 'offsetY', y);
    }

    setComponentScale(componentId, scale) {
        this.state.setComponentProp(componentId, 'scale', scale);
    }

    getComponentOffset(componentId) {
        return this.state.getComponentPosition(componentId);
    }

    // Entity-level helpers
    setPosition(x, y) {
        this.state.x = x;
        this.state.y = y;
    }

    togglePause() {
        this.state.paused = !this.state.paused;
    }

    setAnimationState(stateName) {
        this.animator.setState(stateName);
    }
}
