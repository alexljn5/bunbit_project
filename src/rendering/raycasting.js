// raycasting.js
import { playerPosition } from "../globals.js";
import { tileSectors, mapTable } from "../mapdata/maps.js";
import { CANVAS_WIDTH, playerFOV, numCastRays, maxRayDepth, useWasmRayMath, raycastWasmStatus, updateGraphicsSettings } from "../globals.js";
import { fastSin, fastCos, Q_rsqrt } from "../math/mathtables.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { textureIdMap, floorTextureIdMap, roofTextureIdMap } from "../mapdata/maptexturesids.js";
import { textureTransparencyMap } from "../mapdata/maptexturesloader.js";
import { jsFallbackRaycast } from "./renderengine.js";

// Re-export graphics settings from globals.js for backward compatibility
export { playerFOV, numCastRays, maxRayDepth, useWasmRayMath, raycastWasmStatus, updateGraphicsSettings };

// Debug helper
const DEBUG_PREFIX = '[DEBUG]';
function debugLog(...args) {
    if (window.DEBUG_TAURI) {
        console.log(DEBUG_PREFIX, ...args);
    }
}

// --- OPTIMIZED RAYCASTING WORKER MANAGEMENT ---
const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 4);

// Tauri detection for worker path
const isTauri = typeof window !== 'undefined' && (
    window.__TAURI__ !== undefined ||
    window.location.protocol === 'tauri:'
);

// Use asset:// protocol for Tauri, relative path for dev
const workerScriptPath = isTauri
    ? "asset:///rendering/renderworkers/raycastworker.js"
    : new URL("./renderworkers/raycastworker.js", import.meta.url).toString();

const workers = Array.from({ length: NUM_WORKERS }, () => new Worker(workerScriptPath));
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
    debugLog(`Worker ${idx} created, setting up message handlers`);

    worker.onmessage = (e) => {
        const { frameId } = e.data;

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

        const key = `${frameId}_${idx}`;
        const cb = workerPendingFrames.get(key);

        if (cb) {
            debugLog(`Worker ${idx} response received for frame ${frameId}`);
            cb(e.data);
            workerPendingFrames.delete(key);
        }
    };

    worker.onerror = (error) => {
        console.error(`[WORKER ${idx}] Error:`, error);
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
    debugLog('castRays() invoked', { frameId: currentFrameId + 1 });

    const currentMap = mapHandler.getFullMap();
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0] || !Array.isArray(currentMap[0])) {
        debugLog('castRays: no valid map, using last results or fallback');
        return lastFrameResults.results || new Array(numCastRays).fill(null);
    }

    if (!workersInitialized) {
        debugLog('castRays: initializing workers');
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
            textureTransparencyMap: textureTransparencyMap,
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
        debugLog(`castRays: posting frame ${frameId} to worker ${idx}`);
        return new Promise((resolve) => {
            const key = `${frameId}_${idx}`;
            workerPendingFrames.set(key, (data) => {
                if (data.error) {
                    debugLog(`Worker ${idx} error for frame ${frameId}:`, data.error);
                    resolve({ startRay: start, rayData: new Array(end - start).fill(null), frameId });
                } else if (data.frameId === frameId) {
                    debugLog(`Worker ${idx} response received for frame ${frameId}`);
                    resolve(data);
                }
            });
            worker.postMessage(workerData);
        });
    });

    // Safety timeout: 500ms to prevent hanging forever
    const timeoutMs = 500;
    debugLog(`castRays: waiting for workers with ${timeoutMs}ms timeout`);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        debugLog(`castRays: TIMEOUT after ${timeoutMs}ms`);
        resolve(null);
    }, timeoutMs));

    const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise
    ]);

    if (!results || results.some(r => !r || r.frameId !== frameId)) {
        debugLog('castRays: workers failed or timeout, using fallback');
        // Use JS fallback raycast instead of returning all nulls
        try {
            const fallbackData = jsFallbackRaycast();
            debugLog('castRays: fallback raycast successful');
            return fallbackData;
        } catch (e) {
            debugLog('castRays: fallback failed, returning nulls');
            return lastFrameResults.results || new Array(numCastRays).fill(null);
        }
    }

    const rayData = new Array(numCastRays);
    for (let i = 0; i < NUM_WORKERS; ++i) {
        const { startRay, rayData: segData } = results[i];
        for (let j = 0, n = segData.length; j < n; ++j) {
            rayData[startRay + j] = segData[j];
        }
    }

    // Log ray data summary
    const validCount = rayData.filter(r => r !== null).length;
    debugLog('castRays: returning', {
        frameId,
        rayCount: rayData.length,
        validCount,
        firstRay: rayData[0]
    });

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