import { drawQuad } from "./renderengine.js";
import { texturesLoaded, getDemonLaughingCurrentFrame, tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { numCastRays } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";

// Heap-based cache for wall rendering data
const wallRenderCache = new Map();

// Reusable quad object to reduce allocations
const reusableQuad = {
    topX: 0, topY: 0,
    leftX: 0, leftY: 0,
    rightX: 0, rightY: 0,
    color: "gray",
    texture: null,
    textureX: 0,
    alpha: 1,
    textureKey: null // for demon animation checks
};

export function precomputeWallRenderData(sectorKey) {
    try {
        if (!texturesLoaded || !tileSectors[sectorKey]) {
            return; // early exit, don’t log every frame
        }

        const sector = tileSectors[sectorKey];
        const defaultTexture = tileTexturesMap.get("wall_creamlol");
        const tileSectorsInv = 1 / tileSectors;
        const colWidth = CANVAS_WIDTH / numCastRays;

        const cacheData = [];
        for (let i = 0; i < numCastRays; i++) {
            const colX = i * colWidth;
            const nextColX = colX + colWidth;
            const rayCache = { quads: [] };

            // Simplified static ray data
            const ray = {
                distance: 10,
                hitSide: "x",
                hitX: i / numCastRays,
                textureKey: sector.walls[0]?.texture || "wall_creamlol"
            };

            const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            const wallTop = (CANVAS_HEIGHT - wallHeight) * 0.5;
            const wallBottom = wallTop + wallHeight;

            const texHit = ray.hitSide === "x" ? ray.hitX : ray.hitY;
            let textureX = (texHit % tileSectors) * tileSectorsInv;
            textureX = Math.max(0, Math.min(1, textureX));

            let texture = ray.textureKey === "wall_laughing_demon"
                ? getDemonLaughingCurrentFrame() || defaultTexture
                : tileTexturesMap.get(ray.textureKey) || defaultTexture;

            rayCache.quads.push({
                topX: colX, topY: wallTop,
                leftX: colX, leftY: wallBottom,
                rightX: nextColX, rightY: wallBottom,
                color: "gray",
                texture,
                textureX,
                alpha: 1,
                textureKey: ray.textureKey
            });

            cacheData.push(rayCache);
        }

        wallRenderCache.set(sectorKey, cacheData);
    } catch (err) {
        console.error(`Error precomputing wall render data for ${sectorKey}:`, err);
    }
}

export function renderRaycastWalls(rayData, sectorKey) {
    if (!texturesLoaded) {
        // Gray fallback
        drawQuad({
            topX: 0, topY: 0,
            leftX: 0, leftY: CANVAS_HEIGHT,
            rightX: CANVAS_WIDTH, rightY: CANVAS_HEIGHT,
            color: "gray", alpha: 1
        });
        return;
    }

    try {
        const cachedData = wallRenderCache.get(sectorKey);
        const demonFrame = getDemonLaughingCurrentFrame() || tileTexturesMap.get("wall_creamlol");

        if (cachedData && rayData.length === cachedData.length) {
            // Use cached data
            for (let i = 0; i < cachedData.length; i++) {
                const rayCache = cachedData[i];
                for (const quad of rayCache.quads) {
                    // Update animated texture just once per frame
                    reusableQuad.topX = quad.topX;
                    reusableQuad.topY = quad.topY;
                    reusableQuad.leftX = quad.leftX;
                    reusableQuad.leftY = quad.leftY;
                    reusableQuad.rightX = quad.rightX;
                    reusableQuad.rightY = quad.rightY;
                    reusableQuad.textureX = quad.textureX;
                    reusableQuad.alpha = quad.alpha;
                    reusableQuad.texture = (quad.textureKey === "wall_laughing_demon") ? demonFrame : quad.texture;

                    drawQuad(reusableQuad);
                }
            }
            return;
        }

        // Fallback to real-time rendering
        const colWidth = CANVAS_WIDTH / numCastRays;
        const defaultTexture = tileTexturesMap.get("wall_creamlol");
        const tileSectorsInv = 1 / tileSectors;

        for (let i = 0, len = rayData.length; i < len; i++) {
            const ray = rayData[i];
            if (!ray) continue;

            const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            const wallTop = (CANVAS_HEIGHT - wallHeight) * 0.5;
            const wallBottom = wallTop + wallHeight;

            let textureX;
            if (Array.isArray(ray)) {
                const firstHit = ray[ray.length - 1];
                const texHit = firstHit.hitSide === "x" ? firstHit.hitX : firstHit.hitY;
                textureX = (texHit % tileSectors) * tileSectorsInv;
            } else {
                const texHit = ray.hitSide === "x" ? ray.hitX : ray.hitY;
                textureX = (texHit % tileSectors) * tileSectorsInv;
            }
            textureX = Math.max(0, Math.min(1, textureX));

            const colX = i * colWidth;
            const nextColX = colX + colWidth;

            if (Array.isArray(ray)) {
                let accumulatedAlpha = 0;
                for (let j = ray.length - 1; j >= 0; j--) {
                    const hit = ray[j];
                    const tex = tileTexturesMap.get(hit.textureKey) || defaultTexture;
                    const alpha = 0.5 * (1 - accumulatedAlpha);

                    reusableQuad.topX = colX;
                    reusableQuad.topY = wallTop;
                    reusableQuad.leftX = colX;
                    reusableQuad.leftY = wallBottom;
                    reusableQuad.rightX = nextColX;
                    reusableQuad.rightY = wallBottom;
                    reusableQuad.color = "gray";
                    reusableQuad.texture = tex;
                    reusableQuad.textureX = textureX;
                    reusableQuad.alpha = alpha;

                    drawQuad(reusableQuad);

                    accumulatedAlpha += alpha;
                    if (accumulatedAlpha >= 1) break;
                }
            } else {
                let texture = (ray.textureKey === "wall_laughing_demon")
                    ? demonFrame
                    : (tileTexturesMap.get(ray.textureKey) || defaultTexture);

                if (!texture) continue;

                reusableQuad.topX = colX;
                reusableQuad.topY = wallTop;
                reusableQuad.leftX = colX;
                reusableQuad.leftY = wallBottom;
                reusableQuad.rightX = nextColX;
                reusableQuad.rightY = wallBottom;
                reusableQuad.color = "gray";
                reusableQuad.texture = texture;
                reusableQuad.textureX = textureX;
                reusableQuad.alpha = 1;

                drawQuad(reusableQuad);
            }
        }

        // Cache static results
        if (sectorKey && !wallRenderCache.has(sectorKey)) {
            precomputeWallRenderData(sectorKey);
        }
    } catch (err) {
        console.error("Error in renderRaycastWalls:", err);
        drawQuad({
            topX: 0, topY: 0,
            leftX: 0, leftY: CANVAS_HEIGHT,
            rightX: CANVAS_WIDTH, rightY: CANVAS_HEIGHT,
            color: "gray", alpha: 1
        });
    }
}

export function clearWallRenderCache() {
    try {
        wallRenderCache.clear();
    } catch (err) {
        console.error("Error in clearWallRenderCache:", err);
    }
}
