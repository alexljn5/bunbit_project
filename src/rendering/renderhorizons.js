import { mapHandler } from "../mapdata/maphandler.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap, texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../globals.js";
import { fastCos, fastSin } from "../math/mathtables.js";
import { renderEngine } from "./renderengine.js";
import { playerFOV, numCastRays } from "./raycasting.js";

// Number of workers to use
const NUM_WORKERS = 8;

// Array to hold workers
const horizonWorkers = Array.from({ length: NUM_WORKERS }, () =>
    new Worker('/src/rendering/renderworkers/horizonrenderworker.js', { type: "module" })
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

// Heap-based cache for horizon data
const horizonCache = new Map();

const textureCanvas = document.createElement("canvas");
const textureCtx = textureCanvas.getContext("2d", { willReadFrequently: true });

// Final buffer to combine worker results
let finalBuffer = null;
let finalImageData = null;

function initializeWorkers() {
    // Reuse final buffer and ImageData to avoid reallocations each frame
    finalBuffer = new Uint8ClampedArray(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
    // Create ImageData once and reuse its underlying buffer
    finalImageData = new ImageData(finalBuffer, CANVAS_WIDTH, CANVAS_HEIGHT);

    const rowsPerWorker = Math.ceil(CANVAS_HEIGHT / NUM_WORKERS);

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
                    playerFOV,
                    rowsPerWorker,
                    numWorkers: NUM_WORKERS
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
    const textureData = imageData.data;

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

export function precomputeHorizonData(sectorKey, rayData) {
    try {
        if (!texturesLoaded || !tileSectors[sectorKey] || !rayData) {
            //console.warn(`Cannot precompute horizon for sector ${sectorKey}: missing data *pouts*`);
            return;
        }

        const floorTextureKey = mapHandler.getMapFloorTexture(sectorKey) || "floor_concrete_01";
        const roofTextureKey = "roof_concrete_01";
        const floorTexture = tileTexturesMap.get(floorTextureKey);
        const roofTexture = tileTexturesMap.get(roofTextureKey);

        if (!floorTexture || !roofTexture) {
            console.warn(`Textures missing for sector ${sectorKey} *tilts head*`);
            return;
        }

        const clipYFloor = new Float32Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT);
        const clipYRoof = new Float32Array(CANVAS_WIDTH).fill(0);
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

        const cacheData = {
            clipYFloor: new Float32Array(clipYFloor),
            clipYRoof: new Float32Array(clipYRoof),
            floorTextureKey,
            roofTextureKey,
            playerPosition: { x: playerPosition.x, z: playerPosition.z, angle: playerPosition.angle }
        };

        horizonCache.set(sectorKey, cacheData);
        console.log(`Precomputed horizon data for sector ${sectorKey}, cache size: ${horizonCache.size} *twirls*`);
    } catch (err) {
        console.error(`Error precomputing horizon data for ${sectorKey}:`, err);
    }
}

export function renderRaycastHorizons(rayData, targetCtx = renderEngine) {
    return new Promise(async resolve => {
        console.time('renderHorizons');

        if (
            isInitialized.some(init => !init) ||
            CANVAS_WIDTH !== lastCanvasWidth ||
            CANVAS_HEIGHT !== lastCanvasHeight
        ) {
            await initializeWorkers();
        }

        const mapKey = mapHandler.activeMapKey || "map_01";
        const cachedData = horizonCache.get(mapKey);

        // Check if cache is valid
        const isPlayerPositionClose = cachedData &&
            Math.abs(playerPosition.x - cachedData.playerPosition.x) < 0.1 &&
            Math.abs(playerPosition.z - cachedData.playerPosition.z) < 0.1 &&
            Math.abs(playerPosition.angle - cachedData.playerPosition.angle) < 0.01;

        if (cachedData && isPlayerPositionClose && rayData.length === numCastRays) {
            const floorTextureKey = cachedData.floorTextureKey;
            const roofTextureKey = cachedData.roofTextureKey;

            if (floorTextureKey !== lastFloorTextureKey) {
                updateTexture(tileTexturesMap.get(floorTextureKey), "Floor");
                lastFloorTextureKey = floorTextureKey;
            }
            if (roofTextureKey !== lastRoofTextureKey) {
                updateTexture(tileTexturesMap.get(roofTextureKey), "Roof");
                lastRoofTextureKey = roofTextureKey;
            }

            const rowsPerWorker = Math.ceil(CANVAS_HEIGHT / NUM_WORKERS);
            const promises = horizonWorkers.map((worker, index) => {
                const startY = index * rowsPerWorker;
                const endY = Math.min(startY + rowsPerWorker, CANVAS_HEIGHT);

                return new Promise(resolveWorker => {
                    worker.onmessage = function (e) {
                        // Accept render_done and error messages; ignore telemetry
                        if (e.data.type === 'render_done') {
                            // Worker sent an ArrayBuffer (raw bytes)
                            const workerBuffer = new Uint8ClampedArray(e.data.horizonBuffer);
                            const startOffset = e.data.startY * CANVAS_WIDTH * 4;
                            try {
                                finalBuffer.set(workerBuffer, startOffset);
                            } catch (error) {
                                console.error(`Error copying horizon worker ${e.data.workerId} buffer: ${error.message}`);
                            }
                            resolveWorker();
                        } else if (e.data.type === 'error') {
                            console.error(`Horizon worker error (id=${e.data.workerId}):`, e.data.message, e.data.stack);
                            // Resolve to avoid stalling the frame; main will render whatever parts are available
                            resolveWorker();
                        }
                    };

                    // Make copies of cached clip arrays so we can transfer without detaching cachedData
                    const workerClipYFloor = new Float32Array(cachedData.clipYFloor);
                    const workerClipYRoof = new Float32Array(cachedData.clipYRoof);

                    // Attach postTime so the worker can compute queue delay
                    const postTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();

                    worker.postMessage({
                        type: 'render',
                        playerPosition: cachedData.playerPosition,
                        startY,
                        endY,
                        workerId: index,
                        clipYFloorBuffer: workerClipYFloor.buffer,
                        clipYRoofBuffer: workerClipYRoof.buffer,
                        postTime
                    }, [workerClipYFloor.buffer, workerClipYRoof.buffer]);
                });
            });

            await Promise.all(promises);
            // Reuse preallocated ImageData and blit
            targetCtx.putImageData(finalImageData, 0, 0);
            console.log(`Rendered horizons from cache for sector ${mapKey} *smiles*`);
            console.timeEnd('renderHorizons');
            resolve();
            return;
        }

        // Fallback to real-time rendering
        const floorTextureKey = mapHandler.getMapFloorTexture(mapKey) || "floor_concrete_01";
        const roofTextureKey = "roof_concrete_01";
        const floorTexture = tileTexturesMap.get(floorTextureKey);
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

        const clipYFloor = new Float32Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT);
        const clipYRoof = new Float32Array(CANVAS_WIDTH).fill(0);
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
            workerClipYRoof.set(clipYRoof.length ? clipYRoof : clipYRoof);

            return new Promise(resolveWorker => {
                worker.onmessage = function (e) {
                    // Accept render_done and error messages; ignore telemetry
                    if (e.data.type === 'render_done') {
                        const workerBuffer = new Uint8ClampedArray(e.data.horizonBuffer);
                        const startOffset = e.data.startY * CANVAS_WIDTH * 4;
                        try {
                            finalBuffer.set(workerBuffer, startOffset);
                        } catch (error) {
                            console.error(`Error copying horizon worker ${e.data.workerId} buffer: ${error.message}`);
                        }
                        resolveWorker();
                    } else if (e.data.type === 'error') {
                        console.error(`Horizon worker error (id=${e.data.workerId}):`, e.data.message, e.data.stack);
                        resolveWorker();
                    }
                };

                const postTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();

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
                    clipYRoofBuffer: workerClipYRoof.buffer,
                    postTime
                }, [workerClipYFloor.buffer, workerClipYRoof.buffer]);
            });
        });

        await Promise.all(promises);

        // Reuse the allocated ImageData
        targetCtx.putImageData(finalImageData, 0, 0);

        // Cache results for static sectors
        if (!horizonCache.has(mapKey)) {
            precomputeHorizonData(mapKey, rayData);
        }

        console.timeEnd('renderHorizons');
        resolve();
    });
}

export function cleanupHorizonWorkers() {
    try {
        horizonWorkers.forEach(worker => worker.terminate());
        isInitialized.fill(false);
        finalBuffer = null;
        horizonCache.clear();
        console.log("Horizon workers and cache terminated *chao chao*");
    } catch (err) {
        console.error('Error in cleanupHorizonWorkers:', err);
    }
}