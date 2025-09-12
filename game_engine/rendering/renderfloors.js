import { mapHandler } from "../mapdata/maphandler.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap, texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fastSin, fastCos } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { playerFOV } from "./raycasting.js";
import { numCastRays } from "./raycasting.js";

// Number of workers to use
const NUM_WORKERS = 4;

// Array to hold workers
const floorWorkers = Array.from({ length: NUM_WORKERS }, () =>
    new Worker('/game_engine/rendering/renderworkers/floorrenderworker.js')
);

let isInitialized = Array(NUM_WORKERS).fill(false);
let lastTextureKey = "";
let textureWidth = 0;
let textureHeight = 0;
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

const textureCanvas = document.createElement("canvas");
const textureCtx = textureCanvas.getContext("2d", { willReadFrequently: true });

// Final buffer to combine worker results
let finalBuffer = null; // Initialize lazily in initializeWorkers

function initializeWorkers() {
    // Reinitialize finalBuffer to match current canvas dimensions
    finalBuffer = new Uint8ClampedArray(CANVAS_WIDTH * CANVAS_HEIGHT * 4);

    return Promise.all(
        floorWorkers.map((worker, index) => {
            return new Promise(resolve => {
                worker.onmessage = function (e) {
                    if (e.data.type === 'init_done') {
                        isInitialized[index] = true;
                        resolve();
                    }
                };
                worker.postMessage({
                    type: 'init',
                    CANVAS_WIDTH,
                    CANVAS_HEIGHT,
                    tileSectors,
                    playerFOV
                });
            });
        })
    ).then(() => {
        lastCanvasWidth = CANVAS_WIDTH;
        lastCanvasHeight = CANVAS_HEIGHT;
    });
}

function updateTexture(texture) {
    if (!texture || !texture.complete) {
        console.warn("Texture not loaded or invalid, skipping update *pouts*");
        return;
    }

    // Update canvas dimensions if texture size changes
    if (texture.width !== textureWidth || texture.height !== textureHeight) {
        textureWidth = texture.width;
        textureHeight = texture.height;
        textureCanvas.width = textureWidth;
        textureCanvas.height = textureHeight;
    }

    // Draw texture to canvas and get pixel data
    textureCtx.drawImage(texture, 0, 0);
    const imageData = textureCtx.getImageData(0, 0, textureWidth, textureHeight);
    const textureData = imageData.data; // Uint8ClampedArray

    // Send a new copy of the texture data to each worker
    floorWorkers.forEach((worker, index) => {
        // Create a new ArrayBuffer and copy the texture data
        const newBuffer = new ArrayBuffer(textureData.byteLength);
        const newTextureData = new Uint8ClampedArray(newBuffer);
        newTextureData.set(textureData); // Copy the data

        worker.postMessage(
            {
                type: 'texture',
                textureData: newBuffer,
                textureWidth,
                textureHeight
            },
            [newBuffer] // Transfer the new buffer
        );
    });
}

export function cleanupFloorWorkers() {
    floorWorkers.forEach(worker => worker.terminate());
    isInitialized.fill(false);
    finalBuffer = null; // Clear buffer to force reinitialization
    console.log("Floor workers terminated *chao chao*");
}

export function renderRaycastFloors(rayData) {
    return new Promise(async resolve => {
        // Initialize workers if needed
        if (
            isInitialized.some(init => !init) ||
            CANVAS_WIDTH !== lastCanvasWidth ||
            CANVAS_HEIGHT !== lastCanvasHeight
        ) {
            await initializeWorkers();
        }

        const mapKey = mapHandler.activeMapKey || "map_01";
        const floorTextureKey = mapHandler.getMapFloorTexture(mapKey);
        const texture = tileTexturesMap.get(floorTextureKey) || tileTexturesMap.get("floor_concrete");

        if (!texturesLoaded || !texture || !texture.complete) {
            console.warn("Textures not loaded or invalid, rendering fallback *hides*");
            renderEngine.fillStyle = "gray";
            renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
            resolve();
            return;
        }

        if (floorTextureKey !== lastTextureKey) {
            updateTexture(texture);
            lastTextureKey = floorTextureKey;
        }

        // Build per-column clipY buffer: start floor drawing from this y downward (init to full height)
        const clipYBuffer = new Float32Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT);
        const halfHeight = CANVAS_HEIGHT / 2;
        const colWidth = CANVAS_WIDTH / numCastRays;
        for (let i = 0; i < rayData.length; i++) {
            const ray = rayData[i];
            if (ray && !Array.isArray(ray)) {  // Solid wall only (skip transparents for full floor under them)
                const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
                const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
                const wallBottom = wallTop + wallHeight;
                const startCol = Math.floor(i * colWidth);
                const endCol = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
                for (let col = startCol; col < endCol; col++) {
                    clipYBuffer[col] = Math.min(clipYBuffer[col], wallBottom);
                }
            }
            // For Array.isArray(ray) (only transparents), skip: full floor
        }

        // Split canvas height into NUM_WORKERS parts
        const rowsPerWorker = Math.ceil(CANVAS_HEIGHT / NUM_WORKERS);
        const promises = floorWorkers.map((worker, index) => {
            const startY = index * rowsPerWorker;
            const endY = Math.min(startY + rowsPerWorker, CANVAS_HEIGHT);

            // Create a new ArrayBuffer copy for this worker's clipY
            const workerClipY = new Float32Array(clipYBuffer.length);
            workerClipY.set(clipYBuffer); // Copy the full clipY buffer

            return new Promise(resolveWorker => {
                worker.onmessage = function (e) {
                    if (e.data.type === 'render_done') {
                        // Copy worker's buffer to the correct position in finalBuffer
                        const workerBuffer = new Uint8ClampedArray(e.data.floorBuffer);
                        const startOffset = e.data.startY * CANVAS_WIDTH * 4;
                        try {
                            finalBuffer.set(workerBuffer, startOffset);
                        } catch (error) {
                            console.error(`Error copying worker ${e.data.workerId} buffer: ${error.message}`);
                        }
                        resolveWorker();
                    }
                };

                worker.postMessage({
                    type: 'render',
                    playerPosition: {
                        x: playerPosition.x,
                        z: playerPosition.z,
                        angle: playerPosition.angle
                    },
                    startY,
                    endY,
                    workerId: index,
                    clipYBuffer: workerClipY.buffer  // Transfer the copied buffer
                }, [workerClipY.buffer]);
            });
        });

        // Wait for all workers to finish
        await Promise.all(promises);

        // Create ImageData from finalBuffer and draw
        const imageData = new ImageData(finalBuffer, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.putImageData(imageData, 0, 0);
        resolve();
    });
}