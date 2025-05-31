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
        const dialogue = [
            "BoyKisser: Hello there, traveler!",
            "BoyKisser: Press T to continue...",
            "BoyKisser: Please take this item!",
            "BoyKisser: It's a special gift for you.",
            "BoyKisser: Remember, kindness is key!",
        ];
        if (playerInventory.includes("generic_gun")) {
            dialogue.push("BoyKisser: You already have a gun, no need for another.");
        } else {
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
        renderEngine.fillText(line, 120, 650);
    }
    renderEngine.restore();
}