import { keys, playerPosition } from "../../playerdata/playerlogic.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { map_01 } from "../../mapdata/map_01.js";
import { tileSectors } from "../../mapdata/maps.js";
import { isOccludedByWall } from "../../ai/aihandler.js";
import { placeholderAISpriteWorldPos } from "../../rendering/sprites/rendersprites.js";
import { playGenericGunShootSound } from "../../audio/soundhandler.js";

export let genericGunAmmo = 10;
const gunDamage = 20; // Base damage for gun
const gunRange = 200; // Gun attack range
let lastAttackTime = 0; // Cooldown tracker
const attackCooldown = 333; // ~3 shots per second (1000ms / 333ms ≈ 3 shots)

export function setGenericGunAmmo(value) {
    genericGunAmmo = value;
}

export function genericGunHandler() {
    // Check if spacebar is pressed and the selected inventory item is the generic gun
    if (!keys[" "] || playerInventory[inventoryState.selectedInventoryIndex] !== "generic_gun") {
        return;
    }

    // Check if there's enough ammo
    if (genericGunAmmo <= 0) {
        console.log("No ammo left for generic gun! *eek*");
        return;
    }

    // Check if enough time has passed since the last shot
    const now = performance.now();
    if (now - lastAttackTime < attackCooldown) {
        return; // Still on cooldown, don't fire
    }

    // Fire the gun: reduce ammo, play sound, and update cooldown
    genericGunAmmo--;
    playGenericGunShootSound();
    console.log(`Generic gun fired! Ammo left: ${genericGunAmmo}`);
    lastAttackTime = now;

    // Check for nearby enemies (e.g., placeholderAI)
    const dx = playerPosition.x - placeholderAISpriteWorldPos.x;
    const dz = playerPosition.z - placeholderAISpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check occlusion and range
    const isOccluded = isOccludedByWall(
        playerPosition.x, playerPosition.z,
        placeholderAISpriteWorldPos.x, placeholderAISpriteWorldPos.z,
        map_01, tileSectors
    );

    if (distance < gunRange && !isOccluded && placeholderAIHealth > 0) {
        setPlaceholderAIHealth(placeholderAIHealth - gunDamage);
        console.log(`Shot Placeholder AI with generic gun! Health: ${placeholderAIHealth}, Ammo: ${genericGunAmmo}`);
    }
}