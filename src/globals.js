const gameInfo = {
    name: "Bunbit",
    version: "0.0.5"
};

// --- MINIMAP FLAG ---
export let showMinimap = false;
export function setShowMinimap(val) {
    showMinimap = val;
}

// =============================================================================
// GLOBAL FONT CONFIGURATION
// Change this single value to update the font across the entire game.
// The font is loaded via @font-face in stylesgame.css.
// =============================================================================
export const GLOBAL_FONT = "'BoldPixels', 'Courier New', monospace";

// Preload the global font so canvas text rendering can use it immediately.
// Canvas requires fonts to be fully loaded before they can be rendered.
let globalFontLoaded = false;
export function preloadGlobalFont() {
    if (globalFontLoaded || typeof document === 'undefined') return;
    globalFontLoaded = true;

    // Use both FontFace API and document.fonts.load for maximum compatibility
    const fontRegular = new FontFace('BoldPixels', 'url(./img/fonts/boldpixels/BoldsPixels.ttf)');

    Promise.all([fontRegular.load()])
        .then(([regular]) => {
            document.fonts.add(regular);
            console.log('[Font] BoldPixels loaded successfully');
            // Trigger a redraw so canvas picks up the new font
            document.dispatchEvent(new Event('fontLoaded'));
        })
        .catch((err) => {
            console.warn('[Font] BoldPixels failed to load, falling back to Courier New:', err);
        });

    // Also try document.fonts.load as a fallback
    document.fonts.load(`${GLOBAL_FONT}`).catch(() => { });
}

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

// ─── Canonical logical game resolution ─────────────────────
// The game ALWAYS runs internally at GAME_WIDTH x GAME_HEIGHT.
// The browser viewport / fullscreen size is NOT part of the game
// coordinate space. A single global display layer (src/rendering/display.js)
// scales this logical square visually and letterboxes it.
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 800;

// When true, starting the dashboard requests browser fullscreen.
// Fullscreen still uses the same 800x800 logical resolution — only
// the visual scale changes. Kept false during development.
export const AUTO_FULLSCREEN = false;

export const REF_CANVAS_WIDTH = GAME_WIDTH;
export const REF_CANVAS_HEIGHT = GAME_HEIGHT;

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

// Worker debug instrumentation toggle.
// When false (default), [WORKER DEBUG] / [PERF DEBUG] console logs are suppressed.
// The measured worker heartbeats still feed the performance monitor regardless.
export let WORKER_DEBUG_LOGS = false;
export function setWorkerDebugLogs(value) {
    WORKER_DEBUG_LOGS = !!value;
}

export function updateCanvasResolution(highResEnabled) {
    HIGH_RES_ENABLED = highResEnabled;

    // Canonical logical resolution is FIXED at 800x800. The canvas backing
    // store is always GAME_WIDTH x GAME_HEIGHT; only the visual scale changes.
    const renderResolution = GAME_WIDTH;

    // Update canvas properties in browser environment
    if (domElements.mainGameRender) {
        domElements.mainGameRender.width = renderResolution;
        domElements.mainGameRender.height = renderResolution;

        // The single global display layer owns all CSS sizing. If the module
        // is present, let it recompute the scale (it also debounces resize).
        try {
            const display = window.__bunbitDisplay ?? null;
            if (display && typeof display.applyDisplayScale === 'function') {
                display.applyDisplayScale();
            }
        } catch (_) { /* display layer not loaded yet — globals run early */ }
    }

    // Update resolution values
    CANVAS_WIDTH = renderResolution;
    CANVAS_HEIGHT = renderResolution;
    SCALE_X = renderResolution / REF_CANVAS_WIDTH;
    SCALE_Y = renderResolution / REF_CANVAS_HEIGHT;
}

// Handle window resize to keep canvas responsive.
// The canvas internal resolution stays the same (GAME_WIDTH x GAME_HEIGHT).
// CSS scaling + centering + letterboxing is handled by the display layer.
export function onWindowResize() {
    const display = typeof window !== 'undefined' ? window.__bunbitDisplay : null;
    if (display && typeof display.applyDisplayScale === 'function') {
        display.applyDisplayScale();
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('resize', onWindowResize);
}

// Initialize canonical resolution (always 800x800 logical).
CANVAS_WIDTH = GAME_WIDTH;
CANVAS_HEIGHT = GAME_HEIGHT;
SCALE_X = GAME_WIDTH / REF_CANVAS_WIDTH;
SCALE_Y = GAME_HEIGHT / REF_CANVAS_HEIGHT;

// =============================================================================
// GLOBAL FLAGS - Centralized configuration for the entire application
// =============================================================================

// --- DEBUG FLAGS ---
export let defaultDebugVisible = false; // Debug features hidden by default
export let isDebugVisible = false; // Debug terminal visibility
export let showDebugTools = false; // Debug tools overlay visibility
export let showTerminal = false; // Terminal visibility

// DEBUG PLAY flag: when true, the debug panel is shown automatically
// when transitioning to GAMEPLAY via DEBUG PLAY.
export let debugPlayShowsPanel = true;

// Debug terminal configuration
export let MAX_LOGS = 50000;

// Developer-only start/intro animation toggles
export let DEBUG_START_INTRO_ANIMATION = true;
export let RUN_INTRO_ON_START = true; // Run intro animation automatically on app start

// =============================================================================
// DEVELOPMENT SHORTCUT FLAGS
// Toggle these to skip animations, cutscenes, and dialogue for faster testing.
// Can also be set via URL params: ?disableAnimations=true&disableCutscenes=true&disableDialogue=true&fastDialogue=true&skipIntro=true&devMode=true
// =============================================================================

// Master dev mode toggle — set to true to enable ALL shortcuts below at once.
// Individual flags can still be overridden after this block.
export let DEV_MODE = false;

export let DISABLE_ANIMATIONS = false;   // Skip all animation sequences (fades, slides, etc.)
export let DISABLE_CUTSCENES = true;    // Skip cutscene/cinematic sequences
export let DISABLE_DIALOGUE = true;     // Skip dialogue boxes entirely
export let FAST_DIALOGUE = false;        // Instantly render dialogue text (no typewriter effect)
export let SKIP_INTRO = false;           // Skip intro sequence on app start

// Apply URL param overrides for dev shortcuts
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);

    // Master dev mode via URL
    if (urlParams.get('devMode') === 'true') DEV_MODE = true;

    // Individual flags via URL (override hardcoded values)
    if (urlParams.get('disableAnimations') === 'true') DISABLE_ANIMATIONS = true;
    if (urlParams.get('disableCutscenes') === 'true') DISABLE_CUTSCENES = true;
    if (urlParams.get('disableDialogue') === 'true') DISABLE_DIALOGUE = true;
    if (urlParams.get('fastDialogue') === 'true') FAST_DIALOGUE = true;
    if (urlParams.get('skipIntro') === 'true') SKIP_INTRO = true;

    // If DEV_MODE is active, enable all shortcuts unless explicitly overridden above
    if (DEV_MODE) {
        DISABLE_ANIMATIONS = urlParams.get('disableAnimations') === 'false' ? false : true;
        DISABLE_CUTSCENES = urlParams.get('disableCutscenes') === 'false' ? false : true;
        DISABLE_DIALOGUE = urlParams.get('disableDialogue') === 'false' ? false : true;
        FAST_DIALOGUE = urlParams.get('fastDialogue') === 'false' ? false : true;
        SKIP_INTRO = urlParams.get('skipIntro') === 'false' ? false : true;
    }

    // Log active dev shortcuts
    const activeShortcuts = [];
    if (DISABLE_ANIMATIONS) activeShortcuts.push('disableAnimations');
    if (DISABLE_CUTSCENES) activeShortcuts.push('disableCutscenes');
    if (DISABLE_DIALOGUE) activeShortcuts.push('disableDialogue');
    if (FAST_DIALOGUE) activeShortcuts.push('fastDialogue');
    if (SKIP_INTRO) activeShortcuts.push('skipIntro');
    if (DEV_MODE) activeShortcuts.push('devMode');
    if (activeShortcuts.length > 0) {
        console.log(`[DEV SHORTCUTS] Active: ${activeShortcuts.join(', ')}`);
    }
}

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

// Apply the default theme immediately on load
if (typeof window !== 'undefined') {
    window.defaultThemeName = defaultThemeName;
}

// Note: Theme objects are defined in their respective files in src/themes/
// Theme manager is exported from src/themes/thememanager.js


// --- GRAPHICS SETTINGS ---
export let currentGraphicsPreset = "low";
export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 300; // Default value
export let maxRayDepth = 50; // Default value

// --- SKYBOX SETTINGS ---
export let skyboxEnabled = false;
export let skyColorTop = "#1a0a2e";      // Deep purple/blue at top
export let skyColorHorizon = "#ff6b35";  // Orange at horizon

// Device-based adjustment for numCastRays
if (typeof navigator !== 'undefined' && (/Mobi|Android/i.test(navigator.userAgent) || navigator.hardwareConcurrency <= 4)) {
    numCastRays = 240; // Reduce for low-end devices
}

// --- WASM RAYCASTING SETTINGS ---
export let useWasmRayMath = typeof window !== 'undefined' ? (window.__useWasmRayMath ?? true) : true;
export let raycastWasmStatus = useWasmRayMath ? "requested" : "disabled";

// --- DEBUG FLAGS ---
// Enable detailed WASM loading logs via window.DEBUG_WASM = true
// Can also be enabled via URL param ?debugWASM=1
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    window.DEBUG_WASM = window.DEBUG_WASM ?? (urlParams.get('debugWASM') === '1');
}

// --- GAME STATE FLAGS ---
export let menuActive = true;
export let isPaused = false;
export let gameOver = false;
export let introActive = true; // Allow intro autorun to run on app start

// Initialize window.introActive for autorun check
if (typeof window !== 'undefined') {
    window.introActive = introActive;
}

// --- ENGINE STATE FLAGS ---
// Tracks the current state in the engine state machine.
// Valid values are defined in src/engine/enginestate.js (EngineState enum).
export let engineState = 'ENGINE_INIT';

/**
 * Updates the engine state and syncs to window for cross-module access.
 * @param {string} newState - The target engine state name.
 */
export function setEngineState(newState) {
    engineState = newState;
    if (typeof window !== 'undefined') {
        window.engineState = newState;
    }
}

// Initialize window.engineState
if (typeof window !== 'undefined') {
    window.engineState = engineState;
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

export function setScrollOffsetX(val) {
    scrollOffsetX = val;
}

export function setVirtualScrollY(val) {
    virtualScrollY = val;
}

export function setAutoScroll(val) {
    autoScroll = val;
}

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
    title: () => `32px ${GLOBAL_FONT}`,
    subtitle: () => `24px ${GLOBAL_FONT}`,
    button: () => `18px ${GLOBAL_FONT}`,
    body: () => `16px ${GLOBAL_FONT}`,
    small: () => `14px ${GLOBAL_FONT}`
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
    if (typeof window !== 'undefined') {
        window.defaultDebugVisible = val;
    }
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

// Apply a graphics preset by name
export function applyGraphicsPreset(presetName) {
    const preset = graphicsPresets[presetName];
    if (preset) {
        currentGraphicsPreset = presetName;
        numCastRays = preset.numCastRays;
        maxRayDepth = preset.maxRayDepth;
        if (typeof window !== 'undefined') {
            window.__raycastMathSource = useWasmRayMath ? "wasm" : "js";
        }
    }
}

// Set log buffer
export function setLogBuffer(val) {
    logBuffer = val;
}

// Clear the log buffer
export function clearLogBuffer() {
    logBuffer.length = 0;
}

// =============================================================================
// DEV SHORTCUT SETTERS
// =============================================================================
export function setDevMode(val) {
    DEV_MODE = !!val;
    // When enabling dev mode, also enable all shortcuts unless explicitly disabled
    if (DEV_MODE) {
        DISABLE_ANIMATIONS = true;
        DISABLE_CUTSCENES = true;
        DISABLE_DIALOGUE = true;
        FAST_DIALOGUE = true;
        SKIP_INTRO = true;
    }
}
export function setDisableAnimations(val) { DISABLE_ANIMATIONS = !!val; }
export function setDisableCutscenes(val) { DISABLE_CUTSCENES = !!val; }
export function setDisableDialogue(val) { DISABLE_DIALOGUE = !!val; }
export function setFastDialogue(val) { FAST_DIALOGUE = !!val; }
export function setSkipIntro(val) { SKIP_INTRO = !!val; }