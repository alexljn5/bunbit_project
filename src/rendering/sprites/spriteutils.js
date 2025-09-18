import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../globals.js";
import { playerPosition, playerVantagePointX, playerVantagePointY } from "../../playerdata/playerlogic.js";
import { renderEngine } from "../renderengine.js";
import { numCastRays, playerFOV } from "../raycasting.js"
import { tileSectors } from "../../mapdata/maps.js";

export function isSpriteVisible(rayData, startColumn, endColumn, correctedDistance, spriteName = 'unknown') {
    // Ensure integer column values and proper bounds
    startColumn = Math.max(0, Math.min(numCastRays - 1, Math.round(startColumn)));
    endColumn = Math.max(0, Math.min(numCastRays - 1, Math.round(endColumn)));

    if (correctedDistance <= 0.1) return { visible: false, visibleStartCol: startColumn, visibleEndCol: startColumn };

    let visibleStartCol = -1;
    let visibleEndCol = -1;
    let visibleSegments = [];

    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        // Add small epsilon to handle floating point precision
        if (!ray || correctedDistance < ray.distance + 0.01) {
            if (visibleStartCol === -1) visibleStartCol = col;
            visibleEndCol = col;
        } else if (visibleStartCol !== -1) {
            // Store the visible segment and reset
            visibleSegments.push({ start: visibleStartCol, end: visibleEndCol });
            visibleStartCol = -1;
            visibleEndCol = -1;
        }
    }
    // If we have an active segment at the end, add it
    if (visibleStartCol !== -1) {
        visibleSegments.push({ start: visibleStartCol, end: visibleEndCol });
    }

    // If we have visible segments, use the largest one
    if (visibleSegments.length > 0) {
        let largestSegment = visibleSegments[0];
        for (let i = 1; i < visibleSegments.length; i++) {
            const segment = visibleSegments[i];
            if (segment.end - segment.start > largestSegment.end - largestSegment.start) {
                largestSegment = segment;
            }
        }
        return {
            visible: true,
            visibleStartCol: largestSegment.start,
            visibleEndCol: largestSegment.end
        };
    }

    return { visible: false, visibleStartCol: startColumn, visibleEndCol: startColumn };
}

export function getSpriteScreenParams(relativeAngle, spriteWidth) {
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
    // Ensure relative angle is normalized
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    // Calculate screen position with more precise angle handling
    const halfFOV = playerFOV / 2;
    const screenX = (CANVAS_WIDTH / 2) * (1 + relativeAngle / halfFOV);
    const adjustedScreenX = Math.round(screenX - playerVantagePointX.playerVantagePointX);

    // Calculate columns with proper rounding
    const colWidth = CANVAS_WIDTH / numCastRays;
    const halfSpriteWidth = spriteWidth / 2;
    const startColumn = Math.floor((adjustedScreenX - halfSpriteWidth) / colWidth);
    const endColumn = Math.ceil((adjustedScreenX + halfSpriteWidth) / colWidth);

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