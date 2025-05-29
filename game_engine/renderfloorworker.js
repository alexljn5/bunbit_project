// renderfloorworker.js
self.addEventListener("message", (e) => {
    const {
        rayData,
        playerX,
        playerZ,
        playerAngle,
        playerFOV,
        tileSectors,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        numCastRays,
        floorTextures,
        frameId
    } = e.data;

    // Precompute cos/sin for each ray column
    const rayAngles = new Float32Array(numCastRays);
    const cosAngles = new Float32Array(numCastRays);
    const sinAngles = new Float32Array(numCastRays);
    for (let x = 0; x < numCastRays; x++) {
        rayAngles[x] = playerAngle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);
        cosAngles[x] = Math.cos(rayAngles[x]);
        sinAngles[x] = Math.sin(rayAngles[x]);
    }

    // Hoist constants
    const projectionPlaneDist = (CANVAS_WIDTH / 2) / Math.tan(playerFOV / 2);
    const halfCanvasHeight = CANVAS_HEIGHT / 2;
    const halfTile = tileSectors / 2;

    // Output: for each x, an object { texKey, data: Float32Array } or null
    const floorPixels = new Array(numCastRays);
    for (let x = 0; x < numCastRays; x++) {
        const ray = rayData[x];
        if (!ray || !ray.floorTextureKey) {
            floorPixels[x] = null;
            continue;
        }
        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallBottom = (CANVAS_HEIGHT + wallHeight) / 2;
        const cosA = cosAngles[x];
        const sinA = sinAngles[x];
        const yStart = Math.floor(wallBottom);
        const clampedYStart = Math.min(yStart, CANVAS_HEIGHT);
        const yCount = Math.floor((CANVAS_HEIGHT - clampedYStart) / 2);
        if (yCount <= 0) {
            floorPixels[x] = null;
            continue;
        }
        const arr = new Float32Array(yCount * 3); // [y, texX, texY, ...]
        let idx = 0;
        for (let y = clampedYStart; y < CANVAS_HEIGHT; y += 2) {
            const rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
            const floorX = playerX + rowDistance * cosA;
            const floorY = playerZ + rowDistance * sinA;
            const textureX = ((floorX % tileSectors + tileSectors) % tileSectors) / tileSectors;
            const textureY = ((floorY % tileSectors + tileSectors) % tileSectors) / tileSectors;
            arr[idx++] = y;
            arr[idx++] = textureX;
            arr[idx++] = textureY;
        }
        floorPixels[x] = {
            texKey: ray.floorTextureKey,
            data: arr
        };
    }
    self.postMessage({ frameId, floorPixels });
});
