import { keys, playerPosition } from "../playerdata/playerlogic.js";
import { playerInventory, inventoryState } from "../playerdata/playerinventory.js";
import { placeholderAIHealth, setPlaceholderAIHealth } from "../ai/placeholderai.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "../ai/aihandler.js";
import { placeholderAISpriteWorldPos } from "../rendersprites.js";

export let genericGunAmmo = 10;
const gunDamage = 20; // Base damage for gun
const gunRange = 200; // Gun attack range
let lastAttackTime = 0; // Cooldown tracker
const attackCooldown = 500; // 0.5 seconds between attacks

export function setGenericGunAmmo(value) {
    genericGunAmmo = value;
}

function genericGunHandler() {
    if (!keys[" "] || playerInventory[inventoryState.selectedInventoryIndex] !== "generic_gun") {
        return;
    } else {
        genericGunAmmo--;
    }

    if (genericGunAmmo <= 0) {
        console.log("No ammo left for generic gun!");
        keys[" "] = false;
        return;
    }

    const now = performance.now();
    if (now - lastAttackTime < attackCooldown) {
        return;
    }

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
        console.log(`Shot Placeholder AI with generic gun! Health: ${placeholderAIHealth}, Ammo: ${genericGunAmmo - 1}`);
        genericGunAmmo--;
        lastAttackTime = now;
    }

    keys[" "] = false; // Reset space key
}

export function gunHandlerGodFunction() {
    genericGunHandler();
}