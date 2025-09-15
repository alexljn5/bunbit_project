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
}

// Math Tables for Fast Trig
export const SIN_TABLE_SIZE = 1024; // 2^10 for bitwise masking
export const FIXED_POINT_SHIFT = 16; // 2^16 = 65536 for fixed-point precision
export const ANGLE_SCALE = (SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (Math.PI * 2); // ~1048576 / (2 * π)
export const sinTable = new Float32Array(SIN_TABLE_SIZE);
export const cosTable = new Float32Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = (i * Math.PI * 2) / SIN_TABLE_SIZE;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

export function fastSin(angle) {
    // Convert angle to fixed-point (32-bit int, 16-bit fraction)
    const fixedAngle = (angle * ANGLE_SCALE) | 0; // Scale to fixed-point
    const idx = (fixedAngle >>> FIXED_POINT_SHIFT) & (SIN_TABLE_SIZE - 1); // Extract table index
    return sinTable[idx];
}

export function fastCos(angle) {
    // Convert angle to fixed-point (32-bit int, 16-bit fraction)
    const fixedAngle = (angle * ANGLE_SCALE) | 0;
    const idx = (fixedAngle >>> FIXED_POINT_SHIFT) & (SIN_TABLE_SIZE - 1);
    return cosTable[idx];
}

export function Q_rsqrt(number) {
    const threeHalfs = 1.5;
    const half = 0.5;
    const x2 = number * half;
    let y = number;
    const buf = new ArrayBuffer(4);
    const f = new Float32Array(buf);
    const i = new Uint32Array(buf);
    f[0] = y;
    i[0] = 0x5f3759df - (i[0] >> 1); // Quake III magic number
    y = f[0];
    y = y * (threeHalfs - (x2 * y * y)); // First Newton-Raphson iteration
    y = y * (threeHalfs - (x2 * y * y)); // Second iteration
    return y;
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