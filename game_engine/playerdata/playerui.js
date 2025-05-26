// playerUI.js
import { compiledTextStyle } from "../debugtools.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, renderEngine } from "../renderengine.js";
import { casperFace1, casperFace2, casperFace3, casperFace4, casperFace5, casperFace1Loaded, casperFace2Loaded, casperFace3Loaded, casperFace4Loaded, casperFace5Loaded } from "./playertextures.js";
import { playerInventory } from "./playerinventory.js";
import { metalPipeSprite } from "../rendersprites.js";

// Animation state
let currentFaceIndex = 0;
let lastFrameTime = performance.now();
const frameDuration = 500; // 0.5 seconds per face

// Array of faces and their load status
const faces = [
    { image: casperFace1, loaded: () => casperFace1Loaded },
    { image: casperFace2, loaded: () => casperFace2Loaded },
    { image: casperFace3, loaded: () => casperFace3Loaded },
    { image: casperFace4, loaded: () => casperFace4Loaded },
    { image: casperFace5, loaded: () => casperFace5Loaded },
];

export function playerUI() {
    // Update animation frame
    const currentTime = performance.now();
    if (currentTime - lastFrameTime >= frameDuration) {
        currentFaceIndex = (currentFaceIndex + 1) % faces.length; // Cycle 0->4, back to 0
        lastFrameTime = currentTime;
    }

    // Draw semi-transparent background
    renderEngine.fillStyle = "rgba(26, 24, 24, 0.5)";
    renderEngine.fillRect(0, 700, 800, 100);

    // Draw current face if loaded
    const currentFace = faces[currentFaceIndex];
    if (currentFace.loaded()) {
        renderEngine.drawImage(currentFace.image, 368, 710, 72, 72);
    } else {
        // Fallback if current image isn't loaded
        compiledTextStyle();
        renderEngine.fillRect(368, 710, 72, 72);
        renderEngine.fillText("Loading...", 373, 742);
    }

    if (playerInventory.includes("metal_pipe")) {
        renderEngine.drawImage(metalPipeSprite, 492, 672)
    }
}