import { fuckTheScreenUpBaby } from "../raycasting.js";
import { numCastRays } from "../raycasting.js";
import { renderEngine, CANVAS_HEIGHT, CANVAS_WIDTH } from "../renderengine.js";

export function fuckTheScreenUp() {
    fuckTheScreenUpBaby();

    // Set the fill style to a semi-transparent red
    renderEngine.fillStyle = "rgba(0, 0, 0, 0.5)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    numCastRays - 500;
}