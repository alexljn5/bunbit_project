import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";
import { inventoryState } from "../playerdata/playerinventory.js";

export function meleeHandlerGodFunction() {
    metalPipeHandler();
}

function metalPipeHandler() {
    if (keys[" "] && playerInventory[inventoryState.selectedInventoryIndex] === "metal_pipe") {
        if (typeof window !== 'undefined' && window.boyKisserEnemyHealth !== undefined) {
            window.boyKisserEnemyHealth = Math.max(0, window.boyKisserEnemyHealth - 0.2);
        } else if (typeof globalThis !== 'undefined' && globalThis.boyKisserEnemyHealth !== undefined) {
            globalThis.boyKisserEnemyHealth = Math.max(0, globalThis.boyKisserEnemyHealth - 0.2);
        }
    }
    keys[" "] = false; // Reset space key to prevent continuous firing
}
