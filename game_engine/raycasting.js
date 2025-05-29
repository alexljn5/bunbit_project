import { playerPosition } from "./playerdata/playerlogic.js";
import { tileSectors, mapTable } from "./mapdata/maps.js";
import { textureIdMap, floorTextureIdMap } from "./mapdata/maptextures.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./renderengine.js";

export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 300; // Keep at 50 as it works
export let maxRayDepth = 20;

const worker1 = new Worker("./raycastworker.js", { type: "module" });
const worker2 = new Worker("./raycastworker.js", { type: "module" });

let map_01 = mapTable.get("map_01");
let workersInitialized = false;
let currentFrameId = 0;
let lastFrameResults = { frameId: -1, results: null };
let timeoutCount = 0;

// Track pending frame promises
const worker1PendingFrames = new Map();
const worker2PendingFrames = new Map();

worker1.onmessage = (e) => {
    console.log("Worker1 response:", {
        frameId: e.data.frameId,
        rayCount: e.data.rayData?.length,
        workerTime: e.data.workerTime,
        nonNullRays: e.data.rayData?.filter(ray => ray !== null).length,
        error: e.data.error || null
    });
    const { frameId } = e.data;
    if (worker1PendingFrames.has(frameId)) {
        worker1PendingFrames.get(frameId)(e.data);
        worker1PendingFrames.delete(frameId);
    }
};

worker2.onmessage = (e) => {
    const { frameId } = e.data;
    if (worker2PendingFrames.has(frameId)) {
        worker2PendingFrames.get(frameId)(e.data);
        worker2PendingFrames.delete(frameId);
    }
};

worker1.onerror = (error) => {
    console.error("Worker1 error:", error);
    for (const [frameId, resolve] of worker1PendingFrames.entries()) {
        resolve({ startRay: 0, rayData: [], frameId });
    }
    worker1PendingFrames.clear();
};

async function initializeWorkers() {
    if (!map_01 || !Array.isArray(map_01) || !map_01[0]) {
        console.error("map_01 is invalid or undefined!");
        return false;
    }
    const staticData = {
        type: "init",
        tileSectors,
        map_01,
        textureIdMap: Object.fromEntries(textureIdMap),
        floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
        CANVAS_WIDTH,
        numCastRays,
        maxRayDepth
    };

    const initPromise = new Promise((resolve) => {
        const handler = (e) => {
            if (e.data.type === "init") {
                resolve(e.data.success);
            }
        };
        worker1.addEventListener("message", handler, { once: true });
        worker1.addEventListener("error", () => resolve(false), { once: true });
    });

    worker1.postMessage(staticData);
    const success = await initPromise;
    workersInitialized = success;
    return workersInitialized;
}

// Main-thread raycasting fallback
function castRaysMainThread(posX, posZ, playerAngle, playerFOV) {
    const rayData = [];
    const startTime = performance.now();

    for (let x = 0; x < numCastRays; x++) {
        const rayAngle = playerAngle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);

        let distance = 0;
        let hit = false;
        let hitWallType = null;
        let rayX = posX;
        let rayY = posZ;
        let hitSide = null;
        let textureKey = null;
        let floorTextureKey = "floor_concrete";
        let floorX = 0;
        let floorY = 0;
        let lastFloorTile = null;

        const cosAngle = Math.cos(rayAngle);
        const sinAngle = Math.sin(rayAngle);

        let cellX = Math.floor(rayX / tileSectors);
        let cellY = Math.floor(rayY / tileSectors);

        let distToNextX = cosAngle !== 0 ? ((cosAngle > 0 ? cellX + 1 : cellX) * tileSectors - rayX) / cosAngle : Infinity;
        let distToNextY = sinAngle !== 0 ? ((sinAngle > 0 ? cellY + 1 : cellY) * tileSectors - rayY) / sinAngle : Infinity;

        const deltaDistX = Math.abs(tileSectors / cosAngle) || Infinity;
        const deltaDistY = Math.abs(tileSectors / sinAngle) || Infinity;

        let steps = 0;
        const maxSteps = maxRayDepth * 2;

        while (distance < maxRayDepth * tileSectors && !hit && steps < maxSteps) {
            steps++;
            if (distToNextX < distToNextY) {
                distance = distToNextX;
                cellX += cosAngle > 0 ? 1 : -1;
                distToNextX += deltaDistX;
                hitSide = "y";
            } else {
                distance = distToNextY;
                cellY += sinAngle > 0 ? 1 : -1;
                distToNextY += deltaDistY;
                hitSide = "x";
            }

            if (cellX >= 0 && cellX < map_01[0].length && cellY >= 0 && cellY < map_01.length) {
                const tile = map_01[cellY][cellX];
                if (!tile || typeof tile !== "object") {
                    console.log(`Main thread: Invalid tile at [${cellY}][${cellX}] for ray ${x}`);
                    break;
                }
                if (tile.type === "wall") {
                    hit = true;
                    hitWallType = tile.type;
                    textureKey = textureIdMap.get(tile.textureId) || "wall_creamlol";
                    if (lastFloorTile) {
                        floorTextureKey = floorTextureIdMap.get(lastFloorTile.floorTextureId) || "floor_concrete";
                    }
                } else if (tile.type === "empty") {
                    lastFloorTile = tile;
                    floorTextureKey = floorTextureIdMap.get(tile.floorTextureId) || "floor_concrete";
                    floorX = rayX + distance * cosAngle;
                    floorY = rayY + distance * sinAngle;
                    continue;
                }
            } else {
                console.log(`Main thread: Ray ${x} out of bounds at cellX=${cellX}, cellY=${cellY}`);
                break;
            }
        }

        if (hit) {
            const correctedDistance = distance * Math.cos(rayAngle - playerAngle);
            let hitX = rayX + distance * cosAngle;
            let hitY = rayY + distance * sinAngle;

            if (hitSide === "y") {
                hitX = (cosAngle > 0 ? cellX : cellX + 1) * tileSectors;
            } else {
                hitY = (sinAngle > 0 ? cellY : cellY + 1) * tileSectors;
            }

            if (isNaN(hitX) || isNaN(hitY) || Math.abs(hitX) > CANVAS_WIDTH * 2 || Math.abs(hitY) > CANVAS_WIDTH * 2) {
                console.log(`Main thread: Invalid hit coordinates for ray ${x}: hitX=${hitX}, hitY=${hitY}`);
                rayData.push(null);
                continue;
            }

            rayData.push({
                column: Math.floor(x * (CANVAS_WIDTH / numCastRays)),
                distance: correctedDistance,
                wallType: hitWallType,
                hitX: hitX,
                hitY: hitY,
                hitSide: hitSide,
                textureKey: textureKey,
                floorTextureKey: floorTextureKey,
                floorX: floorX,
                floorY: floorY,
            });
        } else {
            rayData.push(null);
        }
    }

    console.log("Main thread castRays time:", performance.now() - startTime, "ms");
    return rayData;
}

export async function castRays() {
    const startTime = performance.now();
    if (!map_01 || !Array.isArray(map_01) || !map_01[0]) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }

    if (!workersInitialized) {
        const initialized = await initializeWorkers();
        if (!initialized) {
            return lastFrameResults.results || new Array(numCastRays).fill(null);
        }
    }

    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const playerAngle = playerPosition.angle;
    currentFrameId++;
    const frameId = currentFrameId;

    // Validate player position
    if (posX < 0 || posZ < 0 || posX > map_01[0].length * tileSectors || posZ > map_01.length * tileSectors) {
        playerPosition.x = 5 * tileSectors;
        playerPosition.z = 5 * tileSectors;
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }

    // --- OPTIMIZATION: Only update the screen if we have a new, complete frame ---
    let frameResolved = false;
    const workerData = {
        type: "frame",
        posX,
        posZ,
        playerAngle,
        playerFOV,
        frameId,
        startRay: 0,
        endRay: numCastRays
    };

    const worker1Promise = new Promise((resolve) => {
        worker1PendingFrames.set(frameId, (data) => {
            if (data.error) {
                resolve({ startRay: 0, rayData: [], frameId: -1 });
            } else if (data.frameId === frameId) {
                resolve(data);
            }
        });
    });

    worker1.postMessage(workerData);

    // --- OPTIMIZATION: Use a longer timeout, but never show a blank frame ---
    const result = await Promise.race([
        worker1Promise,
        new Promise((resolve) => setTimeout(() => {
            resolve({ startRay: 0, rayData: [], frameId: -1 });
        }, 20))
    ]);

    if (result.frameId !== frameId || !result.rayData || result.rayData.length !== numCastRays) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }

    // --- OPTIMIZATION: Reuse the same rayData array if possible ---
    let rayData = lastFrameResults.results || new Array(numCastRays).fill(null);
    for (let i = 0; i < numCastRays; i++) {
        rayData[i] = result.rayData[i];
    }
    lastFrameResults = { frameId, results: rayData };
    return rayData;
}

export function cleanupWorkers() {
    worker1.terminate();
    workersInitialized = false;
    console.log("Raycast worker terminated");
}

export function testFuckingAround() {
    return new Promise((resolve) => {
        const interval1 = setInterval(() => {
            playerFOV += 6;
        }, 1000);

        const interval2 = setInterval(() => {
            playerFOV *= Math.pow(8, 10);
        }, 10000);

        const interval3 = setInterval(() => {
            playerFOV = Math.PI / 6;
        }, 5000);

        const interval4 = setInterval(() => {
            playerFOV = (playerFOV * 5.5) % 2;
        }, 6000);

        // Stop all intervals after 15 seconds
        setTimeout(() => {
            clearInterval(interval1);
            clearInterval(interval2);
            clearInterval(interval3);
            clearInterval(interval4);

            // Reset playerFOV
            playerFOV = Math.PI / 6;
            console.log("All intervals stopped and playerFOV reset.");

            // Resolve with reset value
            resolve(playerFOV);
        }, 5000);  // 15000ms = 15 seconds
    });
}

export function testAnimationFuckingAround() {
    return new Promise((resolve) => {
        const interval1 = setInterval(() => {
            playerFOV += 1;
        }, 1000);

        const interval2 = setInterval(() => {
            playerFOV *= Math.pow(0.5, 5 * 5 / 2 % 4);
        }, 10000);

        const interval3 = setInterval(() => {
            playerFOV = Math.PI / 2;
        }, 5000);

        const interval4 = setInterval(() => {
            playerFOV = (playerFOV * 0.5) % 2;
        }, 6000);

        // Stop all intervals after 15 seconds
        setTimeout(() => {
            clearInterval(interval1);
            clearInterval(interval2);
            clearInterval(interval3);
            clearInterval(interval4);

            // Reset playerFOV
            playerFOV = Math.PI / 6;
            console.log("All intervals stopped and playerFOV reset.");

            // Resolve with reset value
            resolve(playerFOV);
        }, 15000);  // 15000ms = 15 seconds
    });
}