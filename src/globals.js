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
        // Allow CSS to scale the display canvas dynamically (not transform)
        domElements.mainGameRender.style.width = '100%';
        domElements.mainGameRender.style.height = '100%';
        domElements.mainGameRender.style.maxWidth = '90vw';
        domElements.mainGameRender.style.maxHeight = '90vh';
        domElements.mainGameRender.style.aspectRatio = '1';
    }

    // Update resolution values
    CANVAS_WIDTH = renderResolution;
    CANVAS_HEIGHT = renderResolution;
    SCALE_X = renderResolution / REF_CANVAS_WIDTH;
    SCALE_Y = renderResolution / REF_CANVAS_HEIGHT;
}

// Handle window resize to keep canvas responsive
export function onWindowResize() {
    if (domElements.mainGameRender && domElements.mainGameRender.parentElement) {
        // Canvas internal resolution stays same (renderResolution), CSS scaling handles viewport
        // Optionally adjust render resolution based on device pixel ratio for high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        // If you want to support super high DPI, uncomment below and adjust render resolution
        // const renderResolution = HIGH_RES_ENABLED ? 800 : 400;
        // const newResolution = Math.ceil(renderResolution * Math.min(dpr, 2)); // Cap at 2x
        // domElements.mainGameRender.width = newResolution;
        // domElements.mainGameRender.height = newResolution;
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('resize', onWindowResize);
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

// =============================================================================
// GLOBAL FLAGS - Centralized configuration for the entire application
// =============================================================================

// --- DEBUG FLAGS ---
export let defaultDebugVisible = false; // Debug features hidden by default
export let isDebugVisible = false; // Debug terminal visibility
export let showDebugTools = false; // Debug tools overlay visibility
export let showTerminal = false; // Terminal visibility

// Debug terminal configuration
export let MAX_LOGS = 50000;

// Developer-only start/intro animation toggles
export let DEBUG_START_INTRO_ANIMATION = true;
export let RUN_INTRO_ON_START = true; // Run intro animation automatically on app start
export let logBuffer = [];
export let logFilters = { log: true, error: true, warn: true, info: true, debug: true };

// Debug terminal enabled via URL param or production check
export const ENABLE_DEBUG_TERMINAL = (() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const debugTerminalParam = urlParams ? urlParams.get('debugTerminal') : null;
    if (debugTerminalParam === 'false') return false;

    if (typeof window === 'undefined') return true;
    return !(window.debugAPI && window.debugAPI.isProduction && window.debugAPI.isProduction());
})();

// --- THEME FLAGS ---
// Default theme selection (control via single string)
export let defaultThemeName = 'evil';

// Note: Theme objects are defined in their respective files in src/themes/
// Theme manager is exported from src/themes/thememanager.js


// --- GRAPHICS SETTINGS ---
export let currentGraphicsPreset = "low";
export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 300; // Default value
export let maxRayDepth = 50; // Default value

// Device-based adjustment for numCastRays
if (typeof navigator !== 'undefined' && (/Mobi|Android/i.test(navigator.userAgent) || navigator.hardwareConcurrency <= 4)) {
    numCastRays = 240; // Reduce for low-end devices
}

// --- WASM RAYCASTING SETTINGS ---
export let useWasmRayMath = typeof window !== 'undefined' ? (window.__useWasmRayMath ?? true) : true;
export let raycastWasmStatus = useWasmRayMath ? "requested" : "disabled";

// --- GAME STATE FLAGS ---
export let menuActive = true;
export let isPaused = false;
export let gameOver = false;
export let introActive = true;

// Initialize window.introActive for autorun check
if (typeof window !== 'undefined') {
    window.introActive = introActive;
}

// --- INPUT STATE ---
export const keys = Object.fromEntries([
    ["w", false], ["a", false], ["s", false], ["d", false],
    ["q", false], ["e", false], [" ", false], ["shift", false],
    ["alt", false], ["p", false], ["t", false], ["enter", false],
    ["i", false], ["1", false], ["2", false], ["3", false], ["4", false],
    ["5", false], ["6", false], ["7", false], ["8", false], ["9", false],
    ["f3", false], ["f4", false], ["escape", false], ["y", false]
]);

// --- PLAYER STATE ---
export let playerPosition = { x: 2.5 * 50 / 2, z: 2.5 * 50 / 2, angle: 0 };
export let previousPosition = { x: playerPosition.x, z: playerPosition.z };
export let playerMovement = { x: 0, z: 0 };
export const playerStamina = { playerStaminaBar: 100 };
export const playerHealth = { playerHealth: 100 };
export let playerHealthBar = 100;
export let playerMovementDisabled = false;

// --- INVENTORY STATE ---
export let playerInventory = [];
export const inventoryState = { selectedInventoryIndex: 0 };
export let showInventorySprite = false;

// --- DEBUG CANVAS SETTINGS ---
export let DEBUG_WIDTH = typeof CANVAS_WIDTH !== 'undefined' ? CANVAS_WIDTH * 0.75 : 600;
export let DEBUG_HEIGHT = typeof CANVAS_HEIGHT !== 'undefined' ? CANVAS_HEIGHT * 0.5 : 400;
export const MIN_WIDTH = 300;
export const MIN_HEIGHT = 200;
export let MAX_CHARS_PER_LINE = 120;

// --- SCROLL STATE ---
export let scrollOffsetX = 0;
export let virtualScrollY = 0;
export let autoScroll = true;

// --- BUTTON STATE ---
export let buttons = [];

// --- WINDOW RESIZE STATE ---
export let resizeArea = { x: 0, y: 0, w: 15, h: 15, hovered: false };

// --- HEADER HEIGHT ---
export const HEADER_HEIGHT = 30;

// --- GRAPHICS PRESETS ---
export const graphicsPresets = {
    potato: { numCastRays: 100, maxRayDepth: 20 },
    very_low: { numCastRays: 150, maxRayDepth: 25 },
    low: { numCastRays: 200, maxRayDepth: 30 },
    medium: { numCastRays: 300, maxRayDepth: 40 },
    high: { numCastRays: 400, maxRayDepth: 50 },
    extreme: { numCastRays: 500, maxRayDepth: 60 },
    nasa: { numCastRays: 600, maxRayDepth: 70 }
};

// --- MENU FONTS ---
export const MENU_FONTS = {
    title: () => `32px Arial`,
    subtitle: () => `24px Arial`,
    button: () => `18px Arial`,
    body: () => `16px Arial`,
    small: () => `14px Arial`
};

// --- BUTTON PRESETS ---
export const BUTTON_PRESETS = {
    standard: { width: 100, height: 40, textOffsetX: 20, textOffsetY: 25 },
    wide: { width: 200, height: 40, textOffsetX: 30, textOffsetY: 25 },
    small: { width: 80, height: 30, textOffsetX: 15, textOffsetY: 20 }
};

// --- DIALOG PRESETS ---
export const DIALOG_PRESETS = {
    standard: { width: 400, height: 150, padding: 20 },
    wide: { width: 600, height: 200, padding: 30 },
    notification: { width: 300, height: 100, padding: 15 }
};

// --- ANIMATION PRESETS ---
export const ANIMATION_PRESETS = {
    fadeIn: { duration: 500, steps: 20, initialAlpha: 0, finalAlpha: 1 },
    fadeOut: { duration: 500, steps: 20, initialAlpha: 1, finalAlpha: 0 },
    slideIn: { duration: 300, distance: 100 }
};

// --- THEME DEFINITIONS ---
// Note: Theme objects are defined in their respective files in src/themes/
// Theme manager is exported from src/themes/thememanager.js

// --- GLOBAL STATE UPDATE FUNCTIONS ---
export function setPaused(val) {
    isPaused = val;
}

export function setMenuActive(val) {
    menuActive = val;
}

export function setDebugVisible(val) {
    isDebugVisible = val;
    defaultDebugVisible = val;
}

export function setShowDebugTools(val) {
    showDebugTools = val;
}

export function setShowTerminal(val) {
    showTerminal = val;
}

export function setGameOver(val) {
    gameOver = val;
}

export function setIntroActive(val) {
    introActive = val;
    if (typeof window !== 'undefined') {
        window.introActive = val;
    }
}

export function setPlayerMovementDisabled(val) {
    playerMovementDisabled = val;
}

export function setPlayerPosition(newPosition) {
    if (newPosition) {
        playerPosition.x = newPosition.x;
        playerPosition.z = newPosition.z;
        playerPosition.angle = newPosition.angle;
    }
}

export function setShowInventorySprite(val) {
    showInventorySprite = val;
}

export function updateGraphicsSettings({ numCastRays: newRays, maxRayDepth: newDepth }) {
    numCastRays = newRays || numCastRays;
    maxRayDepth = newDepth || maxRayDepth;
}

export function applyGraphicsPreset(preset) {
    if (!graphicsPresets[preset]) return false;
    currentGraphicsPreset = preset;
    updateGraphicsSettings(graphicsPresets[preset]);
    return true;
}