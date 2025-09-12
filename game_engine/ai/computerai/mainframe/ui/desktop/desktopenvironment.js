// computerai/mainframe/ui/test.js
import { computerAIRenderEngine } from "../../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../../globals.js";
import { drawAsciiArt, loadAsciiArt } from "../loadascii.js";

export function testEnvironmentGodFunction() {
    desktopenvironmentOsLogo();
    // Clear the screen
    computerAIRenderEngine.fillStyle = "#1a1a1a";
    computerAIRenderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw a simple desktop environment
    computerAIRenderEngine.fillStyle = "#00ff00";
    computerAIRenderEngine.font = `${24 * SCALE_X}px Arial`;
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "middle";
    computerAIRenderEngine.fillText("Welcome to the Test Environment!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    computerAIRenderEngine.fillStyle = "#ffffff";
    computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
    computerAIRenderEngine.fillText("This is your desktop after successful login!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    // You can add more desktop elements here later!
    computerAIRenderEngine.fillStyle = "#4444ff";
    computerAIRenderEngine.fillRect(50 * SCALE_X, 50 * SCALE_Y, 100 * SCALE_X, 100 * SCALE_Y);
    computerAIRenderEngine.fillStyle = "#ffffff";
    computerAIRenderEngine.fillText("App 1", 100 * SCALE_X, 100 * SCALE_Y);
}

// You can add more functions for your test environment here
function desktopenvironmentOsLogo() {
    loadAsciiArt();
    drawAsciiArt();
}