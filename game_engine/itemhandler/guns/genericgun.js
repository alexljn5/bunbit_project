import { keys, playerPosition } from "../../playerdata/playerlogic.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { playGenericGunShootSound } from "../../audio/soundhandler.js";
import { genericGunDamage, genericGunRange, genericGunAmmo, checkEnemyHitbox } from "./gunregistry.js";


let lastAttackTime = 0; // Cooldown tracker
let attackCooldown = 333; // ~3 shots per second (1000ms / 333ms ≈ 3 shots)


export function genericGunHandler() {
    // Check if spacebar is pressed and the selected inventory item is the generic gun
    if (!keys[" "] || playerInventory[inventoryState.selectedInventoryIndex] !== "generic_gun") {
        return;
    }
    // Check if there's enough ammo
    if (genericGunAmmo.current <= 0) {
        console.log("No ammo left for generic gun! *eek*");
        return;
    }
    // Check if enough time has passed since the last shot
    const now = performance.now();
    if (now - lastAttackTime < attackCooldown) {
        return; // Still on cooldown, don't fire
    }
    // Fire the gun: reduce ammo, play sound, and update cooldown
    genericGunAmmo.current--;
    playGenericGunShootSound();
    lastAttackTime = now;
    checkEnemyHitbox();
}

