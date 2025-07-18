import { playerPosition, playerHealth } from "../playerdata/playerlogic.js";
import { casperLesserDemonSpriteWorldPos, spriteManager } from "../rendering/sprites/rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "./aihandler.js";
import { casperLesserDemonDeathScreen } from "../events/map_01_events.js";

export let casperLesserDemonPreviousPos = null; // Initialize as null, set in AI
export let lastKnownPlayerPos = null;
export let canSeePlayer = true;
export let isPeeking = false;
export let peekStartTime = 0;
const damagePerSecond = 100;
let lastHitTime = 0;
const hitCooldown = 1000;
const hitRadius = 20;

export function setCanSeePlayer(value) {
    canSeePlayer = value;
}

export function setIsPeeking(value) {
    isPeeking = value;
}

export function setPeekStartTime(value) {
    peekStartTime = value;
}

export function casperLesserDemon() {
    const casperSprite = spriteManager.getSprite("casperLesserDemon");
    if (!casperSprite || !casperSprite.worldPos) {
        console.log("Casper Lesser Demon sprite not found or missing worldPos!");
        return;
    }

    // Initialize casperLesserDemonSpriteWorldPos if null
    if (casperLesserDemonSpriteWorldPos === null) {
        casperLesserDemonSpriteWorldPos = { x: casperSprite.worldPos.x, z: casperSprite.worldPos.z };
    }

    // Sync casperLesserDemonSpriteWorldPos with SpriteManager's worldPos
    casperLesserDemonSpriteWorldPos.x = casperSprite.worldPos.x;
    casperLesserDemonSpriteWorldPos.z = casperSprite.worldPos.z;

    if (!lastKnownPlayerPos) {
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
    }

    if (!casperLesserDemonPreviousPos) {
        casperLesserDemonPreviousPos = { x: casperSprite.worldPos.x, z: casperSprite.worldPos.z };
    }

    const enemySpeed = 0.2;
    const randomFactor = 0.1;
    const enemyRadius = 10;
    const buffer = 0.3;
    const visionRange = 400;
    const peekDistance = 50;
    const peekDelay = 2000;

    const dx = playerPosition.x - casperLesserDemonSpriteWorldPos.x;
    const dz = playerPosition.z - casperLesserDemonSpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(0, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;
        console.log(`Casper hit player! Health: ${playerHealth.playerHealth}`);
        casperLesserDemonDeathScreen();
    }

    const isOccluded = isOccludedByWall(
        casperLesserDemonSpriteWorldPos.x,
        casperLesserDemonSpriteWorldPos.z,
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
        const checkX = casperLesserDemonSpriteWorldPos.x + t * dx;
        const checkZ = casperLesserDemonSpriteWorldPos.z + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < map_01[0].length && cellZ >= 0 && cellZ < map_01.length) {
            if (map_01[cellZ][cellX].type === "wall") {
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

    const cellX = Math.floor(casperLesserDemonSpriteWorldPos.x / tileSectors);
    const cellZ = Math.floor(casperLesserDemonSpriteWorldPos.z / tileSectors);
    let adjacentWalls = 0;
    const directions = [
        { dx: 0, dz: -1 },
        { dx: 0, dz: 1 },
        { dx: -1, dz: 0 },
        { dx: 1, dz: 0 },
    ];
    for (const dir of directions) {
        const checkX = cellX + dir.dx;
        const checkZ = cellZ + dir.dz;
        if (checkX >= 0 && checkX < map_01[0].length && checkZ >= 0 && checkZ < map_01.length) {
            if (map_01[checkZ][checkX].type === "wall") {
                adjacentWalls++;
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

    const targetX = canSeePlayer ? playerPosition.x : lastKnownPlayerPos.x;
    const targetZ = canSeePlayer ? playerPosition.z : lastKnownPlayerPos.z;
    const targetDx = targetX - casperLesserDemonSpriteWorldPos.x;
    const targetDz = targetZ - casperLesserDemonSpriteWorldPos.z;
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

    casperSprite.worldPos.x = casperLesserDemonSpriteWorldPos.x;
    casperSprite.worldPos.z = casperLesserDemonSpriteWorldPos.z;

    casperLesserDemonPreviousPos.x = casperLesserDemonSpriteWorldPos.x;
    casperLesserDemonPreviousPos.z = casperLesserDemonSpriteWorldPos.z;

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    casperLesserDemonSpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, casperLesserDemonSpriteWorldPos.x));
    casperLesserDemonSpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, casperLesserDemonSpriteWorldPos.z));

    casperSprite.worldPos.x = casperLesserDemonSpriteWorldPos.x;
    casperSprite.worldPos.z = casperLesserDemonSpriteWorldPos.z;
}