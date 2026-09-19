// Jim Hate entity descriptor.
// This module is discovered by scripts/discover-entities.mjs
// and re-exported via src/entities/entity-manifest.js.

import { JimHate } from './JimHate.js';
import { JimHateState } from './JimHateState.js';
import { JimHateAnimator } from './JimHateAnimator.js';
import { JimHateRenderer } from './JimHateRenderer.js';
import { JIM_HATE_CONFIG } from './JimHateConfig.js';

export const JIM_HATE_DESCRIPTOR = {
    id: 'jim-hate',
    label: 'Jim Hate',
    classPath: './JimHate.js',
    configPath: './JimHateConfig.js',
    config: JIM_HATE_CONFIG,
    spriteComponents: [
        {
            id: 'face',
            label: 'Face',
            spritePath: JIM_HATE_CONFIG.faceSpritePath,
            defaultWidth: JIM_HATE_CONFIG.faceWidth,
            defaultHeight: JIM_HATE_CONFIG.faceHeight,
            defaultOffsetX: JIM_HATE_CONFIG.defaultFaceOffsetX,
            defaultOffsetY: JIM_HATE_CONFIG.defaultFaceOffsetY,
            defaultScale: JIM_HATE_CONFIG.defaultFaceScale,
        },
        {
            id: 'hands',
            label: 'Hands',
            spritePath: JIM_HATE_CONFIG.handsSpritePath,
            defaultWidth: JIM_HATE_CONFIG.handsWidth,
            defaultHeight: JIM_HATE_CONFIG.handsHeight,
            defaultOffsetX: JIM_HATE_CONFIG.defaultHandsOffsetX,
            defaultOffsetY: JIM_HATE_CONFIG.defaultHandsOffsetY,
            defaultScale: JIM_HATE_CONFIG.defaultHandsScale,
        },
    ],
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
