let latestFrameId = -1;

self.addEventListener("message", (e) => {
    const startTime = performance.now();
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

    // Drop outdated frames
    if (frameId < latestFrameId) return;
    latestFrameId = frameId;

    // Precompute ray angles, cos, and sin
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
    const baseStep = 4; // Base step for close rows
    const maxRows = Math.ceil(CANVAS_HEIGHT / baseStep); // Max rows per column
    const invTileSectors = 1 / tileSectors; // For faster modulo

    // Preallocate output array
    const floorPixels = new Array(numCastRays);
    // Single Float32Array for all data: [len, texKeyIdx, data..., len, texKeyIdx, ...]
    const allData = new Float32Array(numCastRays * (2 + maxRows * 3));
    const texKeys = [];
    let dataOffset = 0;

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

        // Dynamic step based on row distance
        const projectionFactor = 1 / projectionPlaneDist;
        let rowDistance = halfTile / ((y - halfCanvasHeight) * projectionFactor);
        let floorX = playerX + rowDistance * cosA;
        let floorY = playerZ + rowDistance * sinA;
        let prevRowDistance = rowDistance;
        const arr = new Float32Array(maxRows * 3);
        let idx = 0;

        for (; y < yEnd; y += baseStep) {
            if (y !== Math.min(Math.floor(wallBottom), CANVAS_HEIGHT)) {
                rowDistance = halfTile / ((y - halfCanvasHeight) * projectionFactor);
                const dr = rowDistance - prevRowDistance;
                floorX += dr * cosA;
                floorY += dr * sinA;
                prevRowDistance = rowDistance;
            }

            // Faster texture coordinate wrapping
            const texX = (floorX - Math.floor(floorX / tileSectors) * tileSectors) * invTileSectors;
            const texY = (floorY - Math.floor(floorY / tileSectors) * tileSectors) * invTileSectors;
            arr[idx++] = y;
            arr[idx++] = texX;
            arr[idx++] = texY;
        }

        if (idx > 0) {
            const texKeyIdx = texKeys.length;
            texKeys.push(ray.floorTextureKey);
            allData[dataOffset++] = idx / 3; // Number of rows
            allData[dataOffset++] = texKeyIdx; // Index into texKeys
            allData.set(arr.subarray(0, idx), dataOffset);
            dataOffset += idx;
            floorPixels[x] = { texKey: ray.floorTextureKey, data: arr.subarray(0, idx) };
        } else {
            floorPixels[x] = null;
        }
    }

    // Compact message with single Float32Array and texture keys
    self.postMessage({
        frameId,
        floorPixels,
        allData: allData.subarray(0, dataOffset),
        texKeys,
        workerTime: performance.now() - startTime
    }, [allData.buffer]);
});