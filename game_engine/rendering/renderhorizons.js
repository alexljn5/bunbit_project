import { mapHandler } from "../mapdata/maphandler.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap, texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fastSin, fastCos } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { playerFOV, numCastRays } from "./raycasting.js";

// Number of workers to use
const NUM_WORKERS = 4;

// Array to hold workers
const horizonWorkers = Array.from({ length: NUM_WORKERS }, () =>
    new Worker('/game_engine/rendering/renderworkers/horizonrenderworker.js')
);

let isInitialized = Array(NUM_WORKERS).fill(false);
let lastFloorTextureKey = "";
let lastRoofTextureKey = "";
let textureWidthFloor = 0;
let textureHeightFloor = 0;
let textureWidthRoof = 0;
let textureHeightRoof = 0;
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
        horizonWorkers.map((worker, index) => {
            return new Promise(resolve => {
                worker.onmessage = function (e) {
                    if (e.data.type === 'init_done') {
                        isInitialized[index] = true;
                        console.log(`Horizon worker ${index} initialized *chao chao*`);
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
        console.log("All horizon workers ready *twirls*");
    });
}

function updateTexture(texture, type) {
    if (!texture || !texture.complete) {
        console.warn(`${type} texture not loaded or invalid, skipping update *pouts*`);
        return;
    }

    const textureWidth = texture.width;
    const textureHeight = texture.height;
    textureCanvas.width = textureWidth;
    textureCanvas.height = textureHeight;

    textureCtx.drawImage(texture, 0, 0);
    const imageData = textureCtx.getImageData(0, 0, textureWidth, textureHeight);
    const textureData = imageData.data; // Uint8ClampedArray

    horizonWorkers.forEach((worker, index) => {
        const newBuffer = new ArrayBuffer(textureData.byteLength);
        const newTextureData = new Uint8ClampedArray(newBuffer);
        newTextureData.set(textureData);

        worker.postMessage(
            {
                type: `texture_${type.toLowerCase()}`,
                textureData: newBuffer,
                textureWidth,
                textureHeight
            },
            [newBuffer]
        );
    });

    if (type === "Floor") {
        textureWidthFloor = textureWidth;
        textureHeightFloor = textureHeight;
    } else {
        textureWidthRoof = textureWidth;
        textureHeightRoof = textureHeight;
    }
}

export function cleanupHorizonWorkers() {
    horizonWorkers.forEach(worker => worker.terminate());
    isInitialized.fill(false);
    finalBuffer = null;
    console.log("Horizon workers terminated *chao chao*");
}

export function renderRaycastHorizons(rayData, targetCtx = renderEngine) {
    return new Promise(async resolve => {
        console.time('renderHorizons'); // Debug perf

        if (
            isInitialized.some(init => !init) ||
            CANVAS_WIDTH !== lastCanvasWidth ||
            CANVAS_HEIGHT !== lastCanvasHeight
        ) {
            await initializeWorkers();
        }

        const mapKey = mapHandler.activeMapKey || "map_01";
        const floorTextureKey = mapHandler.getMapFloorTexture(mapKey);
        const roofTextureKey = "floor_concrete"; // Adjust as needed for your roof texture

        const floorTexture = tileTexturesMap.get(floorTextureKey) || tileTexturesMap.get("floor_concrete");
        const roofTexture = tileTexturesMap.get(roofTextureKey);

        if (!texturesLoaded || !floorTexture || !floorTexture.complete || !roofTexture || !roofTexture.complete) {
            console.warn("Textures not loaded or invalid, rendering fallback *hides*");
            targetCtx.fillStyle = "black";
            targetCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
            targetCtx.fillStyle = "gray";
            targetCtx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
            resolve();
            return;
        }

        if (floorTextureKey !== lastFloorTextureKey) {
            updateTexture(floorTexture, "Floor");
            lastFloorTextureKey = floorTextureKey;
        }

        if (roofTextureKey !== lastRoofTextureKey) {
            updateTexture(roofTexture, "Roof");
            lastRoofTextureKey = roofTextureKey;
        }

        // Compute clipY for floors (wall bottom)
        const clipYFloor = new Float32Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT);
        // Compute clipY for roofs (wall top)
        const clipYRoof = new Float32Array(CANVAS_WIDTH).fill(0);

        const halfHeight = CANVAS_HEIGHT / 2;
        const colWidth = CANVAS_WIDTH / numCastRays;

        for (let i = 0; i < rayData.length; i++) {
            const ray = rayData[i];
            if (ray && !Array.isArray(ray)) {
                let wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
                wallHeight = Math.min(wallHeight, CANVAS_HEIGHT * 2);
                const wallTop = Math.max(0, (CANVAS_HEIGHT - wallHeight) / 2);
                const wallBottom = Math.min(CANVAS_HEIGHT, wallTop + wallHeight);
                const startCol = Math.floor(i * colWidth);
                const endCol = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
                for (let col = startCol; col < endCol; col++) {
                    clipYFloor[col] = Math.min(clipYFloor[col], wallBottom);
                    clipYRoof[col] = Math.max(clipYRoof[col], wallTop);
                }
            }
        }

        const rowsPerWorker = Math.ceil(CANVAS_HEIGHT / NUM_WORKERS);
        const promises = horizonWorkers.map((worker, index) => {
            const startY = index * rowsPerWorker;
            const endY = Math.min(startY + rowsPerWorker, CANVAS_HEIGHT);

            const workerClipYFloor = new Float32Array(clipYFloor.length);
            workerClipYFloor.set(clipYFloor);
            const workerClipYRoof = new Float32Array(clipYRoof.length);
            workerClipYRoof.set(clipYRoof);

            return new Promise(resolveWorker => {
                worker.onmessage = function (e) {
                    if (e.data.type === 'render_done') {
                        const workerBuffer = new Uint8ClampedArray(e.data.horizonBuffer);
                        const startOffset = e.data.startY * CANVAS_WIDTH * 4;
                        try {
                            finalBuffer.set(workerBuffer, startOffset);
                            console.log(`Horizon worker ${e.data.workerId} done for rows ${e.data.startY}-${e.data.endY}`);
                        } catch (error) {
                            console.error(`Error copying horizon worker ${e.data.workerId} buffer: ${error.message}`);
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
                    clipYFloorBuffer: workerClipYFloor.buffer,
                    clipYRoofBuffer: workerClipYRoof.buffer
                }, [workerClipYFloor.buffer, workerClipYRoof.buffer]);
            });
        });

        await Promise.all(promises);

        const imageData = new ImageData(finalBuffer, CANVAS_WIDTH, CANVAS_HEIGHT);
        targetCtx.putImageData(imageData, 0, 0);
        console.timeEnd('renderHorizons');
        resolve();
    });
}