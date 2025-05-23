import { playerMovement, playerPosition } from "./playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { map_01, mapWidth, mapHeight } from "./mapdata/map_01.js";
import { tileSectors } from "./maps.js";
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
    renderEngine.fillText("IDLE 2.5D TEST: Alpha 0.0.2", 0, 30);
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

const minimapCanvas = document.createElement("canvas");
minimapCanvas.width = 200;
minimapCanvas.height = 200;
minimapCanvas.style.position = "absolute";
minimapCanvas.style.top = "300px";
minimapCanvas.style.right = "350px";
document.body.appendChild(minimapCanvas);
const minimapContext = minimapCanvas.getContext("2d");

const minimapScale = Math.min(
    minimapCanvas.width / (mapWidth * tileSectors),
    minimapCanvas.height / (mapHeight * tileSectors)
);
const minimapTileSize = tileSectors * minimapScale;

export function drawMinimap() {
    // Clear the minimap
    minimapContext.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapContext.setTransform(1, 0, 0, 1, 0, 0);

    // Draw map tiles
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const tile = map_01[y][x];
            const pixelX = x * minimapTileSize;
            const pixelY = y * minimapTileSize;

            if (tile.type === "wall" && tileTexturesMap.has(tile.textureId)) {
                const texture = tileTexturesMap.get(tile.textureId);
                minimapContext.drawImage(
                    texture,
                    0, 0, texture.width, texture.height,
                    pixelX, pixelY, minimapTileSize, minimapTileSize
                );
            } else {
                minimapContext.fillStyle = tile.type === "wall" ? "#777777" : "black";
                minimapContext.fillRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
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
                minimapContext.strokeStyle = "white";
                minimapContext.lineWidth = 1;
                minimapContext.strokeRect(pixelX, pixelY, minimapTileSize, minimapTileSize);
            }
        }
    }

    // Draw player as a red square
    const playerPixelX = playerPosition.x * minimapScale;
    const playerPixelY = playerPosition.z * minimapScale;
    const playerSize = 5;

    minimapContext.fillStyle = "red";
    minimapContext.fillRect(
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

        minimapContext.drawImage(
            creamTestSprite,
            0, 0, creamTestSprite.width, creamTestSprite.height,
            spritePixelX - spriteSize / 2,
            spritePixelY - spriteSize / 2,
            spriteSize,
            spriteSize
        );
    }

    // Draw creamSpinFrames

    // This code was given by AI, I have no idea why it actually projected the damn sprite, but holy fuck it did and it works and it is amazing. Do not ever fuck with this.
    if (creamSpinLoaded) {
        const currentFrame = getCreamSpinCurrentFrame();
        if (currentFrame) {
            const spritePixelX = creamSpinWorldPos.x * minimapScale;
            const spritePixelY = creamSpinWorldPos.z * minimapScale;
            const spriteSize = minimapTileSize * 0.5;

            minimapContext.drawImage(
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
    minimapContext.strokeStyle = "white";
    minimapContext.lineWidth = 2;
    minimapContext.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}