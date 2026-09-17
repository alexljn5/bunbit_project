import { keys } from "../../../playerdata/playerlogic.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, menuActive, setMenuActive, playerMovementDisabled, setPlayerMovementDisabled, GLOBAL_FONT, engineState } from "../../../globals.js";
import { getMouseCanvasPos } from "../../../utils/inputTransform.js";

import { saveGame, loadGame } from "../../../savedata/save_load_game.js";
import { applyGraphicsPreset, getGraphicsSettings, drawGraphicsOverlay, handleGraphicsMenuClick } from "./graphicssettings.js";
import { drawButton, drawMenuOverlay } from "../../overlays.js";
import { engineController } from "../../../engine/engine.js";
import { EngineState } from "../../../engine/enginestate.js";

// Import settings sub-modules
import { drawAudioOverlay } from "./audiosettings.js";
import { drawControlsOverlay } from "./controlssettings.js";

// Avoid circular dependency with renderengine.js by using window globals
function getGame() { return window.__game || null; }
function getRenderEngine() { return window.__renderEngine || null; }

// Fullscreen support via display module
const bunbitDisplay = typeof window !== 'undefined' ? window.__bunbitDisplay : null;

function toggleFullscreen() {
    if (!bunbitDisplay) return;
    if (bunbitDisplay.isFullscreen) {
        bunbitDisplay.exitFullscreen();
    } else {
        bunbitDisplay.requestFullscreen();
    }
    needsRedraw = true;
}

// Keyboard shortcuts for fullscreen (F11 or Alt+Enter)
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
            e.preventDefault();
            toggleFullscreen();
        }
    });
}

// Export menu loop controls so dashboard can open settings programmatically
export { startMenuLoop, stopMenuLoop };

let lastEscapeState = false;
let showLoadPrompt = false;
let offscreenCanvas = null;
let offscreenContext = null;
let needsRedraw = true;
let menuRafId = null;
let menuIsRunning = false;
let showControls = false;
let showAudio = false;
let showGraphics = false;
let showSaveMessage = false;
let showLoadMessage = false;
let showNoSaveMessage = false;
let messageTimer = null;
let presetButtons = []; // Store preset buttons from drawGraphicsOverlay

// Expose settings menu state so renderengine.js can skip mainGameMenu()
// when the settings menu is handling its own rendering.
window.__settingsMenuOpen = false;

// File input element for loading games
let fileInput = null;

// Dynamic settings buttons to ensure proper scaling
function getSettingsButtons() {
    return [
        { name: "Resume", x: 60 * SCALE_X, y: 160 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Audio", x: 60 * SCALE_X, y: 220 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Controls", x: 60 * SCALE_X, y: 280 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Graphics", x: 60 * SCALE_X, y: 340 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Save Game", x: 60 * SCALE_X, y: 400 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Load Game", x: 60 * SCALE_X, y: 460 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Fullscreen", x: 60 * SCALE_X, y: 520 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Back to Menu", x: 60 * SCALE_X, y: 580 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Quit", x: 60 * SCALE_X, y: 640 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false }
    ];
}

// Reusable button-drawing function with hover effect (same as old code)


function initOffscreenCanvas() {
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement('canvas');
        offscreenContext = offscreenCanvas.getContext('2d');
    }
    if (
        offscreenCanvas.width !== CANVAS_WIDTH ||
        offscreenCanvas.height !== CANVAS_HEIGHT
    ) {
        offscreenCanvas.width = CANVAS_WIDTH;
        offscreenCanvas.height = CANVAS_HEIGHT;
        needsRedraw = true; // Force redraw on resize
    }
}

function drawStaticMenu() {
    initOffscreenCanvas();
    offscreenContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Use reusable overlay function with alpha 0.8
    drawMenuOverlay(0.8);
    offscreenContext.fillStyle = "#cccccc";
    offscreenContext.font = `bold ${Math.floor(20 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    offscreenContext.fillText("Settings Menu", 60 * SCALE_X, 80 * SCALE_Y);
    offscreenContext.font = `${Math.floor(14 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    offscreenContext.fillText("Press Escape to close", 60 * SCALE_X, 110 * SCALE_Y);
}

function drawSettingsButtons() {
    if (showControls || showAudio || showGraphics) return;
    const engine = getRenderEngine();
    if (!engine) return;
    const settingsButtons = getSettingsButtons();
    settingsButtons.forEach(button => drawButton(engine, button));
    if (showSaveMessage || showLoadMessage || showNoSaveMessage) {
        engine.fillStyle = "rgba(10, 10, 10, 0.95)";
        engine.fillRect(350 * SCALE_X, 120 * SCALE_Y, 400 * SCALE_X, 100 * SCALE_Y);
        engine.strokeStyle = "#555555";
        engine.lineWidth = 1;
        engine.strokeRect(350 * SCALE_X, 120 * SCALE_Y, 400 * SCALE_X, 100 * SCALE_Y);
        engine.fillStyle = "#cccccc";
        engine.font = `bold ${Math.floor(20 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
        const message = showSaveMessage ? "Game Saved!" : showLoadMessage ? "Game Loaded!" : "No Save Found!";
        engine.fillText(message, 400 * SCALE_X, 170 * SCALE_Y);
    }
    if (showLoadPrompt) {
        engine.fillStyle = "rgba(10, 10, 10, 0.95)";
        engine.fillRect(250 * SCALE_X, 100 * SCALE_Y, 500 * SCALE_X, 150 * SCALE_Y);
        engine.strokeStyle = "#555555";
        engine.lineWidth = 1;
        engine.strokeRect(250 * SCALE_X, 100 * SCALE_Y, 500 * SCALE_X, 150 * SCALE_Y);
        engine.fillStyle = "#cccccc";
        engine.font = `bold ${Math.floor(20 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
        engine.fillText("Select save.json from your savesdata folder", 280 * SCALE_X, 150 * SCALE_Y);
        engine.fillText("Click anywhere to continue", 280 * SCALE_X, 180 * SCALE_Y);
    }
}

async function handleSettingsMenuClick(e) {
    const engine = getRenderEngine();
    const canvas = engine?.canvas;
    if (!canvas) return;
    const { x: mouseX, y: mouseY } = getMouseCanvasPos(canvas, e);

    needsRedraw = true;

    if (showLoadPrompt && e.type === 'click') {
        showLoadPrompt = false;
        fileInput.click();
        fileInput.onchange = async () => {
            const file = fileInput.files[0];
            try {
                const success = await loadGame(file);
                if (success) {
                    showLoadMessage = true;
                    if (messageTimer) clearTimeout(messageTimer);
                    messageTimer = setTimeout(() => {
                        showLoadMessage = false;
                        needsRedraw = true;
                    }, 2000);
                } else {
                    showNoSaveMessage = true;
                    if (messageTimer) clearTimeout(messageTimer);
                    messageTimer = setTimeout(() => {
                        showNoSaveMessage = false;
                        needsRedraw = true;
                    }, 2000);
                }
            } catch (error) {
                showNoSaveMessage = true;
                if (messageTimer) clearTimeout(messageTimer);
                messageTimer = setTimeout(() => {
                    showNoSaveMessage = false;
                    needsRedraw = true;
                }, 2000);
            }
            fileInput.value = '';
        };
        return;
    }

    if (showGraphics) {
        handleGraphicsMenuClick(e, engine, SCALE_X, SCALE_Y, presetButtons, (value) => { showGraphics = value; }, (value) => { needsRedraw = value; });
        return;
    }

    if (showControls) {
        const backButton = {
            name: "Back",
            x: 60 * SCALE_X,
            y: 470 * SCALE_Y,
            width: 100 * SCALE_X,
            height: 36 * SCALE_Y,
            hovered: false
        };
        backButton.hovered = (
            mouseX >= backButton.x && mouseX <= backButton.x + backButton.width &&
            mouseY >= backButton.y && mouseY <= backButton.y + backButton.height
        );
        if (backButton.hovered && e.type === 'click') {
            showControls = false;
        }
        return;
    }

    if (showAudio) {
        const backButton = {
            name: "Back",
            x: 60 * SCALE_X,
            y: 470 * SCALE_Y,
            width: 100 * SCALE_X,
            height: 36 * SCALE_Y,
            hovered: false
        };
        backButton.hovered = (
            mouseX >= backButton.x && mouseX <= backButton.x + backButton.width &&
            mouseY >= backButton.y && mouseY <= backButton.y + backButton.height
        );
        if (backButton.hovered && e.type === 'click') {
            showAudio = false;
        }
        return;
    }

    const settingsButtons = getSettingsButtons();
    settingsButtons.forEach(button => {
        button.hovered = (
            mouseX >= button.x && mouseX <= button.x + button.width &&
            mouseY >= button.y && mouseY <= button.y + button.height
        );
        if (button.hovered && e.type === 'click') {
            if (button.name === "Resume") {
                setMenuActive(false);
                setPlayerMovementDisabled(false);
                detachSettingsMenuHandlers();
            } else if (button.name === "Audio") {
                showAudio = true;
                showControls = false;
                showGraphics = false;
            } else if (button.name === "Controls") {
                showControls = true;
                showAudio = false;
                showGraphics = false;
            } else if (button.name === "Graphics") {
                showGraphics = true;
                showControls = false;
                showAudio = false;
            } else if (button.name === "Save Game") {
                if (saveGame()) {
                    showSaveMessage = true;
                    if (messageTimer) clearTimeout(messageTimer);
                    messageTimer = setTimeout(() => {
                        showSaveMessage = false;
                        needsRedraw = true;
                    }, 2000);
                }
            } else if (button.name === "Load Game") {
                showLoadPrompt = true;
            } else if (button.name === "Fullscreen") {
                toggleFullscreen();
            } else if (button.name === "Back to Menu") {
                window.__settingsMenuOpen = false;
                stopMenuLoop();
                showLoadPrompt = false;
                showControls = false;
                showAudio = false;
                showGraphics = false;
                detachSettingsMenuHandlers();
                // Keep menuActive=true so the game menu shows, but don't resume gameplay
            } else if (button.name === "Quit") {
                if (typeof window !== 'undefined') {
                    window.location.href = 'intro.html';
                }
            }
        }
    });
}

function attachSettingsMenuHandlers() {
    const canvas = getRenderEngine()?.canvas;
    if (!canvas) return;
    if (!canvas._hasMenuHandlers) {
        canvas.onmousemove = handleSettingsMenuClick;
        canvas.onclick = handleSettingsMenuClick;
        canvas._hasMenuHandlers = true;
    }
}

function detachSettingsMenuHandlers() {
    const canvas = getRenderEngine()?.canvas;
    if (!canvas) return;
    if (canvas._hasMenuHandlers) {
        // Only detach click handlers, keep mouse move handlers for hover effects
        canvas.onclick = null;
        canvas._hasMenuHandlers = false;
    }
}

function startMenuLoop() {
    console.log('[Settings] startMenuLoop called, menuIsRunning:', menuIsRunning, 'menuActive:', menuActive);
    if (menuIsRunning) {
        console.log('[Settings] startMenuLoop early return - already running');
        return;
    }
    menuIsRunning = true;
    window.__settingsMenuOpen = true;

    function menuTick() {
        if (!menuIsRunning || !menuActive) {
            console.log('[Settings] menuTick stopping, menuIsRunning:', menuIsRunning, 'menuActive:', menuActive);
            stopMenuLoop();
            return;
        }
        menuSettingsRender();
        menuRafId = requestAnimationFrame(menuTick);
    }

    menuRafId = requestAnimationFrame(menuTick);
    console.log('[Settings] menu loop started, menuRafId:', menuRafId);
}

function stopMenuLoop() {
    if (!menuIsRunning) return;
    menuIsRunning = false;
    if (menuRafId) {
        cancelAnimationFrame(menuRafId);
        menuRafId = null;
    }
}

function menuSettingsRender() {
    const engine = getRenderEngine();
    if (!engine) return;
    engine.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
    engine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw solid background immediately to prevent white flash between frames
    engine.fillStyle = "#0a0a0a";
    engine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (needsRedraw || !offscreenCanvas) {
        drawStaticMenu();
        needsRedraw = false;
    }
    if (offscreenCanvas) {
        engine.drawImage(offscreenCanvas, 0, 0);
    }
    if (showControls) {
        drawControlsOverlay();
    } else if (showAudio) {
        drawAudioOverlay();
    } else if (showGraphics) {
        presetButtons = drawGraphicsOverlay(engine, SCALE_X, SCALE_Y, showGraphics);
    } else {
        drawSettingsButtons();
    }
}

function menuSettings() {
    // ESC key handler: toggle between game menu and gameplay.
    // The settings menu is opened from the game menu's Settings button,
    // not directly from ESC.
    const currentEscapeState = keys["escape"];
    if (!lastEscapeState && currentEscapeState) {
        if (window.__settingsMenuOpen) {
            // Close settings menu, return to game menu
            window.__settingsMenuOpen = false;
            stopMenuLoop();
            showLoadPrompt = false;
            showControls = false;
            showAudio = false;
            showGraphics = false;
            detachSettingsMenuHandlers();
            // Keep menuActive=true so the game menu shows
        } else if (menuActive) {
            // Close game menu, resume gameplay
            setMenuActive(false);
            setPlayerMovementDisabled(false);
            showLoadPrompt = false;
            showControls = false;
            showAudio = false;
            showGraphics = false;
        } else {
            // Open game menu
            setMenuActive(true);
            setPlayerMovementDisabled(true);
        }
        needsRedraw = true;
    }
    lastEscapeState = currentEscapeState;
}

function initFileInput() {
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }
}

export { attachSettingsMenuHandlers, initFileInput };

export function menuSettingsGodFunction() {
    menuSettings();
}
