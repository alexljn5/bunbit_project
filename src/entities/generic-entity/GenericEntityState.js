// Generic Entity State
// Manages all mutable state for a generic sprite-component entity.
// This is the data layer — no rendering and animation logic here.
//
// State is component-driven: each sprite component (face, hands, etc.)
// stores its own offsetX/offsetY/scale. This allows the editor and
// renderer to treat any number of independent sprite layers uniformly.

import { GENERIC_ENTITY_CONFIG } from './GenericEntityConfig.js';

export class GenericEntityState {
    constructor() {
        this.reset();
    }

    reset() {
        // Component-specific state
        this.components = {};
        for (const comp of GENERIC_ENTITY_CONFIG.spriteComponents) {
            this.components[comp.id] = {
                offsetX: comp.defaultOffsetX,
                offsetY: comp.defaultOffsetY,
                scale: comp.defaultScale,
                layer: comp.defaultLayer ?? 0,
            };
        }

        // Entity position (for future movement)
        this.x = 0;
        this.y = 0;

        // Animation
        this.animationSpeed = GENERIC_ENTITY_CONFIG.defaultAnimationSpeed;
        this.time = 0;
        this.paused = false;

        // Entity state
        this.activeState = 'idle'; // idle, walk, attack, etc. (future)

        // Entity dimensions
        this.width = GENERIC_ENTITY_CONFIG.entityWidth;
        this.height = GENERIC_ENTITY_CONFIG.entityHeight;

        // Animation offsets applied to entity centre
        this._animOffsets = { x: 0, y: 0 };
    }

    // Generic property setter for top-level state (editor/debug use)
    set(key, value) {
        this[key] = value;
    }

    // Component property setter
    setComponentProp(componentId, prop, value) {
        const comp = this.components[componentId];
        if (comp) {
            comp[prop] = value;
        }
    }

    // Component property getter
    getComponentProp(componentId, prop) {
        const comp = this.components[componentId];
        return comp ? comp[prop] : undefined;
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
