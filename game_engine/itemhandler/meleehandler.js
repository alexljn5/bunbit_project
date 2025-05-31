import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";

export function meleeHandlerGodFunction() {
    metalPipeHandler();
}

function metalPipeHandler() {
    if (keys[" "]) {
        genericGunAmmo--;

        // Decrement the exported variable directly (since it's a number, not an object)
        // This will only update the local copy, so we need to use a setter or refactor to an object for reactivity
        // For now, update via window/globalThis for demo purposes
        if (typeof window !== 'undefined' && window.boyKisserEnemyHealth !== undefined) {
            window.boyKisserEnemyHealth = Math.max(0, window.boyKisserEnemyHealth - 1);
        } else if (typeof globalThis !== 'undefined' && globalThis.boyKisserEnemyHealth !== undefined) {
            globalThis.boyKisserEnemyHealth = Math.max(0, globalThis.boyKisserEnemyHealth - 1);
        }
    }
    keys[" "] = false; // Reset space key to prevent continuous firing
}
