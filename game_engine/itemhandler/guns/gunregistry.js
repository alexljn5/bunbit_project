import { inventoryState, playerInventory } from "../../playerdata/playerinventory.js";
import { spriteManager } from "../../rendering/sprites/rendersprites.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { placeholderAIHealths, handleSpriteDeath } from "../../ai/airegistry.js";
import { isOccludedByWall } from "../../ai/aihandler.js";
import { mapHandler } from "../../mapdata/maphandler.js";
import { tileSectors } from "../../mapdata/maps.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerFOV } from "../../rendering/raycasting.js";
import { getSpriteScreenParams } from "../../rendering/sprites/spriteutils.js";


export let genericGunDamage = { value: 50 };
export let genericGunRange = { value: 200 };
export let genericGunAmmo = { current: 10 };

export function setGenericGunAmmo(value) {
    if (typeof value !== "number" || value <= 0) {
        console.error("setGenericGunAmmo: Value must be a non-negative number");
        return;
    }
    genericGunAmmo.current = value;
    console.log(`genericGunAmmo set to ${value}`);
}

export function checkEnemyHitbox() {
    // Check all placeholder AIs
    const enemies = [];
    const regex = /^placeholderAI_\d+$/;

    spriteManager.sprites.forEach((sprite, spriteId) => {
        if (regex.test(spriteId) && sprite?.worldPos) {
            const health = placeholderAIHealths.get(spriteId);
            if (health && health.value > 0) {
                enemies.push({
                    id: spriteId,
                    worldPos: sprite.worldPos,
                    health: health,
                    aspectRatio: 128 / 80, // Match sprite properties
                    scaleFactor: 0.5
                });
            }
        }
    });

    if (enemies.length === 0) {
        return;
    }

    // Find the closest enemy in view
    let closestEnemy = null;
    let closestDistance = Infinity;

    for (const enemy of enemies) {

        const dx = enemy.worldPos.x - playerPosition.x;
        const dz = enemy.worldPos.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // 1. Check if the enemy is within the gun's range
        if (distance > genericGunRange.value) {
            continue;
        }

        // 2. Perform a more accurate screen-space hitbox check
        const angleToEnemy = Math.atan2(dz, dx);
        let relativeAngle = angleToEnemy - playerPosition.angle;

        // Normalize angle to be within player's FOV
        while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
        while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

        // Quick check to see if the enemy is outside the player's field of view
        if (Math.abs(relativeAngle) > playerFOV / 2) {
            continue;
        }

        const correctedDistance = distance * Math.cos(relativeAngle);
        if (correctedDistance <= 0.1) continue; // Enemy is behind the player

        // Calculate the sprite's dimensions and position on the screen
        const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * enemy.scaleFactor;
        const spriteWidth = spriteHeight * enemy.aspectRatio;
        const { adjustedScreenX } = getSpriteScreenParams(relativeAngle, spriteWidth);

        // Check if the crosshair (center of the screen) is over the sprite
        const crosshairX = CANVAS_WIDTH / 2;
        const spriteLeft = adjustedScreenX - spriteWidth / 2;
        const spriteRight = adjustedScreenX + spriteWidth / 2;

        if (crosshairX < spriteLeft || crosshairX > spriteRight) {
            continue;
        }

        // 3. Check for wall occlusion
        const map = mapHandler.getFullMap();
        if (isOccludedByWall(playerPosition.x, playerPosition.z, enemy.worldPos.x, enemy.worldPos.z, map, tileSectors)) {
            continue;
        }

        if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
        }
    }

    if (closestEnemy) {
        closestEnemy.health.value -= genericGunDamage.value;
        console.log(`Hit ${closestEnemy.id}! Health: ${closestEnemy.health.value}`);

        if (closestEnemy.health.value <= 0) {
            handleSpriteDeath(closestEnemy.id);
        }
        console.log("Shot occluded by wall.");
        return;
    }

    // 4. If all checks pass, deal damage
    if (enemy.health.value > 0) {
        enemy.health.value -= genericGunDamage.value;
        console.log(`Hit ${enemy.id}! Health is now: ${enemy.health.value}`);

        if (enemy.health.value <= 0) {
            console.log(`${enemy.id} has been defeated!`);
            handleSpriteDeath(enemy.id);
        }
    }
}