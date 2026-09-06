import { renderEngine } from "../rendering/renderengine.js";
import { compiledTextStyle } from "../debugtools.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, GLOBAL_FONT } from "../globals.js";
import { drawMenuOverlay } from "./overlays.js";
import { getMouseCanvasPos } from "../utils/inputTransform.js";

let gameOverLolImage = new Image();
gameOverLolImage.src = "./img/gameoverlol.png";

export function drawRespawnMenu(canvas, onRespawn) {
    // Draw death screen overlay
    drawMenuOverlay(0.8);

    renderEngine.fillStyle = "#cccccc";
    compiledTextStyle();
    renderEngine.font = `bold ${32 * Math.min(SCALE_X, SCALE_Y)}px ${GLOBAL_FONT}`;
    renderEngine.fillText("YOU DIED", CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT / 2 - 50 * SCALE_Y);

    // Draw respawn button
    const buttonWidth = 200 * SCALE_X;
    const buttonHeight = 40 * SCALE_Y;
    const buttonX = CANVAS_WIDTH / 2 - buttonWidth / 2;
    const buttonY = CANVAS_HEIGHT / 2 + 20 * SCALE_Y;

    renderEngine.fillStyle = "#1a1a1a";
    renderEngine.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    renderEngine.strokeStyle = "#555555";
    renderEngine.lineWidth = 1;
    renderEngine.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    renderEngine.fillStyle = "#cccccc";
    renderEngine.font = `bold ${18 * Math.min(SCALE_X, SCALE_Y)}px ${GLOBAL_FONT}`;
    renderEngine.textAlign = 'center';
    renderEngine.fillText("Respawn", buttonX + buttonWidth / 2, buttonY + 25 * SCALE_Y);
    renderEngine.textAlign = 'left';

    // Draw image only if loaded
    const lolGameOverImg = gameOverLolImage;
    const imgWidth = 196 * SCALE_X;
    const imgHeight = 128 * SCALE_Y;
    const imgX = (CANVAS_WIDTH - imgWidth) / 2;
    const imgY = 270 * SCALE_Y;

    if (lolGameOverImg.complete && lolGameOverImg.naturalWidth !== 0) {
        renderEngine.drawImage(lolGameOverImg, imgX, imgY, imgWidth, imgHeight);
    } else {
        // Optional: Log error or draw a placeholder
        console.error("Game over image failed to load!");
        renderEngine.fillStyle = "#555555"; // Draw a gray rectangle as a fallback
        renderEngine.fillRect(imgX, imgY, imgWidth, imgHeight);
    }

    // Clear previous click handler and set new one
    canvas.onclick = null;
    canvas.onclick = function (e) {
        const { x: mouseX, y: mouseY } = getMouseCanvasPos(canvas, e);

        if (
            mouseX >= buttonX &&
            mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY &&
            mouseY <= buttonY + buttonHeight
        ) {
            onRespawn();
        }
    };
}

// Optional: Log when the image fails to load
gameOverLolImage.onerror = () => {
    console.error("Failed to load image at ./img/gameoverlol.png");
};
