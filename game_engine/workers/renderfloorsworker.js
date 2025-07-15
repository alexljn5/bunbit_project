////////////Old, might be repurposed later////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const SIN_TABLE_SIZE = 2048;
const TWO_PI = Math.PI * 2;
const sinTable = new Float32Array(SIN_TABLE_SIZE);
const cosTable = new Float32Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = (i / SIN_TABLE_SIZE) * TWO_PI;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

function fastSin(angle) {
    let idx = Math.floor((angle % TWO_PI) / TWO_PI * SIN_TABLE_SIZE);
    if (idx < 0) idx += SIN_TABLE_SIZE;
    return sinTable[idx];
}

function fastCos(angle) {
    let idx = Math.floor((angle % TWO_PI) / TWO_PI * SIN_TABLE_SIZE);
    if (idx < 0) idx += SIN_TABLE_SIZE;
    return cosTable[idx];
}

function Q_rsqrt(number) {
    const threehalfs = 1.5;
    const x2 = number * 0.5;
    let y = number;
    const buf = new ArrayBuffer(4);
    const f = new Float32Array(buf);
    const i = new Uint32Array(buf);
    f[0] = y;
    i[0] = 0x5f3759df - (i[0] >> 1);
    y = f[0];
    y = y * (threehalfs - (x2 * y * y));
    return y;
}

let staticData = null;
let latestFrameId = -1;

self.addEventListener("message", (e) => {
    const startTime = performance.now();

    try {
        if (e.data.type === "init") {
            staticData = {
                tileSectors: e.data.tileSectors,
                CANVAS_HEIGHT: e.data.CANVAS_HEIGHT,
                CANVAS_WIDTH: e.data.CANVAS_WIDTH,
                numCastRays: e.data.numCastRays,
                playerFOV: e.data.playerFOV,
                floorTextureKey: e.data.floorTextureKey
            };
            self.postMessage({ type: "init", success: true });
            return;
        }

        if (e.data.type === "update") {
            if (!staticData) throw new Error("Worker not initialized");
            staticData.CANVAS_WIDTH = e.data.CANVAS_WIDTH;
            staticData.CANVAS_HEIGHT = e.data.CANVAS_HEIGHT;
            staticData.numCastRays = e.data.numCastRays;
            self.postMessage({ type: "update", success: true });
            return;
        }

        if (!staticData) throw new Error("Worker not initialized");

        const { rayData, startRay, endRay, playerPosition, frameId } = e.data;
        if (frameId < latestFrameId) return;
        latestFrameId = frameId;

        if (!rayData || !Array.isArray(rayData)) {
            self.postMessage({
                type: "error",
                error: "Invalid or missing rayData",
                frameId,
                workerTime: performance.now() - startTime
            });
            return;
        }

        const { tileSectors, CANVAS_HEIGHT, CANVAS_WIDTH, numCastRays, playerFOV } = staticData;
        const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
        const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
        const invTileSectors = 1 / tileSectors;
        const textureSize = 128;
        const numScanlines = Math.max(16, Math.min(32, Math.floor(numCastRays / 3))); // Scale: 16–64 scanlines
        const scanlineSteps = Array.from({ length: numScanlines }, (_, i) => i / (numScanlines - 1));

        const floorData = [];

        for (let i = 0; i < endRay - startRay; i++) {
            const x = startRay + i;
            const ray = rayData[i];
            if (!ray || !ray.distance || !ray.textureKey) {
                console.warn(`Skipping invalid ray at index ${i} (startRay: ${startRay})`);
                continue;
            }

            const rayAngle = playerPosition.angle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);
            const cosAngle = fastCos(rayAngle);
            const sinAngle = fastSin(rayAngle);
            const angleDiff = rayAngle - playerPosition.angle;
            const correctedDistance = ray.distance * Q_rsqrt(1 + angleDiff * angleDiff);

            // Calculate wall height and bottom
            const wallHeight = (tileSectors * projectionPlaneDist) / correctedDistance;
            const wallBottom = Math.min(halfCanvasHeight + wallHeight * 0.3, CANVAS_HEIGHT); // Offset to align with walls
            if (wallBottom <= 0) {
                console.warn(`Skipping ray ${x}: wallBottom ${wallBottom} <= 0`);
                continue;
            }

            // Compute texture coordinates for multiple scanlines
            const scanlines = [];
            for (let t of scanlineSteps) {
                const y = wallBottom + t * (CANVAS_HEIGHT - 1 - wallBottom);
                const floorDistance = (tileSectors * projectionPlaneDist) / (y - halfCanvasHeight + 0.0001);
                const floorX = playerPosition.x + floorDistance * cosAngle;
                const floorY = playerPosition.z + floorDistance * sinAngle;
                const texX = (floorX % tileSectors) * (1 / tileSectors);
                const texY = (floorY % tileSectors) * (1 / tileSectors);
                scanlines.push({
                    y,
                    texX: texX >= 0 ? texX : texX + 1,
                    texY: texY >= 0 ? texY : texY + 1
                });
            }

            floorData.push({
                column: x,
                wallBottom,
                scanlines
            });
        }

        self.postMessage({
            type: "frame",
            startRay,
            frameId,
            floorData,
            workerTime: performance.now() - startTime
        }, [floorData.buffer].filter(Boolean));
    } catch (err) {
        self.postMessage({
            type: "error",
            error: err.message,
            frameId: e.data.frameId || -1,
            workerTime: performance.now() - startTime
        });
    }
});
