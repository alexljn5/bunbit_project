import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { keys, playerPosition } from "../../playerdata/playerlogic.js";
import { checkMeleeHitbox, metalPipeStats, resetSwingState } from "./meleeregistry.js";

export function metalPipeHandler() {
    // Check if we have the pipe equipped
    if (playerInventory[inventoryState.selectedInventoryIndex] !== "metal_pipe") {
        return;
    }

    // Check for attack input
    if (keys[" "]) {
        checkMeleeHitbox(metalPipeStats);
    } else {
        resetSwingState();
    }
}

export function meleeHandlerGodFunction() {
    metalPipeHandler();
}
