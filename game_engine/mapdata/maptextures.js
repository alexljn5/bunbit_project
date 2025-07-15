// game_engine/mapdata/maptextures.js
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

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

export const textureIdMap = new Map([
    [1, "wall_creamlol"],
    [2, "wall_brick"],
    [3, "wall_aldi"],
    [4, "wall_satanic"],
    [5, "wall_schizoeye"],
    [6, "door_rusty_01"],
    [7, "wall_brick_graffiti_01"],
    [8, "wall_laughing_demon"],
    [9, "wall_brick_door01_open"],
    [10, "wall_brick_door01_closed"],
]);

export const fullTile = { type: "wall", textureId: 1, texture: "wall_creamlol", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileBrick = { type: "wall", textureId: 2, texture: "wall_brick", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileAldi = { type: "wall", textureId: 3, texture: "wall_aldi", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileSatanic = { type: "wall", textureId: 4, texture: "wall_satanic", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileSchizoEye = { type: "wall", textureId: 5, texture: "wall_schizoeye", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileRustyDoor01 = { type: "wall", textureId: 6, texture: "door_rusty_01", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileBrickGraffiti01 = { type: "wall", textureId: 7, texture: "wall_brick_graffiti_01", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileLaughingDemon = { type: "wall", textureId: 8, texture: "wall_laughing_demon", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileBrickDoor01Open = { type: "wall", textureId: 9, texture: "wall_brick_door01_open", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const fullTileBrickDoor01Closed = { type: "wall", textureId: 10, texture: "wall_brick_door01_closed", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };
export const emptyTile = { type: "empty", floorHeight: 0, floorTextureId: 50, floorTexture: "floor_concrete", ceilingTextureId: 1 };

export const tileTexturesMap = new Map();

const roofTextures = {
    roof_concrete: isBrowser ? new Image() : { src: "./img/sprites/roofs/roof_concrete.png" },
};
if (isBrowser) {
    roofTextures.roof_concrete.src = "./img/sprites/roofs/roof_concrete.png";
}

export const roofTextureIdMap = new Map([
    [1, "roof_concrete"],
]);

export const roofConcrete = { type: "roof", textureId: 1, texture: "roof_concrete", floorHeight: 0 };

const floorTextures = {
    floor_concrete: isBrowser ? new Image() : { src: "./img/sprites/roofs/roof_concrete.png" },
    floor_test: isBrowser ? new Image() : { src: "./img/sprites/walls/creamlol.png" },
};
if (isBrowser) {
    floorTextures.floor_concrete.src = "./img/sprites/roofs/roof_concrete.png";
    floorTextures.floor_test.src = "./img/sprites/walls/creamlol.png";
}

export const floorTextureIdMap = new Map([
    [50, "floor_concrete"],
    [51, "floor_test"],
]);

export const floorConcrete = { type: "floor", textureId: 50, texture: "floor_concrete", floorHeight: 1 };
export const floorTest = { type: "floor", textureId: 51, texture: "floor_test", floorHeight: 1 };

// Initialize tileTexturesMap
for (const [key, texture] of Object.entries(floorTextures)) {
    tileTexturesMap.set(key, texture);
    console.log(`Loading floor texture: ${key} from ${texture.src} *twirls*`);
}
for (const [key, texture] of Object.entries(roofTextures)) {
    tileTexturesMap.set(key, texture);
    console.log(`Loading roof texture: ${key} from ${texture.src} *twirls*`);
}
for (const [key, texture] of Object.entries(tileTextures)) {
    if (key === "wall_laughing_demon") {
        tileTexturesMap.set(key, isBrowser ? tileTextures.wall_laughing_demon[0] : { src: "./img/sprites/demonlaughing/demonlaughing_frame_0.gif" });
    } else {
        tileTexturesMap.set(key, texture);
        console.log(`Loading wall texture: ${key} from ${texture.src} *claps*`);
    }
}

// Texture loading handlers (only in browser)
if (isBrowser) {
    for (const [name, texture] of Object.entries(floorTextures)) {
        texture.onload = checkTexturesLoaded(name);
        texture.onerror = handleTextureError(name);
    }
    for (const [name, texture] of Object.entries(roofTextures)) {
        texture.onload = checkTexturesLoaded(name);
        texture.onerror = handleTextureError(name);
    }
    for (const [name, texture] of Object.entries(tileTextures)) {
        if (name === "wall_laughing_demon") {
            texture.forEach((frame, i) => {
                frame.onload = checkTexturesLoaded(`demonlaughing_frame_${i}`);
                frame.onerror = handleTextureError(`demonlaughing_frame_${i}`);
            });
        } else {
            texture.onload = checkTexturesLoaded(name);
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
        console.log(`Texture loaded: ${textureName}, remaining: ${texturesToLoad} *giggles*`);
        if (textureName.includes("demonlaughing")) {
            if (tileTextures.wall_laughing_demon.filter(f => f.complete).length === demonLaughingFrameCount) {
                demonLaughingLoaded = true;
                console.log("All demon laughing frames loaded! *claps*");
            }
        }
        if (texturesToLoad === 0) {
            texturesLoaded = true;
            console.log("All textures loaded! Ready to render! *twirls*");
        }
    };
}

function handleTextureError(textureName) {
    return () => {
        console.error(`Failed to load texture: ${textureName} *pouts*`);
        texturesToLoad--;
        if (texturesToLoad === 0) {
            texturesLoaded = true;
            console.log("All textures processed, but some failed! *hides*");
        }
    };
}

export { tileTextures, texturesLoaded };