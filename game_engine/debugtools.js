import { playerMovement, playerPosition } from "./playerdata/playerlogic.js";
import { renderEngine } from "./rendering/renderengine.js";
import { mapHandler } from "./mapdata/maphandler.js";
import { tileSectors } from "./mapdata/maps.js";
import { tileTexturesMap } from "./mapdata/maptexturesloader.js";
import { getCreamSpinCurrentFrame, spriteState } from "./rendering/sprites/spritetextures.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, HIGH_RES_ENABLED, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "./globals.js";
import { spriteManager } from "./rendering/sprites/rendersprites.js";
import { renderSprite } from "./rendering/sprites/spriteutils.js";
import { gameVersionNumber } from "./globals.js";

export function compiledDevTools() {
    drawDebugOverlay();
    drawMinimap();
}

// Static variable for FPS calculation
let lastFrameTime = null;

function drawDebugOverlay() {
    // Define debug text panel dimensions
    const overlayX = 10 * SCALE_X;
    const overlayY = 10 * SCALE_Y;
    const overlayWidth = 300 * SCALE_X;
    const overlayHeight = 100 * SCALE_Y;

    // Draw semi-transparent background
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);

    // Draw white border
    renderEngine.strokeStyle = "#fff";
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

    // Draw version text
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${22 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText(`IDLE 2.5D TEST: ${gameVersionNumber}`, overlayX + 10 * SCALE_X, overlayY + 30 * SCALE_Y);

    // Draw FPS
    if (!lastFrameTime) lastFrameTime = performance.now();
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    const fps = Math.round(1 / deltaTime);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText(`FPS: ${fps}`, overlayX + 10 * SCALE_X, overlayY + 60 * SCALE_Y);

    // Draw player coordinates
    const playerX = Math.round(playerPosition.x);
    const playerZ = Math.round(playerPosition.z);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText(`X: ${playerX}, Z: ${playerZ}`, overlayX + 10 * SCALE_X, overlayY + 80 * SCALE_Y);
}

// Define minimap size relative to reference canvas (800x800)
const baseMinimapWidth = 200; // Base size in reference resolution
const baseMinimapHeight = 200;
const baseMargin = 20; // Base margin in reference resolution

export function drawMinimap() {
    // Log the active map key for debugging
    console.log(`drawMinimap: Active map key is ${mapHandler.activeMapKey}`);

    // Ensure sprites are loaded for the current map
    spriteManager.loadSpritesForMap(mapHandler.activeMapKey);

    // Get the full map grid for the active map
    const mapGrid = mapHandler.getFullMap(mapHandler.activeMapKey);
    if (!mapGrid || !Array.isArray(mapGrid) || !mapGrid[0] || !Array.isArray(mapGrid[0])) {
        console.warn(`No valid map grid for ${mapHandler.activeMapKey}`);
        renderEngine.fillStyle = "red";
        const minimapWidth = baseMinimapWidth * SCALE_X;
        const minimapHeight = baseMinimapHeight * SCALE_Y;
        renderEngine.fillRect(
            CANVAS_WIDTH - minimapWidth - baseMargin * SCALE_X,
            baseMargin * SCALE_Y,
            minimapWidth,
            minimapHeight
        );
        return;
    }

    const height = mapGrid.length;
    const width = mapGrid[0].length;

    // Calculate minimap size and scale, accounting for canvas resolution
    const minimapWidth = baseMinimapWidth * SCALE_X;
    const minimapHeight = baseMinimapHeight * SCALE_Y;
    const minimapScale = Math.min(
        minimapWidth / (width * tileSectors),
        minimapHeight / (height * tileSectors)
    );
    const minimapTileSize = tileSectors * minimapScale;

    // Position minimap in top-right corner
    const transformScale = HIGH_RES_ENABLED ? 1 : 2; // From globals.js: scale(1) for high-res, scale(2) for low-res
    const minimapX = CANVAS_WIDTH - minimapWidth - baseMargin * SCALE_X;
    const minimapY = baseMargin * SCALE_Y;
    renderEngine.save();
    renderEngine.translate(minimapX, minimapY);

    // Draw minimap background
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(0, 0, minimapWidth, minimapHeight);

    // Draw map tiles (walls and floors)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = mapGrid[y][x];
            if (!tile) continue;
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

    // Draw borders for empty tiles with wall neighbors
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = mapGrid[y][x];
            if (!tile || tile.type !== "empty") continue;
            let hasWallNeighbor = false;
            if (y > 0 && mapGrid[y - 1][x]?.type === "wall") hasWallNeighbor = true;
            if (y < height - 1 && mapGrid[y + 1][x]?.type === "wall") hasWallNeighbor = true;
            if (x > 0 && mapGrid[y][x - 1]?.type === "wall") hasWallNeighbor = true;
            if (x < width - 1 && mapGrid[y][x + 1]?.type === "wall") hasWallNeighbor = true;
            const pixelX = x * minimapTileSize;
            const pixelY = y * minimapTileSize;
            renderEngine.strokeStyle = hasWallNeighbor ? "white" : "#777777";
            renderEngine.lineWidth = 1 * Math.min(SCALE_X, SCALE_Y);
            renderEngine.strokeRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
        }
    }

    // Draw player position
    const playerTileX = playerPosition.x / tileSectors;
    const playerTileY = playerPosition.z / tileSectors;
    const playerPixelX = playerTileX * minimapTileSize;
    const playerPixelY = playerTileY * minimapTileSize;
    const playerSize = 5 * Math.min(SCALE_X, SCALE_Y) * transformScale; // Adjust for canvas scale
    renderEngine.fillStyle = "red";
    renderEngine.fillRect(
        playerPixelX - playerSize / 2,
        playerPixelY - playerSize / 2,
        playerSize,
        playerSize
    );

    // Draw sprites
    const spritesToRender = [
        'creamSpin',
        'boyKisser',
        'casperLesserDemon',
        'metalPipe',
        'nineMMAmmo'
    ];
    for (const spriteId of spritesToRender) {
        const sprite = spriteManager.getSprite(spriteId);
        if (!sprite) {
            console.warn(`Sprite ${spriteId} not found in spriteManager`);
            continue;
        }
        if (!sprite.isLoaded) {
            console.warn(`Sprite ${spriteId} is not loaded`);
            // Draw a placeholder rectangle
            renderEngine.fillStyle = spriteId === 'creamSpin' ? 'pink' : 'yellow';
            const spriteTileX = sprite.worldPos?.x / tileSectors || 0;
            const spriteTileY = sprite.worldPos?.z / tileSectors || 0;
            const spritePixelX = spriteTileX * minimapTileSize;
            const spritePixelY = spriteTileY * minimapTileSize;
            const spriteSize = minimapTileSize * 0.5;
            renderEngine.fillRect(
                spritePixelX - spriteSize / 2,
                spritePixelY - spriteSize / 2,
                spriteSize,
                spriteSize
            );
            continue;
        }
        if (!sprite.worldPos) {
            console.warn(`Sprite ${spriteId} has no worldPos`);
            continue;
        }
        if (spriteId === 'metalPipe' && spriteState.isMetalPipeCollected) {
            console.log(`Skipping ${spriteId}: isMetalPipeCollected is true`);
            continue;
        }
        if (spriteId === 'nineMMAmmo' && spriteState.isNineMmAmmoCollected) {
            console.log(`Skipping ${spriteId}: isNineMmAmmoCollected is true`);
            continue;
        }
        const spriteTileX = sprite.worldPos.x / tileSectors;
        const spriteTileY = sprite.worldPos.z / tileSectors;
        // Check if sprite is within map bounds
        if (
            spriteTileX < 0 || spriteTileX >= width ||
            spriteTileY < 0 || spriteTileY >= height
        ) {
            console.warn(`Sprite ${spriteId} is out of map bounds: x=${spriteTileX}, y=${spriteTileY}`);
            continue;
        }
        let image = sprite.image;
        if (spriteId === 'creamSpin') {
            const currentFrame = getCreamSpinCurrentFrame();
            if (!currentFrame) {
                console.warn(`No current frame for creamSpin`);
                continue;
            }
            image = currentFrame;
        }
        const spritePixelX = spriteTileX * minimapTileSize;
        const spritePixelY = spriteTileY * minimapTileSize;
        const spriteSize = minimapTileSize * 0.5 * transformScale; // Adjust for canvas scale
        renderEngine.drawImage(
            image,
            0, 0, image.width, image.height,
            spritePixelX - spriteSize / 2,
            spritePixelY - spriteSize / 2,
            spriteSize,
            spriteSize
        );
    }

    // Draw minimap border
    renderEngine.strokeStyle = "#fff";
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y) * transformScale;
    renderEngine.strokeRect(0, 0, minimapWidth, minimapHeight);

    renderEngine.restore();
}
export function compiledTextStyle() { renderEngine.fillStyle = "yellow"; renderEngine.font = `${30 * Math.min(SCALE_X, SCALE_Y)}px Arial`; }