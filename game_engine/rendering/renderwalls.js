import { drawQuad } from "./renderengine.js";
import { texturesLoaded, getDemonLaughingCurrentFrame } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { numCastRays } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { fastSin, fastCos } from "../math/mathtables.js";

export function renderRaycastWalls(rayData) {
    if (!texturesLoaded) {
        console.warn("Textures not loaded, rendering gray walls *pouts*");
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        return;
    }

    const colWidth = CANVAS_WIDTH / numCastRays;
    const defaultTexture = tileTexturesMap.get("wall_creamlol");

    for (let i = 0; i < rayData.length; i++) {
        const ray = rayData[i];
        if (!ray) continue;

        // Use fastSin / fastCos for wall height calculations if needed
        // Example: if you had fisheye correction
        // const correctedDistance = ray.distance * fastCos(ray.rayAngle - playerAngle);

        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
        const wallBottom = wallTop + wallHeight;

        // Precompute textureX once
        let textureX = (ray.hitSide === "x" ? ray.hitX % tileSectors : ray.hitY % tileSectors) / tileSectors;
        textureX = textureX < 0 ? 0 : (textureX > 1 ? 1 : textureX);

        if (Array.isArray(ray)) {
            // Handle transparent multi-hit
            let accumulatedAlpha = 0;
            const colX = i * colWidth;
            const nextColX = colX + colWidth;

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
            // Single hit wall
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

            const colX = i * colWidth;
            drawQuad({
                topX: colX,
                topY: wallTop,
                leftX: colX,
                leftY: wallBottom,
                rightX: colX + colWidth,
                rightY: wallBottom,
                color: "gray",
                texture,
                textureX,
                alpha: 1.0
            });
        }
    }
}
