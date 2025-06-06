import { keys } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { inventoryState } from "../playerdata/playerinventory.js";
import { boyKisserEnemyHealth } from "../ai/friendlycat.js"; // Import to avoid global

export let genericGunAmmo = 10;

// Setter function to update genericGunAmmo
export function setGenericGunAmmo(value) {
    genericGunAmmo = value;
}

// Cleaned up gun handler for clarity and maintainability
export function gunHandlerGodFunction() {
    genericGunHandler();
}

function genericGunHandler() {
    if (keys[" "] && playerInventory[inventoryState.selectedInventoryIndex] === "generic_gun") {
        if (genericGunAmmo <= 0) {
            keys[" "] = false;
            return;
        } else {
            genericGunAmmo--;
            boyKisserEnemyHealth = Math.max(0, boyKisserEnemyHealth - 1); // Use imported variable
        }
        keys[" "] = false;
    }
}