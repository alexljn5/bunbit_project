import { playerPosition, playerHealth } from "../playerdata/playerlogic.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "./aihandler.js";
import { casperLesserDemonDeathScreen } from "../events/map_01_events.js";

import { mapHandler } from "../mapdata/maphandler.js";

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
    if (!casperSprite?.worldPos) {
        console.log("Casper Lesser Demon sprite or worldPos not found!");
        return;
    }

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

    const dx = playerPosition.x - casperSprite.worldPos.x;
    const dz = playerPosition.z - casperSprite.worldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        // Deal damage to player
        playerHealth.playerHealth = Math.max(0, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;

        // Check if player died
        if (playerHealth.playerHealth <= 0) {
            casperLesserDemonDeathScreen();
        }
    }

    // Use current map grid from mapHandler
    const currentMap = mapHandler.getFullMap();
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0]) return;

    const isOccluded = isOccludedByWall(
        casperSprite.worldPos.x,
        casperSprite.worldPos.z,
        playerPosition.x,
        playerPosition.z,
        currentMap,
        tileSectors
    );

    const steps = Math.ceil(distance / tileSectors);
    let nearestWallDistance = Infinity;
    let nearestWallPos = null;
    let isHalfwayBehindWall = false;

    for (let i = 0; i <= steps; i++) { /* ...existing code... */ }

    const cellX = Math.floor(casperSprite.worldPos.x / tileSectors);
    const cellZ = Math.floor(casperSprite.worldPos.z / tileSectors);
    let adjacentWalls = 0;
    const directions = [
        { dx: 0, dz: -1 },
        { dx: 0, dz: 1 },
        { dx: -1, dz: 0 },
        { dx: 1, dz: 0 },
    ];
    for (const dir of directions) { /* ...existing code... */ }

    if (!isOccluded && distance < visionRange) { /* ...existing code... */ } else { /* ...existing code... */ }

    const targetX = canSeePlayer ? playerPosition.x : lastKnownPlayerPos.x;
    const targetZ = canSeePlayer ? playerPosition.z : lastKnownPlayerPos.z;
    const targetDx = targetX - casperSprite.worldPos.x;
    const targetDz = targetZ - casperSprite.worldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (isHalfwayBehindWall && !canSeePlayer && targetDistance > hitRadius) { /* ...existing code... */ } else { /* ...existing code... */ }

    if (targetDistance < 10) { /* ...existing code... */ }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = casperSprite.worldPos.x + randomDirX * enemySpeed;
    let newZ = casperSprite.worldPos.z + randomDirZ * enemySpeed;

    const mapWidth = currentMap[0].length;
    const mapHeight = currentMap.length;
    const minX = Math.floor((newX - enemyRadius) / tileSectors);
    const maxX = Math.floor((newX + enemyRadius) / tileSectors);
    const minZ = Math.floor((newZ - enemyRadius) / tileSectors);
    const maxZ = Math.floor((newZ + enemyRadius) / tileSectors);

    let collisionX = false;
    let collisionZ = false;

    for (let x = minX; x <= maxX; x++) { /* ...existing code... */ }

    if (!collisionX) { /* ...existing code... */ }
    if (!collisionZ) { /* ...existing code... */ }

    casperSprite.worldPos.x = newX;
    casperSprite.worldPos.z = newZ;

}