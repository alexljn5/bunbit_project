let staticData = null;
let latestFrameId = -1;

self.addEventListener("message", (e) => {
    const startTime = performance.now();

    try {
        if (e.data.type === "init") {
            staticData = {
                tileSectors: e.data.tileSectors,
                map_01: e.data.map_01,
                textureIdMap: e.data.textureIdMap,
                floorTextureIdMap: e.data.floorTextureIdMap,
                CANVAS_WIDTH: e.data.CANVAS_WIDTH,
                numCastRays: e.data.numCastRays,
                maxRayDepth: e.data.maxRayDepth
            };
            self.postMessage({ type: "init", success: true });
            return;
        }

        if (!staticData) throw new Error("Worker not initialized");

        const { startRay, endRay, posX, posZ, playerAngle, playerFOV, frameId } = e.data;
        if (frameId < latestFrameId) return; // Drop old frames
        latestFrameId = frameId;

        const {
            tileSectors, map_01, textureIdMap,
            floorTextureIdMap, CANVAS_WIDTH, numCastRays, maxRayDepth
        } = staticData;

        const rayCount = endRay - startRay;
        const rayData = new Array(rayCount);

        for (let i = 0; i < rayCount; i++) {
            const x = startRay + i;
            const rayAngle = playerAngle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);
            const cosAngle = Math.cos(rayAngle);
            const sinAngle = Math.sin(rayAngle);

            let distance = 0;
            let rayX = posX;
            let rayY = posZ;
            let cellX = Math.floor(rayX / tileSectors);
            let cellY = Math.floor(rayY / tileSectors);
            let distToNextX = cosAngle !== 0 ? ((cosAngle > 0 ? cellX + 1 : cellX) * tileSectors - rayX) / cosAngle : Infinity;
            let distToNextY = sinAngle !== 0 ? ((sinAngle > 0 ? cellY + 1 : cellY) * tileSectors - rayY) / sinAngle : Infinity;
            const deltaDistX = Math.abs(tileSectors / cosAngle);
            const deltaDistY = Math.abs(tileSectors / sinAngle);

            let steps = 0;
            let hit = false;
            let hitSide = null;
            let hitWallType = null;
            let textureKey = null;
            let floorTextureKey = "floor_concrete";
            let floorX = 0, floorY = 0;
            let lastFloorTile = null;

            while (steps++ < maxRayDepth * 2 && !hit && distance < maxRayDepth * tileSectors) {
                if (distToNextX < distToNextY) {
                    distance = distToNextX;
                    cellX += cosAngle > 0 ? 1 : -1;
                    distToNextX += deltaDistX;
                    hitSide = "y";
                } else {
                    distance = distToNextY;
                    cellY += sinAngle > 0 ? 1 : -1;
                    distToNextY += deltaDistY;
                    hitSide = "x";
                }

                if (
                    cellX < 0 || cellY < 0 ||
                    cellX >= map_01[0].length || cellY >= map_01.length
                ) break;

                const tile = map_01[cellY][cellX];
                if (!tile || typeof tile !== "object") break;

                if (tile.type === "wall") {
                    hit = true;
                    hitWallType = tile.type;
                    textureKey = textureIdMap[tile.textureId] || "wall_creamlol";
                    if (lastFloorTile)
                        floorTextureKey = floorTextureIdMap[lastFloorTile.floorTextureId] || floorTextureKey;
                } else if (tile.type === "empty") {
                    lastFloorTile = tile;
                    floorTextureKey = floorTextureIdMap[tile.floorTextureId] || floorTextureKey;
                    floorX = rayX + distance * cosAngle;
                    floorY = rayY + distance * sinAngle;
                }
            }

            if (hit) {
                const correctedDistance = distance * Math.cos(rayAngle - playerAngle);
                let hitX = rayX + distance * cosAngle;
                let hitY = rayY + distance * sinAngle;
                if (hitSide === "y") hitX = (cosAngle > 0 ? cellX : cellX + 1) * tileSectors;
                if (hitSide === "x") hitY = (sinAngle > 0 ? cellY : cellY + 1) * tileSectors;

                rayData[i] = {
                    column: x,
                    distance: correctedDistance,
                    wallType: hitWallType,
                    hitX, hitY,
                    hitSide,
                    textureKey,
                    floorTextureKey,
                    floorX, floorY
                };
            } else {
                rayData[i] = null;
            }
        }

        self.postMessage({
            type: "frame",
            startRay,
            frameId,
            rayData,
            workerTime: performance.now() - startTime
        });
    } catch (err) {
        self.postMessage({
            type: "error",
            error: err.message,
            frameId: e.data.frameId || -1,
            workerTime: performance.now() - startTime
        });
    }
});
