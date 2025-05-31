import { playerPosition } from "./playerdata/playerlogic.js";
import { tileSectors, mapTable } from "./mapdata/maps.js";
import { textureIdMap, floorTextureIdMap } from "./mapdata/maptextures.js";
import { CANVAS_WIDTH } from "./renderengine.js";

export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 300; // Reduced for performance
export let maxRayDepth = 11;

// --- OPTIMIZED RAYCASTING WORKER MANAGEMENT ---
const NUM_WORKERS = 4;
const workers = Array.from({ length: NUM_WORKERS }, () => new Worker("./workers/raycastworker.js", { type: "module" }));
const workerPendingFrames = new Map();
let workersInitialized = false;
let currentFrameId = 0;
let lastFrameResults = { frameId: -1, results: null };

workers.forEach((worker, idx) => {
    worker.onmessage = (e) => {
        const { frameId } = e.data;
        const key = `${frameId}_${idx}`;
        const cb = workerPendingFrames.get(key);
        if (cb) {
            cb(e.data);
            workerPendingFrames.delete(key);
        }
    };
    worker.onerror = (error) => {
        for (const [key, resolve] of workerPendingFrames.entries()) {
            if (key.endsWith(`_${idx}`)) {
                resolve({ startRay: 0, rayData: [], frameId: -1 });
                workerPendingFrames.delete(key);
            }
        }
    };
});

async function initializeWorkers() {
    const map_01 = mapTable.get("map_01");
    if (!map_01 || !Array.isArray(map_01) || !map_01[0]) return false;
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
    let resolved = false;
    const initPromise = new Promise((resolve) => {
        const handler = (e) => {
            if (e.data.type === "init" && !resolved) {
                resolved = true;
                resolve(e.data.success);
            }
        };
        workers[0].addEventListener("message", handler, { once: true });
        workers[0].addEventListener("error", () => resolve(false), { once: true });
    });
    for (let w of workers) w.postMessage(staticData);
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
    const map_01 = mapTable.get("map_01");
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
    // Split rays into NUM_WORKERS segments (use Math.ceil to cover all rays)
    const seg = Math.ceil(numCastRays / NUM_WORKERS);
    const promises = workers.map((worker, idx) => {
        const start = idx * seg;
        const end = Math.min((idx + 1) * seg, numCastRays);
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
            const key = `${frameId}_${idx}`;
            workerPendingFrames.set(key, (data) => {
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
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 24));
    const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise
    ]);
    if (!results || results.some(r => !r || r.frameId !== frameId)) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }
    // Merge rayData in order
    const rayData = new Array(numCastRays);
    for (let i = 0; i < NUM_WORKERS; ++i) {
        const { startRay, rayData: segData } = results[i];
        for (let j = 0, n = segData.length; j < n; ++j) {
            rayData[startRay + j] = segData[j];
        }
    }
    lastFrameResults = { frameId, results: rayData };
    return rayData;
}

export function cleanupWorkers() {
    for (let w of workers) w.terminate();
    workersInitialized = false;
    workerPendingFrames.clear();
    console.log("Raycast workers terminated");
}

// --- TEST/DEBUG FUNCTIONS ---
export function testFuckingAround() {
    castRays().then(rayData => {
        if (!rayData) {
            console.log("No ray data available");
            return;
        }
        console.log("First 10 rays:", rayData.slice(0, 10));
    });
}

// --- FOV Animation (fuckTheScreenUpBaby) ---
let increasing = true;
let fovAnimationActive = false;
let fovResetTimeout = null;

export function fuckTheScreenUpBaby() {
    if (!fovAnimationActive) {
        fovAnimationActive = true;
        // Reset FOV and stop animation after 2 seconds
        fovResetTimeout = setTimeout(() => {
            playerFOV = Math.PI / 6;
            fovAnimationActive = false;
        }, 2000);
    }
    if (!fovAnimationActive) return;
    for (let i = 0; i < 100; i++) {
        if (increasing) {
            playerFOV++;
            if (playerFOV >= 100) increasing = false;
        } else {
            playerFOV--;
            if (playerFOV <= 6) increasing = true;
        }
    }
}
