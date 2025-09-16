import { tileSectors } from "../mapdata/maps.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { playerPosition, previousPosition, keys } from "../playerdata/playerlogic.js";
import { map_01 } from "../mapdata/map_01.js";

export function wallCollision(isSprinting, playerMovementSpeed, deltaTime) {
    // Use mapHandler to get the current map's grid, fallback to map_01 for map_01
    const mapKey = mapHandler.activeMapKey || "map_01";
    const activeSector = mapHandler.getFullMap(mapKey) || (mapKey === "map_01" ? map_01 : null);

    // Validate the active sector
    if (!activeSector || !Array.isArray(activeSector) || !activeSector[0] || !Array.isArray(activeSector[0])) {
        console.error(`Invalid map data for ${mapKey} in wallCollision! ActiveSector:`, activeSector,
            `Falling back to map_01 if available.`);
        if (mapKey === "map_01" && map_01 && Array.isArray(map_01) && map_01[0] && Array.isArray(map_01[0])) {
            return wallCollisionWithMap(map_01, isSprinting, playerMovementSpeed, deltaTime);
        }
        console.error(`No valid map data for ${mapKey}, skipping collision detection. *pouts*`);
        return;
    }

    return wallCollisionWithMap(activeSector, isSprinting, playerMovementSpeed, deltaTime);
}

function wallCollisionWithMap(activeSector, isSprinting, playerMovementSpeed, deltaTime) {
    const mapHeight = activeSector.length;
    const mapWidth = activeSector[0].length;
    const playerRadius = 10;
    const buffer = 0.2; // Increased buffer to prevent sticking
    const epsilon = 0.01;

    // Cap movement delta to prevent tunneling
    const maxStep = playerMovementSpeed * (isSprinting ? 2 : 1) * deltaTime;
    let deltaX = playerPosition.x - previousPosition.x;
    let deltaZ = playerPosition.z - previousPosition.z;
    const deltaLength = Math.hypot(deltaX, deltaZ);
    if (deltaLength > maxStep) {
        deltaX = (deltaX / deltaLength) * maxStep;
        deltaZ = (deltaZ / deltaLength) * maxStep;
    }

    const proposedX = previousPosition.x + deltaX;
    const proposedZ = previousPosition.z + deltaZ;

    let newX = proposedX;
    let newZ = proposedZ;
    let collision = false;

    const xMin = Math.floor((proposedX - playerRadius - epsilon) / tileSectors);
    const xMax = Math.floor((proposedX + playerRadius + epsilon) / tileSectors);
    const zMin = Math.floor((proposedZ - playerRadius - epsilon) / tileSectors);
    const zMax = Math.floor((proposedZ + playerRadius + epsilon) / tileSectors);

    const normalX = { value: 0 };
    const normalZ = { value: 0 };

    for (let x = xMin; x <= xMax; x++) {
        for (let z = zMin; z <= zMax; z++) {
            if (x < 0 || x >= mapWidth || z < 0 || z >= mapHeight) continue;
            const tile = activeSector[z][x];
            if (!tile || tile.type !== "wall") continue;

            const tileLeft = x * tileSectors;
            const tileRight = (x + 1) * tileSectors;
            const tileTop = z * tileSectors;
            const tileBottom = (z + 1) * tileSectors;

            const closestX = Math.max(tileLeft, Math.min(proposedX, tileRight));
            const closestZ = Math.max(tileTop, Math.min(proposedZ, tileBottom));
            const dx = proposedX - closestX;
            const dz = proposedZ - closestZ;
            const distance = Math.hypot(dx, dz);

            if (distance < playerRadius + epsilon) {
                collision = true;
                const overlap = playerRadius - distance;
                if (distance > 0) {
                    normalX.value += dx / distance;
                    normalZ.value += dz / distance;
                } else {
                    normalX.value += deltaX !== 0 ? -Math.sign(deltaX) : 0;
                    normalZ.value += deltaZ !== 0 ? -Math.sign(deltaZ) : 0;
                }
            }
        }
    }

    if (collision) {
        const normalLength = Math.hypot(normalX.value, normalZ.value);
        if (normalLength > 0) {
            normalX.value /= normalLength;
            normalZ.value /= normalLength;
        }

        let minOverlap = playerRadius + buffer;
        for (let x = xMin; x <= xMax; x++) {
            for (let z = zMin; z <= zMax; z++) {
                if (x < 0 || x >= mapWidth || z < 0 || z >= mapHeight) continue;
                const tile = activeSector[z][x];
                if (!tile || tile.type !== "wall") continue;
                const tileLeft = x * tileSectors;
                const tileRight = (x + 1) * tileSectors;
                const tileTop = z * tileSectors;
                const tileBottom = (z + 1) * tileSectors;
                const closestX = Math.max(tileLeft, Math.min(proposedX, tileRight));
                const closestZ = Math.max(tileTop, Math.min(proposedZ, tileBottom));
                const dx = proposedX - closestX;
                const dz = proposedZ - closestZ;
                const distance = Math.hypot(dx, dz);
                if (distance < playerRadius + epsilon) {
                    const overlap = playerRadius + buffer - distance;
                    if (overlap < minOverlap) minOverlap = overlap;
                }
            }
        }

        newX += normalX.value * minOverlap;
        newZ += normalZ.value * minOverlap;

        const dot = deltaX * normalX.value + deltaZ * normalZ.value;
        if (dot < 0) {
            let slideX = deltaX - dot * normalX.value;
            let slideZ = deltaZ - dot * normalZ.value;
            const slideLength = Math.hypot(slideX, slideZ);
            if (slideLength > 0) {
                const speed = playerMovementSpeed * (isSprinting ? 2 : 1) * (keys.shift ? 0.5 : 1) * deltaTime;
                slideX = (slideX / slideLength) * speed;
                slideZ = (slideZ / slideLength) * speed;
                newX += slideX;
                newZ += slideZ;
            }
        }
    }

    playerPosition.x = newX;
    playerPosition.z = newZ;
    previousPosition.x = newX;
    previousPosition.z = newZ;
}

export function collissionGodFunction() {
    const isSprinting = keys["Shift"] || false;
    const playerMovementSpeed = 50; // Adjust as needed
    const deltaTime = window.deltaTime || 1 / 60; // Fallback to 60 FPS
    wallCollision(isSprinting, playerMovementSpeed, deltaTime);
}