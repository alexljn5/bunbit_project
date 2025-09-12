import { isInteractionKeyPressed } from "../../playerdata/playerlogic.js";
import { renderEngine } from "../../rendering/renderengine.js";
import { isPaused, setPaused } from "../../gamestate.js";
import { REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, SCALE_X, SCALE_Y, CANVAS_HEIGHT, CANVAS_WIDTH } from "../../globals.js";
import { keys } from "../../playerdata/playerlogic.js";  // For ESC close
import { drawComputerAICanvas } from "./mainframe/canvashandler.js";
import { HIGH_RES_ENABLED } from "../../globals.js";
import { placeHolderText } from "./mainframe/ui/desktop.js";

export const computerAICanvas = document.createElement("canvas");
export const computerAIRenderEngine = computerAICanvas.getContext("2d");
computerAICanvas.width = CANVAS_WIDTH;
computerAICanvas.height = CANVAS_HEIGHT;


computerAICanvas.style.transformOrigin = "center";

let isAIOverlayActive = false;  // Move here if you want global

export function computerAIGodFunction() {
    drawComputerAICanvas();
    placeHolderText();
}

function closeComputerAIOverlay() {
    if (computerAICanvas.parentNode) {
        computerAICanvas.parentNode.removeChild(computerAICanvas);
    }
    isAIOverlayActive = false;
    setPaused(false);
    console.log("Computer AI overlay closed!");
}

export { closeComputerAIOverlay };  // Export if needed elsewhere