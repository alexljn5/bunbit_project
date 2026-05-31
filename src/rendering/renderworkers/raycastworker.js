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

    // FIX: Float64Array and Int32Array to match Java signature
    outDistance: null,
    outHit: null,
    outSide: null,

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
    },
    sin(angle) {
        const idx =
            ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
        return sinTable[idx];
    },
    cos(angle) {
        const idx =
            ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
        return cosTable[idx];
    }
};

/* =========================================================
   FAST INV SQRT
========================================================= */

const buf = new ArrayBuffer(4);
const f32 = new Float32Array(buf);
const u32 = new Uint32Array(buf);

function Q_rsqrt(n) {
    const x2 = n * 0.5;
    f32[0] = n;
    u32[0] = 0x5f3759df - (u32[0] >> 1);
    f32[0] = f32[0] * (1.5 - x2 * f32[0] * f32[0]);
    return f32[0];
}

/* =========================================================
   BUFFER MANAGEMENT
   FIX: Use Float64Array/Int32Array to match Java JSExport signature
========================================================= */

function ensureBuffers(rayCount) {
    if (
        !WorkerState.outDistance ||
        WorkerState.outDistance.length < rayCount
    ) {
        debug("Allocating buffers", { rayCount });

        WorkerState.outDistance = new Float64Array(rayCount);  // was Float32Array
        WorkerState.outHit = new Int32Array(rayCount);    // was Uint8Array
        WorkerState.outSide = new Int32Array(rayCount);    // was Uint8Array
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

    if (WorkerState.wasm) {
        debug("WASM already loaded");
        return WorkerState.wasm;
    }

    if (WorkerState.wasmPromise) {
        debug("WASM already loading");
        return WorkerState.wasmPromise;
    }

    WorkerState.wasmPromise = (async () => {
        try {

            debug("Starting WASM load");

            importScripts(WASM_RUNTIME_URL);
            debug("Runtime loaded");

            const res = await fetch(WASM_URL);
            debug("WASM fetch", { ok: res.ok, status: res.status });

            const bytes = await res.arrayBuffer();
            debug("WASM bytes", { size: bytes.byteLength });

            const module = await self.TeaVM.wasmGC.load(bytes, {
                stackDeobfuscator: { enabled: false }
            });

            debug("TeaVM loaded");

            if (!module.exports) {
                throw new Error("module.exports missing");
            }

            if (!module.exports.raycastColumnsBatch) {
                throw new Error("Missing raycastColumnsBatch export");
            }

            WorkerState.wasm = module;
            WorkerState.batchPoC = module.exports.raycastColumnsBatch;

            debug("WASM ready", {
                exports: Object.keys(module.exports)
            });

            postWasmStatus("ready");

            return module;

        } catch (err) {

            debug("WASM FAILED", {
                error: err?.stack || err?.message || String(err)
            });

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
    const texGrid = new Int32Array(w * h);  // ADD THIS

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const tile = map[y][x];
            if (tile && tile.type === "wall") {
                grid[y * w + x] = 1;
                texGrid[y * w + x] = tile.textureId ?? 0;  // ADD THIS
            }
        }
    }
    return { grid, texGrid, w, h };  // ADD texGrid
}

/* =========================================================
   RAYCAST CORE
   FIX: use WorkerState.static.map instead of d.map_01
        (d.map_01 is only present on 'init' messages, not 'frame' messages)
========================================================= */

function castRayColumn(x, s, map, math) {

    if (!map || !map[0]) return null;

    const rayAngle = math.rayAngle(
        s.playerAngle,
        s.playerFOV,
        x,
        s.numCastRays
    );

    const cosA = math.cos(rayAngle);
    const sinA = math.sin(rayAngle);

    let rayX = s.posX;
    let rayY = s.posZ;

    let cellX = Math.floor(rayX / s.tileSize);
    let cellY = Math.floor(rayY / s.tileSize);

    let distX =
        cosA !== 0
            ? ((cosA > 0 ? cellX + 1 : cellX) * s.tileSize - rayX) / cosA
            : Infinity;

    let distY =
        sinA !== 0
            ? ((sinA > 0 ? cellY + 1 : cellY) * s.tileSize - rayY) / sinA
            : Infinity;

    const deltaX = Math.abs(s.tileSize / cosA);
    const deltaY = Math.abs(s.tileSize / sinA);

    let steps = 0;
    let distance = 0;
    let hit = false;
    let side = null;
    let texture = null;

    let lastFloor = null;
    let floorTex = "floor_concrete";

    while (steps++ < s.maxRayDepth * 2 && !hit) {

        if (distX < distY) {
            distance = distX;
            cellX += cosA > 0 ? 1 : -1;
            distX += deltaX;
            side = "y";
        } else {
            distance = distY;
            cellY += sinA > 0 ? 1 : -1;
            distY += deltaY;
            side = "x";
        }

        if (
            cellX < 0 || cellY < 0 ||
            cellX >= map[0].length ||
            cellY >= map.length
        ) break;

        const tile = map[cellY][cellX];
        if (!tile) break;

        if (tile.type === "wall") {
            const tex = s.textureMap[tile.textureId] || "wall_default";
            const transparent = s.transparency[tex];

            if (!transparent) {
                hit = true;
                texture = tex;

                if (lastFloor) {
                    floorTex =
                        s.floorMap[lastFloor.floorTextureId] || floorTex;
                }
            }
        } else {
            lastFloor = tile;
            floorTex =
                s.floorMap[tile.floorTextureId] || floorTex;
        }
    }

    if (!hit) return null;

    const angleDiff = rayAngle - s.playerAngle;
    const corrected = distance * Q_rsqrt(1 + angleDiff * angleDiff);

    // Compute textureX at cast time — hitSide and distance are already known
    const hitWorldX = s.posX + cosA * corrected;  // use corrected? No, use distance
    // Actually use pre-correction distance for texture coord
    const hitAlongWall = side === "y" ? (s.posZ + sinA * distance) : (s.posX + cosA * distance);
    let textureX = (hitAlongWall % s.tileSize) / s.tileSize;
    if (textureX < 0) textureX += 1;
    if (side === "y" && cosA > 0) textureX = 1 - textureX;
    if (side === "x" && sinA < 0) textureX = 1 - textureX;

    return {
        column: x,
        distance: corrected,
        hitSide: side,
        textureKey: texture,
        floorTextureKey: floorTex,
        textureX,          // ← add this
        backend: "js"
    };
}

/* =========================================================
   MAIN LOOP
========================================================= */

self.addEventListener("message", async (e) => {

    const t0 = performance?.now?.() ?? Date.now();

    try {

        const d = e.data;

        if (d.type === "init") {

            debug("INIT received");

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

            // FIX: guard flattenMap — map_01 must be a valid 2D array
            if (d.map_01 && Array.isArray(d.map_01) && d.map_01[0]) {
                WorkerState.flatMap = flattenMap(d.map_01);
            } else {
                debug("INIT: map_01 missing or invalid, flatMap not built");
            }

            if (WorkerState.static.useWasm) {
                debug("WASM requested");
                await loadWasm();
                debug("WASM init done");
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

        const useWasm = !!WorkerState.wasm && s.useWasm;

        const rayCount = d.endRay - d.startRay;

        /* ================= WASM PATH ================= */

        if (useWasm && WorkerState.batchPoC && WorkerState.flatMap) {

            debug("WASM path entered", { frameId: d.frameId });
            ensureBuffers(rayCount);
            debug("Calling batchPoC", { rayCount, start: d.startRay, end: d.endRay });

            WorkerState.batchPoC(
                s.posX, s.posZ, s.playerAngle, s.playerFOV,
                d.startRay, d.endRay, s.numCastRays, s.tileSize,
                WorkerState.flatMap.w, WorkerState.flatMap.h,
                WorkerState.flatMap.grid, s.maxRayDepth,
                WorkerState.outDistance, WorkerState.outHit, WorkerState.outSide
            );

            debug("batchPoC finished");

            const rayData = new Array(rayCount);

            for (let i = 0; i < rayCount; i++) {

                if (WorkerState.outHit[i] === 0) {
                    rayData[i] = null;
                    continue;
                }

                const dist = WorkerState.outDistance[i];
                const side = WorkerState.outSide[i];

                // MUST be declared here (fixes your crash)
                let textureKey = "wall_creamlol";

                const rayIndex = d.startRay + i;
                const a =
                    s.playerAngle +
                    (-s.playerFOV / 2 + (rayIndex / s.numCastRays) * s.playerFOV);

                const cosA = Math.cos(a);
                const sinA = Math.sin(a);

                const hitX = s.posX + cosA * dist;
                const hitY = s.posZ + sinA * dist;

                const tileSize = s.tileSize;

                let hitAlongWall = (side === 1) ? hitY : hitX;

                let textureX = (hitAlongWall % tileSize) / tileSize;
                if (textureX < 0) textureX += 1;

                if (side === 1 && cosA > 0) textureX = 1 - textureX;
                if (side === 0 && sinA < 0) textureX = 1 - textureX;

                // IMPORTANT: assign ray output LAST
                rayData[i] = {
                    column: d.startRay + i,
                    distance: dist,
                    hitSide: side === 1 ? "y" : "x",
                    textureKey,
                    textureX,
                    floorTextureKey: "floor_concrete_01",
                    backend: "wasm"
                };
            }

            // THIS WAS MISSING — without it execution falls through to the JS path
            self.postMessage({
                type: "frame",
                frameId: d.frameId,
                startRay: d.startRay,
                rayData,
                workerTime: (performance?.now?.() ?? Date.now()) - t0
            });

            return; // AND THIS
        }

        /* ================= JS FALLBACK ================= */

        // FIX: use WorkerState.static.map — d.map_01 is undefined on frame messages
        const map = WorkerState.static.map;

        if (!map || !Array.isArray(map) || !map[0]) {
            self.postMessage({
                type: "error",
                error: "Map not available in worker state",
                frameId: d.frameId,
                workerTime: (performance?.now?.() ?? Date.now()) - t0
            });
            return;
        }

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

        return;

        WorkerState.cpuAccum += (performance?.now?.() ?? Date.now()) - t0;

    } catch (err) {

        self.postMessage({
            type: "error",
            error: err?.message || String(err),
            stack: err?.stack || null,
            frameId: e.data?.frameId ?? -1,
            workerTime: (performance?.now?.() ?? Date.now()) - t0
        });
    }
});