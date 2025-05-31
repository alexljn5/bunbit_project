import { renderEngine } from "../renderengine.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../renderengine.js";
import { fuckTheScreenUp } from "./fuckthescreenup.js";

export function newGameStartAnimation() {
    drawNewGameStartAnimation();
}

function drawNewGameStartAnimation() {
    // Set fill style and draw rectangle
    renderEngine.fillStyle = "rgba(255, 0, 0, 1)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Set text style and draw text
    renderEngine.fillStyle = "white";
    renderEngine.font = "20px Arial";
    setTimeout(() => {
        renderEngine.fillText("My name is John. B. Ossman. I remember nothing, but then...", 0, 15);
    }, 100);

    setTimeout(() => {
        renderEngine.fillText("I awaken with a jolt of electricity rushing through my veins...", 0, 40);
    }, 2000);

    setTimeout(() => {
        fuckTheScreenUp();
    }, 4000);
}