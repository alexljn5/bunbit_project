// raycasting.js
import { playerPosition } from "../playerdata/playerlogic.js";
import { tileSectors, mapTable } from "../mapdata/maps.js";
import { CANVAS_WIDTH, fastSin, fastCos, Q_rsqrt } from "../globals.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { textureIdMap, floorTextureIdMap, roofTextureIdMap } from "../mapdata/maptexturesids.js";
import { textureTransparencyMap } from "../mapdata/maptexturesloader.js";

export let playerFOV = Math.PI / 6; // 60 degrees
export let numCastRays = 300; // Default value
export let maxRayDepth = 50; // Default value

// Device-based adjustment for numCastRays
if (/Mobi|Android/i.test(navigator.userAgent) || navigator.hardwareConcurrency <= 4) {
    numCastRays = 240; // Reduce for low-end devices
}


// --- OPTIMIZED RAYCASTING WORKER MANAGEMENT ---
const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 4);
const workerUrl = new URL("./renderworkers/raycastworker.js", import.meta.url);
const workers = Array.from({ length: NUM_WORKERS }, () => new Worker(workerUrl, { type: "module" }));
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

export async function initializeWorkers() {
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

export function initializeMap() {
    if (!mapHandler.activeMapKey) {
        mapHandler.loadMap("map_01", playerPosition);
    }
}

export async function castRays() {
    const currentMap = mapHandler.getFullMap();
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0]) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }
    if (!workersInitialized) {
        for (let w of workers) w.postMessage({
            type: "init",
            tileSectors,
            map_01: currentMap,
            textureIdMap: Object.fromEntries(textureIdMap),
            floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
            CANVAS_WIDTH,
            numCastRays,
            maxRayDepth,
            textureTransparencyMap: textureTransparencyMap
        });
        workersInitialized = true;
    }
    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const playerAngle = playerPosition.angle;
    currentFrameId++;
    const frameId = currentFrameId;
    if (posX < 0 || posZ < 0 || posX > currentMap[0].length * tileSectors || posZ > currentMap.length * tileSectors) {
        playerPosition.x = 5 * tileSectors;
        playerPosition.z = 5 * tileSectors;
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }
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
                    resolve({ startRay: 0, rayData: [], frameId: -1 });
                } else if (data.frameId === frameId) {
                    resolve(data);
                }
            });
            worker.postMessage(workerData);
        });
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 24));
    const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise
    ]);
    if (!results || results.some(r => !r || r.frameId !== frameId)) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }
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

export function updateGraphicsSettings({ numCastRays: newRays, maxRayDepth: newDepth }) {
    numCastRays = newRays || numCastRays;
    maxRayDepth = newDepth || maxRayDepth;
    for (let w of workers) {
        w.postMessage({
            type: "updateSettings",
            numCastRays,
            maxRayDepth
        });
    }
    if (workersInitialized) {
        const currentMap = mapHandler.getFullMap();
        if (currentMap && Array.isArray(currentMap) && currentMap[0]) {
            for (let w of workers) {
                w.postMessage({
                    type: "init",
                    tileSectors,
                    map_01: currentMap,
                    textureIdMap: Object.fromEntries(textureIdMap),
                    floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
                    CANVAS_WIDTH,
                    numCastRays,
                    maxRayDepth
                });
            }
        }
    }
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