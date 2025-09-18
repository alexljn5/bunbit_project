import { isPaused, setPaused } from "../../../gamestate.js";
import { renderEngine } from "../../../rendering/renderengine.js";
import { isInteractionKeyPressed } from "../../../playerdata/playerlogic.js";
import { computerAICanvas, computerAIRenderEngine } from "../computerai.js";
import { REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../globals.js";
import { initInputHandler } from "./utils/inputhandler.js";
import { spriteManager } from "../../../rendering/sprites/rendersprites.js";
import { playerPosition } from "../../../playerdata/playerlogic.js";


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

let isAIOverlayActive = false;
const interactionRadius = 2.0 * 50; // Adjust radius as needed (2 tiles = 2 * 50 units)

export function drawComputerAICanvas() {
    if (isPaused || isAIOverlayActive) return;

    // Check interaction key
    if (!isInteractionKeyPressed()) return;

    // Get the computer sprite world position
    const computerSprite = spriteManager.getSprite("computerAi");
    if (!computerSprite?.worldPos) return;

    const dx = computerSprite.worldPos.x - playerPosition.x;
    const dz = computerSprite.worldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > interactionRadius) return; // Too far, do nothing

    isAIOverlayActive = true;
    setPaused(true);
    renderEngine.save();

    // Set canvas resolution
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

    initInputHandler(computerAICanvas);
}

// NEW: Listen for res change to reposition if open
if (typeof window !== 'undefined') {
    window.addEventListener('resolutionChanged', repositionOverlay);
}