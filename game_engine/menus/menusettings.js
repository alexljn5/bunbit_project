import { keys } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, renderEngine } from "../renderengine.js";
import { volumeSlidersGodFunction, setupAudioSliderHandlers } from "../audio/audiohandler.js";

// Re-use or define playerMovementDisabled (exported for playerlogic.js)
export let playerMovementDisabled = false; // Note: If already exported in BoyKisser NPC code, you may not need to redefine here
let menuActive = false;
let lastEscapeState = false; // Track previous Escape key state

// Settings menu buttons
const settingsButtons = [
    { name: "Resume", x: 60, y: 160, width: 140, height: 40, hovered: false },
    { name: "Audio", x: 60, y: 220, width: 140, height: 40, hovered: false },
    { name: "Controls", x: 60, y: 280, width: 140, height: 40, hovered: false },
    { name: "Quit", x: 60, y: 340, width: 140, height: 40, hovered: false }
];

let showControls = false;
let showAudio = false;

function drawSettingsButtons() {
    if (showControls || showAudio) return; // Don't draw main buttons if overlay is up
    settingsButtons.forEach(button => {
        renderEngine.fillStyle = button.hovered ? "#555" : "#222";
        renderEngine.fillRect(button.x, button.y, button.width, button.height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(button.x, button.y, button.width, button.height);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = "18px Arial";
        renderEngine.fillText(button.name, button.x + 20, button.y + 25);
    });
}

function drawControlsOverlay() {
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(350, 120, 400, 400);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(350, 120, 400, 400);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = "22px Arial";
    renderEngine.fillText("Controls", 350, 160);
    renderEngine.font = "16px Arial";
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
        renderEngine.fillText(line, 360, 200 + i * 30);
    });
    // Draw a back button
    renderEngine.fillStyle = showControls ? "#555" : "#222";
    renderEngine.fillRect(60, 470, 100, 36);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(60, 470, 100, 36);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = "18px Arial";
    renderEngine.fillText("Back", 90, 495);
}

function drawAudioOverlay() {
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(350, 120, 400, 400);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(350, 120, 400, 400);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = "22px Arial";
    renderEngine.fillText("Audio Settings", 350, 160);
    // Draw sliders (reuse your volumeSlidersGodFunction)
    volumeSlidersGodFunction();
    setupAudioSliderHandlers();
    // Draw a back button
    renderEngine.fillStyle = showAudio ? "#555" : "#222";
    renderEngine.fillRect(60, 470, 100, 36);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(60, 470, 100, 36);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = "18px Arial";
    renderEngine.fillText("Back", 90, 495);
}

function handleSettingsMenuClick(e) {
    const canvas = renderEngine.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    if (showControls) {
        // Only handle back button for controls, require click
        if (
            mouseX >= 60 && mouseX <= 160 &&
            mouseY >= 470 && mouseY <= 506 &&
            e.type === 'click'
        ) {
            showControls = false;
        }
        return;
    }
    if (showAudio) {
        // Only handle back button for audio, require click
        if (
            mouseX >= 60 && mouseX <= 160 &&
            mouseY >= 470 && mouseY <= 506 &&
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

// Attach mouse handlers when menu is active
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

// Cleaned up menu settings for clarity and maintainability
function menuSettings() {
    // Get current Escape key state
    const currentEscapeState = keys["escape"];

    // Only toggle menu if Escape is pressed AND it wasn't pressed last frame (fresh press)
    if (!lastEscapeState && currentEscapeState) {
        menuActive = !menuActive; // Toggle menu state
        playerMovementDisabled = menuActive; // Update player movement
    }

    // Update lastEscapeState for next frame
    lastEscapeState = currentEscapeState;

    // Draw menu if active
    if (menuActive) {
        renderEngine.fillStyle = "rgba(0, 0, 0, 0.8)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.fillStyle = "white";
        renderEngine.font = "20px Arial";
        renderEngine.fillText("Settings Menu", 60, 80);
        renderEngine.fillText("Press Escape to close", 60, 110);
        if (showControls) {
            drawControlsOverlay();
        } else if (showAudio) {
            drawAudioOverlay();
        } else {
            drawSettingsButtons();
        }
        // Only show sliders in the audio overlay
        attachSettingsMenuHandlers();
    } else {
        detachSettingsMenuHandlers();
    }
}

export function menuSettingsGodFunction() {
    menuSettings();
}