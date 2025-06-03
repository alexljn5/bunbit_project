import { renderEngine } from "../renderengine.js";
import { metalPipeSprite, genericGunSprite } from "../rendersprites.js";
import { compiledTextStyle } from "../debugtools.js";
import { keys } from "./playerlogic.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";

export let playerInventory = [];
export let showInventorySprite = false;
export let selectedInventoryIndex = 0;

export function playerInventoryGodFunction() {
    inventoryUIShit();
    keyHandlingOfInventory();
}

function inventoryUIShit() {
    if (showInventorySprite) {
        compiledTextStyle();
        renderEngine.save();
        renderEngine.globalAlpha = 0.588;
        renderEngine.fillStyle = "#222";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, 100 * SCALE_Y);
        renderEngine.globalAlpha = 1.0;
        const spriteMap = {
            "metal_pipe": metalPipeSprite,
            "generic_gun": genericGunSprite
        };
        let x = 10 * SCALE_X;
        const maxSlots = 9;
        const slotSize = 64 * SCALE_X;
        const slotSpacing = 10 * SCALE_X;
        for (let i = 0; i < maxSlots; i++) {
            const itemKey = playerInventory[i];
            const sprite = spriteMap[itemKey];
            if (i === selectedInventoryIndex) {
                renderEngine.strokeStyle = '#FFD700';
                renderEngine.lineWidth = 4 * Math.min(SCALE_X, SCALE_Y);
                renderEngine.strokeRect(x - 2 * SCALE_X, 8 * SCALE_Y, 68 * SCALE_X, 68 * SCALE_Y);
            }
            if (sprite) {
                renderEngine.drawImage(sprite, x, 10 * SCALE_Y, slotSize, slotSize);
                renderEngine.fillStyle = "#fff";
            }
            x += slotSize + slotSpacing;
        }
        renderEngine.restore();
    }
}

function keyHandlingOfInventory() {
    if (keys["i"]) {
        showInventorySprite = !showInventorySprite;
        keys["i"] = false;
    }
    for (let i = 1; i <= 9; i++) {
        const key = String(i);
        if (keys[key]) {
            selectedInventoryIndex = i - 1;
            keys[key] = false;
        }
    }
}