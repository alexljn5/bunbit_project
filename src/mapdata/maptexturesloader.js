// game_engine/mapdata/maptextures.js
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { wdMainEvent } from "../debug/workermaindebug.js";

// Check if running in browser (for Image and document)
const isBrowser = typeof document !== 'undefined' && typeof Image !== 'undefined';

// Texture definitions (without Image in Node.js)
const tileTextures = {
    wall_creamlol: isBrowser ? new Image() : { src: "./img/sprites/walls/creamlol.png" },
    wall_brick: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_brick.png" },
    wall_aldi: isBrowser ? new Image() : { src: "./img/sprites/test/aldi.png" },
    wall_satanic: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_satanic_01.png" },
    wall_schizoeye: isBrowser ? new Image() : { src: "./img/sprites/website/schizoeye.gif" },
    door_rusty_01: isBrowser ? new Image() : { src: "./img/sprites/doors/door_rusty_01.png" },
    wall_brick_graffiti_01: isBrowser ? new Image() : { src: "./img/sprites/decoration/wall_brick_graffiti_01.png" },
    wall_laughing_demon: isBrowser ? [] : [],
    wall_brick_door01_closed: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_brick_door01_closed.png" },
    wall_brick_door01_open: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_brick_door01_open.png" },
    wall_fence_test: isBrowser ? new Image() : { src: "./img/sprites/walls/fence_wall_test.png" },
    wall_brick_cream: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_brick_cream.png" },
    wall_brick_eye: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_brick_eye.png" },
    wall_casper_01: isBrowser ? new Image() : { src: "./img/sprites/walls/wall_casper_01.png" },
};

// Set image sources in browser
if (isBrowser) {
    tileTextures.wall_creamlol.src = "./img/sprites/walls/creamlol.png";
    tileTextures.wall_brick.src = "./img/sprites/walls/wall_brick.png";
    tileTextures.wall_aldi.src = "./img/sprites/test/aldi.png";
    tileTextures.wall_satanic.src = "./img/sprites/walls/wall_satanic_01.png";
    tileTextures.wall_schizoeye.src = "./img/sprites/test/schizoeye.gif";
    tileTextures.door_rusty_01.src = "./img/sprites/doors/door_rusty_01.png";
    tileTextures.wall_brick_graffiti_01.src = "./img/sprites/decoration/wall_brick_graffiti_01.png";
    tileTextures.wall_brick_door01_open.src = "./img/sprites/walls/wall_brick_door01_open.png";
    tileTextures.wall_brick_door01_closed.src = "./img/sprites/walls/wall_brick_door01_closed.png";
    tileTextures.wall_fence_test.src = "./img/sprites/walls/fence_wall_test.png";
    tileTextures.wall_brick_cream.src = "./img/sprites/walls/wall_brick_cream.png";
    tileTextures.wall_brick_eye.src = "./img/sprites/walls/wall_brick_eye.png";
    tileTextures.wall_casper_01.src = "./img/sprites/walls/wall_casper_01.png";
}

const demonLaughingFrameCount = 7;
export let demonLaughingLoaded = false;
if (isBrowser) {
    for (let i = 0; i < demonLaughingFrameCount; i++) {
        const img = new Image();
        img.src = `./img/sprites/demonlaughing/demonlaughing_frame_${i}.gif`;
        tileTextures.wall_laughing_demon[i] = img;
    }
}

let demonLaughingFrameIndex = 0;
let lastFrameTime = 0;
const demonLaughingFrameDelay = 100;
let cachedFrame = null;

let texturesLoaded = false;
let texturesToLoad = Object.keys(tileTextures).length + demonLaughingFrameCount - 1;
const textureRegistrationLog = [];
const textureLoadLog = [];
let textureSummaryLogged = false;

function trackTextureRegistration(type, key, src) {
    textureRegistrationLog.push({ type, key, src });
}

function trackTextureLoad(entry) {
    textureLoadLog.push(entry);
}

function logTextureSummary(status = "complete") {
    if (textureSummaryLogged) return;
    textureSummaryLogged = true;
    console.groupCollapsed(`[Textures] ${status}: ${textureLoadLog.length}/${textureRegistrationLog.length} processed`);
    console.log("registered", textureRegistrationLog);
    console.log("processed", textureLoadLog);
    console.groupEnd();
}

export const fullTile = { type: "wall", textureId: 1, texture: "wall_creamlol", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileBrick = { type: "wall", textureId: 2, texture: "wall_brick", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileAldi = { type: "wall", textureId: 3, texture: "wall_aldi", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileSatanic = { type: "wall", textureId: 4, texture: "wall_satanic", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileSchizoEye = { type: "wall", textureId: 5, texture: "wall_schizoeye", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileRustyDoor01 = { type: "wall", textureId: 6, texture: "door_rusty_01", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileBrickGraffiti01 = { type: "wall", textureId: 7, texture: "wall_brick_graffiti_01", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileLaughingDemon = { type: "wall", textureId: 8, texture: "wall_laughing_demon", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileBrickDoor01Open = { type: "wall", textureId: 9, texture: "wall_brick_door01_open", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileBrickDoor01Closed = { type: "wall", textureId: 10, texture: "wall_brick_door01_closed", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileFenceWallTest = { type: "wall", textureId: 11, texture: "wall_fence_test", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const fullTileBrickCream = { type: "wall", textureId: 12, texture: "wall_brick_cream", floorHeight: 0, floorTextureId: 50, floorTexture: "wall_brick_cream", ceilingTextureId: 1, transparent: false };
export const fullTileBrickEye = { type: "wall", textureId: 13, texture: "wall_brick_eye", floorHeight: 0, floorTextureId: 50, floorTexture: "wall_brick_eye", ceilingTextureId: 1, transparent: false };
export const fullTileCasper01 = { type: "wall", textureId: 14, texture: "wall_casper_01", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: false };
export const emptyTile = { type: "empty", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete_01", ceilingTextureId: 1 };

// Transparent wall tile (invisible but still blocks rays)
export const transparentWall = { type: "wall", textureId: 1, texture: "wall_creamlol", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1, transparent: true };

// Set of texture keys that should be rendered as transparent (invisible) walls
export const transparentWallTextureKeys = new Set();

// Register transparent wall texture key
transparentWallTextureKeys.add(transparentWall.texture);

export const tileTexturesMap = new Map();

const roofTextures = {
    roof_concrete_01: isBrowser ? new Image() : { src: "./img/sprites/roofs/roof_concrete_01.png" },
};
if (isBrowser) {
    roofTextures.roof_concrete_01.src = "./img/sprites/roofs/roof_concrete_01.png";
}

export const roofConcrete01 = { type: "roof", textureId: 100, texture: "roof_concrete_01", floorHeight: 0 };

const floorTextures = {
    floor_concrete_01: isBrowser ? new Image() : { src: "./img/sprites/floors/floor_concrete_01.png" },
    floor_test: isBrowser ? new Image() : { src: "./img/sprites/walls/creamlol.png" },
};
if (isBrowser) {
    floorTextures.floor_concrete_01.src = "./img/sprites/floors/floor_concrete_01.png";
    floorTextures.floor_test.src = "./img/sprites/walls/creamlol.png";
}

export const floorConcrete = { type: "floor", textureId: 50, texture: "floor_concrete_01", floorHeight: 1 };
export const floorTest = { type: "floor", textureId: 51, texture: "floor_test", floorHeight: 1 };

// Initialize tileTexturesMap
for (const [key, texture] of Object.entries(floorTextures)) {
    tileTexturesMap.set(key, texture);
    trackTextureRegistration("floor", key, texture.src);
}
for (const [key, texture] of Object.entries(roofTextures)) {
    tileTexturesMap.set(key, texture);
    trackTextureRegistration("roof", key, texture.src);
}
for (const [key, texture] of Object.entries(tileTextures)) {
    if (key === "wall_laughing_demon") {
        tileTexturesMap.set(key, isBrowser ? tileTextures.wall_laughing_demon[0] : { src: "./img/sprites/demonlaughing/demonlaughing_frame_0.gif" });
        trackTextureRegistration("wall-animation", key, `${demonLaughingFrameCount} frames`);
    } else {
        tileTexturesMap.set(key, texture);
        trackTextureRegistration("wall", key, texture.src);
    }
}

// Texture loading handlers (only in browser)
export const textureTransparencyMap = {};
if (isBrowser) {
    async function checkTextureTransparency(texture) {
        return new Promise((resolve) => {
            const canvas = document.createElement("canvas");
            canvas.width = texture.width;
            canvas.height = texture.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(texture, 0, 0);
            const imageData = ctx.getImageData(0, 0, texture.width, texture.height);
            const data = imageData.data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] < 255) {
                    resolve(true);
                    return;
                }
            }
            resolve(false);
        });
    }

    async function checkTexturesLoadedWithTransparency(textureName, texture) {
        await checkTexturesLoaded(textureName)();
        const hasTransparency = await checkTextureTransparency(texture);
        textureTransparencyMap[textureName] = hasTransparency;
        trackTextureLoad({ name: textureName, status: "transparency-checked", hasTransparency });
    }

    for (const [name, texture] of Object.entries(floorTextures)) {
        texture.onload = () => checkTexturesLoadedWithTransparency(name, texture);
        texture.onerror = handleTextureError(name);
    }
    for (const [name, texture] of Object.entries(roofTextures)) {
        texture.onload = () => checkTexturesLoadedWithTransparency(name, texture);
        texture.onerror = handleTextureError(name);
    }
    for (const [name, texture] of Object.entries(tileTextures)) {
        if (name === "wall_laughing_demon") {
            texture.forEach((frame, i) => {
                frame.onload = () => checkTexturesLoadedWithTransparency(`demonlaughing_frame_${i}`, frame);
                frame.onerror = handleTextureError(`demonlaughing_frame_${i}`);
            });
        } else {
            texture.onload = () => checkTexturesLoadedWithTransparency(name, texture);
            texture.onerror = handleTextureError(name);
        }
    }
}

export function getDemonLaughingCurrentFrame() {
    if (!isBrowser) {
        console.warn("Not in browser, returning fallback texture *pouts*");
        return tileTexturesMap.get("wall_creamlol");
    }
    if (!demonLaughingLoaded) {
        console.warn("Demon laughing frames not loaded! Using fallback *pouts*");
        return tileTexturesMap.get("wall_creamlol");
    }
    const now = performance.now();
    if (now - lastFrameTime >= demonLaughingFrameDelay) {
        demonLaughingFrameIndex = (demonLaughingFrameIndex + 1) % demonLaughingFrameCount;
        lastFrameTime = now;
        const img = tileTextures.wall_laughing_demon[demonLaughingFrameIndex];
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(img, 0, 0);
        cachedFrame = tempCanvas;
    }
    return cachedFrame || tileTextures.wall_laughing_demon[0];
}

function checkTexturesLoaded(textureName) {
    return () => {
        texturesToLoad--;
        trackTextureLoad({ name: textureName, status: "loaded", remaining: texturesToLoad });
        if (textureName.includes("demonlaughing")) {
            if (tileTextures.wall_laughing_demon.filter(f => f.complete).length === demonLaughingFrameCount) {
                demonLaughingLoaded = true;
                trackTextureLoad({ name: "wall_laughing_demon", status: "animation-ready" });
            }
        }
        if (texturesToLoad === 0) {
            texturesLoaded = true;
            logTextureSummary("loaded");
        }
    };
}

function handleTextureError(textureName) {
    return () => {
        console.error(`Failed to load texture: ${textureName} *pouts*`);
        trackTextureLoad({ name: textureName, status: "error" });
        texturesToLoad--;
        if (texturesToLoad === 0) {
            texturesLoaded = true;
            logTextureSummary("processed with errors");
        }
    };
}

export { tileTextures, texturesLoaded, };

// After initializing tileTexturesMap entries above, try to offload image decoding to a worker
async function _startTextureWorkerLoad() {
    if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') {
        console.warn('Worker or createImageBitmap not available; using main-thread image loading fallback');
        return false;
    }

    try {
        const worker = new Worker('/src/mapdata/textureloaderworker.js', { type: 'module' });
        wdMainEvent('textureloader-worker', 'created (module)');
        worker.onerror = (error) => { console.error('Texture worker error:', error); wdMainError('textureloader-worker', error); };
        const texturesToSend = [];
        for (const [key, value] of Object.entries(tileTextures)) {
            if (key === 'wall_laughing_demon') {
                // send all frames
                value.forEach((frame, idx) => {
                    texturesToSend.push({ key: key, url: frame.src, frameIndex: idx });
                });
            } else {
                texturesToSend.push({ key, url: value.src, frameIndex: null });
            }
        }

        worker.onmessage = function (e) {
            const data = e.data;
            if (!data) return;
            wdMainMessage('textureloader-worker', data.type);
            if (data.type === 'loaded') {
                try {
                    const key = data.key;
                    const frameIndex = data.frameIndex;
                    const img = data.imageBitmap;
                    // replace map entry with ImageBitmap or a frame array
                    if (key === 'wall_laughing_demon') {
                        if (!tileTexturesMap.get(key) || !Array.isArray(tileTexturesMap.get(key))) {
                            tileTexturesMap.set(key, []);
                        }
                        const frames = tileTexturesMap.get(key);
                        frames[frameIndex] = img;
                    } else {
                        tileTexturesMap.set(key, img);
                    }
                    if (data.hasTransparency === true) textureTransparencyMap[key] = true;
                    // store sampled column if provided for debugging/fallback
                    if (data.sampledColumnBuffer) {
                        try {
                            textureTransparencyMap[`${key}_sampledColumn`] = new Uint8ClampedArray(data.sampledColumnBuffer);
                        } catch (errSC) {
                            // ignore
                        }
                    }
                    // free original HTMLImage objects if any
                    try {
                        const orig = tileTextures[key];
                        if (orig && orig instanceof Image) {
                            // Allow GC by removing src reference
                            orig.src = '';
                        }
                    } catch (errFree) {
                        // ignore
                    }
                    if (!texturesLoaded) {
                        texturesToLoad--;
                        trackTextureLoad({ name: key, status: "worker-loaded", remaining: texturesToLoad });
                        if (texturesToLoad === 0) {
                            texturesLoaded = true;
                            logTextureSummary("loaded via worker");
                        }
                    }
                } catch (err) {
                    console.error('Error applying texture from worker', err);
                }
            } else if (data.type === 'error') {
                console.error('Texture worker error', data.key, data.message);
                wdMainError('textureloader-worker', data);
            } else {
                // ignore other messages
            }
        };

        worker.postMessage({ type: 'load', textures: texturesToSend });
        return true;
    } catch (err) {
        console.error('Failed to start texture worker:', err);
        return false;
    }
}

// Worker-based loading is optional.
// It can introduce path-resolution differences for relative URLs; keep it gated so
// main-thread loader still guarantees textures and avoids error spam.
const USE_TEXTURE_WORKER = false;
if (USE_TEXTURE_WORKER) {
    _startTextureWorkerLoad().then(ok => {
        if (!ok) {
            console.info('[Textures] Worker not used; falling back to main-thread image loader');
        }
    });
} else {
    wdMainEvent('textureloader-worker', 'DISABLED: USE_TEXTURE_WORKER=false — worker is never started (main-thread loader used instead)');
}

