import { inventoryState, playerInventory } from "../../playerdata/playerinventory.js";
import { spriteManager } from "../../rendering/sprites/rendersprites.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { placeholderAIHealths, handleSpriteDeath } from "../../ai/airegistry.js";
import { isOccludedByWall } from "../../ai/aihandler.js";
import { mapHandler } from "../../mapdata/maphandler.js";
import { tileSectors } from "../../mapdata/maps.js";
import { playMetalSwingSound } from "../../audio/soundhandler.js";

// Metal pipe configuration
export const metalPipeStats = {
    damage: { value: 25 },
    range: { value: 30 },
    cooldown: { value: 800 } // 800ms cooldown between swings
};

let lastSwingTime = 0;
let isSwinging = false;

export function checkMeleeHitbox(weaponStats) {
    // Only check if we're not in cooldown
    const now = performance.now();
    if (now - lastSwingTime < weaponStats.cooldown.value || isSwinging) {
        return false;
    }

    // Start swing state and play sound immediately
    isSwinging = true;
    lastSwingTime = now;

    // Play swing sound on valid swing attempt
    if (weaponStats === metalPipeStats) {
        playMetalSwingSound();
    }

    const enemies = [];
    const regex = /^placeholderAI_\d+$/;

    spriteManager.sprites.forEach((sprite, spriteId) => {
        if (regex.test(spriteId) && sprite?.worldPos) {
            const health = placeholderAIHealths.get(spriteId);
            if (health && health.value > 0) {
                const dx = sprite.worldPos.x - playerPosition.x;
                const dz = sprite.worldPos.z - playerPosition.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                // Check if enemy is within melee range
                if (distance <= weaponStats.range.value) {
                    enemies.push({
                        id: spriteId,
                        worldPos: sprite.worldPos,
                        health: health,
                        distance: distance
                    });
                }
            }
        }
    });

    if (enemies.length === 0) {
        return false;
    }

    // Sort enemies by distance and find closest one that can be hit
    enemies.sort((a, b) => a.distance - b.distance);

    for (const enemy of enemies) {
        // Check for wall occlusion
        const map = mapHandler.getFullMap();
        if (!isOccludedByWall(
            playerPosition.x,
            playerPosition.z,
            enemy.worldPos.x,
            enemy.worldPos.z,
            map,
            tileSectors
        )) {
            // Deal damage
            enemy.health.value -= weaponStats.damage.value;
            console.log(`Hit ${enemy.id} with melee weapon! Health: ${enemy.health.value}`);

            if (enemy.health.value <= 0) {
                handleSpriteDeath(enemy.id);
            }

            return true;
        }
    }

    return false;
}

export function resetSwingState() {
    isSwinging = false;
}

export function getMeleeWeaponStats(weaponId) {
    switch (weaponId) {
        case "metal_pipe":
            return metalPipeStats;
        default:
            console.warn(`Unknown melee weapon: ${weaponId}`);
            return null;
    }
}
