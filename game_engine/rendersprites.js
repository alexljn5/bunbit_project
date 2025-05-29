import { keys, playerMovement, playerPosition, playerVantagePointX, playerVantagePointY } from "./playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { tileSectors } from "./mapdata/maps.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./renderengine.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js";
import { playerInventory } from "./playerdata/playerinventory.js"; // Add this import

// Preload Sprites
export const playerHandSprite = new Image(100, 100);
playerHandSprite.src = "./img/sprites/playerhand/playerhand_default.png";
export let handLoaded = false;
playerHandSprite.onload = () => {
    handLoaded = true;
    console.log("Player hand sprite loaded");
};
playerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_default.png at ./img/sprites/playerhand/playerhand_default.png");
};

export const pillar01Sprite = new Image(128, 128);
pillar01Sprite.src = "./img/sprites/decoration/pillar_01.png";
export let pillar01Loaded = false;
pillar01Sprite.onload = () => {
    pillar01Loaded = true;
    console.log("Pillar 01 sprite loaded");
};
pillar01Sprite.onerror = () => {
    console.error("Failed to load pillar_01.png at ./img/sprites/decoration/pillar_01.png");
};
export const pillar01SpriteWorldPos = { x: 2.5 * tileSectors, z: 6 * tileSectors }; // (150, 150)

export const creamTestSprite = new Image(200, 50);
creamTestSprite.src = "./img/sprites/creamtest.png";
export let creamTestLoaded = false;
creamTestSprite.onload = () => {
    creamTestLoaded = true;
    console.log("Cream test sprite loaded");
};
creamTestSprite.onerror = () => {
    console.error("Failed to load creamtest.png at ./img/sprites/creamtest.png");
};

export const firingSprite = new Image(32, 32);
firingSprite.src = "./img/sprites/placeholder.png";
export let firingLoaded = false;
firingSprite.onload = () => {
    firingLoaded = true;
    console.log("Firing sprite loaded");
};
firingSprite.onerror = () => {
    console.error("Failed to load placeholder.png at ./img/sprites/placeholder.png");
};

export const creamSpinFrames = [];
export const creamSpinFrameCount = 7;
export let creamSpinLoaded = false;
for (let i = 0; i < creamSpinFrameCount; i++) {
    const img = new Image(150, 250);
    img.src = `./img/sprites/creamspin/creamspin${i}.png`;
    img.onload = () => {
        creamSpinFrames[i] = img;
        if (creamSpinFrames.filter(f => f).length === creamSpinFrameCount) {
            creamSpinLoaded = true;
            console.log("All cream spin frames loaded");
        }
    };
    img.onerror = () => {
        console.error(`Failed to load creamspin${i}.png at ./img/sprites/creamspin/creamspin${i}.png`);
    };
}

export const corpse1Sprite = new Image(128, 128);
corpse1Sprite.src = "./img/sprites/decoration/corpse_1.png";
export let corpse1Loaded = false;
corpse1Sprite.onload = () => {
    corpse1Loaded = true;
    console.log("Corpse 1 sprite loaded");
};
corpse1Sprite.onerror = () => {
    console.error("Failed to load corpse_1.png at ./img/sprites/decoration/corpse_1.png");
};
export const corpse1WorldPos = { x: 1 * tileSectors, z: 1.3 * tileSectors }; // (150, 150)

export const metalPipeSprite = new Image(128, 128);
metalPipeSprite.src = "./img/sprites/items/metal_pipe.png";
export let metalPipeLoaded = false;
metalPipeSprite.onload = () => {
    metalPipeLoaded = true;
    console.log("Metal pipe sprite loaded");
};
export const metalPipeWorldPos = { x: 1 * tileSectors, z: 1 * tileSectors };
export const spriteState = {
    isMetalPipeCollected: false
};

export const metalPipePlayerHandSprite = new Image(128, 128);
metalPipePlayerHandSprite.src = "./img/sprites/playerhand/playerhand_metal_pipe.png";
export let metalPipePlayerHandLoaded = false;
metalPipePlayerHandSprite.onload = () => {
    metalPipePlayerHandLoaded = true;
    console.log("Metal pipe player hand sprite loaded");
};

export const boyKisserEnemySprite = new Image(128, 128);
//boyKisserEnemySprite.src = "./img/sprites/enemy/boykisser.png";
boyKisserEnemySprite.src = "./img/sprites/enemy/carenemytest.png";
export let boyKisserEnemySpriteLoaded = false;
boyKisserEnemySprite.onload = () => {
    boyKisserEnemySpriteLoaded = true;
    console.log("Boy kisser loaded!");
}
export const boyKisserEnemySpriteWorldPos = { x: 6 * tileSectors, z: 7.3 * tileSectors };

export const casperLesserDemonSprite = new Image(128, 128);
casperLesserDemonSprite.src = "./img/sprites/enemy/casperdemon.png";
export let casperLesserDemonSpriteLoaded = false;
casperLesserDemonSprite.onload = () => {
    casperLesserDemonSpriteLoaded = true;
    console.log("Casper loaded!");
}
export const casperLesserDemonSpriteWorldPos = { x: 2.5 * tileSectors, z: 8 * tileSectors };


export function drawSprites(rayData) {
    if (!rayData) {
        console.warn("rayData is undefined, skipping sprite rendering");
        return;
    }
    drawStaticSprites(rayData);
    animatedSpriteRenderer(rayData);
}

function drawStaticSprites(rayData) {
    playerHandSpriteFunction();
    corpse1SpriteFunction(rayData);
    metalPipeSpriteFunction(rayData);
    boyKisserEnemySpriteFunction(rayData);
    casperLesserDemonSpriteFunction(rayData);
    pillar01SpriteFunction(rayData);
}

function animatedSpriteRenderer(rayData) {
    creamSpinTestSprite(rayData);
}

function pillar01SpriteFunction(rayData) {
    if (!pillar01Loaded) {
        console.warn("Pillar 01 sprite not loaded");
        return;
    }
    // Calculate distance from player to sprite     
    const dx = pillar01SpriteWorldPos.x - playerPosition.x;
    const dz = pillar01SpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    // Apply perspective correction (same as walls) 
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
        console.log("Pillar too close, skipping");
        return;
    }
    // Calculate sprite size based on distance, matching wall scaling       
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 128); // Fixed: Use 128x128 aspect ratio
    //const spriteY = (CANVAS_HEIGHT - spriteHeight) / 2; // Center vertically
    const spriteY = 400;
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    // Check if sprite is visible (not occluded by walls)   
    let isVisible = false;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            isVisible = true;
            break;
        }
    }
    // Only draw if sprite is on screen and not occluded
    if (isVisible && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {

        renderEngine.drawImage(
            pillar01Sprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    } else {
        console.log("Pillar 01 not drawn: off-screen or occluded");
    }
}


function boyKisserEnemySpriteFunction(rayData) {
    if (!boyKisserEnemySpriteLoaded) {
        console.warn("Boykisser not loaded");
        return;
    }

    // Calculate distance from player to sprite
    const dx = boyKisserEnemySpriteWorldPos.x - playerPosition.x; // Fixed: Use corpse1WorldPos
    const dz = boyKisserEnemySpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
        console.log("Corpse too close, skipping");
        return;
    }

    // Calculate sprite size based on distance, matching wall scaling
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80); // Fixed: Use 128x64 aspect ratio

    //const spriteY = (CANVAS_HEIGHT - spriteHeight) / 2; // Center vertically
    const spriteY = 400; // Center vertically

    // Calculate screen X position
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));

    // Apply vantage point offset
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;

    // Determine the screen columns the sprite spans
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));

    // Check if sprite is visible (not occluded by walls)
    let isVisible = false;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            isVisible = true;
            break;
        }
    }
    // Only draw if sprite is on screen and not occluded
    if (isVisible && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            boyKisserEnemySprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    } else {
        console.log("Corpse1 not drawn: off-screen or occluded");
    }
}

function casperLesserDemonSpriteFunction(rayData) {
    if (!casperLesserDemonSpriteLoaded) {
        console.warn("corpse1Sprite not loaded");
        return;
    }

    // Calculate distance from player to sprite
    const dx = casperLesserDemonSpriteWorldPos.x - playerPosition.x; // Fixed: Use corpse1WorldPos
    const dz = casperLesserDemonSpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
        //console.log("Corpse too close, skipping");
        return;
    }

    // Calculate sprite size based on distance, matching wall scaling
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80); // Fixed: Use 128x64 aspect ratio

    //const spriteY = (CANVAS_HEIGHT - spriteHeight) / 2; // Center vertically
    const spriteY = 400; // Center vertically

    // Calculate screen X position
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));

    // Apply vantage point offset
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;

    // Determine the screen columns the sprite spans
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));

    // Check if sprite is visible (not occluded by walls)
    let isVisible = false;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            isVisible = true;
            break;
        }
    }
    // Only draw if sprite is on screen and not occluded
    if (isVisible && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            casperLesserDemonSprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    } else {
        //console.log("Corpse1 not drawn: off-screen or occluded");
    }
}

function corpse1SpriteFunction(rayData) {
    if (!corpse1Loaded) {
        console.warn("corpse1Sprite not loaded");
        return;
    }

    // Calculate distance from player to sprite
    const dx = corpse1WorldPos.x - playerPosition.x; // Fixed: Use corpse1WorldPos
    const dz = corpse1WorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
        console.log("Corpse too close, skipping");
        return;
    }

    // Calculate sprite size based on distance, matching wall scaling
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80); // Fixed: Use 128x64 aspect ratio

    //const spriteY = (CANVAS_HEIGHT - spriteHeight) / 2; // Center vertically
    const spriteY = 400; // Center vertically

    // Calculate screen X position
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));

    // Apply vantage point offset
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;

    // Determine the screen columns the sprite spans
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));

    // Check if sprite is visible (not occluded by walls)
    let isVisible = false;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            isVisible = true;
            break;
        }
    }
    // Only draw if sprite is on screen and not occluded
    if (isVisible && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            corpse1Sprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    } else {
        //console.log("Corpse1 not drawn: off-screen or occluded");
    }
}

function metalPipeSpriteFunction(rayData) {
    if (!metalPipeSprite) {
        console.warn("corpse1Sprite not loaded");
        return;
    }

    if (!metalPipeLoaded || spriteState.isMetalPipeCollected) {
        return;
    }

    // Calculate distance from player to sprite
    const dx = metalPipeWorldPos.x - playerPosition.x;
    const dz = metalPipeWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
        console.log("Metal Pipe too close, skipping");
        return;
    }

    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80);
    const spriteY = 500;
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));
    // Apply vantage point offset
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;
    // Determine the screen columns the sprite spans
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    // Check if sprite is visible (not occluded by walls)
    let isVisible = false;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            isVisible = true;
            break;
        }
    }
    // Only draw if sprite is on screen and not occluded
    if (isVisible && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            metalPipeSprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    } else {
        //console.log("Corpse1 not drawn: off-screen or occluded");
    }
}

function playerHandSpriteFunction() {
    const defaultPlayerHandX = 0;
    const defaultPlayerHandY = 0;
    const defaultPlayerHandWidth = 100;
    const defaultPlayerHandHeight = 100;

    const playerHandMetalPipeX = 450;
    const playerHandMetalPipeY = 400;
    const playerHandMetalPipeWidth = 256;
    const playerHandMetalPipeHeight = 512;

    if (playerInventory.includes("metal_pipe") && metalPipePlayerHandLoaded) {
        renderEngine.drawImage(metalPipePlayerHandSprite, playerHandMetalPipeX, playerHandMetalPipeY, playerHandMetalPipeWidth, playerHandMetalPipeHeight);
    } else if (handLoaded) {
        renderEngine.drawImage(playerHandSprite, defaultPlayerHandX, defaultPlayerHandY, defaultPlayerHandWidth, defaultPlayerHandHeight);
    } else {
        console.warn("No player hand sprite loaded");
    }
}

// Animation state
let defaultFrameSpeed = 10;
let creamSpinFrameIndex = 0;
let creamSpinFrameTimer = 0;
const creamSpinFrameDelay = defaultFrameSpeed;

// Sprite world positions
export const creamTestWorldPos = { x: 3 * tileSectors, z: 2 * tileSectors }; // (150, 150)
export const creamSpinWorldPos = { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors }; // (460, 458)

// Function to get current creamSpin frame
export function getCreamSpinCurrentFrame() {
    if (!creamSpinLoaded) return null;
    creamSpinFrameTimer++;
    if (creamSpinFrameTimer >= creamSpinFrameDelay) {
        creamSpinFrameIndex = (creamSpinFrameIndex + 1) % creamSpinFrameCount;
        creamSpinFrameTimer = 0;
    }
    return creamSpinFrames[creamSpinFrameIndex];
}

function creamSpinTestSprite(rayData) {
    if (!creamSpinLoaded) {
        console.warn("creamSpinFrames not loaded");
        return;
    }

    // Calculate distance from player to sprite
    const dx = creamSpinWorldPos.x - playerPosition.x;
    const dz = creamSpinWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
        console.log("CreamSpin too close, skipping");
        return;
    }

    // Calculate sprite size based on distance, matching wall scaling
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors;
    const spriteWidth = spriteHeight * (150 / 250); // 150x250 for creamSpin
    const spriteY = (CANVAS_HEIGHT - spriteHeight) / 2; // Center vertically

    // Calculate screen X position
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));

    // Apply vantage point offset
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;

    // Determine the screen columns the sprite spans
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));

    // Check if sprite is visible (not occluded by walls)
    let isVisible = false;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            isVisible = true;
            break;
        }
    }
    // Only draw if sprite is on screen and not occluded
    if (isVisible && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        const currentFrame = getCreamSpinCurrentFrame();
        if (currentFrame) {
            renderEngine.drawImage(
                currentFrame,
                adjustedScreenX - spriteWidth / 2,
                spriteY - playerVantagePointY.playerVantagePointY,
                spriteWidth,
                spriteHeight
            );
        }
    } else {
    }
}