import { drawQuad } from "./renderengine.js";
import { texturesLoaded, getDemonLaughingCurrentFrame, tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { numCastRays } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";

// Heap-based cache for wall rendering data
const wallRenderCache = new Map();

export function precomputeWallRenderData(sectorKey) {
    try {
        if (!texturesLoaded || !tileSectors[sectorKey]) {
            console.warn(`Cannot precompute for sector ${sectorKey}: textures or sector missing *pouts*`);
            return;
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

            // Simulate ray data for static walls (assumes raycasting provides similar data)
            const ray = { distance: 10, hitSide: "x", hitX: i / numCastRays, textureKey: sector.walls[0]?.texture || "wall_creamlol" }; // Simplified

            const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            const wallTop = (CANVAS_HEIGHT - wallHeight) * 0.5;
            const wallBottom = wallTop + wallHeight;

            let textureX = (ray.hitSide === "x" ? ray.hitX : ray.hitY) - Math.floor((ray.hitSide === "x" ? ray.hitX : ray.hitY) / tileSectors) * tileSectors;
            textureX *= tileSectorsInv;
            textureX = Math.max(0, Math.min(1, textureX));

            let texture = ray.textureKey === "wall_laughing_demon" ? getDemonLaughingCurrentFrame() || defaultTexture : tileTexturesMap.get(ray.textureKey) || defaultTexture;

            rayCache.quads.push({
                topX: colX,
                topY: wallTop,
                leftX: colX,
                leftY: wallBottom,
                rightX: nextColX,
                rightY: wallBottom,
                color: "gray",
                texture,
                textureX,
                alpha: 1
            });

            cacheData.push(rayCache);
        }

        wallRenderCache.set(sectorKey, cacheData);
        console.log(`Precomputed wall render data for sector ${sectorKey}, cache size: ${wallRenderCache.size} *twirls*`);
    } catch (err) {
        console.error(`Error precomputing wall render data for ${sectorKey}:`, err);
    }
}

export function renderRaycastWalls(rayData, sectorKey) {
    if (!texturesLoaded) {
        console.warn("Textures not loaded, rendering gray walls *pouts*");
        drawQuad({
            topX: 0,
            topY: 0,
            leftX: 0,
            leftY: CANVAS_HEIGHT,
            rightX: CANVAS_WIDTH,
            rightY: CANVAS_HEIGHT,
            color: "gray",
            alpha: 1
        });
        return;
    }

    try {
        const cachedData = wallRenderCache.get(sectorKey);
        if (cachedData && rayData.length === cachedData.length) {
            // Use cached data for static walls
            for (let i = 0; i < cachedData.length; i++) {
                const rayCache = cachedData[i];
                for (const quad of rayCache.quads) {
                    // Update animated textures
                    if (quad.textureKey === "wall_laughing_demon") {
                        quad.texture = getDemonLaughingCurrentFrame() || tileTexturesMap.get("wall_creamlol");
                    }
                    drawQuad(quad);
                }
            }
            console.log(`Rendered walls from cache for sector ${sectorKey} *smiles*`);
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
                textureX = texHit - Math.floor(texHit / tileSectors) * tileSectors;
                textureX *= tileSectorsInv;
            } else {
                const texHit = ray.hitSide === "x" ? ray.hitX : ray.hitY;
                textureX = texHit - Math.floor(texHit / tileSectors) * tileSectors;
                textureX *= tileSectorsInv;
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

                    drawQuad({
                        topX: colX,
                        topY: wallTop,
                        leftX: colX,
                        leftY: wallBottom,
                        rightX: nextColX,
                        rightY: wallBottom,
                        color: "gray",
                        texture: tex,
                        textureX,
                        alpha
                    });

                    accumulatedAlpha += alpha;
                    if (accumulatedAlpha >= 1) break;
                }
            } else {
                let texture;
                if (ray.textureKey === "wall_laughing_demon") {
                    texture = getDemonLaughingCurrentFrame() || defaultTexture;
                } else {
                    texture = tileTexturesMap.get(ray.textureKey) || defaultTexture;
                }

                if (!texture) {
                    console.warn(`Missing wall texture: ${ray.textureKey} *tilts head*`);
                    continue;
                }

                drawQuad({
                    topX: colX,
                    topY: wallTop,
                    leftX: colX,
                    leftY: wallBottom,
                    rightX: nextColX,
                    rightY: wallBottom,
                    color: "gray",
                    texture,
                    textureX,
                    alpha: 1
                });
            }
        }

        // Cache the results for static sectors
        if (sectorKey && !wallRenderCache.has(sectorKey)) {
            precomputeWallRenderData(sectorKey);
        }
    } catch (err) {
        console.error('Error in renderRaycastWalls:', err);
        drawQuad({
            topX: 0,
            topY: 0,
            leftX: 0,
            leftY: CANVAS_HEIGHT,
            rightX: CANVAS_WIDTH,
            rightY: CANVAS_HEIGHT,
            color: "gray",
            alpha: 1
        });
    }
}

export function clearWallRenderCache() {
    try {
        wallRenderCache.clear();
        console.log('Cleared wall render cache *twirls*');
    } catch (err) {
        console.error('Error in clearWallRenderCache:', err);
    }
}