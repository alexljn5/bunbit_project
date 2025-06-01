import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { boyKisserEnemySpriteWorldPos } from "../rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { renderEngine } from "../renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { basicPickUpMenuStyle } from "../menus/menuhandler.js";
import { genericGunSprite } from "../rendersprites.js";
import { isOccludedByWall } from "./aihandler.js";

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
let justReceivedGun = false;

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

let showGunPickupBox = false;
let gunPickupTimer = 0;
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

function drawGunPickupBox() {
    basicPickUpMenuStyle();
    // Centered box: 400x200 at (200,200) on 800x800 canvas
    // Place text and image neatly inside
    renderEngine.save();
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "white"; // White text like NPC dialogue
    renderEngine.font = "24px Arial";
    const text = "You received a generic gun!";
    // Center text horizontally in the box (box x=200, width=400)
    const textMetrics = renderEngine.measureText(text);
    const textX = 200 + (400 - textMetrics.width) / 2;
    const textY = 350; // nicely below the top of the box
    renderEngine.fillText(text, textX, textY);
    // Draw gun image centered below the text
    const gunImg = genericGunSprite; // Use loaded sprite
    const imgWidth = 96;
    const imgHeight = 48;
    const imgX = 200 + (400 - imgWidth) / 2;
    const imgY = 370; // below the text, inside the box
    renderEngine.drawImage(gunImg, imgX, imgY, imgWidth, imgHeight);
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

/*
function isOccludedByWall(x0, z0, x1, z1, map, tileSectors) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(distance / tileSectors);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = x0 + t * dx;
        const checkZ = z0 + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < map[0].length && cellZ >= 0 && cellZ < map.length) {
            if (map[cellZ][cellX].type === "wall") {
                return true;
            }
        }
    }
    return false;
}
*/