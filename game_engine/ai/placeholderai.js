import { playerPosition, playerHealth, keys } from "../playerdata/playerlogic.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "./aihandler.js";
import { renderEngine } from "../rendering/renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { placeholderAIHealth, placeholderAIHealthBar } from "./airegistry.js";
import { mapHandler } from "../mapdata/maphandler.js";

// Placeholder AI logic with health bar and damage handling
export let placeholderAIPreviousPos = null;
export let lastKnownPlayerPos = null;
export let canSeePlayer = true;
export let isPeeking = false;
export let peekStartTime = 0;
let placeholderAISpriteWorldPos = null;
const damagePerSecond = 100;
const hitCooldown = 1000;
const hitRadius = 20;
const gunDamage = 20;
const meleeDamage = 10;
const meleeRange = 30;
let lastHitTime = 0;
let lastPlayerAttackTime = 0;
const attackCooldown = 500;

export function setCanSeePlayer(value) {
    canSeePlayer = value;
}

export function setIsPeeking(value) {
    isPeeking = value;
}

export function setPeekStartTime(value) {
    peekStartTime = value;
}

export function placeholderAIGodFunction() {
    if (placeholderAIHealth.value > 0) {
        placeholderAI();
    }
}

export function placeholderAI() {
    const placeholderSprite = spriteManager.getSprite("placeholderAI");
    if (!placeholderSprite) {
        console.log("Placeholder AI sprite not found!");
        return;
    }

    // Always use the sprite's current worldPos for this map
    if (!placeholderSprite.worldPos) {
        console.log("Placeholder AI sprite missing worldPos!");
        return;
    }
    placeholderAISpriteWorldPos = placeholderSprite.worldPos;

    // Draw the health bar
    placeholderAIHealthBar();
    const enemySpeed = 0.2;
    const randomFactor = 0.1;
    const enemyRadius = 10;
    const buffer = 0.3;
    const visionRange = 400;
    const peekDistance = 50;
    const peekDelay = 2000;

    const dx = playerPosition.x - placeholderAISpriteWorldPos.x;
    const dz = playerPosition.z - placeholderAISpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(0, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;
        console.log(`Placeholder AI hit player! Player Health: ${playerHealth.playerHealth}`);
    }

    // Use current map grid from mapHandler
    const currentMap = mapHandler.getFullMap();
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0]) {
        return;
    }

    const isOccluded = isOccludedByWall(
        placeholderAISpriteWorldPos.x,
        placeholderAISpriteWorldPos.z,
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
        const checkX = placeholderAISpriteWorldPos.x + t * dx;
        const checkZ = placeholderAISpriteWorldPos.z + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < currentMap[0].length && cellZ >= 0 && cellZ < currentMap.length) {
            if (currentMap[cellZ][cellX].type === "wall") {
                const wallDist = Math.sqrt(
                    (checkX - placeholderAISpriteWorldPos.x) ** 2 +
                    (checkZ - placeholderAISpriteWorldPos.z) ** 2
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
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
        canSeePlayer = true;
    } else {
        canSeePlayer = false;
    }

    const targetX = canSeePlayer ? playerPosition.x : (lastKnownPlayerPos?.x || placeholderAISpriteWorldPos.x);
    const targetZ = canSeePlayer ? playerPosition.z : (lastKnownPlayerPos?.z || placeholderAISpriteWorldPos.z);
    const targetDx = targetX - placeholderAISpriteWorldPos.x;
    const targetDz = targetZ - placeholderAISpriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (isHalfwayBehindWall && !canSeePlayer && targetDistance > hitRadius) {
        if (!isPeeking) {
            isPeeking = true;
            peekStartTime = performance.now();
        }
        const elapsedPeekTime = performance.now() - peekStartTime;
        if (elapsedPeekTime < peekDelay) {
            return;
        } else {
            isPeeking = false;
            peekStartTime = 0;
        }
    } else {
        isPeeking = false;
        peekStartTime = 0;
    }

    if (targetDistance < 10) {
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = placeholderAISpriteWorldPos.x + randomDirX * enemySpeed;
    let newZ = placeholderAISpriteWorldPos.z + randomDirZ * enemySpeed;

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

                    if (newX + enemyRadius > tileLeft && (placeholderAIPreviousPos?.x ?? newX) + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && (placeholderAIPreviousPos?.x ?? newX) - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && (placeholderAIPreviousPos?.z ?? newZ) + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && (placeholderAIPreviousPos?.z ?? newZ) - enemyRadius >= tileBottom) {
                        newZ = tileBottom + enemyRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    if (!collisionX) {
        placeholderAISpriteWorldPos.x = newX;
    }

    if (!collisionZ) {
        placeholderAISpriteWorldPos.z = newZ;
    }

    placeholderSprite.worldPos.x = placeholderAISpriteWorldPos.x;
    placeholderSprite.worldPos.z = placeholderAISpriteWorldPos.z;

    placeholderAIPreviousPos = { x: placeholderAISpriteWorldPos.x, z: placeholderAISpriteWorldPos.z };

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    placeholderAISpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, placeholderAISpriteWorldPos.x));
    placeholderAISpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, placeholderAISpriteWorldPos.z));

    placeholderSprite.worldPos.x = placeholderAISpriteWorldPos.x;
    placeholderSprite.worldPos.z = placeholderAISpriteWorldPos.z;
}