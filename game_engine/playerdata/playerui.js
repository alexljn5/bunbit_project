// playerUI.js
import { compiledTextStyle } from "../debugtools.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, renderEngine } from "../renderengine.js";
import { casperFace1, casperFace2, casperFace3, casperFace4, casperFace5, casperFace1Loaded, casperFace2Loaded, casperFace3Loaded, casperFace4Loaded, casperFace5Loaded } from "./playertextures.js";
import { playerInventory, selectedInventoryIndex } from "./playerinventory.js";
import { metalPipeSprite, genericGunSprite } from "../rendersprites.js";
import { playerStaminaBar, playerHealthBar } from "./playerlogic.js";
import { genericGunAmmo } from "../itemhandler/gunhandler.js";

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

const maxStamina = 100;
const maxHealth = 100;

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

    // Draw player face (animated or fallback)
    const currentFace = faces[currentFaceIndex];
    if (currentFace.loaded()) {
        renderEngine.drawImage(currentFace.image, 368, 710, 72, 72);
    } else {
        compiledTextStyle();
        renderEngine.fillRect(368, 710, 72, 72);
        renderEngine.fillText("Loading...", 373, 742);
    }
    // Draw selected inventory item sprite (if any)
    const selectedItem = playerInventory[selectedInventoryIndex];
    if (selectedItem === "metal_pipe") {
        renderEngine.drawImage(metalPipeSprite, 492, 672);
    } else if (selectedItem === "generic_gun") {
        renderEngine.drawImage(genericGunSprite, 492, 672);
        renderEngine.fillStyle = "white";
        renderEngine.font = "24px Arial";
        // Ammo text left of player head
        const ammoText = `Ammo: ${genericGunAmmo}`;
        const textMetrics = renderEngine.measureText(ammoText);
        const textX = 368 - 16 - textMetrics.width;
        const textY = 672 + 64;
        renderEngine.fillText(ammoText, textX, textY);
    }
}

export function staminaBarMeterOnCanvas() {
    const barWidth = 180, barHeight = 20;
    const x = CANVAS_WIDTH - barWidth;
    const y = CANVAS_HEIGHT - barHeight - 40;
    renderEngine.fillStyle = 'rgba(255, 255, 255, 0.5)';
    renderEngine.fillRect(x, y, barWidth, barHeight);
    renderEngine.fillStyle = 'rgba(0, 255, 0, 0.8)';
    renderEngine.fillRect(x, y, (barWidth * playerStaminaBar) / maxStamina, barHeight);
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(x, y, barWidth, barHeight);
    compiledTextStyle();
    renderEngine.fillText("Stamina", 680, 732);
}

export function healthMeterOnCanvas() {
    const barWidth = 180, barHeight = 20;
    const x = (CANVAS_WIDTH - barWidth) / 100;
    const y = CANVAS_HEIGHT - barHeight - 40;
    renderEngine.fillStyle = 'rgba(255, 255, 255, 0.5)';
    renderEngine.fillRect(x, y, barWidth, barHeight);
    renderEngine.fillStyle = 'rgba(255, 0, 0, 0.8)';
    renderEngine.fillRect(x, y, (barWidth * playerHealthBar) / maxHealth, barHeight);
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(x, y, barWidth, barHeight);
    compiledTextStyle();
    renderEngine.fillText("HP", 5, 732);
}