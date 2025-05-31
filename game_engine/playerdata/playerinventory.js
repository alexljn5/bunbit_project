import { renderEngine } from "../renderengine.js";
import { metalPipeSprite, genericGunSprite } from "../rendersprites.js";
import { compiledTextStyle } from "../debugtools.js";
import { keys } from "./playerlogic.js";

const domElements = {
    playerInventoryButton: document.getElementById("playerInventory")
};

domElements.playerInventoryButton.addEventListener("click", () => {
    showInventorySprite = !showInventorySprite;
});

export let playerInventory = [];
export let showInventorySprite = false;

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
        // Render items in consistent order, but only if present
        const itemSprites = [
            { key: "metal_pipe", sprite: metalPipeSprite },
            { key: "generic_gun", sprite: genericGunSprite }
        ];
        let x = 10;
        for (const item of itemSprites) {
            if (playerInventory.includes(item.key)) {
                renderEngine.drawImage(item.sprite, x, 10, 64, 64);
                renderEngine.fillStyle = "#fff";
                x += 64 + 10; // next slot
            }
        }
        renderEngine.restore();
    }
}

function keyHandlingOfInventory() {
    if (keys["i"]) {
        showInventorySprite = !showInventorySprite;
        keys["i"] = false;
    }
}

