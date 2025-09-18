// computerai/mainframe/ui/test.js
import { computerAIRenderEngine } from "../../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../../globals.js";
import { drawAsciiArt, loadAsciiArt } from "../loadascii.js";
import { bunbitOSText } from "../login.js";
import { inputBox } from "../../utils/inputbox.js";
import { REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH } from "../../../../../globals.js";
import { desktopButtonsGodFunction } from "./desktopbuttons.js";

let _animationFrameId = null; // store requestAnimationFrame id

export function desktopEnvironmentGodFunction() {
    // Only start the loop if it's not running already
    if (!_animationFrameId) {
        _animationFrameId = requestAnimationFrame(drawDesktop);
    }
}

function drawDesktop() {
    // Clear the screen
    mainDesktopEnvironmentStuff();

    // Footer
    desktopenvironmentFooter();

    // Buttons (images included)
    desktopButtonsGodFunction();

    // OS logo text (async)
    desktopenvironmentOsLogo();

    // Loop
    _animationFrameId = requestAnimationFrame(drawDesktop);
}

function mainDesktopEnvironmentStuff() {
    computerAIRenderEngine.fillStyle = "#1a1a1a";
    computerAIRenderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    computerAIRenderEngine.fillStyle = "#00ff00";
    computerAIRenderEngine.font = `${24 * SCALE_X}px Arial`;
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "middle";
    computerAIRenderEngine.fillText("Welcome to the Test Environment!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    computerAIRenderEngine.fillStyle = "#ffffff";
    computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
    computerAIRenderEngine.fillText("This is your desktop after successful login!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
}

async function desktopenvironmentOsLogo() {
    await bunbitOSText(); // async logo/text rendering
}

function desktopenvironmentFooter() {
    const footerHeight = 60 * SCALE_Y;
    computerAIRenderEngine.fillStyle = "#af0f0fff";
    computerAIRenderEngine.fillRect(0, CANVAS_HEIGHT - footerHeight, CANVAS_WIDTH, footerHeight);

    computerAIRenderEngine.strokeStyle = "#000";
    computerAIRenderEngine.lineWidth = 4 * SCALE_X;
    computerAIRenderEngine.strokeRect(0, CANVAS_HEIGHT - footerHeight, CANVAS_WIDTH, footerHeight);
}
