import { renderEngine } from "../renderengine.js";
import { metalPipeSprite } from "../rendersprites.js";
import { compiledTextStyle } from "../debugtools.js";
import { keys } from "./playerlogic.js";

const domElements = {
    playerInventoryButton: document.getElementById("playerInventory")
};

domElements.playerInventoryButton.addEventListener("click", playerInventoryButton);

export let playerInventory = [];
export let showInventorySprite = false; // New flag to control sprite drawing

export function playerInventoryGodFunction() {
    inventoryUIShit(); // Call inventory UI rendering
    keyHandlingOfInventory(); // Handle key inputs for inventory
}

function playerInventoryButton() {
    showInventorySprite = !showInventorySprite; // Toggle inventory display
}

function inventoryUIShit() {
    if (showInventorySprite) {
        compiledTextStyle();
        // Save context before changing globalAlpha
        renderEngine.save();
        renderEngine.globalAlpha = 0.588; // Semi-transparent background
        renderEngine.fillStyle = "#222";
        renderEngine.fillRect(0, 0, 800, 100);
        renderEngine.globalAlpha = 1.0; // Restore alpha for item drawing
        if (playerInventory.includes("metal_pipe")) {
            renderEngine.drawImage(metalPipeSprite, 10, 10, 64, 64); // Draw metal pipe sprite
            renderEngine.fillStyle = "#fff";
            renderEngine.fillText("Metal Pipe", 80, 40); // Label for the item
        }
        // Restore context after drawing
        renderEngine.restore();
    }
}

function keyHandlingOfInventory() {
    if (keys["i"]) { // Toggle inventory with 'i' key
        showInventorySprite = !showInventorySprite;
        keys["i"] = false; // Reset key state to prevent repeated toggling
    }
}

