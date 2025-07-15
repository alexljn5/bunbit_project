import { fuckTheScreenUpBaby } from "../rendering/raycasting.js";
import { renderEngine } from "../rendering/renderengine.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

// Cleaned up FOV animation for clarity and maintainability
export function fuckTheScreenUp() {
    fuckTheScreenUpBaby();

    // Set the fill style to a semi-transparent red
    renderEngine.fillStyle = "rgba(255, 0, 0, 0.1)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}