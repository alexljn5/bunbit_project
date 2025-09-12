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
const roofWorkers = Array.from({ length: NUM_WORKERS }, () =>
    new Worker('/game_engine/rendering/renderworkers/roofrenderworker.js')
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
let roofFinalBuffer = null; // Initialize lazily in initializeWorkers

function initializeWorkers() {
    // Reinitialize finalBuffer to match current canvas dimensions
    roofFinalBuffer = new Uint8ClampedArray(CANVAS_WIDTH * CANVAS_HEIGHT * 4);

    return Promise.all(
        roofWorkers.map((worker, index) => {
            return new Promise(resolve => {
                worker.onmessage = function (e) {
                    if (e.data.type === 'init_done') {
                        isInitialized[index] = true;
                        console.log(`Roof worker ${index} initialized *chao chao*`);
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
        console.log("All roof workers ready *twirls*");
    });
}

function updateTexture(texture) {
    if (!texture || !texture.complete) {
        console.warn("Roof texture not loaded or invalid, skipping update *pouts*");
        return;
    }

    if (texture.width !== textureWidth || texture.height !== textureHeight) {
        textureWidth = texture.width;
        textureHeight = texture.height;
        textureCanvas.width = textureWidth;
        textureCanvas.height = textureHeight;
    }

    textureCtx.drawImage(texture, 0, 0);
    const imageData = textureCtx.getImageData(0, 0, textureWidth, textureHeight);
    const textureData = imageData.data; // Uint8ClampedArray

    roofWorkers.forEach((worker, index) => {
        const newBuffer = new ArrayBuffer(textureData.byteLength);
        const newTextureData = new Uint8ClampedArray(newBuffer);
        newTextureData.set(textureData);

        worker.postMessage(
            {
                type: 'texture',
                textureData: newBuffer,
                textureWidth,
                textureHeight
            },
            [newBuffer]
        );
    });
}

export function cleanupRoofWorkers() {
    roofWorkers.forEach(worker => worker.terminate());
    isInitialized.fill(false);
    roofFinalBuffer = null;
    console.log("Roof workers terminated *chao chao*");
}

export function renderRaycastRoofs(rayData, targetCtx = renderEngine) {
    return new Promise(async resolve => {
        console.time('renderRoofs'); // Debug perf

        if (
            isInitialized.some(init => !init) ||
            CANVAS_WIDTH !== lastCanvasWidth ||
            CANVAS_HEIGHT !== lastCanvasHeight
        ) {
            await initializeWorkers();
        }

        const mapKey = mapHandler.activeMapKey || "map_01";
        const roofTextureKey = "floor_test";
        const texture = tileTexturesMap.get(roofTextureKey);

        if (!texturesLoaded || !texture || !texture.complete) {
            console.warn("Roof textures not loaded or invalid, rendering fallback *hides*");
            targetCtx.fillStyle = "black";
            targetCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
            resolve();
            return;
        }

        if (roofTextureKey !== lastTextureKey) {
            updateTexture(texture);
            lastTextureKey = roofTextureKey;
        }

        const clipYBuffer = new Float32Array(CANVAS_WIDTH).fill(0);
        const halfHeight = CANVAS_HEIGHT / 2;
        const colWidth = CANVAS_WIDTH / numCastRays;
        for (let i = 0; i < rayData.length; i++) {
            const ray = rayData[i];
            if (ray && !Array.isArray(ray)) {
                let wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
                wallHeight = Math.min(wallHeight, CANVAS_HEIGHT * 2);
                const wallTop = Math.max(0, (CANVAS_HEIGHT - wallHeight) / 2);
                const startCol = Math.floor(i * colWidth);
                const endCol = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
                for (let col = startCol; col < endCol; col++) {
                    clipYBuffer[col] = Math.max(clipYBuffer[col], wallTop);
                }
            }
        }

        const rowsPerWorker = Math.ceil(CANVAS_HEIGHT / NUM_WORKERS);
        const promises = roofWorkers.map((worker, index) => {
            const startY = index * rowsPerWorker;
            const endY = Math.min(startY + rowsPerWorker, CANVAS_HEIGHT);

            const workerClipY = new Float32Array(clipYBuffer.length);
            workerClipY.set(clipYBuffer);

            return new Promise(resolveWorker => {
                worker.onmessage = function (e) {
                    if (e.data.type === 'render_done') {
                        const workerBuffer = new Uint8ClampedArray(e.data.roofBuffer);
                        const startOffset = e.data.startY * CANVAS_WIDTH * 4;
                        try {
                            roofFinalBuffer.set(workerBuffer, startOffset);
                            console.log(`Roof worker ${e.data.workerId} done for rows ${e.data.startY}-${e.data.endY}`);
                        } catch (error) {
                            console.error(`Error copying roof worker ${e.data.workerId} buffer: ${error.message}`);
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
                    clipYBuffer: workerClipY.buffer
                }, [workerClipY.buffer]);
            });
        });

        await Promise.all(promises);

        const imageData = new ImageData(roofFinalBuffer, CANVAS_WIDTH, CANVAS_HEIGHT);
        targetCtx.putImageData(imageData, 0, 0);
        console.timeEnd('renderRoofs');
        resolve();
    });
}