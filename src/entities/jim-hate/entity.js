// Jim Hate entity descriptor.
// This module is discovered by scripts/discover-entities.mjs
// and re-exported via src/entities/entity-manifest.js.

import { JimHate } from './JimHate.js';
import { JimHateState } from './JimHateState.js';
import { JimHateAnimator } from './JimHateAnimator.js';
import { JimHateRenderer } from './JimHateRenderer.js';
import { JIM_HATE_CONFIG } from './JimHateConfig.js';
import { SPRITE_COMPONENTS } from './sprite-components.js';

export const JIM_HATE_DESCRIPTOR = {
    id: 'jim-hate',
    label: 'Jim Hate',
    classPath: './JimHate.js',
    configPath: './JimHateConfig.js',
    config: {
        ...JIM_HATE_CONFIG,
        spriteComponents: SPRITE_COMPONENTS,
    },
    spriteComponents: SPRITE_COMPONENTS,
    defaultConfig: {
        canvasWidth: JIM_HATE_CONFIG.defaultCanvasWidth,
        canvasHeight: JIM_HATE_CONFIG.defaultCanvasHeight,
        previewBackgroundColor: JIM_HATE_CONFIG.previewBackgroundColor,
    },
    class: JimHate,
    stateClass: JimHateState,
    animatorClass: JimHateAnimator,
    rendererClass: JimHateRenderer,
};

export { JIM_HATE_DESCRIPTOR as DESCRIPTOR };

export default JIM_HATE_DESCRIPTOR;
