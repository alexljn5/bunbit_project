import { playerPosition } from "./playerdata/playerlogic.js";
import { tileSectors, mapTable } from "./mapdata/maps.js";
import { textureIdMap, floorTextureIdMap } from "./mapdata/maptextures.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./renderengine.js";

export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 120; // Reduced from 300 for performance
export let maxRayDepth = 30;

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
    // Removed console.log for performance
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

// Fast inverse square root (Quake III style)
function Q_rsqrt(number) {
    const threehalfs = 1.5;
    const x2 = number * 0.5;
    let y = number;
    const buf = new ArrayBuffer(4);
    const f = new Float32Array(buf);
    const i = new Uint32Array(buf);
    f[0] = y;
    i[0] = 0x5f3759df - (i[0] >> 1);
    y = f[0];
    y = y * (threehalfs - (x2 * y * y));
    return y;
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