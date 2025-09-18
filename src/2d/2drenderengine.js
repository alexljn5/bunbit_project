import { gameLoop } from "../main_game.js";
import { _2DPlayerLogicTest, _2DPlayerLogic } from "./2dplayerdata/2dplayerlogic.js";
import { creepyShit } from "./creepyeffecttest.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, updateCanvasResolution, SCALE_X, SCALE_Y } from "../globals.js";
import { _2DKeys } from "./2dplayerdata/2dkeys.js";
import { init2DMainMenu, render2DMainMenu, handle2DMenuClick, handle2DMenuHover } from "./2dmenus/2dmainmenu.js";

// --- DOM Elements ---
const _2DDomElements = {
    _2DMainGameRender: null,
};

export let _2DRenderEngine = null;
export let _2DGame = null;
let isRenderingFrame = false;
let isInMenu = true; // Track menu state

// --- Initialize DOM Elements ---
function initializeDomElements() {
    _2DDomElements._2DMainGameRender = document.getElementById("_2DMainGameRender");
    if (!_2DDomElements._2DMainGameRender) {
        console.error("Failed to find 2D canvas! *pouts*");
        return false;
    }
    _2DRenderEngine = _2DDomElements._2DMainGameRender.getContext("2d");
    if (!_2DRenderEngine) {
        console.error("Failed to get 2D canvas context! *tilts head*");
        return false;
    }
    return true;
}

// --- Button Handlers ---
function setupButtonHandlers() {
    // Initialize and start the game immediately
    if (!_2DGame) {
        mainGameRender();
        _2DGame.start();
    }

    // Add canvas click handler for menu interaction
    if (_2DDomElements._2DMainGameRender) {
        _2DDomElements._2DMainGameRender.addEventListener("click", (event) => {
            if (!isInMenu) return;

            const rect = _2DDomElements._2DMainGameRender.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const action = handle2DMenuClick(x, y);
            if (action === "play") {
                console.log("Starting 2D game from menu...");
                isInMenu = false;
            }
        });

        _2DDomElements._2DMainGameRender.addEventListener("mousemove", (event) => {
            if (!isInMenu) return;

            const rect = _2DDomElements._2DMainGameRender.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            handle2DMenuHover(x, y);
        });
    }
}

// --- Main Game Render Setup ---
export function mainGameRender() {
    console.log("Initializing 2D Game... *twirls*");
    if (!_2DDomElements._2DMainGameRender) {
        console.error("Canvas element not found! *chao chao*");
        return;
    }
    updateCanvasResolution(true); // Set to 800x800 (high-res)
    _2DDomElements._2DMainGameRender.width = CANVAS_WIDTH;
    _2DDomElements._2DMainGameRender.height = CANVAS_HEIGHT;
    console.log(`Canvas size set to ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);

    // Initialize the menu once
    init2DMainMenu();

    _2DGame = gameLoop(gameRenderEngine);
    console.log("2D Game initialized");
}

// --- Main Game Render Loop ---
async function gameRenderEngine() {
    if (isRenderingFrame) return;
    isRenderingFrame = true;
    try {
        // Clear the canvas
        _2DRenderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (isInMenu) {
            // Run menu
            render2DMainMenu(_2DRenderEngine);  // Pass the rendering context
        } else {
            // Run game logic
            _2DPlayerLogic();
            _2DPlayerLogicTest();
            creepyShit();
            console.log("2D Game Frame Rendered");
        }
    } catch (error) {
        console.error("gameRenderEngine error:", error);
        _2DRenderEngine.fillStyle = "gray";
        _2DRenderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } finally {
        isRenderingFrame = false;
    }
}

// --- Initialize on DOM Load ---
window.addEventListener('DOMContentLoaded', () => {
    if (initializeDomElements()) {
        setupButtonHandlers();
    } else {
        console.error("Initialization failed! Check DOM elements. *sad chao*");
    }
});