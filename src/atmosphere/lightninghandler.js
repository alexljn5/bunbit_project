import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

//just some test code lol
export let lightningActive = false;
let nextStrikeTime = 0;
let flashOpacity = 0;

export function updateLightning(timeNow, renderEngine) {
    if (timeNow > nextStrikeTime) {
        lightningActive = true;
        flashOpacity = Math.random() * 0.8 + 0.2;
        nextStrikeTime = timeNow + Math.random() * 8000 + 3000; // Random 3-11 seconds
        setTimeout(() => {
            lightningActive = false;
        }, 100); // Quick flash
    }

    if (lightningActive) {
        renderEngine.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}
