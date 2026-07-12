import { drawQuad } from "./renderengine.js";
import { texturesLoaded, getDemonLaughingCurrentFrame, tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { numCastRays, playerFOV } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { wdMainEvent, wdMainMessage, wdMainError } from "../debug/workermaindebug.js";

// Tauri-only worker URL
const wallPrecomputeWorkerURL = new URL("./renderworkers/wallprecomputeworker.js", import.meta.url);

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

const wallPrecomputeWorker = new Worker(wallPrecomputeWorkerURL, { type: 'module' });
wdMainEvent('wallprecompute-worker', 'created (module)');
wallPrecomputeWorker.onmessage = function (e) {
    if (!e.data) return;
    wdMainMessage('wallprecompute-worker', e.data.type);
    if (e.data.type === 'precomputed') {
        try {
            const { sectorKey, geometryBuffer, numRays, floatsPerRay, textureKeys } = e.data;
            const geom = new Float32Array(geometryBuffer);
            wallRenderCache.set(sectorKey, { geom, numRays, floatsPerRay, textureKeys });
        } catch (err) {
            console.error('Failed to set wall cache from worker:', err);
            wdMainError('wallprecompute-worker', err);
        }
    } else if (e.data.type === 'error') {
        console.error('Wall precompute worker error for', e.data.sectorKey, e.data.message);
        wdMainError('wallprecompute-worker', e.data);
    }
};
wallPrecomputeWorker.onerror = (error) => {
    console.error('Wall precompute worker crashed:', error);
    wdMainError('wallprecompute-worker', error);
};

export function precomputeWallRenderData(sectorKey) {
    try {
        if (!texturesLoaded || !tileSectors[sectorKey]) return;
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

// Compute 0..1 texture X coordinate for a ray hit.
// Uses world-space hit position projected onto the wall face.
// rayIndex = column index (0..numCastRays-1)
function computeTextureX(ray, rayIndex) {
    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const angle = playerPosition.angle;

    const a = angle + (-playerFOV / 2 + (rayIndex / numCastRays) * playerFOV);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    const hitWorldX = posX + cosA * ray.distance;
    const hitWorldY = posZ + sinA * ray.distance;

    // "y" side = ray crossed a vertical grid line (E/W wall face) → texture offset along Y
    // "x" side = ray crossed a horizontal grid line (N/S wall face) → texture offset along X
    const hitAlongWall = ray.hitSide === "y" ? hitWorldY : hitWorldX;

    // Modulo within tile, then normalise to 0..1
    let tx = (hitAlongWall % tileSectors) / tileSectors;
    if (tx < 0) tx += 1;

    // Mirror the texture on the back face so it doesn't reverse direction
    // depending on which side of the wall the ray enters from.
    if (ray.hitSide === "y" && cosA > 0) tx = 1 - tx;
    if (ray.hitSide === "x" && sinA < 0) tx = 1 - tx;

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

        // Cached path — geometry precomputed by worker, textureX already baked in
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
                let accumulatedAlpha = 0;
                for (let j = ray.length - 1; j >= 0; j--) {
                    const hit = ray[j];
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