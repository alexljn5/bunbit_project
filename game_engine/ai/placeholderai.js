import { playerPosition, playerHealth, keys } from "../playerdata/playerlogic.js";
import { placeholderAISpriteWorldPos, placeholderAiSprite } from "../rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "./aihandler.js";
import { renderEngine } from "../renderengine.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../globals.js";
import { genericGunAmmo } from "../itemhandler/gunhandler.js";
import { drawAIHealthBar } from "./aihandler.js";

// Placeholder AI logic with health bar and damage handling
export let placeholderAIPreviousPos = { x: placeholderAISpriteWorldPos.x, z: placeholderAISpriteWorldPos.z };
export let lastKnownPlayerPos = null;
export let canSeePlayer = true;
export let isPeeking = false;
export let peekStartTime = 0;
export let placeholderAIHealth = 100; // Starting health
const damagePerSecond = 100; // Player damage per second (from AI attack)
const hitCooldown = 1000; // 1 second between AI hits on player
const hitRadius = 20; // Distance for AI to hit player
const gunDamage = 20; // Damage per gun shot
const meleeDamage = 10; // Damage per metal pipe hit
const meleeRange = 30; // Range for melee attack
let lastHitTime = 0; // Cooldown for AI hitting player
let lastPlayerAttackTime = 0; // Cooldown for player attacks
const attackCooldown = 500; // 0.5 seconds between player attacks

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
    // Placeholder death event (replace with actual event from map_01_events.js)
    renderEngine.fillStyle = "rgba(255, 0, 0, 0.5)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.fillStyle = "white";
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Placeholder AI Defeated!", CANVAS_WIDTH / 2 - 100 * SCALE_X, CANVAS_HEIGHT / 2);
    // Optionally stop AI updates or remove sprite
    placeholderAISpriteWorldPos.x = -9999; // Move off-screen (temporary)
}

function handlePlayerAttack() {
    const now = performance.now();
    if (now - lastPlayerAttackTime < attackCooldown) return;

    const dx = playerPosition.x - placeholderAISpriteWorldPos.x;
    const dz = playerPosition.z - placeholderAISpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if player is attacking (Space key, assuming isAttackKeyPressed returns true)
    const isAttacking = keys[" "];
    if (!isAttacking) return;

    // Check inventory and apply damage
    警方
    if (playerInventory.includes("generic_gun") && distance < 200) { // Gun range
        setPlaceholderAIHealth(placeholderAIHealth - gunDamage);
        console.log(`Shot Placeholder AI! Health: ${placeholderAIHealth}`);
        lastPlayerAttackTime = now;
    } else if (playerInventory.includes("metal_pipe") && distance < meleeRange) { // Melee range
        setPlaceholderAIHealth(placeholderAIHealth - meleeDamage);
        console.log(`Hit Placeholder AI with metal pipe! Health: ${placeholderAIHealth}`);
        lastPlayerAttackTime = now;
    }
}

export function placeholderAIGodFunction() {
    if (placeholderAIHealth > 0) {
        placeholderAI();
        handlePlayerAttack();
        drawAIHealthBar(
            placeholderAISpriteWorldPos.x,
            placeholderAISpriteWorldPos.z,
            placeholderAIHealth,
            {
                renderEngine,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
                SCALE_X,
                SCALE_Y,
                spriteHeight: 128 * SCALE_Y,
                barHeight: 8 * SCALE_Y,
                playerPosition: {
                    x: playerPosition.x,
                    z: playerPosition.z,
                    angle: playerPosition.angle // Ensure angle is passed
                },
                playerFOV: Math.PI / 3,
                occlusionCheck: () => isOccludedByWall(
                    placeholderAISpriteWorldPos.x,
                    placeholderAISpriteWorldPos.z,
                    playerPosition.x,
                    playerPosition.z,
                    map_01,
                    tileSectors
                )
            }
        );
    }
}

export function placeholderAI() {
    if (!lastKnownPlayerPos) {
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
    }

    const enemySpeed = 0.2; // Slower speed for sneaky stalking
    const randomFactor = 0.1; // Less randomness for deliberate movement
    const enemyRadius = 10;
    const buffer = 0.3;
    const visionRange = 400; // Slightly shorter vision for sneaky vibe
    const peekDistance = 50; // Distance to check for nearby walls
    const peekDelay = 2000; // 2 seconds to peek

    const dx = playerPosition.x - placeholderAISpriteWorldPos.x;
    const dz = playerPosition.z - placeholderAISpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check for collision and apply damage to player
    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(0, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;
        console.log(`Placeholder AI hit player! Player Health: ${playerHealth.playerHealth}`);
    }

    // Check for occlusion
    const isOccluded = isOccludedByWall(
        placeholderAISpriteWorldPos.x,
        placeholderAISpriteWorldPos.z,
        playerPosition.x,
        playerPosition.z,
        map_01,
        tileSectors
    );

    // Line-of-sight check
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
        lastKnownPlayerPos.x = playerPosition.x;
        lastKnownPlayerPos.z = playerPosition.z;
        canSeePlayer = true;
    } else {
        canSeePlayer = false;
    }

    // Determine target position
    const targetX = canSeePlayer ? playerPosition.x : lastKnownPlayerPos.x;
    const targetZ = canSeePlayer ? playerPosition.z : lastKnownPlayerPos.z;
    const targetDx = targetX - placeholderAISpriteWorldPos.x;
    const targetDz = targetZ - placeholderAISpriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    // Peeking logic: Pause if halfway behind a wall and player is not visible
    if (isHalfwayBehindWall && !canSeePlayer && targetDistance > hitRadius) {
        if (!isPeeking) {
            isPeeking = true;
            peekStartTime = performance.now();
        }
        const elapsedPeekTime = performance.now() - peekStartTime;
        if (elapsedPeekTime < peekDelay) {
            console.log("Placeholder AI is peeking halfway behind a wall!");
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
        console.log("Placeholder AI reached target, pausing");
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

                    if (newX + enemyRadius > tileLeft && placeholderAIPreviousPos.x + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && placeholderAIPreviousPos.x - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && placeholderAIPreviousPos.z + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && placeholderAIPreviousPos.z - enemyRadius >= tileBottom) {
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

    placeholderAIPreviousPos.x = placeholderAISpriteWorldPos.x;
    placeholderAIPreviousPos.z = placeholderAISpriteWorldPos.z;

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    placeholderAISpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, placeholderAISpriteWorldPos.x));
    placeholderAISpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, placeholderAISpriteWorldPos.z));
}