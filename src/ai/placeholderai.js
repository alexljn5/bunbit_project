import { playerPosition, playerHealth, keys } from "../playerdata/playerlogic.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "./aihandler.js";
import { renderEngine } from "../rendering/renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { placeholderAIHealths, placeholderAIHealthBar } from "./airegistry.js";
import { mapHandler } from "../mapdata/maphandler.js";

// Placeholder AI logic with health bar and damage handling
// Store state for each AI instance
const aiStates = new Map();

function getAIState(spriteId) {
    if (!aiStates.has(spriteId)) {
        aiStates.set(spriteId, {
            previousPos: null,
            lastKnownPlayerPos: null,
            canSeePlayer: true,
            isPeeking: false,
            peekStartTime: 0,
            spriteWorldPos: null,
            lastHitTime: 0,
            lastPlayerAttackTime: 0
        });
    }
    return aiStates.get(spriteId);
}

// Constants shared by all AIs
const damagePerSecond = 100;
const hitCooldown = 1000;
const hitRadius = 20;
const gunDamage = 20;
const meleeDamage = 10;
const meleeRange = 30;
const attackCooldown = 500;

export function placeholderAIGodFunction() {
    // Handle each AI instance
    const regex = /^placeholderAI_\d+$/;
    spriteManager.sprites.forEach((sprite, spriteId) => {
        if (regex.test(spriteId)) {
            const health = placeholderAIHealths.get(spriteId);
            if (health && health.value > 0) {
                placeholderAI(spriteId);
            }
        }
    });
}

export function placeholderAI(spriteId) {
    const placeholderSprite = spriteManager.getSprite(spriteId);
    if (!placeholderSprite) {
        console.log(`Placeholder AI sprite ${spriteId} not found!`);
        return;
    }
    const aiState = getAIState(spriteId);

    // Always use the sprite's current worldPos for this map
    if (!placeholderSprite.worldPos) {
        console.log("Placeholder AI sprite missing worldPos!");
        return;
    }
    aiState.spriteWorldPos = placeholderSprite.worldPos;

    // Draw the health bar
    placeholderAIHealthBar();
    const enemySpeed = 0.2;
    const randomFactor = 0.1;
    const enemyRadius = 10;
    const buffer = 0.3;
    const visionRange = 400;
    const peekDistance = 50;
    const peekDelay = 2000;

    const dx = playerPosition.x - aiState.spriteWorldPos.x;
    const dz = playerPosition.z - aiState.spriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const now = performance.now();
    if (distance < hitRadius && now - aiState.lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(0, playerHealth.playerHealth - damagePerSecond);
        aiState.lastHitTime = now;
        console.log(`Placeholder AI hit player! Player Health: ${playerHealth.playerHealth}`);
    }

    // Use current map grid from mapHandler
    const currentMap = mapHandler.getFullMap();
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0]) {
        return;
    }

    const isOccluded = isOccludedByWall(
        aiState.spriteWorldPos.x,
        aiState.spriteWorldPos.z,
        playerPosition.x,
        playerPosition.z,
        currentMap,
        tileSectors
    );

    const steps = Math.ceil(distance / tileSectors);
    let nearestWallDistance = Infinity;
    let nearestWallPos = null;
    let isHalfwayBehindWall = false;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = aiState.spriteWorldPos.x + t * dx;
        const checkZ = aiState.spriteWorldPos.z + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < currentMap[0].length && cellZ >= 0 && cellZ < currentMap.length) {
            if (currentMap[cellZ][cellX].type === "wall") {
                const wallDist = Math.sqrt(
                    (checkX - aiState.spriteWorldPos.x) ** 2 +
                    (checkZ - aiState.spriteWorldPos.z) ** 2
                );
                if (wallDist < nearestWallDistance) {
                    nearestWallDistance = wallDist;
                    nearestWallPos = { x: checkX, z: checkZ };
                }
                break;
            }
        }
    }

    if (!isOccluded && distance < visionRange) {
        aiState.lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
        aiState.canSeePlayer = true;
    } else {
        aiState.canSeePlayer = false;
    }

    const targetX = aiState.canSeePlayer ? playerPosition.x : (aiState.lastKnownPlayerPos?.x || aiState.spriteWorldPos.x);
    const targetZ = aiState.canSeePlayer ? playerPosition.z : (aiState.lastKnownPlayerPos?.z || aiState.spriteWorldPos.z);
    const targetDx = targetX - aiState.spriteWorldPos.x;
    const targetDz = targetZ - aiState.spriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (isHalfwayBehindWall && !aiState.canSeePlayer && targetDistance > hitRadius) {
        if (!aiState.isPeeking) {
            aiState.isPeeking = true;
            aiState.peekStartTime = performance.now();
        }
        const elapsedPeekTime = performance.now() - aiState.peekStartTime;
        if (elapsedPeekTime < peekDelay) {
            return;
        } else {
            aiState.isPeeking = false;
            aiState.peekStartTime = 0;
        }
    } else {
        aiState.isPeeking = false;
        aiState.peekStartTime = 0;
    }

    if (targetDistance < 10) {
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = aiState.spriteWorldPos.x + randomDirX * enemySpeed;
    let newZ = aiState.spriteWorldPos.z + randomDirZ * enemySpeed;

    const mapWidth = currentMap[0].length;
    const mapHeight = currentMap.length;
    const minX = Math.floor((newX - enemyRadius) / tileSectors);
    const maxX = Math.floor((newX + enemyRadius) / tileSectors);
    const minZ = Math.floor((newZ - enemyRadius) / tileSectors);
    const maxZ = Math.floor((newZ + enemyRadius) / tileSectors);

    let collisionX = false;
    let collisionZ = false;

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = currentMap[z][x];
                if (tile.type === "wall") {
                    const tileLeft = x * tileSectors;
                    const tileRight = (x + 1) * tileSectors;
                    const tileTop = z * tileSectors;
                    const tileBottom = (z + 1) * tileSectors;

                    if (newX + enemyRadius > tileLeft && (aiState.previousPos?.x ?? newX) + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && (aiState.previousPos?.x ?? newX) - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && (aiState.previousPos?.z ?? newZ) + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && (aiState.previousPos?.z ?? newZ) - enemyRadius >= tileBottom) {
                        newZ = tileBottom + enemyRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    if (!collisionX) {
        aiState.spriteWorldPos.x = newX;
    }

    if (!collisionZ) {
        aiState.spriteWorldPos.z = newZ;
    }

    placeholderSprite.worldPos.x = aiState.spriteWorldPos.x;
    placeholderSprite.worldPos.z = aiState.spriteWorldPos.z;

    aiState.previousPos = { x: aiState.spriteWorldPos.x, z: aiState.spriteWorldPos.z };

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    aiState.spriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, aiState.spriteWorldPos.x));
    aiState.spriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, aiState.spriteWorldPos.z));

    placeholderSprite.worldPos.x = aiState.spriteWorldPos.x;
    placeholderSprite.worldPos.z = aiState.spriteWorldPos.z;
}