import { computerAIRenderEngine } from "../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../globals.js";

export function computerAiDesktopEnvironmentGodFunction() {
    placeHolderText();
}

function placeHolderText() {
    // Draw AI text (logical coords, scales crisp)
    computerAIRenderEngine.fillStyle = "#0f0";
    // FIX: Scale font inversely to match visual size (20px display in both modes)
    computerAIRenderEngine.font = `${20 * SCALE_X}px Arial`;  // Low: 40px internal → 20px display; High: 20px → 20px
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "middle";
    const textX = CANVAS_WIDTH / 2;  // Logical center (200 low, 400 high)
    const textY = CANVAS_HEIGHT / 2;
    computerAIRenderEngine.fillText("Computer AI Interface", textX, textY);
}

