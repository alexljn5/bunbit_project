import { playerPosition } from "./playerdata/playerlogic.js";
import { tileSectors, mapTable } from "./mapdata/maps.js";
import { textureIdMap, floorTextureIdMap } from "./mapdata/maptextures.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./renderengine.js";

export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 150; // Reduced for performance
export let maxRayDepth = 30;

const NUM_WORKERS = 4;
const workers = Array.from({ length: NUM_WORKERS }, () => new Worker("./workers/raycastworker.js", { type: "module" }));
const workerPendingFrames = Array.from({ length: NUM_WORKERS }, () => new Map());

let map_01 = mapTable.get("map_01");
let workersInitialized = false;
let currentFrameId = 0;
let lastFrameResults = { frameId: -1, results: null };

workers.forEach((worker, idx) => {
    worker.onmessage = (e) => {
        const { frameId } = e.data;
        if (workerPendingFrames[idx].has(frameId)) {
            workerPendingFrames[idx].get(frameId)(e.data);
            workerPendingFrames[idx].delete(frameId);
        }
    };
    worker.onerror = (error) => {
        console.error(`Worker${idx + 1} error:`, error);
        for (const [frameId, resolve] of workerPendingFrames[idx].entries()) {
            resolve({ startRay: 0, rayData: [], frameId });
        }
        workerPendingFrames[idx].clear();
    };
});

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
            if (e.data.type === "init") resolve(e.data.success);
        };
        workers[0].addEventListener("message", handler, { once: true });
        workers[0].addEventListener("error", () => resolve(false), { once: true });
    });
    workers.forEach(w => w.postMessage(staticData));
    const success = await initPromise;
    workersInitialized = success;
    return workersInitialized;
}

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
    if (posX < 0 || posZ < 0 || posX > map_01[0].length * tileSectors || posZ > map_01.length * tileSectors) {
        playerPosition.x = 5 * tileSectors;
        playerPosition.z = 5 * tileSectors;
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }
    // Split rays into NUM_WORKERS segments
    const seg = Math.floor(numCastRays / NUM_WORKERS);
    const ranges = Array.from({ length: NUM_WORKERS }, (_, i) => ({
        start: i * seg,
        end: i === NUM_WORKERS - 1 ? numCastRays : (i + 1) * seg
    }));
    const promises = workers.map((worker, idx) => {
        const { start, end } = ranges[idx];
        const workerData = {
            type: "frame",
            posX,
            posZ,
            playerAngle,
            playerFOV,
            frameId,
            startRay: start,
            endRay: end
        };
        return new Promise((resolve) => {
            workerPendingFrames[idx].set(frameId, (data) => {
                if (data.error) {
                    resolve({ startRay: start, rayData: [], frameId: -1 });
                } else if (data.frameId === frameId) {
                    resolve(data);
                }
            });
            worker.postMessage(workerData);
        });
    });
    // Wait for all workers, with a timeout fallback
    const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        resolve(null);
    }, 30));
    const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise
    ]);
    if (!results || results.some(r => !r || r.frameId !== frameId)) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }
    // Merge rayData in order
    let rayData = new Array(numCastRays).fill(null);
    for (let i = 0; i < NUM_WORKERS; i++) {
        const { startRay, rayData: segData } = results[i];
        for (let j = 0; j < segData.length; j++) {
            rayData[startRay + j] = segData[j];
        }
    }
    lastFrameResults = { frameId, results: rayData };
    return rayData;
}

export function cleanupWorkers() {
    workers.forEach(w => w.terminate());
    workersInitialized = false;
    console.log("Raycast workers terminated");
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