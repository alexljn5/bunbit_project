import { renderEngine } from "../renderengine.js";
import { metalPipeSprite } from "../rendersprites.js";

const domElements = {
    playerInventoryButton: document.getElementById("playerInventory")
};

domElements.playerInventoryButton.addEventListener("click", playerInventoryButton);

export let playerInventory = [];
export let showInventorySprite = false; // New flag to control sprite drawing

const justForTesting = "fartshittyaids";

export function playerInventoryGodFunction() {
    console.log(playerInventory);
}

function playerInventoryButton() {

}