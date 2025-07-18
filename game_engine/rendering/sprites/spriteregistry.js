import { Sprite, LAYERS, spriteManager } from "./rendersprites.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { map_debug } from "../../mapdata/map_debug.js";
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
    boyKisserEnemyHealth,
    getCreamSpinCurrentFrame
} from "./spritetextures.js";
import { SCALE_X, SCALE_Y, CANVAS_HEIGHT, CANVAS_WIDTH, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../../globals.js";
import { playerPosition, playerVantagePointY, getPlayerBobbingOffset } from "../../playerdata/playerlogic.js";
import { playerFOV } from "../raycasting.js";
import {
    pillar01SpriteWorldPos,
    corpse1WorldPos,
    metalPipeWorldPos,
    nineMMAmmoSpriteWorldPos,
    boyKisserEnemySpriteWorldPos,
    casperLesserDemonSpriteWorldPos,
    placeholderAISpriteWorldPos
} from "./rendersprites.js";
import { getSpriteScreenParams } from "./spriteutils.js";
import { renderSprite } from "./spriteutils.js";
import { tileSectors } from "../../mapdata/maps.js";

export function registerSprites() {
    const playerHand = new Sprite({
        id: 'playerHand',
        image: playerHandSprite,
        isLoaded: handLoaded,
        layer: LAYERS.FOREGROUND,
        renderFunction: (rayData, renderEngine) => {
            if (!handLoaded && !metalPipePlayerHandLoaded && !genericGunPlayerHandLoaded) return null;
            let handSprite = playerHandSprite;
            const selectedItem = playerInventory[inventoryState.selectedInventoryIndex];
            if (selectedItem === "metal_pipe" && metalPipePlayerHandLoaded) {
                handSprite = metalPipePlayerHandSprite;
            } else if (selectedItem === "generic_gun" && genericGunPlayerHandLoaded) {
                handSprite = genericGunPlayerHandSprite;
            }
            const bobbingY = (400 * SCALE_Y) + getPlayerBobbingOffset();
            const spriteWidth = 256 * SCALE_X;
            const spriteHeight = 512 * SCALE_Y;
            const spriteX = 450 * SCALE_X;
            renderEngine.drawImage(handSprite, spriteX, bobbingY, spriteWidth, spriteHeight);
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
        worldPos: pillar01SpriteWorldPos,
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
        worldPos: corpse1WorldPos,
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
        worldPos: metalPipeWorldPos,
        isLoaded: metalPipeLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 500 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, renderEngine) => {
            if (spriteState.isMetalPipeCollected) return null;
            return renderSprite({
                sprite: metalPipeSprite,
                isLoaded: metalPipeLoaded,
                worldPos: metalPipeWorldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 500 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'metalPipe'
            });
        }
    });
    spriteManager.addSpriteForMaps(metalPipe, ["map_01", "map_02", "map_debug"], {
        map_01: { worldPos: { x: 2.5 * tileSectors, z: 4.5 * tileSectors } },
        map_02: { worldPos: { x: 2.0 * tileSectors, z: 3.5 * tileSectors } },
        map_debug: { worldPos: { x: 2.5 * tileSectors, z: 4.5 * tileSectors } }
    });

    const nineMMAmmo = new Sprite({
        id: 'nineMMAmmo',
        image: nineMMAmmoSprite,
        worldPos: nineMMAmmoSpriteWorldPos,
        isLoaded: nineMMAmmoSpriteLoaded,
        layer: LAYERS.MIDGROUND,
        scaleFactor: 0.5,
        aspectRatio: 1,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        renderFunction: (rayData, renderEngine) => {
            if (spriteState.isNineMmAmmoCollected) return null;
            const dx = nineMMAmmoSpriteWorldPos.x - playerPosition.x;
            const dz = nineMMAmmoSpriteWorldPos.z - playerPosition.z;
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
                worldPos: nineMMAmmoSpriteWorldPos,
                rayData,
                spriteWidth,
                spriteHeight,
                spriteY: spriteYBottom - spriteHeight,
                adjustedScreenX,
                startColumn,
                endColumn,
                correctedDistance,
                spriteId: 'nineMMAmmo'
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
        worldPos: boyKisserEnemySpriteWorldPos,
        isLoaded: boyKisserEnemySpriteLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, renderEngine) => {
            if (!boyKisserEnemySpriteLoaded) return null;
            const result = renderSprite({
                sprite: boyKisserEnemySprite,
                isLoaded: boyKisserEnemySpriteLoaded,
                worldPos: boyKisserEnemySpriteWorldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 400 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'boyKisser'
            });
            if (result) {
                if (typeof window !== 'undefined' && typeof window.boyKisserEnemyHealth === 'number') {
                    boyKisserEnemyHealth = window.boyKisserEnemyHealth;
                } else if (typeof globalThis !== 'undefined' && typeof globalThis.boyKisserEnemyHealth === 'number') {
                    boyKisserEnemyHealth = globalThis.boyKisserEnemyHealth;
                }
                const barWidth = 60 * SCALE_X;
                const barHeight = 8 * SCALE_Y;
                const maxHealth = 5;
                const healthPercent = Math.max(0, Math.min(1, boyKisserEnemyHealth / maxHealth));
                const barX = result.adjustedScreenX - barWidth / 2;
                const barY = result.spriteY - playerVantagePointY.playerVantagePointY - barHeight - 10 * SCALE_Y;
                renderEngine.fillStyle = '#222';
                renderEngine.fillRect(barX, barY, barWidth, barHeight);
                renderEngine.fillStyle = '#FFD700';
                renderEngine.fillRect(barX, barY, barWidth * healthPercent, barHeight);
                renderEngine.strokeStyle = '#000';
                renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
                renderEngine.strokeRect(barX, barY, barWidth, barHeight);
                return result;
            }
            return null;
        }
    });
    spriteManager.addSpriteForMaps(boyKisser, ["map_01", "map_debug"], {
        map_01: { worldPos: { x: 3.4 * tileSectors, z: 1.2 * tileSectors } },
        map_debug: { worldPos: { x: 10.4 * tileSectors, z: 1.2 * tileSectors } }
    });

    const casperLesserDemon = new Sprite({
        id: 'casperLesserDemon',
        image: casperLesserDemonSprite,
        worldPos: casperLesserDemonSpriteWorldPos,
        isLoaded: casperLesserDemonSpriteLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, renderEngine) => {
            if (!casperLesserDemonSpriteLoaded) return null;
            return renderSprite({
                sprite: casperLesserDemonSprite,
                isLoaded: casperLesserDemonSpriteLoaded,
                worldPos: casperLesserDemonSpriteWorldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 400 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'casperLesserDemon'
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
    spriteManager.addSpriteForMaps(creamSpin, ["map_01", "map_02"], {
        map_01: { worldPos: { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors } },
        map_02: { worldPos: { x: 3.5 * tileSectors, z: 12.0 * tileSectors } }
    });

    const placeholderAI = new Sprite({
        id: 'placeholderAI',
        image: placeholderAiSprite,
        worldPos: placeholderAISpriteWorldPos,
        isLoaded: placeholderAiSpriteLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5,
        renderFunction: (rayData, renderEngine) => {
            if (!placeholderAiSpriteLoaded) return null;
            return renderSprite({
                sprite: placeholderAiSprite,
                isLoaded: placeholderAiSpriteLoaded,
                worldPos: placeholderAISpriteWorldPos,
                rayData,
                baseWidthRatio: 128 / REF_CANVAS_WIDTH,
                baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
                aspectRatio: 128 / 80,
                baseYRatio: 400 / REF_CANVAS_HEIGHT,
                scaleFactor: 0.5,
                spriteId: 'placeholderAI'
            });
        }
    });
    spriteManager.addSpriteForMaps(placeholderAI, ["map_01"], {
        map_01: { worldPos: { x: 2.5 * tileSectors, z: 11.3 * tileSectors } }
    });
}