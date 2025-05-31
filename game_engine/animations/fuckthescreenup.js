import { fuckTheScreenUpBaby } from "../raycasting.js";
import { renderEngine, CANVAS_HEIGHT, CANVAS_WIDTH } from "../renderengine.js";

export function fuckTheScreenUp() {
    fuckTheScreenUpBaby();

    // Set the fill style to a semi-transparent red
    renderEngine.fillStyle = "rgba(255, 0, 0, 0.1)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}