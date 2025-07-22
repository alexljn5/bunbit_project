import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { genericGunSprite } from "../rendering/sprites/spritetextures.js";
import { map_01 } from "../mapdata/map_01.js";
import { mapTable } from "../mapdata/maps.js";
import { tileSectors } from "../mapdata/maps.js";
import { renderEngine } from "../rendering/renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { isOccludedByWall } from "./aihandler.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { drawNpcDialogue, drawGunPickupBox, basicPickUpMenuStyle } from "../menus/overlays.js";

// Cleaned up friendly cat (boykisser) NPC AI logic for clarity and maintainability
const npcTriggerRadius = 60;
export let npcLastTriggered = false;
export let dialogueActive = false;
export let dialogueLines = [];
export let currentDialogueIndex = 0;
export let lastInteractionState = false;
export let playerMovementDisabled = false;
export let boyKisserEnemyHealth = 100; // Explicitly defined and exported
export let justReceivedGun = false;
export let showGunPickupBox = false;
export let gunPickupTimer = 0;
export let lastKnownPlayerPos = null;
export let canSeePlayer = false;
export let boyKisserPreviousPos = null; // Initialize as null, set in friendlyCatAi
const GUN_PICKUP_DURATION = 120; // 2 seconds at 60fps


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

export function setCanSeePlayer(value) {
    canSeePlayer = value;
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

export function boyKisserNpcAI() {
    const boyKisserSprite = spriteManager.getSprite("boyKisser");
    if (!boyKisserSprite || !boyKisserSprite.worldPos) {
        console.log("Oh no! BoyKisser sprite not found or missing worldPos! *sadiamas!");
        return;
    }

    const currentInteractionState = isInteractionKeyPressed();
    if (dialogueActive || npcLastTriggered || !currentInteractionState || lastInteractionState) {
        lastInteractionState = currentInteractionState;
        return;
    }

    const dx = playerPosition.x - boyKisserSprite.worldPos.x;
    const dz = playerPosition.z - boyKisserSprite.worldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const isOccluded = isOccludedByWall(
        boyKisserSprite.worldPos.x,
        boyKisserSprite.worldPos.z,
        playerPosition.x,
        playerPosition.z,
        map_01,
        tileSectors
    );

    if (distance < npcTriggerRadius && !isOccluded) {
        let dialogue;
        justReceivedGun = false;
        if (playerInventory.includes("generic_gun")) {
            dialogue = ["You already have a gun, no need for another."];
        } else {
            dialogue = [
                "Hello there, traveler!",
                "Press T to continue...",
                "Please take this item!",
                "It's a special gift for you.",
                "Remember, kindness is key!",
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

export function boyKisserNpcAIGodFunction() {
    if (!dialogueActive) boyKisserNpcAI();
    if (dialogueActive) drawNpcDialogue(dialogueLines, currentDialogueIndex);
    if (showGunPickupBox && gunPickupTimer > 0) {
        drawGunPickupBox();
        gunPickupTimer--;
        if (gunPickupTimer === 0) showGunPickupBox = false;
    }
    friendlyCatAi();
}

function friendlyCatAi() {
    if (playerInventory.includes("generic_gun")) {
        return; // Stop following if player has the gun
    }

    const boyKisserSprite = spriteManager.getSprite("boyKisser");
    if (!boyKisserSprite || !boyKisserSprite.worldPos) {
        console.log("Oops! BoyKisser sprite not found or missing worldPos! *Chao chao*");
        return;
    }

    // No need to sync with old worldPos anymore, using spriteManager directly

    if (!lastKnownPlayerPos) {
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
    }

    // Initialize boyKisserPreviousPos if null
    if (!boyKisserPreviousPos) {
        boyKisserPreviousPos = { x: boyKisserSprite.worldPos.x, z: boyKisserSprite.worldPos.z };
    }

    const enemySpeed = 0.3 * 2;
    const randomFactor = 0.2;
    const enemyRadius = 20;
    const buffer = 0.3;
    const visionRange = 500;

    const dx = playerPosition.x - boyKisserSprite.worldPos.x;
    const dz = playerPosition.z - boyKisserSprite.worldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check for occlusion (BoyKisser)
    const isOccluded = isOccludedByWall(
        boyKisserSprite.worldPos.x,
        boyKisserSprite.worldPos.z,
        playerPosition.x,
        playerPosition.z,
        map_01,
        tileSectors
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
    const targetDx = targetX - boyKisserSprite.worldPos.x;
    const targetDz = targetZ - boyKisserSprite.worldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (targetDistance < 50) {
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = boyKisserSprite.worldPos.x + randomDirX * enemySpeed;
    let newZ = boyKisserSprite.worldPos.z + randomDirZ * enemySpeed;

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
        boyKisserSprite.worldPos.x = newX;
    }
    if (!collisionZ) {
        boyKisserSprite.worldPos.z = newZ;
    }

    // Update previous position
    boyKisserPreviousPos.x = boyKisserSprite.worldPos.x;
    boyKisserPreviousPos.z = boyKisserSprite.worldPos.z;

    // Clamp position to map boundaries
    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    boyKisserSprite.worldPos.x = Math.max(enemyRadius, Math.min(maxXBound, boyKisserSprite.worldPos.x));
    boyKisserSprite.worldPos.z = Math.max(enemyRadius, Math.min(maxZBound, boyKisserSprite.worldPos.z));
}