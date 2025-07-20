// renderfloors.js
import { mapHandler } from "../mapdata/maphandler.js";
import { tileSectors } from "../mapdata/maps.js";
import { tileTexturesMap, texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fastSin, fastCos } from "../globals.js";
import { renderEngine } from "./renderengine.js";
import { numCastRays, playerFOV } from "./raycasting.js";

const floorWorker = new Worker('/game_engine/rendering/renderworkers/renderfloorsworker.js');

let isInitialized = false;
let lastTextureKey = "";
let textureWidth = 0;
let textureHeight = 0;
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;
let resolveRenderPromise = null;

const textureCanvas = document.createElement("canvas");
const textureCtx = textureCanvas.getContext("2d", { willReadFrequently: true });

floorWorker.onmessage = function (e) {
    if (e.data.type === 'render_done') {
        const floorBuffer = new Uint8ClampedArray(e.data.floorBuffer);
        const imageData = new ImageData(floorBuffer, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.putImageData(imageData, 0, 0);
        if (resolveRenderPromise) {
            resolveRenderPromise();
            resolveRenderPromise = null;
        }
    }
};

function initializeWorker() {
    floorWorker.postMessage({
        type: 'init',
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        tileSectors,
        playerFOV
    });
    isInitialized = true;
    lastCanvasWidth = CANVAS_WIDTH;
    lastCanvasHeight = CANVAS_HEIGHT;
}

function updateTexture(texture) {
    if (texture.width !== textureWidth || texture.height !== textureHeight) {
        textureWidth = texture.width;
        textureHeight = texture.height;
        textureCanvas.width = textureWidth;
        textureCanvas.height = textureHeight;
    }
    textureCtx.drawImage(texture, 0, 0);
    const imageData = textureCtx.getImageData(0, 0, textureWidth, textureHeight);
    const textureBuffer = imageData.data.buffer;
    floorWorker.postMessage({ type: 'texture', textureData: textureBuffer, textureWidth, textureHeight }, [textureBuffer]);
}

export function renderRaycastFloors() {
    return new Promise(async resolve => {
        resolveRenderPromise = resolve;

        if (!isInitialized || CANVAS_WIDTH !== lastCanvasWidth || CANVAS_HEIGHT !== lastCanvasHeight) {
            await initializeWorker();
        }

        const mapKey = mapHandler.activeMapKey || "map_01";
        const floorTextureKey = mapHandler.getMapFloorTexture(mapKey);
        const texture = tileTexturesMap.get(floorTextureKey) || tileTexturesMap.get("floor_concrete");

        if (!texturesLoaded || !texture || !texture.complete) {
            renderEngine.fillStyle = "gray";
            renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
            resolve();
            return;
        }

        if (floorTextureKey !== lastTextureKey) {
            updateTexture(texture);
            lastTextureKey = floorTextureKey;
        }

        floorWorker.postMessage({
            type: 'render',
            playerPosition: {
                x: playerPosition.x,
                z: playerPosition.z,
                angle: playerPosition.angle
            }
        });
    });
}