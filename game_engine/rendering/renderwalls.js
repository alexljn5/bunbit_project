import { drawQuad } from "./renderengine.js";
import { texturesLoaded, getDemonLaughingCurrentFrame, tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { numCastRays } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";

export function renderRaycastWalls(rayData) {
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

    const colWidth = CANVAS_WIDTH / numCastRays;
    const defaultTexture = tileTexturesMap.get("wall_creamlol");
    const textureCache = new Map();

    let currentTexture = null;
    let startColX = 0;
    let startWallTop = 0;
    let startWallBottom = 0;
    let startTextureX = 0;
    let batchCount = 0;

    const flushBatch = () => {
        if (batchCount > 0) {
            drawQuad({
                topX: startColX,
                topY: startWallTop,
                leftX: startColX,
                leftY: startWallBottom,
                rightX: startColX + batchCount * colWidth,
                rightY: startWallBottom,
                color: "gray",
                texture: currentTexture,
                textureX: startTextureX,
                alpha: 1
            });
            batchCount = 0;
        }
    };

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
            textureX = (texHit % tileSectors) / tileSectors;
            textureX = Math.max(0, Math.min(1, textureX));

            let accumulatedAlpha = 0;
            for (let j = ray.length - 1; j >= 0; j--) {
                const hit = ray[j];
                let texture = textureCache.get(hit.textureKey) || tileTexturesMap.get(hit.textureKey) || defaultTexture;
                textureCache.set(hit.textureKey, texture);
                const alpha = 0.5 * (1 - accumulatedAlpha);

                drawQuad({
                    topX: i * colWidth,
                    topY: wallTop,
                    leftX: i * colWidth,
                    leftY: wallBottom,
                    rightX: (i + 1) * colWidth,
                    rightY: wallBottom,
                    color: "gray",
                    texture,
                    textureX,
                    alpha
                });

                accumulatedAlpha += alpha;
                if (accumulatedAlpha >= 1) break;
            }
        } else {
            let texture = ray.textureKey === "wall_laughing_demon" ?
                (getDemonLaughingCurrentFrame() || defaultTexture) :
                (textureCache.get(ray.textureKey) || tileTexturesMap.get(ray.textureKey) || defaultTexture);
            textureCache.set(ray.textureKey, texture);

            const texHit = ray.hitSide === "x" ? ray.hitX : ray.hitY;
            textureX = (texHit % tileSectors) / tileSectors;
            textureX = Math.max(0, Math.min(1, textureX));

            if (texture === currentTexture && wallTop === startWallTop && wallBottom === startWallBottom && Math.abs(textureX - startTextureX) < 0.01) {
                batchCount++;
            } else {
                flushBatch();
                currentTexture = texture;
                startColX = i * colWidth;
                startWallTop = wallTop;
                startWallBottom = wallBottom;
                startTextureX = textureX;
                batchCount = 1;
            }
        }
    }

    flushBatch();
}
