import { keys, playerPosition } from "../../playerdata/playerlogic.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { playGenericGunShootSound } from "../../audio/soundhandler.js";
import { genericGunDamage, genericGunRange, genericGunAmmo, Bullet } from "./gunregistry.js";

let lastAttackTime = 0;
let attackCooldown = 333; // ~3 shots per second

export function genericGunHandler() {
    if (!keys[" "] || playerInventory[inventoryState.selectedInventoryIndex] !== "generic_gun") {
        return null;
    }
    if (genericGunAmmo.current <= 0) {
        console.log("No ammo left for generic gun! *eek*");
        return null;
    }
    const now = performance.now();
    if (now - lastAttackTime < attackCooldown) {
        return null;
    }
    genericGunAmmo.current--;
    playGenericGunShootSound();
    lastAttackTime = now;
    console.log(`Shot fired, ammo remaining: ${genericGunAmmo.current}`);
    return new Bullet(
        playerPosition.x,
        playerPosition.z,
        playerPosition.angle,
        genericGunDamage.value,
        300 // Bullet speed (units/s)
    );
}