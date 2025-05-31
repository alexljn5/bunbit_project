import { renderEngine } from "../renderengine.js";
import { metalPipeSprite } from "../rendersprites.js";
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
        if (playerInventory.includes("metal_pipe")) {
            renderEngine.drawImage(metalPipeSprite, 10, 10, 64, 64);
            renderEngine.fillStyle = "#fff";
            renderEngine.fillText("Metal Pipe", 80, 40);
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

