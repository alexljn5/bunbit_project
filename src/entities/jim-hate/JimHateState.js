// Jim Hate Entity State
// Manages all mutable state for the Jim Hate entity.
// This is the data layer — no rendering or animation logic here.

import { JIM_HATE_CONFIG } from './JimHateConfig.js';

export class JimHateState {
    constructor(spriteComponents = []) {
        this.spriteComponents = spriteComponents;
        this.reset();
    }

    reset() {
        // Component-specific state (generic — no hardcoded component names)
        this.components = {};

        // Initialise from runtime sprite components
        const spriteComponents = this.spriteComponents || [];
        for (const comp of spriteComponents) {
            this.components[comp.id] = {
                offsetX: comp.defaultOffsetX ?? 0,
                offsetY: comp.defaultOffsetY ?? 0,
                scale: comp.defaultScale ?? 1.0,
            };
        }

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

    // Generic property setter for editor/debug use
    set(key, value) {
        this[key] = value;
    }

    // Component property setter (editor/debug use)
    // Works for any component ID — no special cases.
    setComponentProp(componentId, prop, value) {
        const comp = this.components[componentId];
        if (comp) {
            comp[prop] = value;
        }
    }

    // Component property getter (editor/debug use)
    // Works for any component ID — no special cases.
    getComponentProp(componentId, prop) {
        const comp = this.components[componentId];
        return comp ? comp[prop] : undefined;
    }

    // Get all component IDs
    getComponentIds() {
        return Object.keys(this.components);
    }

    // Get component state
    getComponent(componentId) {
        return this.components[componentId];
    }

    // Update time-based state
    update(deltaTime) {
        if (this.paused) return;
        this.time += deltaTime * this.animationSpeed;
    }

    // Get component world position (center + offset)
    getComponentPosition(componentId) {
        const comp = this.components[componentId];
        if (!comp) return { x: this.x, y: this.y };
        return {
            x: this.x + comp.offsetX,
            y: this.y + comp.offsetY,
        };
    }
}
