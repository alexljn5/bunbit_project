import { Sprite, LAYERS, spriteManager } from "./rendersprites.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { map_debug } from "../../mapdata/map_debug.js";
import { initPlaceholderAIHealth } from "../../ai/airegistry.js";
import {
    playerHandSprite, handLoaded,
    pillar01Sprite, pillar01Loaded,
    creamSpinFrames, creamSpinLoaded, creamSpinWorldPos,
    corpse1Sprite, corpse1Loaded,
    metalPipeSprite, metalPipeLoaded,
    spriteState,
    metalPipePlayerHandSprite, metalPipePlayerHandLoaded,
    genericGunSprite, genericGunSpriteLoaded,
    genericGunPlayerHandSprite, genericGunPlayerHandLoaded,
    nineMMAmmoSprite, nineMMAmmoSpriteLoaded,
    boyKisserEnemySprite, boyKisserEnemySpriteLoaded,
    casperLesserDemonSprite, casperLesserDemonSpriteLoaded,
    placeholderAiSprite, placeholderAiSpriteLoaded,
    getCreamSpinCurrentFrame, rustyKeySpriteLoaded, rustyKeySprite,
    rustyKeySpritePlayerHandLoaded,
    rustyKeySpritePlayerHandSprite,
    computerAiSprite, computerAiSpriteLoaded
} from "./spritetextures.js";
import { SCALE_X, SCALE_Y, CANVAS_HEIGHT, CANVAS_WIDTH, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../../globals.js";
import { playerPosition, playerVantagePointY, getPlayerBobbingOffset } from "../../playerdata/playerlogic.js";
import { playerFOV } from "../raycasting.js";
import { getSpriteScreenParams } from "./spriteutils.js";
import { renderSprite } from "./spriteutils.js";
import { tileSectors } from "../../mapdata/maps.js";

export function registerSprites() {
    const playerHand = new Sprite({
        id: 'playerHand',
        image: playerHandSprite,
        isLoaded: handLoaded,
        layer: LAYERS.FOREGROUND,
        renderFunction: (rayData, ctx) => {
            if (!handLoaded && !metalPipePlayerHandLoaded && !genericGunPlayerHandLoaded) return null;
            let handSprite = playerHandSprite;
            const selectedItem = playerInventory[inventoryState.selectedInventoryIndex];
            if (selectedItem === "metal_pipe" && metalPipePlayerHandLoaded) {
                handSprite = metalPipePlayerHandSprite;
            } else if (selectedItem === "generic_gun" && genericGunPlayerHandLoaded) {
                handSprite = genericGunPlayerHandSprite;
            } else if (selectedItem === "rusty_key" && rustyKeySpriteLoaded) {
                handSprite = rustyKeySpritePlayerHandSprite;
            }
            const bobbingY = (400 * SCALE_Y) + getPlayerBobbingOffset();
            const spriteWidth = 256 * SCALE_X;
            const spriteHeight = 512 * SCALE_Y;
            const spriteX = 450 * SCALE_X;
            ctx.drawImage(handSprite, spriteX, bobbingY, spriteWidth, spriteHeight);
            return null; // No depth info needed
        }
    });
    spriteManager.addSpriteForMaps(playerHand, ["map_01", "map_02", "map_debug"], {
        map_01: { worldPos: null },
        map_02: { worldPos: null },
        map_debug: { worldPos: null }
    });

    const pillar01 = new Sprite({
        id: 'pillar01',
        image: pillar01Sprite,
        worldPos: { x: 2.5 * tileSectors, z: 6 * tileSectors },
        isLoaded: pillar01Loaded,
        layer: LAYERS.BACKGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 128 / REF_CANVAS_HEIGHT,
        aspectRatio: 1,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
    spriteManager.addSpriteForMaps(pillar01, ["map_01", "map_02"], {
        map_01: { worldPos: { x: 2.5 * tileSectors, z: 6 * tileSectors } },
        map_02: { worldPos: { x: 3.0 * tileSectors, z: 5.0 * tileSectors } }
    });

    const corpse1 = new Sprite({
        id: 'corpse1',
        image: corpse1Sprite,
        worldPos: { x: 1.3 * tileSectors, z: 11.7 * tileSectors },
        isLoaded: corpse1Loaded,
        layer: LAYERS.BACKGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
    spriteManager.addSpriteForMaps(corpse1, ["map_01", "map_debug"], {
        map_01: { worldPos: { x: 1.3 * tileSectors, z: 11.7 * tileSectors } },
        map_debug: { worldPos: { x: 1.3 * tileSectors, z: 11.7 * tileSectors } }
    });

    const metalPipe = new Sprite({
        id: 'metalPipe',
        image: metalPipeSprite,
        worldPos: { x: 2.5 * tileSectors, z: 4.5 * tileSectors },
        isLoaded: metalPipeLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 500 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, ctx) => {
            if (spriteState.isMetalPipeCollected) return null;
            return renderSprite({
                sprite: metalPipeSprite,
                isLoaded: metalPipeLoaded,
                worldPos: spriteManager.getSprite("metalPipe")?.worldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 500 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'metalPipe',
                ctx
            });
        }
    });
    spriteManager.addSpriteForMaps(metalPipe, ["map_01", "map_02", "map_debug"], {
        map_01: { worldPos: { x: 1.5 * tileSectors, z: 6.5 * tileSectors } },
        map_02: { worldPos: { x: 2.0 * tileSectors, z: 3.5 * tileSectors } },
        map_debug: { worldPos: { x: 2.5 * tileSectors, z: 4.5 * tileSectors } }
    });

    const nineMMAmmo = new Sprite({
        id: 'nineMMAmmo',
        image: nineMMAmmoSprite,
        worldPos: { x: 3.4 * tileSectors, z: 1.2 * tileSectors },
        isLoaded: nineMMAmmoSpriteLoaded,
        layer: LAYERS.MIDGROUND,
        scaleFactor: 0.5,
        aspectRatio: 1,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        renderFunction: (rayData, ctx) => {
            if (spriteState.isNineMmAmmoCollected) return null;
            const worldPos = spriteManager.getSprite("nineMMAmmo")?.worldPos;
            if (!worldPos) return null;
            const dx = worldPos.x - playerPosition.x;
            const dz = worldPos.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
            const correctedDistance = distance * Math.cos(relativeAngle);
            if (correctedDistance < 0.1) return null;
            const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * 0.5;
            const spriteWidth = spriteHeight;
            const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
            const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
            const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
            const halfTile = tileSectors * 0.5;
            const rowDistance = correctedDistance;
            const spriteYBottom = halfCanvasHeight + (halfTile / rowDistance) * projectionPlaneDist;
            const result = renderSprite({
                sprite: nineMMAmmoSprite,
                isLoaded: nineMMAmmoSpriteLoaded,
                worldPos: worldPos,  // Use the worldPos we already got from spriteManager
                rayData,
                spriteWidth,
                spriteHeight,
                spriteY: spriteYBottom - spriteHeight,
                adjustedScreenX,
                startColumn,
                endColumn,
                correctedDistance,
                spriteId: 'nineMMAmmo',
                ctx
            });
            return result ? { adjustedScreenX, spriteWidth, spriteY: spriteYBottom - spriteHeight, spriteHeight } : null;
        }
    });
    spriteManager.addSpriteForMaps(nineMMAmmo, ["map_01", "map_02"], {
        map_01: { worldPos: { x: 3.4 * tileSectors, z: 1.2 * tileSectors } },
        map_02: { worldPos: { x: 4.0 * tileSectors, z: 2.0 * tileSectors } }
    });

    const boyKisser = new Sprite({
        id: 'boyKisser',
        image: boyKisserEnemySprite,
        worldPos: null,
        isLoaded: boyKisserEnemySpriteLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, ctx) => {
            if (!boyKisserEnemySpriteLoaded) return null;
            return renderSprite({
                sprite: boyKisserEnemySprite,
                isLoaded: boyKisserEnemySpriteLoaded,
                worldPos: spriteManager.getSprite("boyKisser")?.worldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 400 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'boyKisser',
                ctx
            });
        }
    });
    spriteManager.addSpriteForMaps(boyKisser, ["map_01", "map_debug"], {
        map_01: { worldPos: { x: 3.4 * tileSectors, z: 1.2 * tileSectors } },
        map_debug: { worldPos: { x: 10.4 * tileSectors, z: 1.2 * tileSectors } }
    });

    const casperLesserDemon = new Sprite({
        id: 'casperLesserDemon',
        image: casperLesserDemonSprite,
        worldPos: null,
        isLoaded: casperLesserDemonSpriteLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, ctx) => {
            if (!casperLesserDemonSpriteLoaded) return null;
            return renderSprite({
                sprite: casperLesserDemonSprite,
                isLoaded: casperLesserDemonSpriteLoaded,
                worldPos: spriteManager.getSprite("casperLesserDemon")?.worldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 400 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'casperLesserDemon',
                ctx
            });
        }
    });
    spriteManager.addSpriteForMaps(casperLesserDemon, ["map_01", "map_debug"], {
        map_01: { worldPos: { x: 5.5 * tileSectors, z: 11.3 * tileSectors } },
        map_debug: { worldPos: { x: 10.4 * tileSectors, z: 1.2 * tileSectors } }
    });

    const creamSpin = new Sprite({
        id: 'creamSpin',
        image: creamSpinFrames[0], // Placeholder, updated in render
        worldPos: creamSpinWorldPos,
        isLoaded: creamSpinLoaded,
        layer: LAYERS.MIDGROUND,
        scaleFactor: 1,
        aspectRatio: 150 / 250,
        baseYRatio: 0.5,
        renderFunction: (rayData, renderEngine) => {
            if (!creamSpinLoaded) return null;
            const currentFrame = getCreamSpinCurrentFrame();
            if (!currentFrame) return null;
            const dx = creamSpinWorldPos.x - playerPosition.x;
            const dz = creamSpinWorldPos.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
            const correctedDistance = distance * Math.cos(relativeAngle);
            if (correctedDistance < 0.1) return null;
            const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors;
            const spriteWidth = spriteHeight * (150 / 250);
            const spriteY = CANVAS_HEIGHT * 0.5 - spriteHeight / 2;
            const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
            const result = renderSprite({
                sprite: currentFrame,
                isLoaded: creamSpinLoaded,
                worldPos: creamSpinWorldPos,
                rayData,
                spriteWidth,
                spriteHeight,
                spriteY,
                adjustedScreenX,
                startColumn,
                endColumn,
                correctedDistance,
                spriteId: 'creamSpin'
            });
            return result;
        }
    });
    spriteManager.addSpriteForMaps(creamSpin, ["map_debug"], {
        map_debug: { worldPos: { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors } },
    });

    // Create multiple placeholder AIs for the debug map
    const placeholderAIPositions = [
        { x: 2.5, z: 2.5 },
        { x: 13.5, z: 2.5 },
        { x: 2.5, z: 13.5 }
    ];

    placeholderAIPositions.forEach((pos, index) => {
        const placeholderId = `placeholderAI_${index}`;
        const placeholderAI = new Sprite({
            id: placeholderId,
            image: placeholderAiSprite,
            worldPos: null,
            isLoaded: placeholderAiSpriteLoaded,
            layer: LAYERS.MIDGROUND,
            baseWidthRatio: 128 / REF_CANVAS_WIDTH,
            baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
            aspectRatio: 128 / 80,
            baseYRatio: 400 / REF_CANVAS_HEIGHT,
            scaleFactor: 0.5,
            renderFunction: (rayData, ctx) => {
                if (!placeholderAiSpriteLoaded) return null;
                return renderSprite({
                    sprite: placeholderAiSprite,
                    isLoaded: placeholderAiSpriteLoaded,
                    worldPos: spriteManager.getSprite(placeholderId)?.worldPos,
                    rayData,
                    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                    baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                    aspectRatio: 128 / 80,
                    baseYRatio: 400 / REF_CANVAS_HEIGHT,
                    scaleFactor: 0.5,
                    spriteId: placeholderId,
                    ctx
                });
            }
        });

        const worldPos = {
            map_debug: { worldPos: { x: pos.x * tileSectors, z: pos.z * tileSectors } }
        };

        if (index === 0) {
            worldPos.map_01 = { worldPos: { x: 200.5 * tileSectors, z: 11.3 * tileSectors } };
        }

        spriteManager.addSpriteForMaps(placeholderAI, Object.keys(worldPos), worldPos);
        initPlaceholderAIHealth(placeholderId);
    });

    const computerAi = new Sprite({
        id: 'computerAi',
        image: computerAiSprite,
        worldPos: { x: 4.0 * tileSectors, z: 4.0 * tileSectors },
        isLoaded: computerAiSpriteLoaded,
        layer: LAYERS.BACKGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 128 / REF_CANVAS_HEIGHT,
        aspectRatio: 1, // Square sprite
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
    spriteManager.addSpriteForMaps(computerAi, ["map_03"], {
        map_01: { worldPos: { x: 4.0 * tileSectors, z: 4.0 * tileSectors } }
    });
}