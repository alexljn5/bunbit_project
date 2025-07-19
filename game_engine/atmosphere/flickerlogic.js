import { renderEngine } from "../rendering/renderengine.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../globals.js";

let isFlickerOn = false; // Tracks if the white rectangle is shown
const flickerInterval = 5000; // Time between flickers in milliseconds (adjust for speed)

export function flickeringEffect() {
    setInterval(flickeringSetup, flickerInterval);
}

function flickeringSetup() {
    // Toggle flicker state
    isFlickerOn = !isFlickerOn;

    if (isFlickerOn) {
        // Draw white rectangle
        renderEngine.fillStyle = "black";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        // Clear the canvas (or draw your background)
        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}
