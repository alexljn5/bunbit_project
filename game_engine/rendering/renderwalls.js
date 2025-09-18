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

    // Cache frequently used variables
    const tileSectorsInv = 1 / tileSectors;

    for (let i = 0, len = rayData.length; i < len; i++) {
        const ray = rayData[i];
        if (!ray) continue;

        // Precompute wall height and top/bottom
        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) * 0.5;
        const wallBottom = wallTop + wallHeight;

        // Precompute textureX
        let textureX;
        if (Array.isArray(ray)) {
            // Multi-hit wall: take first hit for tex coord
            const firstHit = ray[ray.length - 1];
            const texHit = firstHit.hitSide === "x" ? firstHit.hitX : firstHit.hitY;
            textureX = texHit - Math.floor(texHit / tileSectors) * tileSectors;
            textureX *= tileSectorsInv;
        } else {
            const texHit = ray.hitSide === "x" ? ray.hitX : ray.hitY;
            textureX = texHit - Math.floor(texHit / tileSectors) * tileSectors;
            textureX *= tileSectorsInv;
        }

        // Clamp textureX once
        if (textureX < 0) textureX = 0;
        else if (textureX > 1) textureX = 1;

        const colX = i * colWidth;
        const nextColX = colX + colWidth;

        if (Array.isArray(ray)) {
            // Multi-hit transparent walls
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
                if (accumulatedAlpha >= 1) break; // stop early
            }
        } else {
            // Single-hit wall
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
}
