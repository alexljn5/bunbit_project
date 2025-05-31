// BoyKisser NPC AI (not enemy, just triggers when close)
import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { boyKisserEnemySpriteWorldPos } from "../rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { renderEngine } from "../renderengine.js";
import { isOccludedByWall } from "./enemyai.js";

// Clean up: optimize dialogue system, event handling, and rendering

window.addEventListener("keydown", (event) => {
    if (dialogueActive && event.key.toLowerCase() === "t") {
        event.preventDefault();
        advanceNpcDialogue();
    }
}, true);

const npcTriggerRadius = 60;
let npcLastTriggered = false;
let dialogueActive = false;
let dialogueLines = [];
let currentDialogueIndex = 0;

function startNpcDialogue(lines) {
    dialogueActive = true;
    dialogueLines = lines;
    currentDialogueIndex = 0;
}

function advanceNpcDialogue() {
    if (!dialogueActive) return;
    currentDialogueIndex++;
    if (currentDialogueIndex >= dialogueLines.length) {
        dialogueActive = false;
        dialogueLines = [];
        currentDialogueIndex = 0;
    }
}

function getCurrentNpcDialogueLine() {
    return dialogueActive ? dialogueLines[currentDialogueIndex] : null;
}

export function boyKisserNpcAIGodFunction() {
    boyKisserNpcAI();
    if (dialogueActive) drawNpcDialogue();
}

function boyKisserNpcAI() {
    const dx = playerPosition.x - boyKisserEnemySpriteWorldPos.x;
    const dz = playerPosition.z - boyKisserEnemySpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const isOccluded = isOccludedByWall(
        boyKisserEnemySpriteWorldPos.x, boyKisserEnemySpriteWorldPos.z,
        playerPosition.x, playerPosition.z,
        map_01, tileSectors
    );
    if (distance < npcTriggerRadius && !isOccluded) {
        if (isInteractionKeyPressed() && !dialogueActive) {
            startNpcDialogue([
                "BoyKisser: Hello there, traveler!",
                "BoyKisser: Press T to continue...",
                "BoyKisser: Please take this item!",
                "BoyKisser: It's a special gift for you.",
                "BoyKisser: Remember, kindness is key!",
            ]);
            npcLastTriggered = true;
        }
    } else {
        npcLastTriggered = false;
    }
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

