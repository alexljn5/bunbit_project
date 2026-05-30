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

    cpuAccum: 0,
    workerId: null,

    perfChannel:
        typeof BroadcastChannel !== "undefined"
            ? new BroadcastChannel("perf_monitor")
            : null,
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

    if (typeof WebAssembly === "undefined" || typeof importScripts !== "function") {
        postWasmStatus("fallback");
        return null;
    }

    postWasmStatus("loading");

    WorkerState.wasmPromise = (async () => {
        try {
            importScripts(WASM_RUNTIME_URL);

            if (!self.TeaVM?.wasmGC) {
                throw new Error("TeaVM runtime missing");
            }

            const res = await fetch(WASM_URL);
            if (!res.ok) {
                throw new Error(`WASM fetch failed: ${res.status}`);
            }

            const bytes = await res.arrayBuffer();
            const instance = await self.TeaVM.wasmGC.load(bytes, {
                stackDeobfuscator: { enabled: false }
            });

            const exports = instance.exports;

            if (
                typeof exports.fastSin !== "function" ||
                typeof exports.fastCos !== "function"
            ) {
                throw new Error("WASM exports missing fastSin/fastCos");
            }

            const test = exports.fastSin(0);
            if (!Number.isFinite(test)) {
                throw new Error("WASM runtime sanity test failed");
            }

            WorkerState.wasm = exports;
            postWasmStatus("ready");

            return exports;

        } catch (e) {
            console.warn("[WASM fallback]", e.message);
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
   RAYCAST CORE
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

        // optional debug hook
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

        const rayData = new Array(d.endRay - d.startRay);

        for (let i = 0; i < rayData.length; i++) {
            const x = d.startRay + i;

            rayData[i] = castRayColumn(
                x,
                s,
                map,
                MathBackend,
                useWasm
            );
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