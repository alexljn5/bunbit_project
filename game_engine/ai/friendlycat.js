import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { boyKisserEnemySpriteWorldPos } from "../rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { renderEngine } from "../renderengine.js";
import { isOccludedByWall } from "./enemyai.js";
import { playerInventory } from "../playerdata/playerinventory.js";

const npcTriggerRadius = 60;
let npcLastTriggered = false;
let dialogueActive = false;
let dialogueLines = [];
let currentDialogueIndex = 0;
let lastInteractionState = false; // Track previous interaction key state

export let playerMovementDisabled = false;

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
        npcLastTriggered = false; // Reset to allow new interaction
    }
}

function getCurrentNpcDialogueLine() {
    return dialogueActive ? dialogueLines[currentDialogueIndex] : null;
}

export function boyKisserNpcAIGodFunction() {
    if (!dialogueActive) boyKisserNpcAI();
    if (dialogueActive) drawNpcDialogue();
    friendlyCatAi();
}

function boyKisserNpcAI() {
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
        if (playerInventory.includes("generic_gun")) {
            // If player has the gun, skip to the single-line dialogue
            dialogue = ["BoyKisser: You already have a gun, no need for another."];
        } else {
            // Full dialogue for first interaction, add gun to inventory
            dialogue = [
                "BoyKisser: Hello there, traveler!",
                "BoyKisser: Press T to continue...",
                "BoyKisser: Please take this item!",
                "BoyKisser: It's a special gift for you.",
                "BoyKisser: Remember, kindness is key!",
            ];
            playerInventory.push("generic_gun");
            console.log("Generic gun added to inventory.", playerInventory);
        }
        startNpcDialogue(dialogue);
        npcLastTriggered = true;
    } else {
        npcLastTriggered = false;
    }
    lastInteractionState = currentInteractionState; // Update key state
}

function drawNpcDialogue() {
    renderEngine.save();
    renderEngine.globalAlpha = 0.85;
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(100, 600, 600, 150);
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "white";
    renderEngine.font = "24px Arial";
    const line = getCurrentNpcDialogueLine();
    if (line) {
        // Word wrap: split long lines to fit inside the dialogue box
        const maxWidth = 560; // width of the text area inside the box
        const x = 120;
        let y = 650;
        const lineHeight = 32;
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
let lastKnownPlayerPos = null;
let canSeePlayer = false;

let boyKisserPreviousPos = { x: boyKisserEnemySpriteWorldPos.x, z: boyKisserEnemySpriteWorldPos.z };
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
        console.log("BoyKisser reached target, pausing");
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

    console.log(`BoyKisser moved to: x=${boyKisserEnemySpriteWorldPos.x.toFixed(2)}, z=${boyKisserEnemySpriteWorldPos.z.toFixed(2)}, targetDistance=${targetDistance.toFixed(2)}, canSeePlayer=${canSeePlayer}`);
}