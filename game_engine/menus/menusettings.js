import { keys } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, renderEngine } from "../renderengine.js";
import { volumeSlidersGodFunction, setupAudioSliderHandlers } from "../audio/audiohandler.js";

// Re-use or define playerMovementDisabled (exported for playerlogic.js)
export let playerMovementDisabled = false; // Note: If already exported in BoyKisser NPC code, you may not need to redefine here
let menuActive = false;
let lastEscapeState = false; // Track previous Escape key state

export function menuSettingsGodFunction() {
    menuSettings();
}

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
        volumeSlidersGodFunction();
        setupAudioSliderHandlers(); // Ensure slider is interactive
    }
}