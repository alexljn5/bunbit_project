const domElements = {
    playerInventoryButton: document.getElementById("playerInventory"),
    testButton: document.getElementById("testButton")
};

domElements.playerInventoryButton.addEventListener("click", playerInventoryButton);

let storedItems = [];

//works
const justForTesting = "fartshittyaids";

function playerInventoryButton() {
    storedItems.push(justForTesting);
    console.log(storedItems);
}

export function playerInventory() {
    console.log(storedItems);
}


