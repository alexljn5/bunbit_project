import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../globals.js";
import { playerPosition, playerVantagePointX, playerVantagePointY } from "../../playerdata/playerlogic.js";
import { renderEngine } from "../renderengine.js";
import { numCastRays, playerFOV } from "../raycasting.js"
import { tileSectors } from "../../mapdata/maps.js";

export function isSpriteVisible(rayData, startColumn, endColumn, correctedDistance, spriteName = 'unknown') {
    startColumn = Math.max(0, Math.min(numCastRays - 1, Math.floor(startColumn)));
    endColumn = Math.max(0, Math.min(numCastRays - 1, Math.ceil(endColumn)));
    if (correctedDistance <= 0) return { visible: false, visibleStartCol: startColumn, visibleEndCol: startColumn };
    let visibleStartCol = -1;
    let visibleEndCol = -1;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            if (visibleStartCol === -1) visibleStartCol = col;
            visibleEndCol = col;
        }
    }
    const visible = visibleStartCol !== -1 && visibleEndCol !== -1;
    return { visible, visibleStartCol, visibleEndCol };
}

export function getSpriteScreenParams(relativeAngle, spriteWidth) {
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;
    const startColumn = (adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays);
    const endColumn = (adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays);
    return { adjustedScreenX, startColumn, endColumn };
}

export function renderSprite({
    sprite,
    isLoaded,
    worldPos,
    rayData,
    baseWidthRatio = 0.25,
    baseHeightRatio = 0.25,
    aspectRatio = 1,
    baseYRatio = 0.5,
    scaleFactor = 0.5,
    spriteId = 'unknown',
    spriteWidth: providedWidth,
    spriteHeight: providedHeight,
    spriteY: providedY,
    adjustedScreenX: providedScreenX,
    startColumn: providedStartCol,
    endColumn: providedEndCol,
    correctedDistance: providedDistance
}) {
    if (!isLoaded || !sprite || !worldPos) return null;

    let spriteWidth, spriteHeight, spriteY, adjustedScreenX, startColumn, endColumn, correctedDistance;

    if (providedWidth && providedHeight && providedY && providedScreenX && providedStartCol !== undefined && providedEndCol !== undefined && providedDistance) {
        spriteWidth = providedWidth;
        spriteHeight = providedHeight;
        spriteY = providedY;
        adjustedScreenX = providedScreenX;
        startColumn = providedStartCol;
        endColumn = providedEndCol;
        correctedDistance = providedDistance;
    } else {
        const dx = worldPos.x - playerPosition.x;
        const dz = worldPos.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
        correctedDistance = distance * Math.cos(relativeAngle);
        if (correctedDistance < 0.1) return null;
        spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * scaleFactor;
        spriteWidth = spriteHeight * aspectRatio;
        spriteY = CANVAS_HEIGHT * baseYRatio;
        ({ adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth));
    }

    const visibility = isSpriteVisible(rayData, startColumn, endColumn, correctedDistance, spriteId);
    if (!visibility.visible) return null;

    if (adjustedScreenX + spriteWidth / 2 < 0 || adjustedScreenX - spriteWidth / 2 > CANVAS_WIDTH) return null;

    const visibleStartCol = Math.max(startColumn, visibility.visibleStartCol);
    const visibleEndCol = Math.min(endColumn, visibility.visibleEndCol);

    const colWidth = CANVAS_WIDTH / numCastRays;
    const spriteLeftX = adjustedScreenX - spriteWidth / 2;
    const visibleLeftX = spriteLeftX + (visibleStartCol - startColumn) * colWidth;
    const visibleRightX = spriteLeftX + (visibleEndCol - startColumn + 1) * colWidth;
    const visibleScreenWidth = visibleRightX - visibleLeftX;

    const spriteImageWidth = sprite.width;
    const visibleFractionStart = (visibleStartCol - startColumn) / (endColumn - startColumn + 1);
    const visibleFractionEnd = (visibleEndCol - startColumn + 1) / (endColumn - startColumn + 1);
    const sx = visibleFractionStart * spriteImageWidth;
    const sWidth = (visibleFractionEnd - visibleFractionStart) * spriteImageWidth;

    renderEngine.drawImage(
        sprite,
        sx, 0, sWidth, sprite.height,
        visibleLeftX, spriteY - playerVantagePointY.playerVantagePointY,
        visibleScreenWidth, spriteHeight
    );

    return { adjustedScreenX, spriteWidth: visibleScreenWidth, spriteY, spriteHeight };
}