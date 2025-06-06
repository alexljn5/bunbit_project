import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { boyKisserEnemySpriteWorldPos } from "../rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { renderEngine } from "../renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { basicPickUpMenuStyle } from "../menus/menuhandler.js";
import { genericGunSprite } from "../rendersprites.js";
import { isOccludedByWall } from "./aihandler.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";

// Cleaned up friendly cat (boykisser) NPC AI logic for clarity and maintainability
const npcTriggerRadius = 60;
export let npcLastTriggered = false;
export let dialogueActive = false;
export let dialogueLines = [];
export let currentDialogueIndex = 0;
export let lastInteractionState = false;
export let playerMovementDisabled = false;
export let boyKisserEnemyHealth = 100; // Explicitly defined and exported

export function setNpcLastTriggered(value) {
    npcLastTriggered = value;
}

export function setDialogueActive(value) {
    dialogueActive = value;
}

export function setDialogueLines(value) {
    dialogueLines = value;
}

export function setCurrentDialogueIndex(value) {
    currentDialogueIndex = value;
}

export function setLastInteractionState(value) {
    lastInteractionState = value;
}

export function setPlayerMovementDisabled(value) {
    playerMovementDisabled = value;
}

export function setJustReceivedGun(value) {
    justReceivedGun = value;
}

export function setShowGunPickupBox(value) {
    showGunPickupBox = value;
}

export function setGunPickupTimer(value) {
    gunPickupTimer = value;
}

export function setBoyKisserEnemyHealth(value) {
    boyKisserEnemyHealth = value;
}

window.addEventListener("keydown", (event) => {
    if (dialogueActive && event.key.toLowerCase() === "t") {
        event.preventDefault();
        advanceNpcDialogue();
    }
}, true);

function startNpcDialogue(lines) {
    dialogueActive = true;
    dialogueLines = lines;
    currentDialogueIndex = 0;
    playerMovementDisabled = true;
}

function advanceNpcDialogue() {
    if (!dialogueActive) return;
    currentDialogueIndex++;
    if (currentDialogueIndex >= dialogueLines.length) {
        dialogueActive = false;
        dialogueLines = [];
        currentDialogueIndex = 0;
        playerMovementDisabled = false;
        npcLastTriggered = false;
        // Only show the pickup box if the player just got the gun (not if they already had it)
        if (showGunPickupBox === false && playerInventory.includes("generic_gun") && gunPickupTimer === 0 && justReceivedGun) {
            showGunPickupBox = true;
            gunPickupTimer = GUN_PICKUP_DURATION;
            justReceivedGun = false;
        }
    }
}

// Track if the player just received the gun in this interaction
export let justReceivedGun = false;

export function boyKisserNpcAI() {
    // Get current interaction key state
    const currentInteractionState = isInteractionKeyPressed();
    // Only trigger if key is pressed AND it wasn't pressed last frame (fresh press)
    if (dialogueActive || npcLastTriggered || !currentInteractionState || lastInteractionState) {
        lastInteractionState = currentInteractionState;
        return;
    }

    const dx = playerPosition.x - boyKisserEnemySpriteWorldPos.x;
    const dz = playerPosition.z - boyKisserEnemySpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const isOccluded = isOccludedByWall(
        boyKisserEnemySpriteWorldPos.x, boyKisserEnemySpriteWorldPos.z,
        playerPosition.x, playerPosition.z,
        map_01, tileSectors
    );

    if (distance < npcTriggerRadius && !isOccluded) {
        let dialogue;
        justReceivedGun = false;
        if (playerInventory.includes("generic_gun")) {
            dialogue = ["BoyKisser: You already have a gun, no need for another."];
        } else {
            dialogue = [
                "BoyKisser: Hello there, traveler!",
                "BoyKisser: Press T to continue...",
                "BoyKisser: Please take this item!",
                "BoyKisser: It's a special gift for you.",
                "BoyKisser: Remember, kindness is key!",
            ];
            playerInventory.push("generic_gun");
            justReceivedGun = true;
        }
        startNpcDialogue(dialogue);
        npcLastTriggered = true;
    } else {
        npcLastTriggered = false;
    }
    lastInteractionState = currentInteractionState;
}

function getCurrentNpcDialogueLine() {
    return dialogueActive ? dialogueLines[currentDialogueIndex] : null;
}

export let showGunPickupBox = false;
export let gunPickupTimer = 0;
const GUN_PICKUP_DURATION = 120; // 2 seconds at 60fps

export function boyKisserNpcAIGodFunction() {
    if (!dialogueActive) boyKisserNpcAI();
    if (dialogueActive) drawNpcDialogue();
    if (showGunPickupBox && gunPickupTimer > 0) {
        drawGunPickupBox();
        gunPickupTimer--;
        if (gunPickupTimer === 0) showGunPickupBox = false;
    }
    friendlyCatAi();
}

function drawNpcDialogue() {
    renderEngine.save();
    renderEngine.globalAlpha = 0.85;
    renderEngine.fillStyle = "black";
    const boxX = 100 * SCALE_X;
    const boxY = 600 * SCALE_Y;
    const boxWidth = 600 * SCALE_X;
    const boxHeight = 150 * SCALE_Y;
    renderEngine.fillRect(boxX, boxY, boxWidth, boxHeight);
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "white";
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    const line = getCurrentNpcDialogueLine();
    if (line) {
        // Word wrap: split long lines to fit inside the dialogue box
        const maxWidth = 560 * SCALE_X; // Scaled text area width
        const x = 120 * SCALE_X;
        let y = 650 * SCALE_Y;
        const lineHeight = 32 * SCALE_Y;
        const words = line.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = renderEngine.measureText(testLine);
            if (metrics.width > maxWidth && currentLine !== '') {
                renderEngine.fillText(currentLine, x, y);
                currentLine = words[i] + ' ';
                y += lineHeight;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            renderEngine.fillText(currentLine, x, y);
        }
    }
    renderEngine.restore();
}

function drawGunPickupBox() {
    basicPickUpMenuStyle(); // Already scaled in menuhandler.js
    renderEngine.save();
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "white";
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    const text = "You received a generic gun!";
    // Center text horizontally in the box (box x=200*SCALE_X, width=400*SCALE_X)
    const textMetrics = renderEngine.measureText(text);
    const textX = (CANVAS_WIDTH - textMetrics.width) / 2; // Centered in scaled box
    const textY = 350 * SCALE_Y;
    renderEngine.fillText(text, textX, textY);
    // Draw gun image centered below the text
    const gunImg = genericGunSprite;
    const imgWidth = 96 * SCALE_X;
    const imgHeight = 48 * SCALE_Y;
    const imgX = (CANVAS_WIDTH - imgWidth) / 2; // Centered in scaled box
    const imgY = 370 * SCALE_Y;
    renderEngine.drawImage(gunImg, imgX, imgY, imgWidth, imgHeight);
    renderEngine.restore();
}

export let lastKnownPlayerPos = null;
export let canSeePlayer = false;

export function setCanSeePlayer(value) {
    canSeePlayer = value;
}

export let boyKisserPreviousPos = { x: boyKisserEnemySpriteWorldPos.x, z: boyKisserEnemySpriteWorldPos.z };

function friendlyCatAi() {
    if (playerInventory.includes("generic_gun")) {
        return; // Stop following if player has the gun
    }
    if (!lastKnownPlayerPos) {
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
    }

    const enemySpeed = 0.3 * 2;
    const randomFactor = 0.2;
    const enemyRadius = 20;
    const buffer = 0.3;
    const visionRange = 500;

    const dx = playerPosition.x - boyKisserEnemySpriteWorldPos.x;
    const dz = playerPosition.z - boyKisserEnemySpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check for occlusion (BoyKisser)
    const isOccluded = isOccludedByWall(
        boyKisserEnemySpriteWorldPos.x, boyKisserEnemySpriteWorldPos.z,
        playerPosition.x, playerPosition.z,
        map_01, tileSectors
    );

    if (!isOccluded && distance < visionRange) {
        lastKnownPlayerPos.x = playerPosition.x;
        lastKnownPlayerPos.z = playerPosition.z;
        canSeePlayer = true;
    } else {
        canSeePlayer = false;
    }

    const targetX = canSeePlayer ? playerPosition.x : lastKnownPlayerPos.x;
    const targetZ = canSeePlayer ? playerPosition.z : lastKnownPlayerPos.z;
    const targetDx = targetX - boyKisserEnemySpriteWorldPos.x;
    const targetDz = targetZ - boyKisserEnemySpriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (targetDistance < 50) {
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = boyKisserEnemySpriteWorldPos.x + randomDirX * enemySpeed;
    let newZ = boyKisserEnemySpriteWorldPos.z + randomDirZ * enemySpeed;

    const mapWidth = map_01[0].length;
    const mapHeight = map_01.length;
    const minX = Math.floor((newX - enemyRadius) / tileSectors);
    const maxX = Math.floor((newX + enemyRadius) / tileSectors);
    const minZ = Math.floor((newZ - enemyRadius) / tileSectors);
    const maxZ = Math.floor((newZ + enemyRadius) / tileSectors);

    let collisionX = false;
    let collisionZ = false;

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
                if (tile.type === "wall") {
                    const tileLeft = x * tileSectors;
                    const tileRight = (x + 1) * tileSectors;
                    const tileTop = z * tileSectors;
                    const tileBottom = (z + 1) * tileSectors;

                    if (newX + enemyRadius > tileLeft && boyKisserPreviousPos.x + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && boyKisserPreviousPos.x - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && boyKisserPreviousPos.z + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && boyKisserPreviousPos.z - enemyRadius >= tileBottom) {
                        newZ = tileBottom + enemyRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    if (!collisionX) {
        boyKisserEnemySpriteWorldPos.x = newX;
    }
    if (!collisionZ) {
        boyKisserEnemySpriteWorldPos.z = newZ;
    }

    boyKisserPreviousPos.x = boyKisserEnemySpriteWorldPos.x;
    boyKisserPreviousPos.z = boyKisserEnemySpriteWorldPos.z;

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    boyKisserEnemySpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, boyKisserEnemySpriteWorldPos.x));
    boyKisserEnemySpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, boyKisserEnemySpriteWorldPos.z));
}