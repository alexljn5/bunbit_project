"use strict";

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

    // Stage 2 buffers (reused)
    outDistance: null,
    outHit: null,
    outSide: null,

    // IMPORTANT: persistent flattened map (NO per-frame allocation)
    flatMap: null
};

/* =========================================================
   MATH BACKEND (JS FALLBACK)
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
   FAST INVERSE SQRT
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
            importScripts(WASM_RUNTIME_URL);

            const res = await fetch(WASM_URL);
            const bytes = await res.arrayBuffer();

            const instance = await self.TeaVM.wasmGC.load(bytes, {
                stackDeobfuscator: { enabled: false }
            });

            const exports = instance.exports;

            if (!exports.fastSin || !exports.fastCos) {
                throw new Error("WASM missing fastSin/fastCos");
            }

            WorkerState.wasm = exports;
            WorkerState.batchPoC = exports.raycastColumnsBatch || null;

            postWasmStatus("ready");
            return exports;

        } catch (e) {
            WorkerState.wasm = null;
            postWasmStatus("fallback");
            return null;

        } finally {
            WorkerState.wasmPromise = null;
        }
    })();

    return WorkerState.wasmPromise;
}

/* =========================================================
   CPU METRICS
========================================================= */

function postCpu() {
    const now = performance?.now?.() ?? Date.now();
    const interval = Math.max(1, now - WorkerState._lastCpuTime);

    const percent = Math.min(100, (WorkerState.cpuAccum / interval) * 100);

    const payload = {
        type: "worker_cpu",
        usages: [{
            id: WorkerState.workerId || "raycast",
            usage: Math.round(percent * 10) / 10
        }]
    };

    try {
        WorkerState.perfChannel
            ? WorkerState.perfChannel.postMessage(payload)
            : self.postMessage(payload);
    } catch { }

    WorkerState.cpuAccum = 0;
    WorkerState._lastCpuTime = now;
}

WorkerState._lastCpuTime = performance?.now?.() ?? Date.now();
setInterval(postCpu, 500);

/* =========================================================
   MAP FLATTEN (CALLED ONLY ON INIT)
========================================================= */

function flattenMap(map) {
    const h = map.length;
    const w = map[0].length;

    const grid = new Int32Array(w * h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const tile = map[y][x];
            grid[y * w + x] = tile && tile.type === "wall" ? 1 : 0;
        }
    }

    return { grid, w, h };
}

/* =========================================================
   RAYCAST CORE (JS FALLBACK ONLY)
========================================================= */

function castRayColumn(x, s, map, math, wasm) {
    const rayAngle = math.rayAngle(
        s.playerAngle,
        s.playerFOV,
        x,
        s.numCastRays
    );

    const cosA = wasm ? WorkerState.wasm.fastCos(rayAngle) : math.cos(rayAngle);
    const sinA = wasm ? WorkerState.wasm.fastSin(rayAngle) : math.sin(rayAngle);

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

    return {
        column: x,
        distance: corrected,
        hitSide: side,
        textureKey: texture,
        floorTextureKey: floorTex,
        hitX: rayX + distance * cosA,
        hitY: rayY + distance * sinA,
        backend: wasm ? "wasm" : "js"
    };
}

/* =========================================================
   MESSAGE HANDLER
========================================================= */

self.addEventListener("message", async (e) => {
    const t0 = performance?.now?.() ?? Date.now();

    try {
        const d = e.data;

        /* ---------------- INIT ---------------- */
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

            WorkerState.flatMap = flattenMap(d.map_01);

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

        const map = s.map;
        const useWasm = !!WorkerState.wasm && s.useWasm;

        const rayCount = d.endRay - d.startRay;

        /* =====================================================
           STAGE 2 WASM DDA PATH
        ===================================================== */

        if (useWasm && WorkerState.batchPoC) {

            if (!WorkerState.outDistance || WorkerState.outDistance.length < rayCount) {
                WorkerState.outDistance = new Float64Array(rayCount);
                WorkerState.outHit = new Int32Array(rayCount);
                WorkerState.outSide = new Int32Array(rayCount);
            }

            WorkerState.batchPoC(
                s.posX,
                s.posZ,
                s.playerAngle,
                s.playerFOV,
                d.startRay,
                d.endRay,
                s.numCastRays,
                s.tileSize,
                WorkerState.flatMap.w,
                WorkerState.flatMap.h,
                WorkerState.flatMap.grid,
                s.maxRayDepth,
                WorkerState.outDistance,
                WorkerState.outHit,
                WorkerState.outSide
            );

            const rayData = new Array(rayCount);

            for (let i = 0; i < rayCount; i++) {
                if (!WorkerState.outHit[i]) {
                    rayData[i] = null;
                    continue;
                }

                rayData[i] = {
                    column: d.startRay + i,
                    distance: WorkerState.outDistance[i],
                    hitSide: WorkerState.outSide[i] ? "y" : "x",
                    textureKey: "wall_default",
                    floorTextureKey: "floor_concrete",
                    hitX: null,
                    hitY: null,
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

            WorkerState.cpuAccum += (performance?.now?.() ?? Date.now()) - t0;
            return;
        }

        /* =====================================================
           FALLBACK PATH
        ===================================================== */

        const rayData = new Array(rayCount);

        for (let i = 0; i < rayCount; i++) {
            const x = d.startRay + i;
            rayData[i] = castRayColumn(x, s, map, MathBackend, useWasm);
        }

        self.postMessage({
            type: "frame",
            frameId: d.frameId,
            startRay: d.startRay,
            rayData,
            workerTime: (performance?.now?.() ?? Date.now()) - t0
        });

        WorkerState.cpuAccum += (performance?.now?.() ?? Date.now()) - t0;

    } catch (err) {
        self.postMessage({
            type: "error",
            error: err.message,
            frameId: e.data?.frameId ?? -1,
            workerTime: (performance?.now?.() ?? Date.now()) - t0
        });
    }
});