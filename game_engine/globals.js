// game_engine/globals.js
export const domElements = {
    mainGameRender: typeof document !== 'undefined' ? document.getElementById("mainGameRender") : null,
};

export let HIGH_RES_ENABLED = false;
export let CANVAS_WIDTH;
export let CANVAS_HEIGHT;
export let SCALE_X;
export let SCALE_Y;

export const REF_CANVAS_WIDTH = 800;
export const REF_CANVAS_HEIGHT = 800;

export function updateCanvasResolution(highResEnabled) {
    HIGH_RES_ENABLED = highResEnabled;

    const renderResolution = highResEnabled ? 800 : 400;

    // Only update canvas properties if in a browser environment
    if (typeof document !== 'undefined' && domElements.mainGameRender) {
        domElements.mainGameRender.width = renderResolution;
        domElements.mainGameRender.height = renderResolution;

        const scale = highResEnabled ? 1 : 2;
        domElements.mainGameRender.style.transform = `scale(${scale})`;
        domElements.mainGameRender.style.transformOrigin = 'center';
    }

    // Update the actual resolution values
    CANVAS_WIDTH = renderResolution;
    CANVAS_HEIGHT = renderResolution;
    SCALE_X = renderResolution / REF_CANVAS_WIDTH;
    SCALE_Y = renderResolution / REF_CANVAS_HEIGHT;
}

// Call once to initialize with default (low-res), but only in browser
if (typeof document !== 'undefined') {
    updateCanvasResolution(false);
} else {
    // Initialize defaults for Node.js
    CANVAS_WIDTH = 400;
    CANVAS_HEIGHT = 400;
    SCALE_X = 400 / REF_CANVAS_WIDTH;
    SCALE_Y = 400 / REF_CANVAS_HEIGHT;
}