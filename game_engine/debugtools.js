import { playerMovement, playerPosition } from "./playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { map_01, mapWidth, mapHeight } from "./mapdata/map_01.js";
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
    if (!fpsMeter.lastTime) fpsMeter.lastTime = performance.now();
    const currentTime = performance.now();
    const deltaTime = (currentTime - fpsMeter.lastTime) / 1000;
    fpsMeter.lastTime = currentTime;
    const fps = Math.round(1 / deltaTime);
    compiledTextStyle();
    renderEngine.fillText(`FPS: ${fps}`, 0, 60 * SCALE_Y);
}
fpsMeter.lastTime = null;

function playerCoordinates() {
    let playerXCoords = Math.round(playerPosition.x + playerMovement.x);
    let playerZCoords = Math.round(playerPosition.z + playerMovement.z);
    compiledTextStyle();
    renderEngine.fillText(`X: ${playerXCoords}, Z: ${playerZCoords}`, 0, 90 * SCALE_Y);
}

const minimapWidth = 200 * SCALE_X;
const minimapHeight = 200 * SCALE_Y;
const minimapScale = Math.min(
    minimapWidth / (mapWidth * tileSectors),
    minimapHeight / (mapHeight * tileSectors)
);
const minimapTileSize = tileSectors * minimapScale;

export function drawMinimap() {
    const minimapX = CANVAS_WIDTH - minimapWidth - 20 * SCALE_X;
    const minimapY = 20 * SCALE_Y;
    renderEngine.save();
    renderEngine.translate(minimapX, minimapY);
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, minimapWidth, minimapHeight);
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const tile = map_01[y][x];
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
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const tile = map_01[y][x];
            if (tile.type !== "empty") continue;
            let hasWallNeighbor = false;
            if (y > 0 && map_01[y - 1][x].type === "wall") hasWallNeighbor = true;
            if (y < mapHeight - 1 && map_01[y + 1][x].type === "wall") hasWallNeighbor = true;
            if (x > 0 && map_01[y][x - 1].type === "wall") hasWallNeighbor = true;
            if (x < mapWidth - 1 && map_01[y][x + 1].type === "wall") hasWallNeighbor = true;
            const pixelX = x * minimapTileSize;
            const pixelY = y * minimapTileSize;
            renderEngine.strokeStyle = hasWallNeighbor ? "white" : "#777777";
            renderEngine.lineWidth = 1 * Math.min(SCALE_X, SCALE_Y);
            renderEngine.strokeRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
        }
    }
    const playerPixelX = playerPosition.x * minimapScale;
    const playerPixelY = playerPosition.z * minimapScale;
    const playerSize = 5 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.fillStyle = "red";
    renderEngine.fillRect(
        playerPixelX - playerSize / 2,
        playerPixelY - playerSize / 2,
        playerSize,
        playerSize
    );
    // Render sprites dynamically
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
        let image = sprite.image;
        if (spriteId === 'creamSpin') {
            const currentFrame = getCreamSpinCurrentFrame();
            if (!currentFrame) continue;
            image = currentFrame;
        }
        const spritePixelX = sprite.worldPos.x * minimapScale;
        const spritePixelY = sprite.worldPos.z * minimapScale;
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
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(0, 0, minimapWidth, minimapHeight);
    renderEngine.restore();
}