import { renderEngine } from "../rendering/renderengine.js";
import { keys } from "./playerlogic.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, playerInventory, inventoryState, showInventorySprite, setShowInventorySprite } from "../globals.js";
import { ITEM_REGISTRY, SPRITE_MAP, validateSprites } from "../itemhandler/itemregistry.js";

// Re-export for backward compatibility
export { playerInventory, inventoryState, showInventorySprite };

export function playerInventoryGodFunction() {
    validateSprites();
    inventoryUIShit();
    keyHandlingOfInventory();
}

function inventoryUIShit() {
    if (showInventorySprite) {
        renderEngine.save();
        renderEngine.globalAlpha = 0.588;
        renderEngine.fillStyle = "#222";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, 100 * SCALE_Y);
        renderEngine.globalAlpha = 1.0;
        let x = 10 * SCALE_X;
        const maxSlots = 9;
        const slotSize = 64 * SCALE_X;
        const slotSpacing = 10 * SCALE_X;
        for (let i = 0; i < maxSlots; i++) {
            const itemKey = playerInventory[i];
            const sprite = SPRITE_MAP[itemKey];
            if (i === inventoryState.selectedInventoryIndex) {
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
        setShowInventorySprite(!showInventorySprite);
        keys["i"] = false;
    }
    for (let i = 1; i <= 9; i++) {
        const key = String(i);
        if (keys[key]) {
            inventoryState.selectedInventoryIndex = i - 1;
            keys[key] = false;
        }
    }
}