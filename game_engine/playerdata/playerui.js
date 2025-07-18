import { compiledTextStyle } from "../debugtools.js";
import { renderEngine } from "../rendering/renderengine.js";
import { casperFace1, casperFace2, casperFace3, casperFace4, casperFace5, casperFace1Loaded, casperFace2Loaded, casperFace3Loaded, casperFace4Loaded, casperFace5Loaded } from "./playertextures.js";
import { playerInventory, inventoryState } from "./playerinventory.js";
import { metalPipeSprite, genericGunSprite } from "../rendering/sprites/spritetextures.js";
import { playerStamina, playerHealthBar, playerHealth } from "./playerlogic.js";
import { genericGunAmmo } from "../itemhandler/guns/genericgun.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";

// Array of faces and their load status
const faces = [
    { image: casperFace1, loaded: () => casperFace1Loaded }, // 80-100 HP
    { image: casperFace2, loaded: () => casperFace2Loaded }, // 60-79 HP
    { image: casperFace3, loaded: () => casperFace3Loaded }, // 40-59 HP
    { image: casperFace4, loaded: () => casperFace4Loaded }, // 20-39 HP
    { image: casperFace5, loaded: () => casperFace5Loaded }, // 0-19 HP
];

const maxStamina = 100;
const maxHealth = 100;

export function playerUI() {
    // Select face based on HP
    let playerFaceIndex;
    if (playerHealth.playerHealth >= 80) {
        playerFaceIndex = 0; // casperface1 (healthy)
    } else if (playerHealth.playerHealth >= 60) {
        playerFaceIndex = 1; // casperface2 (slightly hurt)
    } else if (playerHealth.playerHealth >= 40) {
        playerFaceIndex = 2; // casperface3 (moderately hurt)
    } else if (playerHealth.playerHealth >= 20) {
        playerFaceIndex = 3; // casperface4 (badly hurt)
    } else {
        playerFaceIndex = 4; // casperface5 (near death)
    }
    console.log(`Player HP: ${playerHealth.playerHealth}, Face Index: ${playerFaceIndex} *twirls*`);

    // Draw semi-transparent background
    renderEngine.fillStyle = "rgba(26, 24, 24, 0.5)";
    renderEngine.fillRect(0, 700 * SCALE_Y, CANVAS_WIDTH, 100 * SCALE_Y);

    // Draw player face based on HP
    const faceX = 368 * SCALE_X;
    const faceY = 710 * SCALE_Y;
    const faceSize = 72 * Math.min(SCALE_X, SCALE_Y);
    const currentFace = faces[playerFaceIndex];
    if (currentFace.loaded()) {
        renderEngine.drawImage(currentFace.image, faceX, faceY, faceSize, faceSize);
    } else {
        compiledTextStyle();
        renderEngine.fillRect(faceX, faceY, faceSize, faceSize);
        renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText("Loading...", faceX + 5 * SCALE_X, faceY + 32 * SCALE_Y);
    }

    // Draw selected inventory item sprite (if any)
    const selectedItem = playerInventory[inventoryState.selectedInventoryIndex];
    const itemX = 492 * SCALE_X;
    const itemY = 688 * SCALE_Y;
    const itemSize = 128 * Math.min(SCALE_X, SCALE_Y);
    if (selectedItem === "metal_pipe") {
        renderEngine.drawImage(metalPipeSprite, itemX, itemY, itemSize, itemSize);
    } else if (selectedItem === "generic_gun") {
        renderEngine.drawImage(genericGunSprite, itemX, itemY, itemSize, itemSize);
        renderEngine.fillStyle = "white";
        renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        const ammoText = `Ammo: ${genericGunAmmo}`;
        const textMetrics = renderEngine.measureText(ammoText);
        const textX = faceX - 16 * SCALE_X - textMetrics.width;
        const textY = itemY + 64 * SCALE_Y;
        renderEngine.fillText(ammoText, textX, textY);
    }
}

export function staminaBarMeterOnCanvas() {
    const barWidth = 180 * SCALE_X;
    const barHeight = 20 * SCALE_Y;
    const x = CANVAS_WIDTH - barWidth - 5 * SCALE_X;
    const y = CANVAS_HEIGHT - barHeight - 40 * SCALE_Y;
    renderEngine.fillStyle = 'rgba(255, 255, 255, 0.5)';
    renderEngine.fillRect(x, y, barWidth, barHeight);
    renderEngine.fillStyle = 'rgba(0, 255, 0, 0.8)';
    renderEngine.fillRect(x, y, (barWidth * playerStamina.playerStaminaBar) / maxStamina, barHeight);
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(x, y, barWidth, barHeight);
    compiledTextStyle();
    renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Stamina", (CANVAS_WIDTH - 120 * SCALE_X), 732 * SCALE_Y);
}

export function healthMeterOnCanvas() {
    const barWidth = 180 * SCALE_X;
    const barHeight = 20 * SCALE_Y;
    const x = 5 * SCALE_X;
    const y = CANVAS_HEIGHT - barHeight - 40 * SCALE_Y;
    renderEngine.fillStyle = 'rgba(255, 255, 255, 0.5)';
    renderEngine.fillRect(x, y, barWidth, barHeight);
    renderEngine.fillStyle = 'rgba(255, 0, 0, 0.8)';
    renderEngine.fillRect(x, y, (barWidth * playerHealth.playerHealth) / maxHealth, barHeight);
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(x, y, barWidth, barHeight);
    compiledTextStyle();
    renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("HP", 5 * SCALE_X, 732 * SCALE_Y);
}