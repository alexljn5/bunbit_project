// computerai/mainframe/ui/test.js
import { computerAIRenderEngine } from "../../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../../globals.js";
import { drawAsciiArt, loadAsciiArt } from "../loadascii.js";
import { bunbitOSText } from "../login.js";
import { inputBox } from "../../utils/inputbox.js";
import { REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH } from "../../../../../globals.js";

export function desktopEnvironmentGodFunction() {
    mainDesktopEnvironmentStuff();
    desktopenvironmentOsLogo();
    desktopenvironmentFooter();
    testButton();
}

function mainDesktopEnvironmentStuff() {
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
    /*
    computerAIRenderEngine.fillStyle = "#4444ff";
    computerAIRenderEngine.fillRect(50 * SCALE_X, 50 * SCALE_Y, 100 * SCALE_X, 100 * SCALE_Y);
    computerAIRenderEngine.fillStyle = "#ffffff";
    computerAIRenderEngine.fillText("App 1", 100 * SCALE_X, 100 * SCALE_Y);
    */
}
// You can add more functions for your test environment here
async function desktopenvironmentOsLogo() {
    await bunbitOSText();
}

function desktopenvironmentFooter() {
    // Black footer bar at the bottom
    computerAIRenderEngine.fillStyle = "#4444ff"; // black
    const footerHeight = 60 * SCALE_Y; // scaled height
    computerAIRenderEngine.fillRect(
        0, // x
        CANVAS_HEIGHT - footerHeight + 0, // y (bottom)
        CANVAS_WIDTH, // width spans entire canvas
        footerHeight // height
    );

    // Optional: some text in the footer
    computerAIRenderEngine.fillStyle = "#0f0"; // green text
    computerAIRenderEngine.font = `${14 * SCALE_X}px Arial`;
    computerAIRenderEngine.textAlign = "left";
    computerAIRenderEngine.textBaseline = "middle";
    computerAIRenderEngine.fillText(
        "Bunbit Desktop Footer",
        10 * SCALE_X,
        CANVAS_HEIGHT - footerHeight / 2
    );
}
let startButton;
function testButton() {
    if (!startButton) {
        startButton = new inputBox(
            "startButton",
            10, // xLogical (left footer)
            REF_CANVAS_HEIGHT - 60, // yLogical (in footer)
            80, // widthLogical
            30, // heightLogical
            "Start App", // label
            false, // button
            () => {
                console.log("Start App clicked! Open menu...");
                // Your action (e.g., load new screen)
            }
        );
    }

    // Draw button
    startButton.draw();
}