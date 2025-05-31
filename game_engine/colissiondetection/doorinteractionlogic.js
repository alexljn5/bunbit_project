import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { fullTileBrickDoor01Open, fullTileBrickDoor01Closed } from "../mapdata/maptextures.js";
import { renderEngine } from "../renderengine.js";

let lastInteractionState = false;
let showDoorDialogue = false;
let doorDialogueTimer = 0;
const DOOR_DIALOGUE_DURATION = 120; // frames (~2 seconds at 60fps)

export function doorInteractionLogic() {
    // Get player's tile position
    const playerTileX = Math.floor(playerPosition.x / tileSectors);
    const playerTileZ = Math.floor(playerPosition.z / tileSectors);

    // Check adjacent tiles for a door
    const adjacentOffsets = [
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 },
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 }
    ];

    const currentInteractionState = isInteractionKeyPressed();
    let interacted = false;
    for (const { dx, dz } of adjacentOffsets) {
        const tx = playerTileX + dx;
        const tz = playerTileZ + dz;
        if (
            tz >= 0 && tz < map_01.length &&
            tx >= 0 && tx < map_01[0].length
        ) {
            const tile = map_01[tz][tx];
            if (tile && (tile.textureId === 10 || tile.textureId === 9)) { // 10: closed, 9: open
                if (currentInteractionState && !lastInteractionState) {
                    if (tile.textureId === 10) {
                        // Closed door: show dialogue
                        showDoorDialogue = true;
                        doorDialogueTimer = DOOR_DIALOGUE_DURATION;
                        interacted = true;
                    } else {
                        // Open door: close it
                        map_01[tz][tx] = { ...fullTileBrickDoor01Closed };
                    }
                }
            }
        }
    }
    lastInteractionState = currentInteractionState;
    if (showDoorDialogue && doorDialogueTimer > 0) {
        drawDoorDialogue();
        doorDialogueTimer--;
        if (doorDialogueTimer === 0) showDoorDialogue = false;
    }
}

function drawDoorDialogue() {
    renderEngine.save();
    renderEngine.globalAlpha = 0.85;
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(100, 600, 600, 150);
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "white";
    renderEngine.font = "24px Arial";
    const line = "Doors closed, seems too have a lock on it.";
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
    renderEngine.restore();
}