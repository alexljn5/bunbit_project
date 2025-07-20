// renderfloors.js
import { mapHandler } from "../mapdata/maphandler.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap, texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fastSin, fastCos } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { numCastRays, playerFOV } from "./raycasting.js";

// --- Pre-initialized variables ---
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;
let floorBuffer;
let floorBuffer32;
let textureData;
let floorCanvas;
let floorCtx;
let textureWidth = 0;
let textureHeight = 0;
let lastTextureKey = "";

// --- Texture Buffer Canvas ---
const textureCanvas = document.createElement("canvas");
const textureCtx = textureCanvas.getContext("2d", { willReadFrequently: true });

function updateTextureBuffer(texture) {
    if (texture.width !== textureWidth || texture.height !== textureHeight) {
        textureWidth = texture.width;
        textureHeight = texture.height;
        textureCanvas.width = textureWidth;
        textureCanvas.height = textureHeight;
    }
    textureCtx.drawImage(texture, 0, 0);
    textureData = textureCtx.getImageData(0, 0, textureWidth, textureHeight).data;
}

export function renderRaycastFloors() {
    const mapKey = mapHandler.activeMapKey || "map_01";
    const floorTextureKey = mapHandler.getMapFloorTexture(mapKey);
    const texture = tileTexturesMap.get(floorTextureKey) || tileTexturesMap.get("floor_concrete");

    if (!texturesLoaded || !texture || !texture.complete) {
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        return;
    }

    // --- Update buffers if resolution or texture changes ---
    if (CANVAS_WIDTH !== lastCanvasWidth || CANVAS_HEIGHT !== lastCanvasHeight) {
        floorCanvas = document.createElement('canvas');
        floorCanvas.width = CANVAS_WIDTH;
        floorCanvas.height = CANVAS_HEIGHT;
        floorCtx = floorCanvas.getContext('2d');
        floorBuffer = floorCtx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
        floorBuffer32 = new Uint32Array(floorBuffer.data.buffer);
        lastCanvasWidth = CANVAS_WIDTH;
        lastCanvasHeight = CANVAS_HEIGHT;
    }

    if (floorTextureKey !== lastTextureKey || !textureData) {
        updateTextureBuffer(texture);
        lastTextureKey = floorTextureKey;
    }

    // --- Constants and pre-calculations ---
    const playerAngle = playerPosition.angle;
    const playerX = playerPosition.x;
    const playerZ = playerPosition.z;

    const fov = playerFOV;
    const halfFOV = fov * 0.5;
    const halfHeight = CANVAS_HEIGHT * 0.5;
    const projectionDist = (CANVAS_WIDTH * 0.5) / Math.tan(halfFOV);

    const invTileSectors = 1 / tileSectors;
    const texScaleX = textureWidth / tileSectors;
    const texScaleY = textureHeight / tileSectors;

    // --- Main Scanline Rendering Loop ---
    // Iterate from the horizon down to the bottom of the screen
    for (let y = Math.floor(halfHeight); y < CANVAS_HEIGHT; y++) {
        // Calculate the real-world distance to the floor points at this scanline
        const yCorrected = y - halfHeight;
        // Avoid division by zero for the horizon line
        if (yCorrected === 0) continue;

        const distance = (projectionDist * tileSectors * 0.5) / yCorrected;

        // Calculate the real-world coordinates for the start and end of the scanline
        const rayAngleLeft = playerAngle - halfFOV;
        const rayAngleRight = playerAngle + halfFOV;

        const floorX_left = playerX + distance * fastCos(rayAngleLeft);
        const floorZ_left = playerZ + distance * fastSin(rayAngleLeft);

        const floorX_right = playerX + distance * fastCos(rayAngleRight);
        const floorZ_right = playerZ + distance * fastSin(rayAngleRight);

        // Calculate the step to increment floor coordinates for each pixel in the scanline
        const floorX_step = (floorX_right - floorX_left) / CANVAS_WIDTH;
        const floorZ_step = (floorZ_right - floorZ_left) / CANVAS_WIDTH;

        const texX_step = floorX_step * texScaleX;
        const texY_step = floorZ_step * texScaleY;

        let texX = (floorX_left % tileSectors) * texScaleX;
        let texY = (floorZ_left % tileSectors) * texScaleY;

        const yOffset = y * CANVAS_WIDTH;

        // Iterate across the scanline
        for (let x = 0; x < CANVAS_WIDTH; x++) {
            const intTexX = Math.floor(texX) & (textureWidth - 1);
            const intTexY = Math.floor(texY) & (textureHeight - 1);

            // Get the pixel color from the texture data
            const texOffset = (intTexY * textureWidth + intTexX) * 4;
            const r = textureData[texOffset];
            const g = textureData[texOffset + 1];
            const b = textureData[texOffset + 2];
            const a = textureData[texOffset + 3];

            // Write the pixel to the buffer (ABGR format for Uint32Array)
            floorBuffer32[yOffset + x] = (a << 24) | (b << 16) | (g << 8) | r;

            // Move to the next point in texture space
            texX += texX_step;
            texY += texY_step;
        }
    }

    // Draw the entire floor buffer to the canvas in one go
    floorCtx.putImageData(floorBuffer, 0, 0);
    renderEngine.drawImage(floorCanvas, 0, 0);
}