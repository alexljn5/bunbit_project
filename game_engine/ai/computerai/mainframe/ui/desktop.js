import { computerAIRenderEngine } from "../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../globals.js";

export function placeHolderText() {
    // Draw AI text (logical coords, scales crisp)
    computerAIRenderEngine.fillStyle = "#0f0";
    computerAIRenderEngine.font = `${20}px Arial`;  // Base size; CSS scales it
    computerAIRenderEngine.textAlign = "center";  // Ensures horizontal center
    computerAIRenderEngine.textBaseline = "middle";  // Ensures vertical center
    // FIX: Pure logical center - drop * SCALE_X! (200 low, 400 high—upscale handles rest)
    const textX = CANVAS_WIDTH / 2;
    const textY = CANVAS_HEIGHT / 2;
    computerAIRenderEngine.fillText("Computer AI Interface", textX, textY);
}
