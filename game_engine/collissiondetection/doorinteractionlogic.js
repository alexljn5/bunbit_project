import { playerPosition, isInteractionKeyPressed } from "../playerdata/playerlogic.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { fullTileBrickDoor01Open, fullTileBrickDoor01Closed } from "../mapdata/maptextures.js";
import { renderEngine } from "../renderengine.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";

let lastInteractionState = false;
let showDoorDialogue = false;
let doorDialogueTimer = 0;
const DOOR_DIALOGUE_DURATION = 120;

export function doorInteractionLogic() {
    const playerTileX = Math.floor(playerPosition.x / tileSectors);
    const playerTileZ = Math.floor(playerPosition.z / tileSectors);
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
            if (tile && (tile.textureId === 10 || tile.textureId === 9)) {
                if (currentInteractionState && !lastInteractionState) {
                    if (tile.textureId === 10) {
                        showDoorDialogue = true;
                        doorDialogueTimer = DOOR_DIALOGUE_DURATION;
                        interacted = true;
                    } else {
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
    const boxX = 100 * SCALE_X;
    const boxY = 600 * SCALE_Y;
    const boxWidth = 600 * SCALE_X;
    const boxHeight = 150 * SCALE_Y;
    renderEngine.fillRect(boxX, boxY, boxWidth, boxHeight);
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "white";
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    const line = "Doors closed, seems too have a lock on it.";
    const maxWidth = 560 * SCALE_X;
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
    renderEngine.restore();
}