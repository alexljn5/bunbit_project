import { renderEngine } from "../renderengine.js";
import { fuckTheScreenUp } from "./fuckthescreenup.js";
import { getDemonLaughingCurrentFrame } from "../mapdata/maptextures.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

export let introActive = true;

export function newGameStartAnimation() {
    drawNewGameStartAnimation();
}

function drawDemonFrame(renderEngine, alpha = 0.1) {
    const demonFrame = getDemonLaughingCurrentFrame();
    if (demonFrame) {
        renderEngine.globalAlpha = alpha;
        renderEngine.drawImage(demonFrame, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.globalAlpha = 1.0;
    }
}

function drawNewGameStartAnimation() {
    const startTime = performance.now();

    function animate(now) {
        const elapsed = now - startTime;
        // Always clear and fill background
        renderEngine.fillStyle = "rgba(0, 0, 0, 0.1)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Text 1: 0.1s - 2.2s
        if (elapsed > 100 && elapsed < 2200) {
            renderEngine.fillStyle = "white";
            renderEngine.font = "20px Arial";
            renderEngine.fillText("My name is John. B. Ossman. I remember nothing, but then...", 0, 15);
        }
        // Text 2 + demon: 2.2s - 4.2s
        if (elapsed > 2200 && elapsed < 4200) {
            renderEngine.fillStyle = "red";
            renderEngine.font = "20px Arial";
            renderEngine.fillText("I awaken with a jolt of electricity rushing through my veins...", 0, 40);
            drawDemonFrame(renderEngine);
        }
        // FOV effect: 4.2s - 4.7s (short, punchy)
        if (elapsed > 4200 && elapsed < 5200) {
            // Draw a black background to cover the red, then apply the glitch effect
            renderEngine.fillStyle = "black";
            fuckTheScreenUp();
        }
        // End after 5.5s
        if (elapsed < 6000) {
            requestAnimationFrame(animate);
        } else {
            introActive = false;
        }
    }
    requestAnimationFrame(animate);
}

// Cleaned up new game start animation for clarity and maintainability