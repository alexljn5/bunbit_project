import { isInteractionKeyPressed } from "../../playerdata/playerlogic.js";
import { renderEngine } from "../../rendering/renderengine.js";
import { isPaused, setPaused } from "../../gamestate.js";
import { REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, SCALE_X, SCALE_Y, CANVAS_HEIGHT, CANVAS_WIDTH } from "../../globals.js";
import { keys } from "../../playerdata/playerlogic.js";  // For ESC close

let isAIOverlayActive = false;  // Track to avoid multiples

export function computerAIGodFunction() {

    drawComputerAICanvas();
}

function drawComputerAICanvas() {
    // Skip if game is paused!
    if (isPaused) {
        return;  // No drawing when paused—easy peasy!
    }

    if (isInteractionKeyPressed() && !isAIOverlayActive) {
        isAIOverlayActive = true;
        setPaused(true);
        renderEngine.save();

        const computerAICanvas = document.createElement("canvas");
        const computerAIRenderEngine = computerAICanvas.getContext("2d");

        // Internal resolution: Logical pixels (crisp drawing base)
        computerAICanvas.width = CANVAS_WIDTH;
        computerAICanvas.height = CANVAS_HEIGHT;

        // CSS: Match display size (REF for full coverage, scaled by browser like main)
        computerAICanvas.style.width = `${REF_CANVAS_WIDTH}px`;
        computerAICanvas.style.height = `${REF_CANVAS_HEIGHT}px`;
        computerAICanvas.style.position = "absolute";
        computerAICanvas.style.top = "0";
        computerAICanvas.style.left = "0";
        computerAICanvas.style.zIndex = "1000";  // On top of main canvas (uncommented for reliability)
        computerAICanvas.style.transformOrigin = "0 0";  // Match main canvas scaling anchor
        computerAICanvas.className = "ai-overlay";  // For CSS crispness

        // Position exactly over main canvas (FIX: ceil to cover subpixel gaps!)
        const mainCanvas = document.getElementById("mainGameRender");
        if (mainCanvas && mainCanvas.parentElement) {
            const rect = mainCanvas.getBoundingClientRect();
            computerAICanvas.style.top = `${Math.ceil(rect.top)}px`;  // Ceil to eliminate top gap
            computerAICanvas.style.left = `${Math.ceil(rect.left)}px`;  // Ceil to eliminate left gap
            mainCanvas.parentElement.appendChild(computerAICanvas);
        } else {
            document.body.appendChild(computerAICanvas);
        }

        // Draw full black overlay on logical pixels (hides pause crisp-ly)
        computerAIRenderEngine.fillStyle = "#000";
        computerAIRenderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);  // Full logical size now!

        // Draw AI text (logical coords, scales crisp)
        computerAIRenderEngine.fillStyle = "#0f0";
        computerAIRenderEngine.font = `${20}px Arial`;  // Base size; CSS scales it
        computerAIRenderEngine.textAlign = "center";
        computerAIRenderEngine.textBaseline = "middle";
        computerAIRenderEngine.fillText("Computer AI Interface", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        renderEngine.restore();
        console.log("Computer AI overlay active! *chao chao*");
    }
}