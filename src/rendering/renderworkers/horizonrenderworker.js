let horizonBuffer32;
let textureDataFloor;
let textureWidthFloor = 0;
let textureHeightFloor = 0;
let textureDataRoof;
let textureWidthRoof = 0;
let textureHeightRoof = 0;
let CANVAS_WIDTH = 0;
let CANVAS_HEIGHT = 0;
let tileSectors = 0;
let playerFOV = 0;

// --- Ultra-Fast Math Tables for Worker ---
const SIN_TABLE_BITS = 10;               // 2^10 = 1024 entries
const SIN_TABLE_SIZE = 1 << SIN_TABLE_BITS;
const SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
const FIXED_POINT_SHIFT = 16;            // 16-bit fractional
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

// Optional: ultra-fast inverse square root
const buf = new ArrayBuffer(4);
const f = new Float32Array(buf);
const i = new Uint32Array(buf);

function Q_rsqrt(number) {
    const x2 = number * 0.5;
    f[0] = number;
    i[0] = 0x5f3759df - (i[0] >> 1);
    f[0] = f[0] * (1.5 - x2 * f[0] * f[0]);
    return f[0];
}

// Worker CPU sampling (accumulate busy time and report periodically)
let __workerCpuAccum = 0;
let __workerSampleStart = (typeof performance !== 'undefined') ? performance.now() : Date.now();
let __workerId = null;
const __perfChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('perf_monitor') : null;
function __postWorkerCpu(usagePercent) {
    const payload = { type: 'worker_cpu', usages: [{ id: __workerId || 'horizon', usage: Math.round(usagePercent * 10) / 10 }] };
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

self.onmessage = function (e) {
    const { type } = e.data;

    if (type === 'init') {
        CANVAS_WIDTH = e.data.CANVAS_WIDTH;
        CANVAS_HEIGHT = e.data.CANVAS_HEIGHT;
        tileSectors = e.data.tileSectors;
        playerFOV = e.data.playerFOV;
        __workerId = e.data.workerId || __workerId;
        const rowsPerWorker = e.data.rowsPerWorker || Math.ceil(CANVAS_HEIGHT / (e.data.numWorkers || 4));
        // Preallocate a buffer for this worker (Uint32 per pixel)
        horizonBuffer32 = new Uint32Array(CANVAS_WIDTH * rowsPerWorker);
        self.postMessage({ type: 'init_done' });
        return;
    }

    if (type === 'texture_floor') {
        textureDataFloor = new Uint32Array(e.data.textureData);
        textureWidthFloor = e.data.textureWidth;
        textureHeightFloor = e.data.textureHeight;
        console.log(`Worker received floor texture: ${textureWidthFloor}x${textureHeightFloor} *chao chao*`);
        return;
    }

    if (type === 'texture_roof') {
        textureDataRoof = new Uint32Array(e.data.textureData);
        textureWidthRoof = e.data.textureWidth;
        textureHeightRoof = e.data.textureHeight;
        console.log(`Worker received roof texture: ${textureWidthRoof}x${textureHeightRoof} *chao chao*`);
        return;
    }

    if (type === 'render') {
        const { playerPosition, startY, endY, workerId, clipYFloorBuffer, clipYRoofBuffer } = e.data;
        __workerId = workerId || __workerId;
        const rowCount = endY - startY;
        if (!horizonBuffer32 || horizonBuffer32.length < CANVAS_WIDTH * rowCount) {
            // Ensure buffer is large enough for this segment
            horizonBuffer32 = new Uint32Array(CANVAS_WIDTH * rowCount);
        }

        const tStart = (typeof performance !== 'undefined') ? performance.now() : Date.now();

        const halfHeight = CANVAS_HEIGHT * 0.5;
        const projectionDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);

        const wallColor = 0xFF000000; // Black for wall areas

        const workerClipYFloor = new Float32Array(clipYFloorBuffer);
        const workerClipYRoof = new Float32Array(clipYRoofBuffer);

        for (let y = startY; y < endY; y++) {
            const yOffset = (y - startY) * CANVAS_WIDTH;
            let pixelColor;

            if (y < halfHeight) {
                // Roof (ceiling) rendering
                const yCorrected = halfHeight - y;
                if (yCorrected <= 0) {
                    for (let x = 0; x < CANVAS_WIDTH; x++) {
                        horizonBuffer32[yOffset + x] = wallColor;
                    }
                    continue;
                }

                const distance = (projectionDist * tileSectors * 0.5) / yCorrected;
                const rayAngleLeft = playerPosition.angle - playerFOV * 0.5;
                const rayAngleRight = playerPosition.angle + playerFOV * 0.5;

                const horizX_left = playerPosition.x + distance * fastCos(rayAngleLeft);
                const horizZ_left = playerPosition.z + distance * fastSin(rayAngleLeft);
                const horizX_right = playerPosition.x + distance * fastCos(rayAngleRight);
                const horizZ_right = playerPosition.z + distance * fastSin(rayAngleRight);

                const horizX_step = (horizX_right - horizX_left) / CANVAS_WIDTH;
                const horizZ_step = (horizZ_right - horizZ_left) / CANVAS_WIDTH;

                const texScaleX = textureWidthRoof / tileSectors;
                const texScaleY = textureHeightRoof / tileSectors;
                const texX_step = horizX_step * texScaleX;
                const texY_step = horizZ_step * texScaleY;

                let texX = (horizX_left % tileSectors) * texScaleX;
                let texY = (horizZ_left % tileSectors) * texScaleY;

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    pixelColor = wallColor;
                    if (y <= workerClipYRoof[x]) {
                        const intTexX = Math.floor(texX) & (textureWidthRoof - 1);
                        const intTexY = Math.floor(texY) & (textureHeightRoof - 1);
                        const texOffset = intTexY * textureWidthRoof + intTexX;
                        pixelColor = textureDataRoof[texOffset];
                    }
                    horizonBuffer32[yOffset + x] = pixelColor;

                    texX += texX_step;
                    texY += texY_step;
                }
            } else {
                // Floor rendering
                const yCorrected = y - halfHeight;
                if (yCorrected <= 0) {
                    for (let x = 0; x < CANVAS_WIDTH; x++) {
                        horizonBuffer32[yOffset + x] = wallColor;
                    }
                    continue;
                }

                const distance = (projectionDist * tileSectors * 0.5) / yCorrected;
                const rayAngleLeft = playerPosition.angle - playerFOV * 0.5;
                const rayAngleRight = playerPosition.angle + playerFOV * 0.5;

                const horizX_left = playerPosition.x + distance * fastCos(rayAngleLeft);
                const horizZ_left = playerPosition.z + distance * fastSin(rayAngleLeft);
                const horizX_right = playerPosition.x + distance * fastCos(rayAngleRight);
                const horizZ_right = playerPosition.z + distance * fastSin(rayAngleRight);

                const horizX_step = (horizX_right - horizX_left) / CANVAS_WIDTH;
                const horizZ_step = (horizZ_right - horizZ_left) / CANVAS_WIDTH;

                const texScaleX = textureWidthFloor / tileSectors;
                const texScaleY = textureHeightFloor / tileSectors;
                const texX_step = horizX_step * texScaleX;
                const texY_step = horizZ_step * texScaleY;

                let texX = (horizX_left % tileSectors) * texScaleX;
                let texY = (horizZ_left % tileSectors) * texScaleY;

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    pixelColor = wallColor;
                    if (y >= workerClipYFloor[x]) {
                        const intTexX = Math.floor(texX) & (textureWidthFloor - 1);
                        const intTexY = Math.floor(texY) & (textureHeightFloor - 1);
                        const texOffset = intTexY * textureWidthFloor + intTexX;
                        pixelColor = textureDataFloor[texOffset];
                    }
                    horizonBuffer32[yOffset + x] = pixelColor;

                    texX += texX_step;
                    texY += texY_step;
                }
            }
        }

        // Transfer the buffer back to main thread for zero-copy
        try {
            const t1 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            __workerCpuAccum += (t1 - tStart);

            self.postMessage(
                {
                    type: 'render_done',
                    horizonBuffer: horizonBuffer32.buffer,
                    startY,
                    endY,
                    workerId
                },
                [horizonBuffer32.buffer]
            );
        } finally {
            // Recreate buffer for subsequent frames to keep worker ready
            horizonBuffer32 = new Uint32Array(CANVAS_WIDTH * (rowCount));
        }
    }
};