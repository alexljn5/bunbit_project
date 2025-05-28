// In enemyai.js
import { playerPosition, playerHealth } from "../playerdata/playerlogic.js";
import { boyKisserEnemySpriteWorldPos, casperLesserDemonSpriteWorldPos } from "../rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { testFuckingAround } from "../raycasting.js";

let boyKisserPreviousPos = { x: boyKisserEnemySpriteWorldPos.x, z: boyKisserEnemySpriteWorldPos.z };
let casperLesserDemonPreviousPos = { x: casperLesserDemonSpriteWorldPos.x, z: casperLesserDemonSpriteWorldPos.z }
let lastKnownPlayerPos = null;
let canSeePlayer = true;
const damagePerSecond = 100; // Health lost per second
let lastHitTime = 0;
const hitCooldown = 1000; // 1 second between hits
const hitRadius = 20; // Distance for a "hit"

export function enemyAiGodFunction() {
    testEnemyAi();
    casperLesserDemon();
}

//Follows you Demon
function testEnemyAi() {
    if (!lastKnownPlayerPos) {
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
    }

    const enemySpeed = 0.3 * 2;
    const randomFactor = 0.2;
    const enemyRadius = 10;
    const buffer = 0.3;
    const visionRange = 500;

    const dx = playerPosition.x - boyKisserEnemySpriteWorldPos.x;
    const dz = playerPosition.z - boyKisserEnemySpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check for collision and apply damage
    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(100, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;
        console.log(`BoyKisser hit player! Health: ${playerHealth.playerHealth}`);
        testFuckingAround();
    }

    const steps = Math.ceil(distance / tileSectors);
    let isOccluded = false;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = boyKisserEnemySpriteWorldPos.x + t * dx;
        const checkZ = boyKisserEnemySpriteWorldPos.z + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < map_01[0].length && cellZ >= 0 && cellZ < map_01.length) {
            if (map_01[cellZ][cellX].type === "wall") {
                isOccluded = true;
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

    const targetX = canSeePlayer ? playerPosition.x : lastKnownPlayerPos.x;
    const targetZ = canSeePlayer ? playerPosition.z : lastKnownPlayerPos.z;
    const targetDx = targetX - boyKisserEnemySpriteWorldPos.x;
    const targetDz = targetZ - boyKisserEnemySpriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (targetDistance < 10) {
        console.log("BoyKisser reached target, pausing");
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = boyKisserEnemySpriteWorldPos.x + randomDirX * enemySpeed;
    let newZ = boyKisserEnemySpriteWorldPos.z + randomDirZ * enemySpeed;

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

                    if (newX + enemyRadius > tileLeft && boyKisserPreviousPos.x + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && boyKisserPreviousPos.x - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && boyKisserPreviousPos.z + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && boyKisserPreviousPos.z - enemyRadius >= tileBottom) {
                        newZ = tileBottom + enemyRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    if (!collisionX) {
        boyKisserEnemySpriteWorldPos.x = newX;
    }
    if (!collisionZ) {
        boyKisserEnemySpriteWorldPos.z = newZ;
    }

    boyKisserPreviousPos.x = boyKisserEnemySpriteWorldPos.x;
    boyKisserPreviousPos.z = boyKisserEnemySpriteWorldPos.z;

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    boyKisserEnemySpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, boyKisserEnemySpriteWorldPos.x));
    boyKisserEnemySpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, boyKisserEnemySpriteWorldPos.z));

    console.log(`BoyKisser moved to: x=${boyKisserEnemySpriteWorldPos.x.toFixed(2)}, z=${boyKisserEnemySpriteWorldPos.z.toFixed(2)}, targetDistance=${targetDistance.toFixed(2)}, canSeePlayer=${canSeePlayer}`);
}

//Stalker Demon
function casperLesserDemon() {
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
    let peekStartTime = 0; // Store peek start time
    let isPeeking = false;

    const dx = playerPosition.x - casperLesserDemonSpriteWorldPos.x;
    const dz = playerPosition.z - casperLesserDemonSpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check for collision and apply damage
    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(0, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;
        console.log(`Casper hit player! Health: ${playerHealth.playerHealth}`);
    }

    // Line-of-sight check
    const steps = Math.ceil(distance / tileSectors);
    let isOccluded = false;
    let nearestWallDistance = Infinity;
    let nearestWallPos = null;
    let isHalfwayBehindWall = false;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = casperLesserDemonSpriteWorldPos.x + t * dx;
        const checkZ = casperLesserDemonSpriteWorldPos.z + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < map_01[0].length && cellZ >= 0 && cellZ < map_01.length) {
            if (map_01[cellZ][cellX].type === "wall") {
                isOccluded = true;
                const wallDist = Math.sqrt(
                    (checkX - casperLesserDemonSpriteWorldPos.x) ** 2 +
                    (checkZ - casperLesserDemonSpriteWorldPos.z) ** 2
                );
                if (wallDist < nearestWallDistance) {
                    nearestWallDistance = wallDist;
                    nearestWallPos = { x: checkX, z: checkZ };
                }
                break;
            }
        }
    }

    // Check if Casper is halfway behind a wall
    const cellX = Math.floor(casperLesserDemonSpriteWorldPos.x / tileSectors);
    const cellZ = Math.floor(casperLesserDemonSpriteWorldPos.z / tileSectors);
    let adjacentWalls = 0;
    const directions = [
        { dx: 0, dz: -1 }, // Up
        { dx: 0, dz: 1 },  // Down
        { dx: -1, dz: 0 }, // Left
        { dx: 1, dz: 0 },  // Right
    ];
    for (const dir of directions) {
        const checkX = cellX + dir.dx;
        const checkZ = cellZ + dir.dz;
        if (checkX >= 0 && checkX < map_01[0].length && checkZ >= 0 && checkZ < map_01.length) {
            if (map_01[checkZ][checkX].type === "wall") {
                adjacentWalls++;
                // Check if Casper is close to the wall's edge (within peekDistance)
                const wallEdgeX = (dir.dx === 0 ? cellX : checkX) * tileSectors + (dir.dx > 0 ? tileSectors : 0);
                const wallEdgeZ = (dir.dz === 0 ? cellZ : checkZ) * tileSectors + (dir.dz > 0 ? tileSectors : 0);
                const distToEdge = Math.sqrt(
                    (casperLesserDemonSpriteWorldPos.x - wallEdgeX) ** 2 +
                    (casperLesserDemonSpriteWorldPos.z - wallEdgeZ) ** 2
                );
                if (distToEdge < peekDistance) {
                    isHalfwayBehindWall = true;
                }
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
    const targetDx = targetX - casperLesserDemonSpriteWorldPos.x;
    const targetDz = targetZ - casperLesserDemonSpriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    // Peeking logic: Pause if halfway behind a wall and player is not visible
    if (isHalfwayBehindWall && !canSeePlayer && targetDistance > hitRadius) {
        if (!isPeeking) {
            isPeeking = true;
            peekStartTime = performance.now(); // Start peeking timer
        }
        const elapsedPeekTime = performance.now() - peekStartTime;
        if (elapsedPeekTime < peekDelay) {
            console.log("Casper is peeking halfway behind a wall!");
            return; // Pause movement while peeking
        } else {
            isPeeking = false;
            peekStartTime = 0; // Reset peek timer
        }
    } else {
        isPeeking = false;
        peekStartTime = 0; // Reset if not peeking
    }

    if (targetDistance < 10) {
        console.log("Casper reached target, pausing");
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = casperLesserDemonSpriteWorldPos.x + randomDirX * enemySpeed;
    let newZ = casperLesserDemonSpriteWorldPos.z + randomDirZ * enemySpeed;

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

                    if (newX + enemyRadius > tileLeft && casperLesserDemonPreviousPos.x + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && casperLesserDemonPreviousPos.x - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && casperLesserDemonPreviousPos.z + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && casperLesserDemonPreviousPos.z - enemyRadius >= tileBottom) {
                        newZ = tileBottom + enemyRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    if (!collisionX) {
        casperLesserDemonSpriteWorldPos.x = newX;
    }

    if (!collisionZ) {
        casperLesserDemonSpriteWorldPos.z = newZ;
    }

    casperLesserDemonPreviousPos.x = casperLesserDemonSpriteWorldPos.x;
    casperLesserDemonPreviousPos.z = casperLesserDemonSpriteWorldPos.z;

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    casperLesserDemonSpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, casperLesserDemonSpriteWorldPos.x));
    casperLesserDemonSpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, casperLesserDemonSpriteWorldPos.z));

    console.log(`Casper moved to: x=${casperLesserDemonSpriteWorldPos.x.toFixed(2)}, z=${casperLesserDemonSpriteWorldPos.z.toFixed(2)}, targetDistance=${targetDistance.toFixed(2)}, canSeePlayer=${canSeePlayer}, isPeeking=${isPeeking}, isHalfwayBehindWall=${isHalfwayBehindWall}`);
}