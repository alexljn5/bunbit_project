// renderWorker.js
import { createWorkerDebug } from '../../debug/workerdebug.js';
const wd = createWorkerDebug('renderengine-worker');
let __wdCount = 0;
self.addEventListener("message", (e) => {
    const d = e.data;

    // Handle init message
    if (d.type === "init") {
        wd.setName('renderengine-worker-' + (d.workerId != null ? d.workerId : '?'));
        wd.heartbeat();
        wd.log('started');
        self.postMessage({ type: "init", success: true });
        return;
    }

    const { rayData, startRay, endRay, tileSectors, CANVAS_HEIGHT, CANVAS_WIDTH } = d;
    const wallData = [];

    for (let i = startRay; i < endRay; i++) {
        const ray = rayData[i];
        if (!ray) continue;

        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
        const wallBottom = wallTop + wallHeight;

        // Use textureX from ray data if available, otherwise compute it
        let textureX = ray.textureX;
        if (textureX === undefined) {
            // Fallback: compute from hitSide (simplified)
            textureX = 0.5;
        }
        textureX = Math.max(0, Math.min(1, textureX));

        wallData.push({
            column: ray.column,
            wallTop,
            wallBottom,
            textureX,
            textureKey: ray.textureKey,
        });
    }

    wd.markTask();
    __wdCount++;
    if (__wdCount % 60 === 0) wd.log('processed task', __wdCount);
    self.postMessage({ startRay, wallData });
});