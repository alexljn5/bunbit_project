import { renderEngine } from "../rendering/renderengine.js";
import { compiledTextStyle } from "../debugtools.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../globals.js";
import { drawMenuOverlay } from "./overlays.js";

let gameOverLolImage = new Image();
gameOverLolImage.src = "./img/gameoverlol.png";

export function drawRespawnMenu(canvas, onRespawn) {
    // Draw death screen overlay
    drawMenuOverlay(0.8);

    renderEngine.fillStyle = "#fff";
    compiledTextStyle();
    renderEngine.font = `${32 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("YOU DIED", CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT / 2 - 50 * SCALE_Y);

    // Draw respawn button
    const buttonWidth = 200 * SCALE_X;
    const buttonHeight = 40 * SCALE_Y;
    const buttonX = CANVAS_WIDTH / 2 - buttonWidth / 2;
    const buttonY = CANVAS_HEIGHT / 2 + 20 * SCALE_Y;

    renderEngine.fillStyle = "#222";
    renderEngine.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Respawn", buttonX + 60 * SCALE_X, buttonY + 25 * SCALE_Y);

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
        renderEngine.fillStyle = "#f00"; // Draw a red rectangle as a fallback
        renderEngine.fillRect(imgX, imgY, imgWidth, imgHeight);
    }

    // Clear previous click handler and set new one
    canvas.onclick = null;
    canvas.onclick = function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

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