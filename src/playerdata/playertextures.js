// playertextures.js
const playerTextures = {
    casperface1: new Image(),
    casperface2: new Image(),
    casperface3: new Image(),
    casperface4: new Image(),
    casperface5: new Image(),
};

playerTextures.casperface1.src = "./img/characterhead/casperface1.png";
playerTextures.casperface2.src = "./img/characterhead/casperface2.png";
playerTextures.casperface3.src = "./img/characterhead/casperface3.png";
playerTextures.casperface4.src = "./img/characterhead/casperface4.png";
playerTextures.casperface5.src = "./img/characterhead/casperface5.png";

// Load flags for each image
export let casperFace1Loaded = false;
export let casperFace2Loaded = false;
export let casperFace3Loaded = false;
export let casperFace4Loaded = false;
export let casperFace5Loaded = false;

playerTextures.casperface1.onload = () => {
    casperFace1Loaded = true;
    console.log("Casper face 1 loaded!");
};
playerTextures.casperface2.onload = () => {
    casperFace2Loaded = true;
    console.log("Casper face 2 loaded!");
};
playerTextures.casperface3.onload = () => {
    casperFace3Loaded = true;
    console.log("Casper face 3 loaded!");
};
playerTextures.casperface4.onload = () => {
    casperFace4Loaded = true;
    console.log("Casper face 4 loaded!");
};
playerTextures.casperface5.onload = () => {
    casperFace5Loaded = true;
    console.log("Casper face 5 loaded!");
};

// Export all images
export const casperFace1 = playerTextures.casperface1;
export const casperFace2 = playerTextures.casperface2;
export const casperFace3 = playerTextures.casperface3;
export const casperFace4 = playerTextures.casperface4;
export const casperFace5 = playerTextures.casperface5;

export const playerTextureIdMap = new Map([
    [100, "casperface1"],
    [101, "casperface2"],
    [102, "casperface3"],
    [103, "casperface4"],
    [104, "casperface5"],
]);