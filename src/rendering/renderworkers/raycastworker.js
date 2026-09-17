// raycastworker.js
"use strict";

import { createWorkerDebug } from '../../debug/workerdebug.js';
const wd = createWorkerDebug('raycast-worker');

/* =========================================================
   DEBUG + CRASH HANDLING
========================================================= */
let wasmExports = null; // Will be set from main thread

// Frame counter for debugging
let frameCount = 0;

function debug(msg, extra = {}) {
    if (typeof window !== 'undefined' && window.DEBUG_WASM) {
        try {
            self.postMessage({
                type: "wasmDebug",
                msg,
                ...extra
            });
        } catch { }
    }
}

self.addEventListener("error", (e) => {
    try {
        wd.logError("worker error", e.message, e.filename, e.lineno + ":" + e.colno);
        self.postMessage({
            type: "workerError",
            message: e.message,
            filename: e.filename,
            line: e.lineno,
            column: e.colno
        });
    } catch { }
});

self.addEventListener("unhandledrejection", (e) => {
    try {
        wd.logError("unhandled rejection", e.reason?.message || String(e.reason));
        self.postMessage({
            type: "workerError",
            message: "UnhandledPromiseRejection",
            reason: e.reason?.message || String(e.reason)
        });
    } catch { }
});

/* =========================================================
   STATE
========================================================= */

const WorkerState = {
    static: null,
    latestFrameId: -1,

    // WASM exports will be stored here (received from main thread)
    wasm: null,
    batchPoC: null,
    wasmStatus: "disabled",

    cpuAccum: 0,
    workerId: null,

    perfChannel:
        typeof BroadcastChannel !== "undefined"
            ? new BroadcastChannel("perf_monitor")
            : null,

    outDistance: null,
    outHit: null,
    outSide: null,

    // NEW: authoritative hit coordinates from WASM
    outMapX: null,
    outMapY: null,

    flatMap: null
};

/* =========================================================
   MATH BACKEND
========================================================= */

const SIN_TABLE_BITS = 11;
const SIN_TABLE_SIZE = 1 << SIN_TABLE_BITS;
const SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;

const FIXED_POINT_SHIFT = 16;
const ANGLE_SCALE =
    (SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (Math.PI * 2) | 0;

const sinTable = new Float32Array(SIN_TABLE_SIZE);
const cosTable = new Float32Array(SIN_TABLE_SIZE);

for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const a = (i * 2 * Math.PI) / SIN_TABLE_SIZE;
    sinTable[i] = Math.sin(a);
    cosTable[i] = Math.cos(a);
}

const MathBackend = {
    rayAngle(playerAngle, fov, x, numRays) {
        return playerAngle + (-fov / 2 + (x / numRays) * fov);
    }
};

/* =========================================================
   BUFFER MANAGEMENT
========================================================= */

function ensureBuffers(rayCount) {
    if (!WorkerState.outDistance || WorkerState.outDistance.length < rayCount) {

        debug("Allocating buffers", { rayCount });

        WorkerState.outDistance = new Float64Array(rayCount);
        WorkerState.outHit = new Int32Array(rayCount);
        WorkerState.outSide = new Int32Array(rayCount);

        // NEW
        WorkerState.outMapX = new Int32Array(rayCount);
        WorkerState.outMapY = new Int32Array(rayCount);
    }
}

/* =========================================================
   MAP FLATTEN
========================================================= */

function flattenMap(map) {
    const h = map.length;
    const w = map[0].length;

    const grid = new Int32Array(w * h);
    const texGrid = new Int32Array(w * h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const tile = map[y][x];
            if (tile && tile.type === "wall") {
                grid[y * w + x] = 1;
                texGrid[y * w + x] = tile.textureId ?? 0;
            }
        }
    }

    return { grid, texGrid, w, h };
}

function postWasmStatus(status) {
    WorkerState.wasmStatus = status;
    debug("WASM status updated", { status });
    try {
        self.postMessage({ type: "wasmStatus", status });
    } catch { }
}

/* =========================================================
   RAYCAST CORE (JS FALLBACK + WASM via main thread exports)
========================================================= */

self.addEventListener("message", async (e) => {

    const t0 = performance?.now?.() ?? Date.now();

    try {

        const d = e.data;

        if (d.type === "init") {

            WorkerState.static = {
                tileSize: d.tileSectors,
                map: d.map_01,
                textureMap: d.textureIdMap,
                floorMap: d.floorTextureIdMap,
                numCastRays: d.numCastRays,
                maxRayDepth: d.maxRayDepth,
                transparency: d.textureTransparencyMap || {},
                useWasm: !!d.useWasmRayMath
            };

            WorkerState.workerId = d.workerId;
            wd.setName('raycast-worker-' + (d.workerId != null ? d.workerId : '?'));
            wd.heartbeat();

            if (Array.isArray(d.map_01)) {
                WorkerState.flatMap = flattenMap(d.map_01);
            }

            // Receive WASM exports from the main thread and only enable WASM when complete.
            // If anything is missing, always use JS fallback.
            if (d.wasmExports && typeof d.wasmExports === 'object') {
                const hasRaycast = typeof d.wasmExports.raycastColumnsBatch === 'function';
                const hasFastSin = typeof d.wasmExports.fastSin === 'function';
                const hasFastCos = typeof d.wasmExports.fastCos === 'function';

                if (hasRaycast && hasFastSin && hasFastCos) {
                    wasmExports = d.wasmExports;
                    WorkerState.wasm = wasmExports;
                    WorkerState.batchPoC = wasmExports.raycastColumnsBatch;
                    postWasmStatus("ready");
                    debug("WASM exports received from main thread", {
                        hasRaycast,
                        hasFastSin,
                        hasFastCos,
                        hasRaycastColumnsBatch: hasRaycast
                    });
                } else {
                    wasmExports = null;
                    WorkerState.wasm = null;
                    WorkerState.batchPoC = null;
                    debug("WASM exports missing required functions, using JS fallback", {
                        hasRaycast,
                        hasFastSin,
                        hasFastCos
                    });
                    postWasmStatus("fallback");
                }
            } else {
                wasmExports = null;
                WorkerState.wasm = null;
                WorkerState.batchPoC = null;
                debug("No WASM exports received, using JS fallback");
                postWasmStatus("disabled");
            }

            self.postMessage({ type: "init", success: true });
            wd.log('started');
            return;
        }


        if (!WorkerState.static) throw new Error("Not initialized");

        if (d.frameId < WorkerState.latestFrameId) return;
        WorkerState.latestFrameId = d.frameId;
        frameCount++;

        const s = {
            ...WorkerState.static,
            posX: d.posX,
            posZ: d.posZ,
            playerAngle: d.playerAngle,
            playerFOV: d.playerFOV
        };

        const rayCount = d.endRay - d.startRay;

        /* =====================================================
           WASM PATH (Using exports from main thread)
        ===================================================== */

        // Use the globally stored wasmExports
        if (wasmExports && typeof wasmExports.raycastColumnsBatch === "function") {

            ensureBuffers(rayCount);

            wasmExports.raycastColumnsBatch(
                s.posX, s.posZ, s.playerAngle, s.playerFOV,
                d.startRay, d.endRay, s.numCastRays,
                s.tileSize,
                WorkerState.flatMap.w, WorkerState.flatMap.h,
                WorkerState.flatMap.grid,
                s.maxRayDepth,
                WorkerState.outDistance,   // 13
                WorkerState.outHit,        // 14
                WorkerState.outSide,       // 15
                WorkerState.outMapX,       // 16 ← extra!
                WorkerState.outMapY        // 17 ← extra!
            );

            const rayData = new Array(rayCount);

            for (let i = 0; i < rayCount; i++) {

                if (WorkerState.outHit[i] === 0) {
                    rayData[i] = null;
                    continue;
                }

                const mapX = WorkerState.outMapX[i];
                const mapY = WorkerState.outMapY[i];

                const tile = s.map?.[mapY]?.[mapX];

                let textureKey = "wall_creamlol";

                if (tile) {
                    textureKey =
                        s.textureMap[tile.textureId] ?? "wall_creamlol";
                }

                rayData[i] = {
                    column: d.startRay + i,
                    distance: WorkerState.outDistance[i],
                    hitSide: WorkerState.outSide[i] === 1 ? "y" : "x",
                    textureKey,
                    textureX: 0,
                    floorTextureKey: "floor_concrete_01",
                    backend: "wasm"
                };
            }

            wd.markTask();
            if (frameCount % 60 === 0) wd.log('processed task', frameCount);
            self.postMessage({
                type: "frame",
                frameId: d.frameId,
                startRay: d.startRay,
                rayData,
                workerTime: (performance?.now?.() ?? Date.now()) - t0
            });

            return;
        }

        /* =====================================================
            JS FALLBACK (PROPER IMPLEMENTATION)
         ===================================================== */

        const map = WorkerState.static.map;

        const rayData = new Array(rayCount);

        // Proper JS raycasting implementation
        const castRayColumnLocal = (rayIndex, state, map2d, mathBackend) => {
            if (!map2d || !Array.isArray(map2d) || map2d.length === 0) return null;

            const rayAngle = mathBackend.rayAngle(state.playerAngle, state.playerFOV, rayIndex, state.numCastRays);
            const cosA = Math.cos(rayAngle);
            const sinA = Math.sin(rayAngle);

            const tileSize = state.tileSize;
            const maxRayDepth = state.maxRayDepth;

            // Initial position in map grid
            let cellX = Math.floor(state.posX / tileSize);
            let cellY = Math.floor(state.posZ / tileSize);

            // Distance to next x and y grid lines
            let distX = (cosA !== 0)
                ? ((cosA > 0 ? cellX + 1 : cellX) * tileSize - state.posX) / cosA
                : Number.POSITIVE_INFINITY;
            let distY = (sinA !== 0)
                ? ((sinA > 0 ? cellY + 1 : cellY) * tileSize - state.posZ) / sinA
                : Number.POSITIVE_INFINITY;

            // Delta distances
            const deltaX = Math.abs(tileSize / cosA);
            const deltaY = Math.abs(tileSize / sinA);

            let hit = false;
            let side = 0;
            let distance = 0;
            let steps = 0;

            while (steps++ < maxRayDepth * 2 && !hit) {
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

                // Check bounds
                if (cellX < 0 || cellY < 0 || cellX >= map2d[0].length || cellY >= map2d.length) {
                    break;
                }

                // Check for wall hit
                const tile = map2d[cellY][cellX];
                if (tile && tile.type === "wall") {
                    hit = true;
                }
            }

            if (!hit) return null;

            // Correct distance for fish-eye effect
            const angleDiff = rayAngle - state.playerAngle;
            const correctedDistance = distance / Math.sqrt(1.0 + angleDiff * angleDiff);

            // Get texture key
            const tile = map2d[cellY][cellX];
            let textureKey = "wall_creamlol";
            if (tile) {
                textureKey = state.textureMap[tile.textureId] ?? "wall_creamlol";
            }

            return {
                column: rayIndex,
                distance: correctedDistance,
                hitSide: side === 1 ? "y" : "x",
                textureKey,
                textureX: 0,
                floorTextureKey: "floor_concrete_01",
                backend: "js"
            };
        };

        for (let i = 0; i < rayCount; i++) {
            const x = d.startRay + i;
            rayData[i] = castRayColumnLocal(x, s, map, MathBackend);
        }

        wd.markTask();
        if (frameCount % 60 === 0) wd.log('processed task', frameCount);
        self.postMessage({
            type: "frame",
            frameId: d.frameId,
            startRay: d.startRay,
            rayData,
            workerTime: (performance?.now?.() ?? Date.now()) - t0
        });

    } catch (err) {

        wd.logError('task error', err?.message);
        self.postMessage({
            type: "error",
            error: err?.message || String(err),
            stack: err?.stack || null,
            frameId: e.data?.frameId ?? -1
        });
    }
});