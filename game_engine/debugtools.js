import { playerMovement, playerPosition } from "./playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { mapHandler } from "./mapdata/maphandler.js"; // Updated
import { tileSectors } from "./mapdata/maps.js";
import { tileTexturesMap } from "./mapdata/maptextures.js";
import { spriteManager, getCreamSpinCurrentFrame, spriteState } from "./rendersprites.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "./globals.js";

export function compiledDevTools() {
    fpsMeter();
    playerCoordinates();
    versionTextDisplay();
    drawMinimap();
}

export function compiledTextStyle() {
    renderEngine.fillStyle = "yellow";
    renderEngine.font = `${30 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
}

function versionTextDisplay() {
    compiledTextStyle();
    renderEngine.fillText("IDLE 2.5D TEST: Alpha 0.0.3", 0, 30 * SCALE_Y);
}

function fpsMeter() {
    if (!fpsMeter.last) fpsMeter.last = performance.now();
    const currentTime = performance.now();
    const deltaTime = (currentTime - fpsMeter.last) / 1000;
    fpsMeter.last = currentTime;
    const fps = Math.round(1 / deltaTime);
    compiledTextStyle();
    renderEngine.fillText(`FPS: ${fps}`, 0, 60 * SCALE_Y);
}
fpsMeter.last = null;

function playerCoordinates() {
    // Show actual playerPosition.x and playerPosition.z (not delta)
    const playerX = Math.round(playerPosition.x);
    const playerZ = Math.round(playerPosition.z);
    compiledTextStyle();
    renderEngine.fillText(`X: ${playerX}, Z: ${playerZ}`, 1, 90 * SCALE_Y);
}

const minimapWidth = 200 * SCALE_X;
const minimapHeight = 200 * SCALE_Y;

export function drawMinimap() {
    // Update active sector
    mapHandler.updateActiveSector(playerPosition);
    const sector = mapHandler.getActiveSector();
    if (!sector) {
        console.error("No active sector for minimap! *pouts*");
        renderEngine.fillStyle = "red";
        renderEngine.fillRect(CANVAS_WIDTH - minimapWidth - 20 * SCALE_X, 20 * SCALE_Y, minimapWidth, minimapHeight);
        return;
    }

    // Get sector metadata
    const sectors = mapHandler.maps.get(mapHandler.activeMapKey);
    const sectorInfo = sectors.find(s => s.id === mapHandler.activeSectorId);
    if (!sectorInfo) {
        console.error("Sector info not found for ID:", mapHandler.activeSectorId);
        return;
    }
    const { startX, startY, width, height } = sectorInfo;

    // Calculate minimap scaling based on sector size
    const minimapScale = Math.min(
        minimapWidth / (width * tileSectors),
        minimapHeight / (height * tileSectors)
    );
    const minimapTileSize = tileSectors * minimapScale;

    console.log(`Drawing minimap for sector ${mapHandler.activeSectorId} (${width}x${height}) at (${startX}, ${startY})`);

    const minimapX = CANVAS_WIDTH - minimapWidth - 20 * SCALE_X;
    const minimapY = 20 * SCALE_Y;
    renderEngine.save();
    renderEngine.translate(minimapX, minimapY);
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, minimapWidth, minimapHeight);

    // Draw tiles
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = sector[y][x];
            const pixelX = x * minimapTileSize;
            const pixelY = y * minimapTileSize;
            if (tile.type === "wall" && tileTexturesMap.has(tile.textureId)) {
                const texture = tileTexturesMap.get(tile.textureId);
                renderEngine.drawImage(
                    texture,
                    0, 0, texture.width, texture.height,
                    pixelX, pixelY, minimapTileSize, minimapTileSize
                );
            } else {
                renderEngine.fillStyle = tile.type === "wall" ? "#777777" : "black";
                renderEngine.fillRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
            }
        }
    }

    // Draw outlines for empty tiles with wall neighbors
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = sector[y][x];
            if (tile.type !== "empty") continue;
            let hasWallNeighbor = false;
            if (y > 0 && sector[y - 1][x].type === "wall") hasWallNeighbor = true;
            if (y < height - 1 && sector[y + 1][x].type === "wall") hasWallNeighbor = true;
            if (x > 0 && sector[y][x - 1].type === "wall") hasWallNeighbor = true;
            if (x < width - 1 && sector[y][x + 1].type === "wall") hasWallNeighbor = true;
            const pixelX = x * minimapTileSize;
            const pixelY = y * minimapTileSize;
            renderEngine.strokeStyle = hasWallNeighbor ? "white" : "#777777";
            renderEngine.lineWidth = 1 * Math.min(SCALE_X, SCALE_Y);
            renderEngine.strokeRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
        }
    }

    // Draw player (adjust for sector offset)
    const playerPixelX = (playerPosition.x / tileSectors - startX) * minimapTileSize;
    const playerPixelY = (playerPosition.z / tileSectors - startY) * minimapTileSize;
    const playerSize = 5 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.fillStyle = "red";
    renderEngine.fillRect(
        playerPixelX - playerSize / 2,
        playerPixelY - playerSize / 2,
        playerSize,
        playerSize
    );

    // Render sprites
    const spritesToRender = [
        'creamSpin',
        'boyKisser',
        'casperLesserDemon',
        'metalPipe',
        'nineMMAmmo'
    ];
    for (const spriteId of spritesToRender) {
        const sprite = spriteManager.getSprite(spriteId);
        if (!sprite || !sprite.isLoaded || !sprite.worldPos) continue;
        // Skip collected items
        if (spriteId === 'metalPipe' && spriteState.isMetalPipeCollected) continue;
        if (spriteId === 'nineMMAmmo' && spriteState.isNineMmAmmoCollected) continue;
        // Filter sprites to active sector
        const spriteTileX = sprite.worldPos.x / tileSectors;
        const spriteTileY = sprite.worldPos.z / tileSectors;
        if (
            spriteTileX < startX || spriteTileX >= startX + width ||
            spriteTileY < startY || spriteTileY >= startY + height
        ) continue;
        let image = sprite.image;
        if (spriteId === 'creamSpin') {
            const currentFrame = getCreamSpinCurrentFrame();
            if (!currentFrame) continue;
            image = currentFrame;
        }
        const spritePixelX = (spriteTileX - startX) * minimapTileSize;
        const spritePixelY = (spriteTileY - startY) * minimapTileSize;
        const spriteSize = minimapTileSize * 0.5;
        renderEngine.drawImage(
            image,
            0, 0, image.width, image.height,
            spritePixelX - spriteSize / 2,
            spritePixelY - spriteSize / 2,
            spriteSize,
            spriteSize
        );
    }

    // Draw border
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(0, 0, minimapWidth, minimapHeight);

    renderEngine.restore();
}