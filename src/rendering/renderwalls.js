import { drawQuad } from "./renderengine.js";
import { texturesLoaded, getDemonLaughingCurrentFrame, tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { numCastRays, playerFOV } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";
import { playerPosition } from "../playerdata/playerlogic.js";

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
    textureKey: null,
    ctx: null
};

// Create a precompute worker for wall caches
const wallPrecomputeWorker = new Worker('/src/rendering/renderworkers/wallprecomputeworker.js', { type: 'module' });
wallPrecomputeWorker.onmessage = function (e) {
    if (!e.data) return;
    if (e.data.type === 'precomputed') {
        try {
            const { sectorKey, geometryBuffer, numRays, floatsPerRay, textureKeys } = e.data;
            const geom = new Float32Array(geometryBuffer);
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
            return;
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

// FIX: compute textureX from world hit position rather than ray.hitX/ray.hitY
// (those properties don't exist on ray objects — only distance, hitSide, textureKey etc.)
function computeTextureX(ray, rayIndex) {
    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const angle = playerPosition.angle;

    const a = angle + (-playerFOV / 2 + (rayIndex / numCastRays) * playerFOV);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    const hitWorldX = posX + cosA * ray.distance;
    const hitWorldY = posZ + sinA * ray.distance;

    // Which axis was the wall face on?
    // hitSide "x" means ray hit a wall whose face is along the X axis (N/S wall) — use hitWorldX for V coord
    // hitSide "y" means ray hit an E/W wall — use hitWorldY
    const hitAlongWall = ray.hitSide === "y" ? hitWorldX : hitWorldY;

    let tx = (hitAlongWall % tileSectors) / tileSectors;
    if (tx < 0) tx += 1; // handle negative modulo
    return Math.max(0, Math.min(1, tx));
}

export function renderRaycastWalls(rayData, sectorKey, ctx = null) {
    if (!texturesLoaded) {
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

        // Cached path — geometry was precomputed by worker (textureX already baked in)
        if (cached && cached.geom && cached.numRays === rayData.length) {
            const geom = cached.geom;
            const tKeys = cached.textureKeys;
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
                reusableQuad.texture = (key === "wall_laughing_demon")
                    ? demonFrame
                    : tileTexturesMap.get(key) || tileTexturesMap.get("wall_creamlol");
                reusableQuad.ctx = ctx;
                drawQuad(reusableQuad);
            }
            return;
        }

        // Real-time rendering path
        const colWidth = CANVAS_WIDTH / numCastRays;
        const defaultTexture = tileTexturesMap.get("wall_creamlol");

        for (let i = 0, len = rayData.length; i < len; i++) {
            const ray = rayData[i];
            if (!ray) continue;

            const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            const wallTop = (CANVAS_HEIGHT - wallHeight) * 0.5;
            const wallBottom = wallTop + wallHeight;
            const colX = i * colWidth;
            const nextColX = colX + colWidth;

            if (Array.isArray(ray)) {
                // Transparent wall stack
                let accumulatedAlpha = 0;
                for (let j = ray.length - 1; j >= 0; j--) {
                    const hit = ray[j];
                    // FIX: use computeTextureX, not hit.hitX/hit.hitY
                    const textureX = computeTextureX(hit, i);
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
                    reusableQuad.ctx = ctx;
                    drawQuad(reusableQuad);

                    accumulatedAlpha += alpha;
                    if (accumulatedAlpha >= 1) break;
                }
            } else {
                // FIX: use computeTextureX, not ray.hitX/ray.hitY
                const textureX = computeTextureX(ray, i);

                const texture = (ray.textureKey === "wall_laughing_demon")
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
                reusableQuad.ctx = ctx;
                drawQuad(reusableQuad);
            }
        }

        // Kick off precompute for next frame
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