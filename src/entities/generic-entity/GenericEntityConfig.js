// Generic Entity Configuration
// A configurable template for entities that are composed of independent
// sprite components (e.g. face, hands). Each component has its own
// sprite path, dimensions, default offsets and scale.
//
// This is the generic starting point for new game entities. Individual
// entities (such as Jim Hate) can either reuse this config or provide
// their own specialised config.

export const GENERIC_ENTITY_CONFIG = {
    // Sprite components — each entry describes one independent layer.
    // spritePath is intentionally empty for the generic template;
    // the renderer draws procedural placeholders for unloaded sprites.
    spriteComponents: [
        {
            id: 'face',
            label: 'Face',
            spritePath: '',
            defaultWidth: 200,
            defaultHeight: 250,
            defaultOffsetX: 0,
            defaultOffsetY: -20,
            defaultScale: 1.0,
            defaultLayer: 0,
            placeholderColor: '#3a2a4a',
        },
        {
            id: 'hands',
            label: 'Hands',
            spritePath: '',
            defaultWidth: 180,
            defaultHeight: 160,
            defaultOffsetX: 0,
            defaultOffsetY: 40,
            defaultScale: 1.0,
            defaultLayer: 10,
            placeholderColor: '#2a3a4a',
        },
    ],

    // Default scales
    defaultFaceScale: 1.0,
    defaultHandsScale: 1.0,

    // Default position offsets (relative to entity center, in pixels at scale 1)
    defaultFaceOffsetX: 0,
    defaultFaceOffsetY: -20,
    defaultHandsOffsetX: 0,
    defaultHandsOffsetY: 40,

    // Canvas dimensions for preview
    defaultCanvasWidth: 800,
    defaultCanvasHeight: 800,

    // Background color for preview canvas
    previewBackgroundColor: '#0a0a0a',

    // Animation
    defaultAnimationSpeed: 1.0,
    idleBobSpeed: 2.0,
    idleBobAmplitude: 3.0,
    idleSwaySpeed: 1.5,
    idleSwayAmplitude: 2.0,

    // Entity dimensions (bounding box, for future collision)
    entityWidth: 200,
    entityHeight: 300,
};
