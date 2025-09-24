let staticData = null;
let latestFrameId = -1;

// Worker CPU sampling (accumulate busy time and report periodically)
let __workerCpuAccum = 0;
let __workerSampleStart = (typeof performance !== 'undefined') ? performance.now() : Date.now();
let __workerId = null;
const __perfChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('perf_monitor') : null;
function __postWorkerCpu(usagePercent) {
    const payload = { type: 'worker_cpu', usages: [{ id: __workerId || 'raycast', usage: Math.round(usagePercent * 10) / 10 }] };
    try {
        if (__perfChannel) __perfChannel.postMessage(payload);
        else self.postMessage(payload);
    } catch (err) {
        // best-effort
    }
}
setInterval(() => {
    try {
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const interval = Math.max(1, now - __workerSampleStart);
        const percent = Math.min(100, (__workerCpuAccum / interval) * 100);
        __postWorkerCpu(percent);
        __workerCpuAccum = 0;
        __workerSampleStart = now;
    } catch (err) {
        // ignore
    }
}, 500);

self.addEventListener("message", (e) => {
    const startTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();

    try {
        if (e.data.type === "init") {
            staticData = {
                tileSectors: e.data.tileSectors,
                map_01: e.data.map_01,
                textureIdMap: e.data.textureIdMap,
                floorTextureIdMap: e.data.floorTextureIdMap,
                CANVAS_WIDTH: e.data.CANVAS_WIDTH,
                numCastRays: e.data.numCastRays,
                maxRayDepth: e.data.maxRayDepth,
                textureTransparencyMap: e.data.textureTransparencyMap || {}
            };
            __workerId = e.data.workerId || __workerId;
            self.postMessage({ type: "init", success: true });
            return;
        }

        if (!staticData) throw new Error("Worker not initialized");

        if (e.data.type === "updateSettings") {
            staticData.numCastRays = e.data.numCastRays;
            staticData.maxRayDepth = e.data.maxRayDepth;
            self.postMessage({ type: "updateSettings", success: true });
            return;
        }

        const { startRay, endRay, posX, posZ, playerAngle, playerFOV, frameId } = e.data;
        if (frameId < latestFrameId) return; // Drop old frames
        latestFrameId = frameId;

        const {
            tileSectors, map_01, textureIdMap,
            floorTextureIdMap, CANVAS_WIDTH, numCastRays, maxRayDepth
        } = staticData;

        const rayCount = endRay - startRay;
        const rayData = new Array(rayCount);

        for (let i = 0; i < rayCount; i++) {
            const x = startRay + i;
            const rayAngle = playerAngle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);
            const cosAngle = fastCos(rayAngle);
            const sinAngle = fastSin(rayAngle);

            let distance = 0;
            let rayX = posX;
            let rayY = posZ;
            let cellX = Math.floor(rayX / tileSectors);
            let cellY = Math.floor(rayY / tileSectors);
            let distToNextX = cosAngle !== 0 ? ((cosAngle > 0 ? cellX + 1 : cellX) * tileSectors - rayX) / cosAngle : Infinity;
            let distToNextY = sinAngle !== 0 ? ((sinAngle > 0 ? cellY + 1 : cellY) * tileSectors - rayY) / sinAngle : Infinity;
            const deltaDistX = Math.abs(tileSectors / cosAngle);
            const deltaDistY = Math.abs(tileSectors / sinAngle);

            let steps = 0;
            let hit = false;
            let hitSide = null;
            let hitWallType = null;
            let textureKey = null;
            let floorTextureKey = "floor_concrete";
            let floorX = 0, floorY = 0;
            let lastFloorTile = null;

            while (steps++ < maxRayDepth * 2 && !hit && distance < maxRayDepth * tileSectors) {
                if (distToNextX < distToNextY) {
                    distance = distToNextX;
                    cellX += cosAngle > 0 ? 1 : -1;
                    distToNextX += deltaDistX;
                    hitSide = "y";
                } else {
                    distance = distToNextY;
                    cellY += sinAngle > 0 ? 1 : -1;
                    distToNextY += deltaDistY;
                    hitSide = "x";
                }

                if (
                    cellX < 0 || cellY < 0 ||
                    cellX >= map_01[0].length || cellY >= map_01.length
                ) break;

                const tile = map_01[cellY][cellX];
                if (!tile || typeof tile !== "object") break;

                // New logic for transparent walls
                if (tile.type === "wall") {
                    // Check transparency from passed transparency map
                    const textureName = textureIdMap[tile.textureId] || "wall_creamlol";
                    const isTransparent = staticData.textureTransparencyMap && staticData.textureTransparencyMap[textureName];
                    if (!isTransparent) {
                        hit = true;
                        hitWallType = tile.type;
                        textureKey = textureName;
                        if (lastFloorTile)
                            floorTextureKey = floorTextureIdMap[lastFloorTile.floorTextureId] || floorTextureKey;
                    } else {
                        // Transparent wall hit, record hit but continue raycasting
                        if (!rayData[i]) rayData[i] = [];
                        rayData[i].push({
                            distance,
                            hitSide,
                            textureKey: textureName,
                            floorTextureKey,
                            floorX: rayX + distance * cosAngle,
                            floorY: rayY + distance * sinAngle
                        });
                        // Continue without setting hit = true
                    }
                } else if (tile.type === "empty") {
                    lastFloorTile = tile;
                    floorTextureKey = floorTextureIdMap[tile.floorTextureId] || floorTextureKey;
                    floorX = rayX + distance * cosAngle;
                    floorY = rayY + distance * sinAngle;
                }
            }

            if (hit) {
                const angleDiff = rayAngle - playerAngle;
                const cosApprox = Q_rsqrt(1 + angleDiff * angleDiff);
                const correctedDistance = distance * cosApprox;
                let hitX = rayX + distance * cosAngle;
                let hitY = rayY + distance * sinAngle;
                if (hitSide === "y") hitX = (cosAngle > 0 ? cellX : cellX + 1) * tileSectors;
                if (hitSide === "x") hitY = (sinAngle > 0 ? cellY : cellY + 1) * tileSectors;

                rayData[i] = {
                    column: x,
                    distance: correctedDistance,
                    wallType: hitWallType,
                    hitX, hitY,
                    hitSide,
                    textureKey,
                    floorTextureKey,
                    floorX, floorY
                };
            } else {
                rayData[i] = null;
            }
        }

        self.postMessage({
            type: "frame",
            startRay,
            frameId,
            rayData,
            workerTime: performance.now() - startTime
        });

        // Accumulate busy time for CPU sampling
        try {
            const tEnd = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            __workerCpuAccum += (tEnd - startTime);
        } catch (err) {
            // ignore
        }
    } catch (err) {
        self.postMessage({
            type: "error",
            error: err.message,
            frameId: e.data.frameId || -1,
            workerTime: (typeof performance !== 'undefined') ? performance.now() - startTime : 0
        });

        // also account for time spent until error
        try {
            const tErr = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            __workerCpuAccum += (tErr - startTime);
        } catch (er) {
            // ignore
        }
    }
});

// --- Math Tables for Ultra-Fast Trig ---
const SIN_TABLE_BITS = 11;                // 2^11 = 2048 entries
const SIN_TABLE_SIZE = 1 << SIN_TABLE_BITS;
const SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
const FIXED_POINT_SHIFT = 16;
const ANGLE_SCALE = (SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (Math.PI * 2) | 0;

const sinTable = new Float32Array(SIN_TABLE_SIZE);
const cosTable = new Float32Array(SIN_TABLE_SIZE);

for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = (i * 2 * Math.PI) / SIN_TABLE_SIZE;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

// Bitshift-based fastSin / fastCos
function fastSin(angle) {
    const idx = ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return sinTable[idx];
}

function fastCos(angle) {
    const idx = ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return cosTable[idx];
}

// --- Ultra-fast Inverse Square Root (Q_rsqrt) ---
const buf = new ArrayBuffer(4);
const f = new Float32Array(buf);
const i = new Uint32Array(buf);

function Q_rsqrt(number) {
    const x2 = number * 0.5;
    f[0] = number;
    i[0] = 0x5f3759df - (i[0] >> 1);
    f[0] = f[0] * (1.5 - x2 * f[0] * f[0]); // 1 NR iteration
    return f[0];
}
