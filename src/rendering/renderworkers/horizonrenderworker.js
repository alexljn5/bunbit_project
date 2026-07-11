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

// Precomputed constants
let texScaleXFloor = 0;
let texScaleYFloor = 0;
let texScaleXRoof = 0;
let texScaleYRoof = 0;

// WASM state
let wasmExports = null;
let wasmStatus = 'disabled';
let hasRaycast = false;
let hasRenderHorizon = false;

// Debug counters
let __wasmSinCosCalls = 0;
let __wasmFastSinFallbackCalls = 0;
let frameCount = 0;

let halfHeight = 0;
let projectionDist = 0;

// --- fast JS trig fallback ---
const SIN_TABLE_BITS = 10;
const SIN_TABLE_SIZE = 1 << SIN_TABLE_BITS;
const SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
const FIXED_POINT_SHIFT = 16;
const ANGLE_SCALE = (SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (Math.PI * 2) | 0;

const sinTable = new Float32Array(SIN_TABLE_SIZE);
const cosTable = new Float32Array(SIN_TABLE_SIZE);

for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const a = (i * 2 * Math.PI) / SIN_TABLE_SIZE;
    sinTable[i] = Math.sin(a);
    cosTable[i] = Math.cos(a);
}

function fastSinJs(a) {
    const idx = ((a * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return sinTable[idx];
}

function fastCosJs(a) {
    const idx = ((a * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return cosTable[idx];
}

function postWasmStatus(status) {
    wasmStatus = status;
    try {
        self.postMessage({ type: 'wasmStatus', status });
    } catch { }
}

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

function setWasmExports(exports) {
    // TeaVM exports may not use fastSin/fastCos names; we only enable WASM trig
    // when the required functions actually exist.
    const hasFs = typeof exports?.fastSin === 'function';
    const hasFc = typeof exports?.fastCos === 'function';
    const hasRhs = typeof exports?.renderHorizonSlice === 'function';

    if (exports && hasFs && hasFc) {
        wasmExports = exports;
        hasRaycast = hasFs && hasFc;
        hasRenderHorizon = hasRhs;
        postWasmStatus('ready');
        debug('[WASM horizon] WASM trig ready', { hasRaycast, hasRenderHorizon });
        return true;
    }

    // Expected in environments where WASM doesn't export trig helpers with these names.
    wasmExports = null;
    hasRaycast = false;
    hasRenderHorizon = false;
    postWasmStatus('fallback');
    debug('[WASM horizon] Using JS fallback - missing exports', { hasFastSin: hasFs, hasFastCos: hasFc, hasRenderHorizon: hasRhs });
    return false;
}

function fastSin(a) {
    if (wasmExports && hasRaycast) {
        __wasmSinCosCalls++;
        return wasmExports.fastSin(a);
    }
    __wasmFastSinFallbackCalls++;
    return fastSinJs(a);
}

function fastCos(a) {
    if (wasmExports && hasRaycast) {
        __wasmSinCosCalls++;
        return wasmExports.fastCos(a);
    }
    __wasmFastSinFallbackCalls++;
    return fastCosJs(a);
}

// --- worker setup ---
self.onmessage = function (e) {
    const { type } = e.data;

    // Handle WASM exports received from main thread
    if (type === 'wasmExports') {
        setWasmExports(e.data.wasmExports);
        return;
    }

    if (type === 'init') {
        CANVAS_WIDTH = e.data.CANVAS_WIDTH;
        CANVAS_HEIGHT = e.data.CANVAS_HEIGHT;
        tileSectors = e.data.tileSectors;
        playerFOV = e.data.playerFOV;

        const rowsPerWorker = e.data.rowsPerWorker || Math.ceil(CANVAS_HEIGHT / (e.data.numWorkers || 4));
        horizonBuffer32 = new Uint32Array(CANVAS_WIDTH * rowsPerWorker);

        halfHeight = CANVAS_HEIGHT * 0.5;
        projectionDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);

        self.postMessage({ type: 'init_done' });
        return;
    }

    if (type === 'texture_floor') {
        textureDataFloor = new Uint32Array(e.data.textureData);
        textureWidthFloor = e.data.textureWidth;
        textureHeightFloor = e.data.textureHeight;
        texScaleXFloor = textureWidthFloor / tileSectors;
        texScaleYFloor = textureHeightFloor / tileSectors;
        return;
    }

    if (type === 'texture_roof') {
        textureDataRoof = new Uint32Array(e.data.textureData);
        textureWidthRoof = e.data.textureWidth;
        textureHeightRoof = e.data.textureHeight;
        texScaleXRoof = textureWidthRoof / tileSectors;
        texScaleYRoof = textureHeightRoof / tileSectors;
        return;
    }

    if (type === 'render') {
        const { playerPosition, startY, endY, workerId, clipYFloorBuffer, clipYRoofBuffer } = e.data;

        const rowCount = endY - startY;
        const wallColor = 0xFF000000;

        const floorClip = new Float32Array(clipYFloorBuffer);
        const roofClip = new Float32Array(clipYRoofBuffer);

        for (let y = startY; y < endY; y++) {
            const yOffset = (y - startY) * CANVAS_WIDTH;

            if (y < halfHeight) {
                const yc = halfHeight - y;
                if (yc <= 0) continue;

                const dist = (projectionDist * tileSectors * 0.5) / yc;

                const aL = playerPosition.angle - playerFOV * 0.5;
                const aR = playerPosition.angle + playerFOV * 0.5;

                const xL = playerPosition.x + dist * fastCos(aL);
                const zL = playerPosition.z + dist * fastSin(aL);
                const xR = playerPosition.x + dist * fastCos(aR);
                const zR = playerPosition.z + dist * fastSin(aR);

                const dx = (xR - xL) / CANVAS_WIDTH;
                const dz = (zR - zL) / CANVAS_WIDTH;

                let tx = xL % tileSectors * texScaleXRoof;
                let tz = zL % tileSectors * texScaleYRoof;

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    let col = wallColor;
                    if (y <= roofClip[x]) {
                        const ix = (tx | 0) & (textureWidthRoof - 1);
                        const iz = (tz | 0) & (textureHeightRoof - 1);
                        col = textureDataRoof[iz * textureWidthRoof + ix];
                    }
                    horizonBuffer32[yOffset + x] = col;
                    tx += dx * texScaleXRoof;
                    tz += dz * texScaleYRoof;
                }

            } else {
                const yc = y - halfHeight;
                if (yc <= 0) continue;

                const dist = (projectionDist * tileSectors * 0.5) / yc;

                const aL = playerPosition.angle - playerFOV * 0.5;
                const aR = playerPosition.angle + playerFOV * 0.5;

                const xL = playerPosition.x + dist * fastCos(aL);
                const zL = playerPosition.z + dist * fastSin(aL);
                const xR = playerPosition.x + dist * fastCos(aR);
                const zR = playerPosition.z + dist * fastSin(aR);

                const dx = (xR - xL) / CANVAS_WIDTH;
                const dz = (zR - zL) / CANVAS_WIDTH;

                let tx = xL % tileSectors * texScaleXFloor;
                let tz = zL % tileSectors * texScaleYFloor;

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    let col = wallColor;
                    if (y >= floorClip[x]) {
                        const ix = (tx | 0) & (textureWidthFloor - 1);
                        const iz = (tz | 0) & (textureHeightFloor - 1);
                        col = textureDataFloor[iz * textureWidthFloor + ix];
                    }
                    horizonBuffer32[yOffset + x] = col;
                    tx += dx * texScaleXFloor;
                    tz += dz * texScaleYFloor;
                }
            }
        }

        self.postMessage({
            type: 'render_done',
            horizonBuffer: horizonBuffer32.buffer,
            startY,
            endY,
            workerId
        }, [horizonBuffer32.buffer]);

        horizonBuffer32 = new Uint32Array(CANVAS_WIDTH * rowCount);
        frameCount++;
    }
};