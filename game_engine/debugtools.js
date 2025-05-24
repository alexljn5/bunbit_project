import { playerMovement, playerPosition } from "./playerdata/playerlogic.js";
import { renderEngine, CANVAS_WIDTH, CANVAS_HEIGHT } from "./renderengine.js";
import { map_01, mapWidth, mapHeight } from "./mapdata/map_01.js";
import { tileSectors } from "./mapdata/maps.js";
import { tileTexturesMap } from "./mapdata/maptextures.js";
import { creamTestSprite, creamTestLoaded, creamTestWorldPos, creamSpinLoaded, creamSpinWorldPos, getCreamSpinCurrentFrame } from "./rendersprites.js";

export function compiledDevTools() {
    fpsMeter();
    playerCoordinates();
    versionTextDisplay();
    drawMinimap();
}

export function compiledTextStyle() {
    let defaultFont = "30px Arial";
    renderEngine.fillStyle = "yellow";
    renderEngine.font = defaultFont;
}

function versionTextDisplay() {
    compiledTextStyle();
    renderEngine.fillText("IDLE 2.5D TEST: Alpha 0.0.3", 0, 30);
}

function fpsMeter() {
    if (!fpsMeter.lastTime) fpsMeter.lastTime = performance.now();

    const currentTime = performance.now();
    const deltaTime = (currentTime - fpsMeter.lastTime) / 1000;
    fpsMeter.lastTime = currentTime;

    const fps = Math.round(1 / deltaTime);
    compiledTextStyle();
    renderEngine.fillText(`FPS: ${fps}`, 0, 60);
}
fpsMeter.lastTime = null;

function playerCoordinates() {
    let playerXCoords = Math.round(playerPosition.x + playerMovement.x);
    let playerZCoords = Math.round(playerPosition.z + playerMovement.z);
    compiledTextStyle();
    renderEngine.fillText(`X: ${playerXCoords}, Z: ${playerZCoords}`, 0, 90);
}

const minimapWidth = 200; // Fixed size for minimap
const minimapHeight = 200;
const minimapScale = Math.min(
    minimapWidth / (mapWidth * tileSectors),
    minimapHeight / (mapHeight * tileSectors)
);
const minimapTileSize = tileSectors * minimapScale;

export function drawMinimap() {
    const minimapX = CANVAS_WIDTH - minimapWidth - 20; // Top-right, 20px from edge
    const minimapY = 20; // 20px from top

    // Save the current canvas state
    renderEngine.save();
    // Translate to minimap position
    renderEngine.translate(minimapX, minimapY);

    // Clear the minimap area (optional, since drawBackground clears the canvas)
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, minimapWidth, minimapHeight);

    // Draw map tiles
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

    // Draw borders around empty tiles adjacent to wall tiles
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const tile = map_01[y][x];
            if (tile.type !== "empty") continue;

            // Check neighbors (up, down, left, right)
            const hasWallNeighbor =
                (y > 0 && map_01[y - 1][x].type === "wall") ||
                (y < mapHeight - 1 && map_01[y + 1][x].type === "wall") ||
                (x > 0 && map_01[y][x - 1].type === "wall") ||
                (x < mapWidth - 1 && map_01[y][x + 1].type === "wall");

            if (hasWallNeighbor) {
                const pixelX = x * minimapTileSize;
                const pixelY = y * minimapTileSize;
                renderEngine.strokeStyle = "white";
                renderEngine.lineWidth = 1;
                renderEngine.strokeRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
            }
        }
    }

    // Draw player as a red square
    const playerPixelX = playerPosition.x * minimapScale;
    const playerPixelY = playerPosition.z * minimapScale;
    const playerSize = 5;

    renderEngine.fillStyle = "red";
    renderEngine.fillRect(
        playerPixelX - playerSize / 2,
        playerPixelY - playerSize / 2,
        playerSize,
        playerSize
    );

    // Draw creamTestSprite
    if (creamTestLoaded) {
        const spritePixelX = creamTestWorldPos.x * minimapScale;
        const spritePixelY = creamTestWorldPos.z * minimapScale;
        const spriteSize = minimapTileSize * 0.5;

        renderEngine.drawImage(
            creamTestSprite,
            0, 0, creamTestSprite.width, creamTestSprite.height,
            spritePixelX - spriteSize / 2,
            spritePixelY - spriteSize / 2,
            spriteSize,
            spriteSize
        );
    }

    // Draw creamSpinFrames
    if (creamSpinLoaded) {
        const currentFrame = getCreamSpinCurrentFrame();
        if (currentFrame) {
            const spritePixelX = creamSpinWorldPos.x * minimapScale;
            const spritePixelY = creamSpinWorldPos.z * minimapScale;
            const spriteSize = minimapTileSize * 0.5;

            renderEngine.drawImage(
                currentFrame,
                0, 0, currentFrame.width, currentFrame.height,
                spritePixelX - spriteSize / 2,
                spritePixelY - spriteSize / 2,
                spriteSize,
                spriteSize
            );
        }
    }

    // Draw minimap border
    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(0, 0, minimapWidth, minimapHeight);

    // Restore the canvas state
    renderEngine.restore();
}