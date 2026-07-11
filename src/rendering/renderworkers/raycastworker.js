"use strict";

/* =========================================================
   DEBUG + CRASH HANDLING
========================================================= */

function debug(msg, extra = {}) {
    try {
        self.postMessage({
            type: "wasmDebug",
            msg,
            ...extra
        });
    } catch { }
}

self.addEventListener("error", (e) => {
    try {
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

    wasm: null,
    wasmPromise: null,
    wasmStatus: "disabled",
    batchPoC: null,

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
    WASM LOADER
========================================================= */

// Tauri uses asset: protocol for local files.
// For dev/worker contexts, resolve URLs relative to this worker script so we don't depend on a hardcoded web root.
const isTauri = typeof self !== 'undefined' && self.__TAURI__ !== undefined;

let WASM_RUNTIME_URL;
let WASM_URL;

if (isTauri) {
    const WASM_BASE = "asset:///wasm/generated/wasm-gc";
    WASM_RUNTIME_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm-runtime.js`;
    WASM_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm`;
} else {
    // raycastworker.js lives at: src/rendering/renderworkers/raycastworker.js
    // wasm artifacts live at: src/wasm/generated/wasm-gc/
    // Worker scripts are not guaranteed to be treated as ES modules, so import.meta.url may be unavailable.
    // Use relative URLs from the app's origin (dev server should serve /src/... like the renderer expects).
    // This avoids the crash: "Cannot use 'import.meta' outside a module".
    WASM_RUNTIME_URL = "/src/wasm/generated/wasm-gc/bunbit-renderhelpers.wasm-runtime.js";
    WASM_URL = "/src/wasm/generated/wasm-gc/bunbit-renderhelpers.wasm";
}


function postWasmStatus(status) {
    WorkerState.wasmStatus = status;
    try {
        self.postMessage({ type: "wasmStatus", status });
    } catch { }
}

async function loadWasm() {
    if (WorkerState.wasm) return WorkerState.wasm;
    if (WorkerState.wasmPromise) return WorkerState.wasmPromise;

    WorkerState.wasmPromise = (async () => {
        try {

            debug("Starting WASM load");

            // For asset:// protocol, fetch and eval the runtime script
            if (WASM_RUNTIME_URL.startsWith("asset://")) {
                const runtimeResponse = await fetch(WASM_RUNTIME_URL);
                if (!runtimeResponse.ok) {
                    throw new Error(`Failed to fetch runtime: ${runtimeResponse.status}`);
                }
                const runtimeText = await runtimeResponse.text();
                // Execute the runtime script in the worker context
                eval(runtimeText);
            } else {
                importScripts(WASM_RUNTIME_URL);
            }

            const res = await fetch(WASM_URL);
            const bytes = await res.arrayBuffer();

            const module = await self.TeaVM.wasmGC.load(bytes, {
                stackDeobfuscator: { enabled: false }
            });

            WorkerState.wasm = module;
            WorkerState.batchPoC = module.exports.raycastColumnsBatch;

            postWasmStatus("ready");
            return module;

        } catch (err) {
            postWasmStatus("failed");
            throw err;
        }
    })();

    return WorkerState.wasmPromise;
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

/* =========================================================
   RAYCAST CORE (JS FALLBACK ONLY)
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

            if (Array.isArray(d.map_01)) {
                WorkerState.flatMap = flattenMap(d.map_01);
            }

            if (WorkerState.static.useWasm) {
                await loadWasm();
            }

            self.postMessage({ type: "init", success: true });
            return;
        }

        if (!WorkerState.static) throw new Error("Not initialized");

        if (d.frameId < WorkerState.latestFrameId) return;
        WorkerState.latestFrameId = d.frameId;

        const s = {
            ...WorkerState.static,
            posX: d.posX,
            posZ: d.posZ,
            playerAngle: d.playerAngle,
            playerFOV: d.playerFOV
        };

        const rayCount = d.endRay - d.startRay;

        /* =====================================================
           WASM PATH (FIXED)
        ===================================================== */

        if (WorkerState.wasm && WorkerState.batchPoC) {

            ensureBuffers(rayCount);

            WorkerState.batchPoC(
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

        self.postMessage({
            type: "frame",
            frameId: d.frameId,
            startRay: d.startRay,
            rayData,
            workerTime: (performance?.now?.() ?? Date.now()) - t0
        });

    } catch (err) {

        self.postMessage({
            type: "error",
            error: err?.message || String(err),
            stack: err?.stack || null,
            frameId: e.data?.frameId ?? -1
        });
    }
});