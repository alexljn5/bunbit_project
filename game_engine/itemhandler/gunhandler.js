import { keys } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { selectedInventoryIndex } from "../playerdata/playerinventory.js";

export let genericGunAmmo = 10;

// Cleaned up gun handler for clarity and maintainability
export function gunHandlerGodFunction() {
    genericGunHandler();
}

function genericGunHandler() {
    if (keys[" "] && playerInventory[selectedInventoryIndex] === "generic_gun") {
        if (genericGunAmmo <= 0) {
            keys[" "] = false;
            return;
        } else {
            genericGunAmmo--;
            if (typeof window !== 'undefined' && window.boyKisserEnemyHealth !== undefined) {
                window.boyKisserEnemyHealth = Math.max(0, window.boyKisserEnemyHealth - 1);
            } else if (typeof globalThis !== 'undefined' && globalThis.boyKisserEnemyHealth !== undefined) {
                globalThis.boyKisserEnemyHealth = Math.max(0, globalThis.boyKisserEnemyHealth - 1);
            }
        }
        keys[" "] = false;
    }
}