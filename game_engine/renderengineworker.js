// renderWorker.js
self.addEventListener("message", (e) => {
    const { rayData, startRay, endRay, tileSectors, CANVAS_HEIGHT, CANVAS_WIDTH } = e.data;
    const wallData = [];

    for (let i = startRay; i < endRay; i++) {
        const ray = rayData[i];
        if (!ray) continue;

        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
        const wallBottom = wallTop + wallHeight;

        let textureX;
        if (ray.hitSide === "x") {
            textureX = (ray.hitX % tileSectors) / tileSectors;
        } else {
            textureX = (ray.hitY % tileSectors) / tileSectors;
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

    self.postMessage({ startRay, wallData });
});