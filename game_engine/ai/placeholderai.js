import { playerPosition, playerHealth, keys } from "../playerdata/playerlogic.js";
import { spriteManager, placeholderAISpriteWorldPos, placeholderAiSprite } from "../rendering/sprites/rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "./aihandler.js";
import { renderEngine } from "../rendering/renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../globals.js";

// Placeholder AI logic with health bar and damage handling
export let placeholderAIPreviousPos = null;
export let lastKnownPlayerPos = null;
export let canSeePlayer = true;
export let isPeeking = false;
export let peekStartTime = 0;
export let placeholderAIHealth = 100;
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

export function setPlaceholderAIHealth(value) {
    placeholderAIHealth = Math.max(0, Math.min(100, value));
    if (placeholderAIHealth === 0) {
        console.log("Placeholder AI defeated!");
        triggerPlaceholderAIDeath();
    }
}

function triggerPlaceholderAIDeath() {
    renderEngine.fillStyle = "rgba(255, 0, 0, 0.5)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.fillStyle = "white";
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Placeholder AI Defeated!", CANVAS_WIDTH / 2 - 100 * SCALE_X, CANVAS_HEIGHT / 2);
    if (placeholderAISpriteWorldPos) {
        placeholderAISpriteWorldPos.x = -9999;
    }
    const placeholderSprite = spriteManager.getSprite("placeholderAI");
    if (placeholderSprite && placeholderSprite.worldPos) {
        placeholderSprite.worldPos.x = -9999;
    }
}

function handlePlayerAttack() {
    const now = performance.now();
    if (now - lastPlayerAttackTime < attackCooldown) return;

    const placeholderSprite = spriteManager.getSprite("placeholderAI");
    if (!placeholderSprite || !placeholderSprite.worldPos || !placeholderAISpriteWorldPos) {
        console.log("PlaceholderAI sprite not found or missing worldPos!");
        return;
    }

    const dx = playerPosition.x - placeholderAISpriteWorldPos.x;
    const dz = playerPosition.z - placeholderAISpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const isAttacking = keys[" "];
    if (!isAttacking) return;

    if (playerInventory.includes("generic_gun") && distance <= 100) {
        setPlaceholderAIHealth(placeholderAIHealth - gunDamage);
        console.log(`Player shot Placeholder AI! Health: ${placeholderAIHealth}`);
        lastPlayerAttackTime = now;
    } else if (playerInventory.includes("metal_pipe") && distance <= meleeRange) {
        setPlaceholderAIHealth(placeholderAIHealth - meleeDamage);
        console.log(`Player hit Placeholder AI with metal pipe! Health: ${placeholderAIHealth}`);
        lastPlayerAttackTime = now;
    }
}

export function placeholderAIGodFunction() {
    if (placeholderAIHealth > 0) {
        placeholderAI();
        handlePlayerAttack();
    }
}

export function placeholderAI() {
    const placeholderSprite = spriteManager.getSprite("placeholderAI");
    if (!placeholderSprite || !placeholderSprite.worldPos) {
        console.log("Placeholder AI sprite not found or missing worldPos!");
        return;
    }

    if (placeholderAISpriteWorldPos === null) {
        placeholderAISpriteWorldPos = { x: placeholderSprite.worldPos.x, z: placeholderSprite.worldPos.z };
    }

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

    const isOccluded = isOccludedByWall(
        placeholderAISpriteWorldPos.x,
        placeholderAISpriteWorldPos.z,
        playerPosition.x,
        playerPosition.z,
        map_01,
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
        if (cellX >= 0 && cellX < map_01[0].length && cellZ >= 0 && cellZ < map_01.length) {
            if (map_01[cellZ][cellX].type === "wall") {
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

    const mapWidth = map_01[0].length;
    const mapHeight = map_01.length;
    const minX = Math.floor((newX - enemyRadius) / tileSectors);
    const maxX = Math.floor((newX + enemyRadius) / tileSectors);
    const minZ = Math.floor((newZ - enemyRadius) / tileSectors);
    const maxZ = Math.floor((newZ + enemyRadius) / tileSectors);

    let collisionX = false;
    let collisionZ = false;

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
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