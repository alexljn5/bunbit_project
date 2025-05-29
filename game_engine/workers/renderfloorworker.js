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
        frameId
    } = e.data;

    // Precompute ray angles, cos, and sin in a single tight loop
    const rayAngles = new Float32Array(numCastRays);
    const cosAngles = new Float32Array(numCastRays);
    const sinAngles = new Float32Array(numCastRays);
    const fovStep = playerFOV / numCastRays;
    let angle = playerAngle - playerFOV / 2;
    for (let x = 0; x < numCastRays; x++, angle += fovStep) {
        rayAngles[x] = angle;
        cosAngles[x] = Math.cos(angle);
        sinAngles[x] = Math.sin(angle);
    }

    const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
    const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
    const halfTile = tileSectors * 0.5;

    // Preallocate output array
    const floorPixels = new Array(numCastRays);
    for (let x = 0; x < numCastRays; x++) {
        const ray = rayData[x];
        if (!ray || !ray.floorTextureKey) {
            floorPixels[x] = null;
            continue;
        }
        // Calculate wall height and bottom
        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallBottom = (CANVAS_HEIGHT + wallHeight) * 0.5;
        const cosA = cosAngles[x];
        const sinA = sinAngles[x];
        const yStart = Math.floor(wallBottom);
        const clampedYStart = Math.min(yStart, CANVAS_HEIGHT);
        const yCount = Math.floor((CANVAS_HEIGHT - clampedYStart) * 0.5);
        if (yCount <= 0) {
            floorPixels[x] = null;
            continue;
        }
        // Use a single Float32Array for all scanlines
        const arr = new Float32Array(yCount * 3); // [y, texX, texY, ...]
        let idx = 0;
        let y = clampedYStart;
        // Initial rowDistance
        let rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
        let floorX = playerX + rowDistance * cosA;
        let floorY = playerZ + rowDistance * sinA;
        const step = 2;
        let prevRowDistance = rowDistance;
        for (let i = 0; i < yCount; i++, y += step) {
            if (i > 0) {
                rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
                const dr = rowDistance - prevRowDistance;
                floorX += dr * cosA;
                floorY += dr * sinA;
                prevRowDistance = rowDistance;
            }
            // Clamp and wrap texture coordinates
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