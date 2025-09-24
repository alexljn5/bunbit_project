// Worker to precompute wall rendering quads for a sector
// Worker CPU sampling (accumulate busy time and report periodically)
let __workerCpuAccum = 0;
let __workerSampleStart = (typeof performance !== 'undefined') ? performance.now() : Date.now();
let __workerId = null;
const __perfChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('perf_monitor') : null;
function __postWorkerCpu(usagePercent) {
    const payload = { type: 'worker_cpu', usages: [{ id: __workerId || 'wallprecompute', usage: Math.round(usagePercent * 10) / 10 }] };
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
    const data = e.data;
    if (!data || data.type !== 'precompute') return;
    __workerId = data.workerId || data.sectorKey || __workerId;
    const { sectorKey, sector, numCastRays, CANVAS_WIDTH, CANVAS_HEIGHT, tileSectors } = data;
    try {
        const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        // Each ray will produce one quad with 8 floats: topX, topY, leftX, leftY, rightX, rightY, textureX, alpha
        const floatsPerRay = 8;
        const geom = new Float32Array(numCastRays * floatsPerRay);
        const textureKeys = new Array(numCastRays);

        const defaultTextureKey = sector?.walls?.[0]?.texture || 'wall_creamlol';
        const colWidth = CANVAS_WIDTH / numCastRays;
        const tileSectorsInv = 1 / tileSectors;

        for (let i = 0; i < numCastRays; i++) {
            const colX = i * colWidth;
            const nextColX = colX + colWidth;

            // Simplified synthetic ray info for precompute (distance heuristic)
            const ray = {
                distance: sector && sector.defaultDistance ? sector.defaultDistance : 10,
                hitSide: 'x',
                hitX: i / numCastRays,
                textureKey: (sector && sector.walls && sector.walls[0] && sector.walls[0].texture) || defaultTextureKey
            };

            const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            const wallTop = (CANVAS_HEIGHT - wallHeight) * 0.5;
            const wallBottom = wallTop + wallHeight;

            const texHit = ray.hitSide === 'x' ? ray.hitX : (ray.hitY || 0);
            let textureX = (texHit % tileSectors) * tileSectorsInv;
            textureX = Math.max(0, Math.min(1, textureX));

            const base = i * floatsPerRay;
            geom[base + 0] = colX;
            geom[base + 1] = wallTop;
            geom[base + 2] = colX;
            geom[base + 3] = wallBottom;
            geom[base + 4] = nextColX;
            geom[base + 5] = wallBottom;
            geom[base + 6] = textureX;
            geom[base + 7] = 1; // alpha

            textureKeys[i] = ray.textureKey;
        }

        const t1 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        __workerCpuAccum += (t1 - t0);

        // Transfer the underlying buffer for zero-copy
        self.postMessage({ type: 'precomputed', sectorKey, numRays: numCastRays, floatsPerRay, geometryBuffer: geom.buffer, textureKeys }, [geom.buffer]);
    } catch (err) {
        self.postMessage({ type: 'error', sectorKey, message: err.message });
    }
};
