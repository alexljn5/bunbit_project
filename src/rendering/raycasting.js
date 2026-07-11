// raycasting.js
import { playerPosition } from "../globals.js";
import { tileSectors, mapTable } from "../mapdata/maps.js";
import { CANVAS_WIDTH, playerFOV, numCastRays, maxRayDepth, useWasmRayMath, raycastWasmStatus, updateGraphicsSettings } from "../globals.js";
import { fastSin, fastCos, Q_rsqrt } from "../math/mathtables.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { textureIdMap, floorTextureIdMap, roofTextureIdMap } from "../mapdata/maptexturesids.js";
import { textureTransparencyMap } from "../mapdata/maptexturesloader.js";
import { loadRenderHelpersWasm, getWasmDebugState } from "../wasm/renderhelpers.js";

// Re-export graphics settings from globals.js for backward compatibility
export { playerFOV, numCastRays, maxRayDepth, useWasmRayMath, raycastWasmStatus, updateGraphicsSettings };

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

console.log("[Raycasting] Worker script path:", workerScriptPath);

const workers = Array.from({ length: NUM_WORKERS }, () => new Worker(workerScriptPath));
const workerPendingFrames = new Map();
let workersInitialized = false;
let currentFrameId = 0;
let lastFrameResults = { frameId: -1, results: null };
let cachedWasmExports = null;
let wasmLoadAttempted = false;

// Track WASM state changes
let lastWasmState = 'unknown';
let hasRaycastColumnsBatch = false;

// Set initial raycastWasmStatus
if (typeof window !== 'undefined') {
    window.__raycastWasmStatus = raycastWasmStatus;
    window.__raycastMathSource = useWasmRayMath ? "wasm-requested" : "js";
}

// Load WASM once and cache it
async function getWasmExports() {
    if (cachedWasmExports) return cachedWasmExports;
    if (wasmLoadAttempted) return null;

    wasmLoadAttempted = true;
    try {
        console.groupCollapsed(`[WASM] Loading WASM from main thread`);
        cachedWasmExports = await loadRenderHelpersWasm();

        if (cachedWasmExports) {
            // Check for required exports
            hasRaycastColumnsBatch = typeof cachedWasmExports.raycastColumnsBatch === 'function';
            const hasFastSin = typeof cachedWasmExports.fastSin === 'function';
            const hasFastCos = typeof cachedWasmExports.fastCos === 'function';

            console.log('[WASM] Exports available:', {
                hasRaycastColumnsBatch,
                hasFastSin,
                hasFastCos,
                allExports: Object.keys(cachedWasmExports)
            });

            // Log state change
            if (lastWasmState !== 'ready') {
                console.log(`[WASM] State: ${lastWasmState} → ready`);
                lastWasmState = 'ready';
            }
        } else {
            console.warn('[WASM] Load returned null or undefined');
            if (lastWasmState !== 'failed') {
                console.log(`[WASM] State: ${lastWasmState} → failed`);
                lastWasmState = 'failed';
            }
        }
        console.groupEnd();
        return cachedWasmExports;
    } catch (e) {
        console.error("[Raycasting] WASM load failed:", e);
        cachedWasmExports = null;
        if (lastWasmState !== 'failed') {
            console.log(`[WASM] State: ${lastWasmState} → failed`);
            lastWasmState = 'failed';
        }
        console.groupEnd();
        return null;
    }
}

workers.forEach((worker, idx) => {
    worker.onmessage = (e) => {
        const { frameId } = e.data;

        if (e.data.type === "wasmStatus") {
            // Update the global raycastWasmStatus
            if (typeof window !== 'undefined') {
                window.__raycastWasmStatus = e.data.status;
                window.__raycastMathSource = e.data.status === "ready" ? "wasm" : "js";
            }

            // Only log state changes
            if (lastWasmState !== e.data.status) {
                console.info(`[WASM] Worker ${idx} status: ${lastWasmState} → ${e.data.status}`);
                lastWasmState = e.data.status;
            }

            return;
        }

        if (e.data.type === "wasmDebug") {
            if (window.DEBUG_WASM) {
                console.log(`[WASM DEBUG] Worker ${idx}:`, e.data.msg, e.data);
            }
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

    // Strict ordering: ensure WASM exports attempt finishes before any worker gets init.
    const wasmExports = await getWasmExports();

    if (!wasmExports) {
        console.warn("[Workers] WASM failed to load in main thread, workers will use JS fallback");
    } else if (!hasRaycastColumnsBatch) {
        console.warn("[Workers] WASM exports missing raycastColumnsBatch, workers will use JS fallback");
    }

    const staticData = {
        type: "init",
        tileSectors,
        map_01: map_01,
        textureIdMap: Object.fromEntries(textureIdMap),
        floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
        CANVAS_WIDTH,
        numCastRays,
        maxRayDepth,
        textureTransparencyMap: textureTransparencyMap,
        useWasmRayMath,
        wasmExports: wasmExports && hasRaycastColumnsBatch ? wasmExports : null
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

// JS Fallback raycast function (to be used if workers fail)
function jsFallbackRaycast() {
    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const playerAngle = playerPosition.angle;

    const rayData = new Array(numCastRays);
    const tileSize = tileSectors;
    const maxDepth = maxRayDepth;

    for (let i = 0; i < numCastRays; i++) {
        const rayAngle = playerAngle + (-playerFOV / 2 + (i / numCastRays) * playerFOV);
        const cosA = Math.cos(rayAngle);
        const sinA = Math.sin(rayAngle);

        let cellX = Math.floor(posX / tileSize);
        let cellY = Math.floor(posZ / tileSize);

        let distX = (cosA !== 0)
            ? ((cosA > 0 ? cellX + 1 : cellX) * tileSize - posX) / cosA
            : Number.POSITIVE_INFINITY;
        let distY = (sinA !== 0)
            ? ((sinA > 0 ? cellY + 1 : cellY) * tileSize - posZ) / sinA
            : Number.POSITIVE_INFINITY;

        const deltaX = Math.abs(tileSize / cosA);
        const deltaY = Math.abs(tileSize / sinA);

        let hit = false;
        let side = 0;
        let distance = 0;
        let steps = 0;
        const map = mapHandler.getFullMap();

        while (steps++ < maxDepth * 2 && !hit) {
            if (distX < distY) {
                distance = distX;
                cellX += (cosA > 0 ? 1 : -1);
                distX += deltaX;
                side = 1;
            } else {
                distance = distY;
                cellY += (sinA > 0 ? 1 : -1);
                distY += deltaY;
                side = 0;
            }

            if (cellX < 0 || cellY < 0 || cellX >= map[0].length || cellY >= map.length) break;

            const tile = map[cellY]?.[cellX];
            if (tile && tile.type === "wall") hit = true;
        }

        if (!hit) {
            rayData[i] = null;
            continue;
        }

        const angleDiff = rayAngle - playerAngle;
        const correctedDistance = distance / Math.sqrt(1.0 + angleDiff * angleDiff);

        const tile = map[cellY]?.[cellX];
        let textureKey = "wall_creamlol";
        if (tile) {
            const texMap = Object.fromEntries(textureIdMap);
            textureKey = texMap[tile.textureId] ?? "wall_creamlol";
        }

        rayData[i] = {
            column: i,
            distance: correctedDistance,
            hitSide: side === 1 ? "y" : "x",
            textureKey: textureKey,
            textureX: 0,
            floorTextureKey: "floor_concrete_01",
            backend: "js"
        };
    }

    return rayData;
}

export async function castRays() {
    const currentMap = mapHandler.getFullMap();
    if (!currentMap || !Array.isArray(currentMap) || !currentMap[0] || !Array.isArray(currentMap[0])) {
        const fallbackData = jsFallbackRaycast();
        return fallbackData || lastFrameResults.results || new Array(numCastRays).fill(null);
    }

    if (!workersInitialized) {
        const wasmExports = await getWasmExports();
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
            useWasmRayMath,
            wasmExports: wasmExports && hasRaycastColumnsBatch ? wasmExports : null
        });
        workersInitialized = true;
    }

    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const playerAngle = playerPosition.angle;
    currentFrameId++;
    const frameId = currentFrameId;

    // Log frame count when debugging
    if (window.DEBUG_WASM && frameId % 60 === 0) {
        console.log(`[WASM] Frame count: ${frameId}`);
    }

    if (posX < 0 || posZ < 0 || posX > currentMap[0].length * tileSectors || posZ > currentMap.length * tileSectors) {
        playerPosition.x = 5 * tileSectors;
        playerPosition.z = 5 * tileSectors;
        const fallbackData = jsFallbackRaycast();
        return fallbackData || lastFrameResults.results || new Array(numCastRays).fill(null);
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

    // Safety timeout: 500ms to prevent hanging forever
    const timeoutMs = 500;
    const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        resolve(null);
    }, timeoutMs));

    const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise
    ]);

    if (!results || results.some(r => !r || r.frameId !== frameId)) {
        try {
            const fallbackData = jsFallbackRaycast();
            return fallbackData;
        } catch (e) {
            return lastFrameResults.results || new Array(numCastRays).fill(null);
        }
    }

    const rayData = new Array(numCastRays);
    for (let i = 0; i < NUM_WORKERS; ++i) {
        const { startRay, rayData: segData } = results[i];
        if (segData) {
            for (let j = 0, n = segData.length; j < n; ++j) {
                rayData[startRay + j] = segData[j];
            }
        }
    }

    // Log ray data summary (only when debugging)
    if (window.DEBUG_WASM) {
        const validCount = rayData.filter(r => r !== null).length;
        console.log(`[WASM] castRays: frame ${frameId}, valid rays: ${validCount}/${rayData.length}`);
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