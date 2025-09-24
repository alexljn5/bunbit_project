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

// Create a precompute worker for wall caches
const wallPrecomputeWorker = new Worker('/src/rendering/renderworkers/wallprecomputeworker.js', { type: 'module' });
wallPrecomputeWorker.onmessage = function (e) {
    if (!e.data) return;
    if (e.data.type === 'precomputed') {
        try {
            const { sectorKey, geometryBuffer, numRays, floatsPerRay, textureKeys } = e.data;
            const geom = new Float32Array(geometryBuffer);
            // Store as typed object to avoid allocations
            wallRenderCache.set(sectorKey, { geom, numRays, floatsPerRay, textureKeys });
        } catch (err) {
            console.error('Failed to set wall cache from worker:', err);
        }
    } else if (e.data.type === 'error') {
        console.error('Wall precompute worker error for', e.data.sectorKey, e.data.message);
    }
};

export function precomputeWallRenderData(sectorKey) {
    try {
        if (!texturesLoaded || !tileSectors[sectorKey]) {
            return; // early exit
        }
        const sector = tileSectors[sectorKey];
        wallPrecomputeWorker.postMessage({
            type: 'precompute',
            sectorKey,
            sector,
            numCastRays: numCastRays || 512,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            tileSectors
        });
    } catch (err) {
        console.error(`Error requesting precompute for ${sectorKey}:`, err);
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
        const cached = wallRenderCache.get(sectorKey);
        const demonFrame = getDemonLaughingCurrentFrame() || tileTexturesMap.get("wall_creamlol");

        if (cached && cached.geom && cached.numRays === rayData.length) {
            const geom = cached.geom;
            const tKeys = cached.textureKeys || cached.textureKeys;
            const floatsPerRay = cached.floatsPerRay || 8;
            for (let i = 0, len = cached.numRays; i < len; i++) {
                const base = i * floatsPerRay;
                reusableQuad.topX = geom[base + 0];
                reusableQuad.topY = geom[base + 1];
                reusableQuad.leftX = geom[base + 2];
                reusableQuad.leftY = geom[base + 3];
                reusableQuad.rightX = geom[base + 4];
                reusableQuad.rightY = geom[base + 5];
                reusableQuad.textureX = geom[base + 6];
                reusableQuad.alpha = geom[base + 7];
                const key = tKeys[i] || null;
                reusableQuad.texture = (key === "wall_laughing_demon") ? demonFrame : tileTexturesMap.get(key) || tileTexturesMap.get('wall_creamlol');
                drawQuad(reusableQuad);
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
