// renderfloors.js
import { mapHandler } from "../mapdata/maphandler.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap, texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fastSin, fastCos } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { numCastRays, playerFOV } from "./raycasting.js";

let lastCanvasWidth = CANVAS_WIDTH;
let lastCanvasHeight = CANVAS_HEIGHT;

const bufferCanvas = document.createElement("canvas");
bufferCanvas.width = CANVAS_WIDTH;
bufferCanvas.height = CANVAS_HEIGHT;
const bufferCtx = bufferCanvas.getContext("2d");

export async function renderRaycastFloors(rayData) {
    const mapKey = mapHandler.activeMapKey || "map_01";
    const floorTextureKey = mapHandler.getMapFloorTexture(mapKey);
    const texture = tileTexturesMap.get(floorTextureKey) || tileTexturesMap.get("floor_concrete");

    // Fallback if textures aren't ready
    if (!texturesLoaded || !texture || !texture.complete) {
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        return;
    }

    // Update buffer canvas if resolution changed
    if (CANVAS_WIDTH !== lastCanvasWidth || CANVAS_HEIGHT !== lastCanvasHeight) {
        bufferCanvas.width = CANVAS_WIDTH;
        bufferCanvas.height = CANVAS_HEIGHT;
        lastCanvasWidth = CANVAS_WIDTH;
        lastCanvasHeight = CANVAS_HEIGHT;
    }

    // Clear the buffer
    bufferCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Constants for floor rendering
    const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
    const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
    const halfTile = tileSectors * 0.5;
    const invTileSectors = 1 / tileSectors;

    // Optimization: Render in chunks of 4 rays at a time
    const RAY_CHUNK_SIZE = 4;
    const colWidth = CANVAS_WIDTH / numCastRays * RAY_CHUNK_SIZE;

    // Pre-calculate angles
    const fovStep = playerFOV / numCastRays;
    let angle = playerPosition.angle - playerFOV / 2;

    // Optimization: Pre-calculate row distances
    const rowDistances = new Float32Array(CANVAS_HEIGHT);
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
        rowDistances[y] = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
    }

    // Main rendering loop - process rays in chunks
    for (let x = 0; x < numCastRays; x += RAY_CHUNK_SIZE) {
        const cosA = fastCos(angle);
        const sinA = fastSin(angle);
        angle += fovStep * RAY_CHUNK_SIZE;

        // Find the highest wall in this chunk (minimum distance)
        let minDistance = Infinity;
        for (let i = 0; i < RAY_CHUNK_SIZE && x + i < numCastRays; i++) {
            const ray = rayData[x + i];
            if (ray && ray.distance < minDistance) {
                minDistance = ray.distance;
            }
        }

        if (minDistance === Infinity) continue;

        // Calculate wall bottom for closest wall in chunk
        const wallHeight = (CANVAS_HEIGHT / minDistance) * tileSectors;
        const wallBottom = Math.min((CANVAS_HEIGHT + wallHeight) * 0.5, CANVAS_HEIGHT);
        const yStart = Math.floor(wallBottom);
        if (yStart >= CANVAS_HEIGHT) continue;

        // Calculate initial floor position
        let floorX = playerPosition.x + rowDistances[yStart] * cosA;
        let floorY = playerPosition.z + rowDistances[yStart] * sinA;

        // Optimization: Use larger vertical steps for distant floors
        let stepSize = 1;
        if (minDistance > tileSectors * 2) stepSize = 2;
        if (minDistance > tileSectors * 4) stepSize = 4;

        // Draw vertical strip from wall bottom to screen bottom
        for (let y = yStart; y < CANVAS_HEIGHT; y += stepSize) {
            // Calculate texture coordinates
            const texX = (floorX % tileSectors) * invTileSectors;
            const texY = (floorY % tileSectors) * invTileSectors;
            const finalTexX = texX >= 0 ? texX : texX + 1;
            const finalTexY = texY >= 0 ? texY : texY + 1;

            // Draw chunk of rays at once
            bufferCtx.drawImage(
                texture,
                Math.floor(finalTexX * texture.width),
                Math.floor(finalTexY * texture.height),
                1, // Source width
                stepSize, // Source height
                x / numCastRays * CANVAS_WIDTH, // Destination x
                y, // Destination y
                colWidth, // Destination width
                Math.min(stepSize, CANVAS_HEIGHT - y) // Destination height
            );

            // Update floor position for next step
            if (y + stepSize < CANVAS_HEIGHT) {
                const dr = rowDistances[y + stepSize] - rowDistances[y];
                floorX += dr * cosA;
                floorY += dr * sinA;
            }
        }
    }

    // Draw the entire floor buffer in one operation
    renderEngine.drawImage(bufferCanvas, 0, 0);
}