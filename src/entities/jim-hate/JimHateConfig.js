// Jim Hate Entity Configuration
// Centralized configuration for the Jim Hate entity.

export const JIM_HATE_CONFIG = {
    // Sprite paths (relative to HTML root, matching existing sprite conventions)
    faceSpritePath: './img/sprites/jim/jim-hate/jim-hate-face.png',
    handsSpritePath: './img/sprites/jim/jim-hate/jim-hate-hands.png',

    // Sprite dimensions (measured from actual files)
    faceWidth: 529,
    faceHeight: 702,
    handsWidth: 482,
    handsHeight: 467,

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
