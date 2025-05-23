const tileTextures = {
    wall_creamlol: new Image(),
    wall_brick: new Image(),
    wall_aldi: new Image(),
    wall_satanic: new Image(),
    wall_schizoeye: new Image(),
    door_rusty_01: new Image(),
    wall_brick_graffiti_01: new Image(),
    wall_laughing_demon: [], // Array for animated frames
};

tileTextures.wall_creamlol.src = "./img/sprites/walls/creamlol.png";
tileTextures.wall_brick.src = "./img/sprites/walls/wall_brick.png";
tileTextures.wall_aldi.src = "./img/sprites/test/aldi.png";
tileTextures.wall_satanic.src = "./img/sprites/walls/wall_satanic_01.png";
tileTextures.wall_schizoeye.src = "./img/website/schizoeye.gif";
tileTextures.door_rusty_01.src = "./img/sprites/doors/door_rusty_01.png";
tileTextures.wall_brick_graffiti_01.src = "./img/sprites/decoration/wall_brick_graffiti_01.png";
tileTextures.wall_laughing_demon[0] = new Image();

const demonLaughingFrameCount = 7;
export let demonLaughingLoaded = false;
for (let i = 0; i < demonLaughingFrameCount; i++) {
    const img = new Image();
    img.src = `./img/sprites/demonlaughing/demonlaughing_frame_${i}.gif`;
    tileTextures.wall_laughing_demon[i] = img;
}
// Animation state for wall_laughing_demon
let demonLaughingFrameIndex = 0;
let demonLaughingFrameTimer = 0;
const demonLaughingFrameDelay = 6; // ~0.1s at 60 FPS (0.1s / (1/60) ≈ 6 frames)

let texturesLoaded = false;
let texturesToLoad = Object.keys(tileTextures).length + demonLaughingFrameCount - 1; // Adjust for array


// Map texture IDs to texture keys
export const textureIdMap = new Map([
    [1, "wall_creamlol"],
    [2, "wall_brick"],
    [3, "wall_aldi"],
    [4, "wall_satanic"],
    [5, "wall_schizoeye"],
    [6, "door_rusty_01"],
    [7, "wall_brick_graffiti_01"],
    [8, "wall_laughing_demon"],
]);

export const fullTile = { type: "wall", textureId: 1 }; // Default: wall_creamlol
export const fullTileBrick = { type: "wall", textureId: 2 }; // wall_brick
export const fullTileAldi = { type: "wall", textureId: 3 }; // wall_aldi
export const fullTileSatanic = { type: "wall", textureId: 4 }; // wall_satanic01
export const fullTileSchizoEye = { type: "wall", textureId: 5 }; // wall_schizoeye
export const fullTileRustyDoor01 = { type: "wall", textureId: 6 }; // door_rusty01
export const fullTileBrickGraffiti01 = { type: "wall", textureId: 7 }; // wall_brick_graffiti_01
export const fullTileLaughingDemon = { type: "wall", textureId: 8 };
export const emptyTile = { type: "empty" }; // Fixed: Correct type for empty tiles
export const tileTexturesMap = new Map();

// Roof Textures
const roofTextures = {
    roof_concrete: new Image(),
};

roofTextures.roof_concrete.src = "./img/sprites/roofs/roof_concrete.png";

export const roofTextureIdMap = new Map([
    [1, "roof_concrete"],
]);

export const roofConcrete = { type: "roof", textureId: 1 }; // roof_concrete

export function getDemonLaughingCurrentFrame() {
    if (!demonLaughingLoaded) return null;
    demonLaughingFrameTimer++;
    if (demonLaughingFrameTimer >= demonLaughingFrameDelay) {
        demonLaughingFrameIndex = (demonLaughingFrameIndex + 1) % demonLaughingFrameCount;
        demonLaughingFrameTimer = -1000;
    }
    return tileTextures.wall_laughing_demon[demonLaughingFrameIndex];
}

// Populate tileTexturesMap
for (const [key, texture] of Object.entries(tileTextures)) {
    if (key === "wall_laughing_demon") {
        tileTexturesMap.set(key, tileTextures.wall_laughing_demon[0]); // Default to first frame
    } else {
        tileTexturesMap.set(key, texture);
    }
}

function checkTexturesLoaded(textureName) {
    return () => {
        texturesToLoad--;
        console.log(`Texture loaded: ${textureName}`);
        if (textureName.includes("demonlaughing")) {
            if (tileTextures.wall_laughing_demon.filter(f => f.complete).length === demonLaughingFrameCount) {
                demonLaughingLoaded = true;
                console.log("All demon laughing frames loaded!");
            }
        }
        if (texturesToLoad === 0) {
            texturesLoaded = true;
            console.log("All textures loaded! *yay*");
        }
    };
}

function handleTextureError(textureName) {
    return () => {
        console.error(`Failed to load texture: ${textureName}`);
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