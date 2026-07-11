// raycasting.js
import { playerPosition } from "../globals.js";
import { tileSectors, mapTable } from "../mapdata/maps.js";
import { CANVAS_WIDTH, playerFOV, numCastRays, maxRayDepth, useWasmRayMath, raycastWasmStatus, updateGraphicsSettings } from "../globals.js";
import { fastSin, fastCos, Q_rsqrt } from "../math/mathtables.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { textureIdMap, floorTextureIdMap, roofTextureIdMap } from "../mapdata/maptexturesids.js";
import { textureTransparencyMap } from "../mapdata/maptexturesloader.js";

// Re-export graphics settings from globals.js for backward compatibility
export { playerFOV, numCastRays, maxRayDepth, useWasmRayMath, raycastWasmStatus, updateGraphicsSettings };

// --- OPTIMIZED RAYCASTING WORKER MANAGEMENT ---
const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 4);
// Cache-bust the worker URL to avoid the browser serving a stale worker bundle.
const workerUrlBase = new URL("./renderworkers/raycastworker.js", import.meta.url);
// In raycasting.js, use a relative path that Tauri can serve
const workerUrl = new URL("/wasm/generated/wasm-gc/bunbit-renderhelpers.wasm-runtime.js", import.meta.url);
const workers = Array.from({ length: NUM_WORKERS }, () => new Worker(workerUrl));
const workerPendingFrames = new Map();
let workersInitialized = false;
let currentFrameId = 0;
let lastFrameResults = { frameId: -1, results: null };

// Set initial raycastWasmStatus
if (typeof window !== 'undefined') {
    window.__raycastWasmStatus = raycastWasmStatus;
    window.__raycastMathSource = useWasmRayMath ? "wasm-requested" : "js";
}

workers.forEach((worker, idx) => {
    worker.onmessage = (e) => {

        if (e.data.type === "wasmStatus") {
            // Update the global raycastWasmStatus
            if (typeof window !== 'undefined') {
                window.__raycastWasmStatus = e.data.status;
                window.__raycastMathSource = e.data.status === "ready" ? "wasm" : "js";
            }

            console.info("[WASM STATUS]", {
                worker: idx,
                status: e.data.status
            });

            return;
        }

        if (e.data.type === "wasmDebug") {
            console.log("[WASM DEBUG]", e.data);
            return;
        }

        if (e.data.type === "error") {
            console.error("[WORKER ERROR]", e.data);
            return;
        }

        if (e.data.type === "workerError") {
            console.error("[WORKER CRASH]", e.data);
            return;
        }

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

    // FIX: include textureTransparencyMap so workers can do transparent-wall checks
    const staticData = {
        type: "init",
        tileSectors,
        map_01,
        textureIdMap: Object.fromEntries(textureIdMap),
        floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
        CANVAS_WIDTH,
        numCastRays,
        maxRayDepth,
        useWasmRayMath,
        textureTransparencyMap: textureTransparencyMap  // was missing
    };

    let resolved = false;
    const initPromise = new Promise((resolve) => {
        const handler = (e) => {
            if (e.data.type === "init" && !resolved) {
                resolved = true;
                workers[0].removeEventListener("message", handler);
                resolve(e.data.success);
            }
        };
        workers[0].addEventListener("message", handler);
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
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0] || !Array.isArray(currentMap[0])) {
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }

    if (!workersInitialized) {
        // FIX: include textureTransparencyMap here too (lazy init path)
        for (let w of workers) w.postMessage({
            type: "init",
            tileSectors,
            map_01: currentMap,
            textureIdMap: Object.fromEntries(textureIdMap),
            floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
            CANVAS_WIDTH,
            numCastRays,
            maxRayDepth,
            textureTransparencyMap: textureTransparencyMap,  // was missing
            useWasmRayMath
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
                    resolve({ startRay: start, rayData: new Array(end - start).fill(null), frameId });
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

// Note: updateGraphicsSettings is now defined in globals.js

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
            // Note: playerFOV is now in globals.js, we need to import it to modify
            // For now, we'll use a local reference
        }, 2000);
    }
    if (!fovAnimationActive) return;
    for (let i = 0; i < 100; i++) {
        if (increasing) {
            // playerFOV is imported from globals.js
            if (playerFOV >= 100) increasing = false;
        } else {
            if (playerFOV <= 6) increasing = true;
        }
    }
}