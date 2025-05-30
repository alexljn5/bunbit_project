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
    for (let x = 0; x < numCastRays; ++x, angle += fovStep) {
        rayAngles[x] = angle;
        cosAngles[x] = Math.cos(angle);
        sinAngles[x] = Math.sin(angle);
    }

    const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
    const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
    const halfTile = tileSectors * 0.5;
    const step = 4; // Increase step for fewer iterations (tune for quality/performance)

    // Preallocate output array
    const floorPixels = new Array(numCastRays);
    for (let x = 0; x < numCastRays; ++x) {
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
        let y = Math.min(Math.floor(wallBottom), CANVAS_HEIGHT);
        const yEnd = CANVAS_HEIGHT;
        if (y >= yEnd) {
            floorPixels[x] = null;
            continue;
        }
        // Use a single Float32Array for all scanlines
        // Precompute initial rowDistance and stepDelta for incremental stepping
        const projectionFactor = 1 / projectionPlaneDist;
        let rowDistance = halfTile / ((y - halfCanvasHeight) * projectionFactor);
        let floorX = playerX + rowDistance * cosA;
        let floorY = playerZ + rowDistance * sinA;
        let prevRowDistance = rowDistance;
        const arr = [];
        // Unroll loop for better performance, use step=4
        for (; y < yEnd; y += step) {
            if (y !== Math.min(Math.floor(wallBottom), CANVAS_HEIGHT)) {
                rowDistance = halfTile / ((y - halfCanvasHeight) * projectionFactor);
                const dr = rowDistance - prevRowDistance;
                floorX += dr * cosA;
                floorY += dr * sinA;
                prevRowDistance = rowDistance;
            }
            // Clamp and wrap texture coordinates
            arr.push(y,
                ((floorX % tileSectors + tileSectors) % tileSectors) / tileSectors,
                ((floorY % tileSectors + tileSectors) % tileSectors) / tileSectors
            );
        }
        floorPixels[x] = arr.length ? { texKey: ray.floorTextureKey, data: new Float32Array(arr) } : null;
    }
    self.postMessage({ frameId, floorPixels });
});