import { drawQuad } from "./renderengine.js";
import { texturesLoaded } from "../mapdata/maptexturesloader.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { castRays } from "./raycasting.js";
import { numCastRays } from "./raycasting.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap } from "../mapdata/maptexturesloader.js";
import { getDemonLaughingCurrentFrame } from "../mapdata/maptexturesloader.js";

export function renderRaycastWalls(rayData) {
    if (!texturesLoaded) {
        console.warn("Textures not loaded, rendering gray walls *pouts*");
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        return;
    }
    const colWidth = CANVAS_WIDTH / numCastRays;
    for (let i = 0; i < rayData.length; i++) {
        const ray = rayData[i];
        if (!ray) continue;
        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
        const wallBottom = wallTop + wallHeight;
        let textureX = ray.hitSide === "x"
            ? (ray.hitX % tileSectors) / tileSectors
            : (ray.hitY % tileSectors) / tileSectors;
        textureX = Math.max(0, Math.min(1, textureX));

        if (Array.isArray(ray)) {
            // Multiple hits for transparency, blend them back to front
            let accumulatedAlpha = 0;
            for (let j = ray.length - 1; j >= 0; j--) {
                const hit = ray[j];
                const alpha = 0.5; // Example fixed alpha for transparent walls
                drawQuad({
                    topX: i * colWidth,
                    topY: wallTop,
                    leftX: i * colWidth,
                    leftY: wallBottom,
                    rightX: (i + 1) * colWidth,
                    rightY: wallBottom,
                    color: "gray",
                    texture: tileTexturesMap.get(hit.textureKey) || tileTexturesMap.get("wall_creamlol"),
                    textureX,
                    alpha: alpha * (1 - accumulatedAlpha)
                });
                accumulatedAlpha += alpha * (1 - accumulatedAlpha);
                if (accumulatedAlpha >= 1) break;
            }
        } else {
            let texture = tileTexturesMap.get(ray.textureKey) || tileTexturesMap.get("wall_creamlol");
            if (ray.textureKey === "wall_laughing_demon") {
                texture = getDemonLaughingCurrentFrame() || tileTexturesMap.get("wall_creamlol");
            }
            if (!texture) {
                console.warn(`Missing wall texture: ${ray.textureKey} *tilts head*`);
                continue;
            }
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
                alpha: 1.0
            });
        }
    }
}
