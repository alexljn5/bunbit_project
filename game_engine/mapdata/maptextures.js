import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

const tileTextures = {
    wall_creamlol: new Image(),
    wall_brick: new Image(),
    wall_aldi: new Image(),
    wall_satanic: new Image(),
    wall_schizoeye: new Image(),
    door_rusty_01: new Image(),
    wall_brick_graffiti_01: new Image(),
    wall_laughing_demon: [],
    wall_brick_door01_closed: new Image(),
    wall_brick_door01_open: new Image(),
};

tileTextures.wall_creamlol.src = "./img/sprites/walls/creamlol.png";
tileTextures.wall_brick.src = "./img/sprites/walls/wall_brick.png";
tileTextures.wall_aldi.src = "./img/sprites/test/aldi.png";
tileTextures.wall_satanic.src = "./img/sprites/walls/wall_satanic_01.png";
tileTextures.wall_schizoeye.src = "./img/website/schizoeye.gif";
tileTextures.door_rusty_01.src = "./img/sprites/doors/door_rusty_01.png";
tileTextures.wall_brick_graffiti_01.src = "./img/sprites/decoration/wall_brick_graffiti_01.png";
tileTextures.wall_brick_door01_open.src = "./img/sprites/walls/wall_brick_door01_open.png";
tileTextures.wall_brick_door01_closed.src = "./img/sprites/walls/wall_brick_door01_closed.png";

const demonLaughingFrameCount = 7;
export let demonLaughingLoaded = false;
for (let i = 0; i < demonLaughingFrameCount; i++) {
    const img = new Image();
    img.src = `./img/sprites/demonlaughing/demonlaughing_frame_${i}.gif`;
    tileTextures.wall_laughing_demon[i] = img;
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

export const fullTile = { type: "wall", textureId: 1, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileBrick = { type: "wall", textureId: 2, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileAldi = { type: "wall", textureId: 3, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileSatanic = { type: "wall", textureId: 4, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileSchizoEye = { type: "wall", textureId: 5, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileRustyDoor01 = { type: "wall", textureId: 6, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileBrickGraffiti01 = { type: "wall", textureId: 7, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileLaughingDemon = { type: "wall", textureId: 8, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileBrickDoor01Open = { type: "wall", textureId: 9, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const fullTileBrickDoor01Closed = { type: "wall", textureId: 10, floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };
export const emptyTile = { type: "empty", floorHeight: 0, floorTextureId: 50, ceilingTextureId: 1 };

export const tileTexturesMap = new Map();

const roofTextures = {
    roof_concrete: new Image(),
};
roofTextures.roof_concrete.src = "./img/sprites/roofs/roof_concrete.png";

export const roofTextureIdMap = new Map([
    [1, "roof_concrete"],
]);

export const roofConcrete = { type: "roof", textureId: 1, floorHeight: 0 };

const floorTextures = {
    floor_concrete: new Image(),
    floor_test: new Image()
};
floorTextures.floor_concrete.src = "./img/sprites/roofs/roof_concrete.png";
floorTextures.floor_test.src = "./img/sprites/walls/creamlol.png";

export const floorTextureIdMap = new Map([
    [50, "floor_concrete"],
    [51, "floor_test"],
]);

export const floorConcrete = { type: "floor", textureId: 50, floorHeight: 1 };
export const floorTest = { type: "floor", textureId: 51, floorHeight: 1 };

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
        tileTexturesMap.set(key, tileTextures.wall_laughing_demon[0]);
    } else {
        tileTexturesMap.set(key, texture);
        console.log(`Loading wall texture: ${key} from ${texture.src} *claps*`);
    }
}

texturesToLoad += Object.keys(floorTextures).length + Object.keys(roofTextures).length;
for (const [name, texture] of Object.entries(floorTextures)) {
    texture.onload = checkTexturesLoaded(name);
    texture.onerror = handleTextureError(name);
}
for (const [name, texture] of Object.entries(roofTextures)) {
    texture.onload = checkTexturesLoaded(name);
    texture.onerror = handleTextureError(name);
}

export function getDemonLaughingCurrentFrame() {
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

export { tileTextures, texturesLoaded };