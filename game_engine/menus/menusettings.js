import { keys } from "../playerdata/playerlogic.js";
import { renderEngine } from "../renderengine.js";
import { volumeSlidersGodFunction, setupAudioSliderHandlers } from "../audio/audiohandler.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";

export let playerMovementDisabled = false;
let menuActive = false;
let lastEscapeState = false;

// Settings menu buttons, scaled from 800x800
const settingsButtons = [
    { name: "Resume", x: 60 * SCALE_X, y: 160 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
    { name: "Audio", x: 60 * SCALE_X, y: 220 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
    { name: "Controls", x: 60 * SCALE_X, y: 280 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
    { name: "Quit", x: 60 * SCALE_X, y: 340 * SCALE_Y, width: 140 * SCALE_X, height: 40 * SCALE_Y, hovered: false }
];

let showControls = false;
let showAudio = false;

function drawSettingsButtons() {
    if (showControls || showAudio) return;
    settingsButtons.forEach(button => {
        renderEngine.fillStyle = button.hovered ? "#555" : "#222";
        renderEngine.fillRect(button.x, button.y, button.width, button.height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(button.x, button.y, button.width, button.height);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`; // Scale font
        renderEngine.fillText(button.name, button.x + 20 * SCALE_X, button.y + 25 * SCALE_Y);
    });
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
        "Escape: Open/close menu"
    ];
    controls.forEach((line, i) => {
        renderEngine.fillText(line, overlayX + 10 * SCALE_X, overlayY + 80 * SCALE_Y + i * 30 * SCALE_Y);
    });
    // Draw back button
    const backButtonX = 60 * SCALE_X;
    const backButtonY = 470 * SCALE_Y;
    const backButtonWidth = 100 * SCALE_X;
    const backButtonHeight = 36 * SCALE_Y;
    renderEngine.fillStyle = showControls ? "#555" : "#222";
    renderEngine.fillRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Back", backButtonX + 30 * SCALE_X, backButtonY + 25 * SCALE_Y);
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
    // Draw back button
    const backButtonX = 60 * SCALE_X;
    const backButtonY = 470 * SCALE_Y;
    const backButtonWidth = 100 * SCALE_X;
    const backButtonHeight = 36 * SCALE_Y;
    renderEngine.fillStyle = showAudio ? "#555" : "#222";
    renderEngine.fillRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Back", backButtonX + 30 * SCALE_X, backButtonY + 25 * SCALE_Y);
}

function handleSettingsMenuClick(e) {
    const canvas = renderEngine.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    if (showControls) {
        const backButtonX = 60 * SCALE_X;
        const backButtonY = 470 * SCALE_Y;
        const backButtonWidth = 100 * SCALE_X;
        const backButtonHeight = 36 * SCALE_Y;
        if (
            mouseX >= backButtonX && mouseX <= backButtonX + backButtonWidth &&
            mouseY >= backButtonY && mouseY <= backButtonY + backButtonHeight &&
            e.type === 'click'
        ) {
            showControls = false;
        }
        return;
    }
    if (showAudio) {
        const backButtonX = 60 * SCALE_X;
        const backButtonY = 470 * SCALE_Y;
        const backButtonWidth = 100 * SCALE_X;
        const backButtonHeight = 36 * SCALE_Y;
        if (
            mouseX >= backButtonX && mouseX <= backButtonX + backButtonWidth &&
            mouseY >= backButtonY && mouseY <= backButtonY + backButtonHeight &&
            e.type === 'click'
        ) {
            showAudio = false;
        }
        return;
    }
    settingsButtons.forEach(button => {
        button.hovered = (
            mouseX >= button.x && mouseX <= button.x + button.width &&
            mouseY >= button.y && mouseY <= button.y + button.height
        );
        if (button.hovered && e.type === 'click') {
            if (button.name === "Resume") {
                menuActive = false;
                playerMovementDisabled = false;
            } else if (button.name === "Audio") {
                showAudio = true;
                showControls = false;
            } else if (button.name === "Controls") {
                showControls = true;
                showAudio = false;
            } else if (button.name === "Quit") {
                window.location.reload();
            }
        }
    });
}

function attachSettingsMenuHandlers() {
    const canvas = renderEngine.canvas;
    if (!canvas) return;
    canvas.onmousemove = handleSettingsMenuClick;
    canvas.onclick = handleSettingsMenuClick;
}

function detachSettingsMenuHandlers() {
    const canvas = renderEngine.canvas;
    if (!canvas) return;
    canvas.onmousemove = null;
    canvas.onclick = null;
}

function menuSettings() {
    const currentEscapeState = keys["escape"];
    if (!lastEscapeState && currentEscapeState) {
        menuActive = !menuActive;
        playerMovementDisabled = menuActive;
    }
    lastEscapeState = currentEscapeState;
    if (menuActive) {
        renderEngine.fillStyle = "rgba(0, 0, 0, 0.8)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.fillStyle = "white";
        renderEngine.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText("Settings Menu", 60 * SCALE_X, 80 * SCALE_Y);
        renderEngine.fillText("Press Escape to close", 60 * SCALE_X, 110 * SCALE_Y);
        if (showControls) {
            drawControlsOverlay();
        } else if (showAudio) {
            drawAudioOverlay();
        } else {
            drawSettingsButtons();
        }
        attachSettingsMenuHandlers();
    } else {
        detachSettingsMenuHandlers();
    }
}

export function menuSettingsGodFunction() {
    menuSettings();
}