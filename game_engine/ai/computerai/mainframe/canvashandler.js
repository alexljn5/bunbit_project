import { isPaused, setPaused } from "../../../gamestate.js";
import { renderEngine } from "../../../rendering/renderengine.js";
import { isInteractionKeyPressed } from "../../../playerdata/playerlogic.js";
import { computerAICanvas, computerAIRenderEngine } from "../computerai.js";
import { REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../globals.js";

let isAIOverlayActive = false;  // Track to avoid multiples

// NEW: Function to reposition overlay (call on trigger or res change)
function repositionOverlay() {
    if (!isAIOverlayActive) return;
    const mainCanvas = document.getElementById("mainGameRender");
    const gameContainer = document.querySelector(".game-container");  // Your relative anchor
    if (gameContainer && mainCanvas) {
        // Position relative to game-container (no rect drift!)
        computerAICanvas.style.position = "absolute";
        computerAICanvas.style.top = "0px";  // Top-left of container
        computerAICanvas.style.left = "0px";
        gameContainer.appendChild(computerAICanvas);  // Append to anchor
    } else {
        // Fallback to body with rect (your original)
        if (mainCanvas && mainCanvas.parentElement) {
            const rect = mainCanvas.getBoundingClientRect();
            computerAICanvas.style.top = `${Math.ceil(rect.top)}px`;
            computerAICanvas.style.left = `${Math.ceil(rect.left)}px`;
            mainCanvas.parentElement.appendChild(computerAICanvas);
        } else {
            document.body.appendChild(computerAICanvas);
        }
    }
    console.log("Overlay repositioned!");
}

export function drawComputerAICanvas() {
    // Skip if game is paused!
    if (isPaused) {
        return;  // No drawing when paused—easy peasy!
    }

    if (isInteractionKeyPressed() && !isAIOverlayActive) {
        isAIOverlayActive = true;
        setPaused(true);
        renderEngine.save();

        // NEW: Update internal res on trigger (matches current graphics)
        computerAICanvas.width = CANVAS_WIDTH;
        computerAICanvas.height = CANVAS_HEIGHT;

        // CSS: Match display size (REF for full coverage)
        computerAICanvas.style.width = `${REF_CANVAS_WIDTH}px`;
        computerAICanvas.style.height = `${REF_CANVAS_HEIGHT}px`;
        computerAICanvas.style.position = "absolute";
        computerAICanvas.style.top = "0";
        computerAICanvas.style.left = "0";
        computerAICanvas.style.zIndex = "1000";
        computerAICanvas.style.transformOrigin = "0 0";  // Top-left for relative pos
        computerAICanvas.className = "ai-overlay";

        repositionOverlay();  // Set position

        // Draw full black overlay
        computerAIRenderEngine.fillStyle = "#000";
        computerAIRenderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);


    }
}

// NEW: Listen for res change to reposition if open
if (typeof window !== 'undefined') {
    window.addEventListener('resolutionChanged', repositionOverlay);
}