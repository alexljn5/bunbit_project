import { renderEngine } from "../renderengine.js";
import { metalPipeSprite, genericGunSprite } from "../rendersprites.js";
import { compiledTextStyle } from "../debugtools.js";
import { keys } from "./playerlogic.js";

export let playerInventory = [];
export let showInventorySprite = false;
export let selectedInventoryIndex = 0; // Track selected slot

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
        renderEngine.fillRect(0, 0, 800, 100);
        renderEngine.globalAlpha = 1.0;
        // Render up to 9 items in the order they appear in playerInventory
        const spriteMap = {
            "metal_pipe": metalPipeSprite,
            "generic_gun": genericGunSprite
        };
        let x = 10;
        const maxSlots = 9;
        for (let i = 0; i < maxSlots; i++) {
            const itemKey = playerInventory[i];
            const sprite = spriteMap[itemKey];
            // Highlight selected slot
            if (i === selectedInventoryIndex) {
                renderEngine.strokeStyle = '#FFD700';
                renderEngine.lineWidth = 4;
                renderEngine.strokeRect(x - 2, 8, 68, 68);
            }
            if (sprite) {
                renderEngine.drawImage(sprite, x, 10, 64, 64);
                renderEngine.fillStyle = "#fff";
            } else {
                // Optionally, draw an empty slot or leave blank
                // renderEngine.strokeStyle = '#555';
                // renderEngine.strokeRect(x, 10, 64, 64);
            }
            x += 64 + 10; // next slot
        }
        renderEngine.restore();
    }
}

function keyHandlingOfInventory() {
    // Toggle inventory UI
    if (keys["i"]) {
        showInventorySprite = !showInventorySprite;
        keys["i"] = false;
    }
    // Handle keybinds 1-9 for inventory slots
    for (let i = 1; i <= 9; i++) {
        const key = String(i);
        if (keys[key]) {
            selectedInventoryIndex = i - 1; // Select slot
            keys[key] = false; // Prevent repeat
        }
    }
}

// Cleaned up player inventory for clarity and maintainability

