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

const WASM_BASE = "/src/wasm/generated/wasm-gc";
const WASM_RUNTIME_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm-runtime.js`;
const WASM_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm`;

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

            importScripts(WASM_RUNTIME_URL);

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
                s.posX, s.posZ,
                s.playerAngle, s.playerFOV,
                d.startRay, d.endRay,
                s.numCastRays,
                s.tileSize,
                WorkerState.flatMap.w,
                WorkerState.flatMap.h,
                WorkerState.flatMap.grid,
                s.maxRayDepth,

                WorkerState.outDistance,
                WorkerState.outHit,
                WorkerState.outSide,

                // NEW OUTPUT BUFFERS
                WorkerState.outMapX,
                WorkerState.outMapY
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
           JS FALLBACK (UNCHANGED)
        ===================================================== */

        const map = WorkerState.static.map;

        const rayData = new Array(rayCount);

        for (let i = 0; i < rayCount; i++) {
            const x = d.startRay + i;
            rayData[i] = castRayColumn(x, s, map, MathBackend);
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