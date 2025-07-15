import { game } from "../rendering/renderengine.js";
import { keys } from "../playerdata/playerlogic.js";
import { renderEngine } from "../rendering/renderengine.js";
import { volumeSlidersGodFunction, setupAudioSliderHandlers } from "../audio/audiohandler.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { saveGame, loadGame } from "../savedata/save_load_game.js";
import { applyGraphicsPreset, getGraphicsSettings, drawGraphicsOverlay, handleGraphicsMenuClick } from "./graphicssettings.js";

export let playerMovementDisabled = false;
export let menuActive = false;
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

// Dynamic settings buttons to ensure proper scaling
function getSettingsButtons() {
    return [
        { name: "Resume", x: 60 * SCALE_X, y: 160 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Audio", x: 60 * SCALE_X, y: 220 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Controls", x: 60 * SCALE_X, y: 280 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Graphics", x: 60 * SCALE_X, y: 340 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Save Game", x: 60 * SCALE_X, y: 400 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Load Game", x: 60 * SCALE_X, y: 460 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
        { name: "Quit", x: 60 * SCALE_X, y: 520 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false }
    ];
}

// Reusable button-drawing function with hover effect (same as old code)
export function drawButton(context, button, isSelected = false, textOffsetX = 20, textOffsetY = 25) {
    context.fillStyle = button.hovered || isSelected ? "#555" : "#222"; // Hover effect: #555 when hovered/selected, #222 when normal
    context.fillRect(button.x, button.y, button.width, button.height);
    context.strokeStyle = "#fff";
    context.strokeRect(button.x, button.y, button.width, button.height);
    context.fillStyle = "#fff";
    context.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    context.fillText(button.name, button.x + textOffsetX * SCALE_X, button.y + textOffsetY * SCALE_Y);
}

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
    const testSettingsBackGroundImage = new Image();
    testSettingsBackGroundImage.src = "./img/menu/goon.png";
    initOffscreenCanvas();
    offscreenContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    offscreenContext.fillStyle = "rgba(0, 0, 0, 0.8)";
    offscreenContext.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    offscreenContext.fillStyle = "white";
    offscreenContext.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    offscreenContext.fillText("Settings Menu", 60 * SCALE_X, 80 * SCALE_Y);
    offscreenContext.fillText("Press Escape to close", 60 * SCALE_X, 110 * SCALE_Y);
    offscreenContext.drawImage(testSettingsBackGroundImage, 0, 0, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawSettingsButtons() {
    if (showControls || showAudio || showGraphics) return;
    const settingsButtons = getSettingsButtons();
    settingsButtons.forEach(button => drawButton(renderEngine, button));
    if (showSaveMessage || showLoadMessage || showNoSaveMessage) {
        renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
        renderEngine.fillRect(350 * SCALE_X, 120 * SCALE_Y, 400 * SCALE_X, 100 * SCALE_Y);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(350 * SCALE_X, 120 * SCALE_Y, 400 * SCALE_X, 100 * SCALE_Y);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        const message = showSaveMessage ? "Game Saved!" : showLoadMessage ? "Game Loaded!" : "No Save Found!";
        renderEngine.fillText(message, 400 * SCALE_X, 170 * SCALE_Y);
    }
    if (showLoadPrompt) {
        renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
        renderEngine.fillRect(250 * SCALE_X, 100 * SCALE_Y, 500 * SCALE_X, 150 * SCALE_Y);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(250 * SCALE_X, 100 * SCALE_Y, 500 * SCALE_X, 150 * SCALE_Y);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText("Select save.json from your savesdata folder", 280 * SCALE_X, 150 * SCALE_Y);
        renderEngine.fillText("Click anywhere to continue", 280 * SCALE_X, 180 * SCALE_Y);
    }
}

function drawControlsOverlay() {
    const overlayX = 350 * SCALE_X;
    const overlayY = 120 * SCALE_Y;
    const overlayWidth = 400 * SCALE_X;
    const overlayHeight = 400 * SCALE_Y;
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${22 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Controls", overlayX, overlayY + 40 * SCALE_Y);
    renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    const controls = [
        "WASD: Move",
        "Shift: Walk slow",
        "Alt: Sprint",
        "Q/E: Strafe left/right",
        "Space: Shoot/Hit",
        "1-9: Inventory slots",
        "T: Interact",
        "F3: Toggle debug",
        "Escape: Open/close menu",
        "Save files to your savesdata folder!"
    ];
    controls.forEach((line, i) => {
        renderEngine.fillText(line, overlayX + 10 * SCALE_X, overlayY + 80 * SCALE_Y + i * 30 * SCALE_Y);
    });
    const backButton = {
        name: "Back",
        x: 60 * SCALE_X,
        y: 470 * SCALE_Y,
        width: 100 * SCALE_X,
        height: 36 * SCALE_Y,
        hovered: false
    };
    drawButton(renderEngine, backButton, showControls, 30, 25);
}

function drawAudioOverlay() {
    const overlayX = 350 * SCALE_X;
    const overlayY = 120 * SCALE_Y;
    const overlayWidth = 400 * SCALE_X;
    const overlayHeight = 400 * SCALE_Y;
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${22 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Audio Settings", overlayX, overlayY + 40 * SCALE_Y);
    volumeSlidersGodFunction();
    setupAudioSliderHandlers();
    const backButton = {
        name: "Back",
        x: 60 * SCALE_X,
        y: 470 * SCALE_Y,
        width: 100 * SCALE_X,
        height: 36 * SCALE_Y,
        hovered: false
    };
    drawButton(renderEngine, backButton, showAudio, 30, 25);
}

async function handleSettingsMenuClick(e) {
    const canvas = renderEngine.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

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
        handleGraphicsMenuClick(e, renderEngine, SCALE_X, SCALE_Y, presetButtons, (value) => { showGraphics = value; }, (value) => { needsRedraw = value; });
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
                menuActive = false;
                playerMovementDisabled = false;
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
            } else if (button.name === "Quit") {
                window.location.reload();
            }
        }
    });
}

function attachSettingsMenuHandlers() {
    const canvas = renderEngine.canvas;
    if (!canvas) return;
    if (!canvas._hasMenuHandlers) {
        canvas.onmousemove = handleSettingsMenuClick;
        canvas.onclick = handleSettingsMenuClick;
        canvas._hasMenuHandlers = true;
    }
}

function detachSettingsMenuHandlers() {
    const canvas = renderEngine.canvas;
    if (!canvas) return;
    if (canvas._hasMenuHandlers) {
        canvas.onmousemove = null;
        canvas.onclick = null;
        canvas._hasMenuHandlers = false;
    }
}

function startMenuLoop() {
    if (menuIsRunning) return;
    menuIsRunning = true;

    function menuTick() {
        if (!menuIsRunning || !menuActive) {
            stopMenuLoop();
            return;
        }
        console.log("Rendering settings menu");
        menuSettingsRender();
        menuRafId = requestAnimationFrame(menuTick);
    }

    menuRafId = requestAnimationFrame(menuTick);
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
    renderEngine.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
    renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (needsRedraw || !offscreenCanvas) {
        drawStaticMenu();
        needsRedraw = false;
    }
    if (offscreenCanvas) {
        renderEngine.drawImage(offscreenCanvas, 0, 0);
    }
    if (showControls) {
        drawControlsOverlay();
    } else if (showAudio) {
        drawAudioOverlay();
    } else if (showGraphics) {
        presetButtons = drawGraphicsOverlay(renderEngine, SCALE_X, SCALE_Y, showGraphics);
    } else {
        drawSettingsButtons();
    }
}

function menuSettings() {
    const currentEscapeState = keys["escape"];
    if (!lastEscapeState && currentEscapeState) {
        menuActive = !menuActive;
        playerMovementDisabled = menuActive;
        needsRedraw = true;
        if (menuActive) {
            console.log("Settings menu opened, pausing game");
            game.stop();
            startMenuLoop();
            attachSettingsMenuHandlers();
        } else {
            console.log("Settings menu closed, resuming game");
            stopMenuLoop();
            game.start();
            showLoadPrompt = false;
            showControls = false;
            showAudio = false;
            showGraphics = false;
            detachSettingsMenuHandlers();
        }
    }
    lastEscapeState = currentEscapeState;
}

export function menuSettingsGodFunction() {
    menuSettings();
}