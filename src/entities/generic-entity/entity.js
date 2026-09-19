// Generic Entity descriptor.
// This module is discovered by scripts/discover-entities.mjs
// and re-exported via src/entities/entity-manifest.js.

import { GenericEntity } from './GenericEntity.js';
import { GenericEntityState } from './GenericEntityState.js';
import { GenericEntityAnimator } from './GenericEntityAnimator.js';
import { GenericEntityRenderer } from './GenericEntityRenderer.js';
import { GENERIC_ENTITY_CONFIG } from './GenericEntityConfig.js';

export const GENERIC_ENTITY_DESCRIPTOR = {
    id: 'generic-entity',
    label: 'Generic Entity',
    classPath: './GenericEntity.js',
    configPath: './GenericEntityConfig.js',
    config: GENERIC_ENTITY_CONFIG,
    spriteComponents: GENERIC_ENTITY_CONFIG.spriteComponents.map(c => ({
        id: c.id,
        label: c.label,
        spritePath: c.spritePath,
        defaultWidth: c.defaultWidth,
        defaultHeight: c.defaultHeight,
        defaultOffsetX: c.defaultOffsetX,
        defaultOffsetY: c.defaultOffsetY,
        defaultScale: c.defaultScale,
    })),
    defaultConfig: {
        canvasWidth: GENERIC_ENTITY_CONFIG.defaultCanvasWidth,
        canvasHeight: GENERIC_ENTITY_CONFIG.defaultCanvasHeight,
        previewBackgroundColor: GENERIC_ENTITY_CONFIG.previewBackgroundColor,
    },
    class: GenericEntity,
    stateClass: GenericEntityState,
    animatorClass: GenericEntityAnimator,
    rendererClass: GenericEntityRenderer,
};

export { GENERIC_ENTITY_DESCRIPTOR as DESCRIPTOR };

export default GENERIC_ENTITY_DESCRIPTOR;
