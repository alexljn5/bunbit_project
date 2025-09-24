const gameInfo = {
    name: "Bunbit",
    version: "0.0.5"
};

const isRenderer = typeof window !== "undefined" && typeof document !== "undefined";

// Only do DOM + window stuff in the renderer
export const gameName = gameInfo.name;
export const gameVersionNumber = gameInfo.version;

export const domElements = {
    mainGameRender: typeof document !== 'undefined' ? document.getElementById("mainGameRender") : null,
    _2DMainGameRender: typeof document !== 'undefined' ? document.getElementById("_2DMainGameRender") : null,
};

export let HIGH_RES_ENABLED = true;
export let CANVAS_WIDTH;
export let CANVAS_HEIGHT;
export let SCALE_X;
export let SCALE_Y;

export const REF_CANVAS_WIDTH = 800;
export const REF_CANVAS_HEIGHT = 800;

// Debug toggle via URL param (?debug=true for high-res)
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        HIGH_RES_ENABLED = true;
        console.log("Debug mode: High-res enabled! *chao chao*");
    }

    // Lock the ESC key using Keyboard Lock API
    if (navigator.keyboard && navigator.keyboard.lock) {
        navigator.keyboard.lock(['Escape'])
            .catch(err => console.log("Could not lock ESC key:", err));
    } else {
        console.log("Keyboard Lock API not supported in this browser");
    }
}

export function updateCanvasResolution(highResEnabled) {
    HIGH_RES_ENABLED = highResEnabled;
    const renderResolution = highResEnabled ? 800 : 400;

    // Update canvas properties in browser environment
    if (domElements.mainGameRender) {
        domElements.mainGameRender.width = renderResolution;
        domElements.mainGameRender.height = renderResolution;
        const scale = highResEnabled ? 1 : 2;
        domElements.mainGameRender.style.transform = `scale(${scale})`;
        domElements.mainGameRender.style.transformOrigin = 'center';
    }

    // Update resolution values
    CANVAS_WIDTH = renderResolution;
    CANVAS_HEIGHT = renderResolution;
    SCALE_X = renderResolution / REF_CANVAS_WIDTH;
    SCALE_Y = renderResolution / REF_CANVAS_HEIGHT;
}

// Initialize with default (low-res) in browser or Node.js
if (domElements.mainGameRender) {
    updateCanvasResolution(HIGH_RES_ENABLED);
} else {
    CANVAS_WIDTH = 400;
    CANVAS_HEIGHT = 400;
    SCALE_X = 400 / REF_CANVAS_WIDTH;
    SCALE_Y = 400 / REF_CANVAS_HEIGHT;
}