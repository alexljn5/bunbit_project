import { keys, playerMovement, playerPosition, playerVantagePointX, playerVantagePointY, getPlayerBobbingOffset } from "./playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { tileSectors } from "./mapdata/maps.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH, SCALE_X, SCALE_Y } from "./globals.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js";
import { playerInventory, selectedInventoryIndex } from "./playerdata/playerinventory.js";

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

export const pillar01Sprite = new Image();
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

export const creamTestSprite = new Image();
creamTestSprite.src = "./img/sprites/creamtest.png";
export let creamTestLoaded = false;
creamTestSprite.onload = () => {
    creamTestLoaded = true;
    console.log("Cream test sprite loaded");
};
creamTestSprite.onerror = () => {
    console.error("Failed to load creamtest.png at ./img/sprites/creamtest.png");
};

export const firingSprite = new Image();
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

export const corpse1Sprite = new Image();
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

// Items
export const metalPipeSprite = new Image();
metalPipeSprite.src = "./img/sprites/items/metal_pipe.png";
export let metalPipeLoaded = false;
metalPipeSprite.onload = () => {
    metalPipeLoaded = true;
    console.log("Metal pipe sprite loaded");
};
export const metalPipeWorldPos = { x: 2.5 * tileSectors, z: 4.5 * tileSectors };
export const spriteState = {
    isMetalPipeCollected: false,
    isNineMmAmmoCollected: false
};

export const metalPipePlayerHandSprite = new Image();
metalPipePlayerHandSprite.src = "./img/sprites/playerhand/playerhand_metal_pipe.png";
export let metalPipePlayerHandLoaded = false;
metalPipePlayerHandSprite.onload = () => {
    metalPipePlayerHandLoaded = true;
    console.log("Metal pipe player hand sprite loaded");
};

export const genericGunSprite = new Image();
genericGunSprite.src = "./img/sprites/items/generic_gun.png";
export let genericGunSpriteLoaded = false;
genericGunSprite.onload = () => {
    genericGunSpriteLoaded = true;
    console.log("Generic gun sprite loaded");
};

export const genericGunPlayerHandSprite = new Image();
genericGunPlayerHandSprite.src = "./img/sprites/playerhand/playerhand_generic_gun.png";
export let genericGunPlayerHandLoaded = false;
genericGunPlayerHandSprite.onload = () => {
    genericGunPlayerHandLoaded = true;
    console.log("Generic gun player hand sprite loaded");
};

export const nineMMAmmoSprite = new Image();
nineMMAmmoSprite.src = "./img/sprites/items/9mm_ammo_box.png";
export let nineMMAmmoSpriteLoaded = false;
nineMMAmmoSprite.onload = () => {
    nineMMAmmoSpriteLoaded = true;
    console.log("Generic nine MM ammo loaded");
};
export const nineMMAmmoSpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };

// End of Items
export const boyKisserEnemySprite = new Image();
boyKisserEnemySprite.src = "./img/sprites/enemy/boykisser.png";
export let boyKisserEnemySpriteLoaded = false;
boyKisserEnemySprite.onload = () => {
    boyKisserEnemySpriteLoaded = true;
    console.log("Boy kisser loaded!");
};
export const boyKisserEnemySpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };

export const casperLesserDemonSprite = new Image();
casperLesserDemonSprite.src = "./img/sprites/enemy/casperdemon.png";
export let casperLesserDemonSpriteLoaded = false;
casperLesserDemonSprite.onload = () => {
    casperLesserDemonSpriteLoaded = true;
    console.log("Casper loaded!");
};
export const casperLesserDemonSpriteWorldPos = { x: 5.5 * tileSectors, z: 11.3 * tileSectors };

export let boyKisserEnemyHealth = 5; // Example: 5 health points
if (typeof window !== 'undefined') window.boyKisserEnemyHealth = boyKisserEnemyHealth;
else if (typeof globalThis !== 'undefined') globalThis.boyKisserEnemyHealth = boyKisserEnemyHealth;

export function playerHandSpriteFunction() {
    let handSprite = playerHandSprite;
    const selectedItem = playerInventory[selectedInventoryIndex];
    if (selectedItem === "metal_pipe" && metalPipePlayerHandLoaded) {
        handSprite = metalPipePlayerHandSprite;
    } else if (selectedItem === "generic_gun" && genericGunPlayerHandLoaded) {
        handSprite = genericGunPlayerHandSprite;
    } else if (!handLoaded) {
        console.warn("No player hand sprite loaded");
        return;
    }

    const bobbingY = (400 * SCALE_Y) + getPlayerBobbingOffset();
    const spriteWidth = 256 * SCALE_X;
    const spriteHeight = 512 * SCALE_Y;
    const spriteX = 450 * SCALE_X;

    renderEngine.drawImage(handSprite, spriteX, bobbingY, spriteWidth, spriteHeight);
}

export function drawSprites(rayData) {
    if (!rayData) return;
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
    nineMMAmmoSpriteFunction(rayData);
}

function animatedSpriteRenderer(rayData) {
    creamSpinTestSprite(rayData);
}

function nineMMAmmoSpriteFunction(rayData) {
    if (!nineMMAmmoSpriteLoaded || spriteState.isNineMmAmmoCollected) return;

    const dx = nineMMAmmoSpriteWorldPos.x - playerPosition.x;
    const dz = nineMMAmmoSpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;

    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * 0.5;
    const spriteWidth = spriteHeight; // Square sprite

    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (!isSpriteVisible(rayData, startColumn, endColumn, correctedDistance)) return;
    if (adjustedScreenX + spriteWidth / 2 < 0 || adjustedScreenX - spriteWidth / 2 > CANVAS_WIDTH) return;

    const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
    const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
    const halfTile = tileSectors * 0.5;
    const rowDistance = correctedDistance;
    const spriteYBottom = halfCanvasHeight + (halfTile / rowDistance) * projectionPlaneDist;

    renderEngine.drawImage(
        nineMMAmmoSprite,
        adjustedScreenX - spriteWidth / 2,
        spriteYBottom - spriteHeight - playerVantagePointY.playerVantagePointY,
        spriteWidth,
        spriteHeight
    );
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

    const dx = creamSpinWorldPos.x - playerPosition.x;
    const dz = creamSpinWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;

    // Scale sprite size
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors;
    const aspectRatio = 150 / 250; // Original sprite dimensions
    const spriteWidth = spriteHeight * aspectRatio;
    const spriteY = CANVAS_HEIGHT * 0.5 - spriteHeight / 2; // Center vertically

    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (!isSpriteVisible(rayData, startColumn, endColumn, correctedDistance)) return;
    if (adjustedScreenX + spriteWidth / 2 < 0 || adjustedScreenX - spriteWidth / 2 > CANVAS_WIDTH) return;

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
}

// Utility: check if a sprite is visible (not occluded by walls)
function isSpriteVisible(rayData, startColumn, endColumn, correctedDistance) {
    // Clamp columns to valid range
    startColumn = Math.max(0, startColumn);
    endColumn = Math.min(numCastRays - 1, endColumn);
    // If the sprite is behind the player, always return false
    if (correctedDistance < 0) return false;
    for (let col = startColumn; col <= endColumn; ++col) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            return true;
        }
    }
    return false;
}

// Utility: calculate sprite screen X and columns
function getSpriteScreenParams(relativeAngle, spriteWidth) {
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;
    const startColumn = Math.max(0, Math.floor((adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    const endColumn = Math.min(numCastRays - 1, Math.ceil((adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays)));
    return { adjustedScreenX, startColumn, endColumn };
}

function pillar01SpriteFunction(rayData) {
    renderSprite({
        sprite: pillar01Sprite,
        isLoaded: pillar01Loaded,
        worldPos: pillar01SpriteWorldPos,
        rayData,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 128 / REF_CANVAS_HEIGHT,
        aspectRatio: 1,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
}

function boyKisserEnemySpriteFunction(rayData) {
    const result = renderSprite({
        sprite: boyKisserEnemySprite,
        isLoaded: boyKisserEnemySpriteLoaded,
        worldPos: boyKisserEnemySpriteWorldPos,
        rayData,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });

    if (result) {
        // Sync global health value
        if (typeof window !== 'undefined' && typeof window.boyKisserEnemyHealth === 'number') {
            boyKisserEnemyHealth = window.boyKisserEnemyHealth;
        } else if (typeof globalThis !== 'undefined' && typeof globalThis.boyKisserEnemyHealth === 'number') {
            boyKisserEnemyHealth = globalThis.boyKisserEnemyHealth;
        }

        // Draw health bar
        const barWidth = 60 * SCALE_X;
        const barHeight = 8 * SCALE_Y;
        const maxHealth = 5;
        const healthPercent = Math.max(0, Math.min(1, boyKisserEnemyHealth / maxHealth));
        const barX = result.adjustedScreenX - barWidth / 2;
        const barY = result.spriteY - playerVantagePointY.playerVantagePointY - barHeight - 10 * SCALE_Y;
        renderEngine.fillStyle = '#222';
        renderEngine.fillRect(barX, barY, barWidth, barHeight);
        renderEngine.fillStyle = '#FFD700';
        renderEngine.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        renderEngine.strokeStyle = '#000';
        renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
        renderEngine.strokeRect(barX, barY, barWidth, barHeight);
    }
}

function casperLesserDemonSpriteFunction(rayData) {
    renderSprite({
        sprite: casperLesserDemonSprite,
        isLoaded: casperLesserDemonSpriteLoaded,
        worldPos: casperLesserDemonSpriteWorldPos,
        rayData,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
}

function corpse1SpriteFunction(rayData) {
    renderSprite({
        sprite: corpse1Sprite,
        isLoaded: corpse1Loaded,
        worldPos: corpse1WorldPos,
        rayData,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
}

function metalPipeSpriteFunction(rayData) {
    if (spriteState.isMetalPipeCollected) return;
    renderSprite({
        sprite: metalPipeSprite,
        isLoaded: metalPipeLoaded,
        worldPos: metalPipeWorldPos,
        rayData,
        baseWidthRatio: 128 / REF_CANVAS_WIDTH,
        baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
        aspectRatio: 128 / 80,
        baseYRatio: 500 / REF_CANVAS_HEIGHT,
        scaleFactor: 0.5
    });
}

function renderSprite({
    sprite,
    isLoaded,
    worldPos,
    rayData,
    baseWidthRatio = 0.25,
    baseHeightRatio = 0.25,
    aspectRatio = 1,
    baseYRatio = 0.5,
    scaleFactor = 0.5
}) {
    if (!isLoaded || !sprite) return;

    const dx = worldPos.x - playerPosition.x;
    const dz = worldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;

    // Calculate sprite size based on distance and canvas size
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * scaleFactor;
    const spriteWidth = spriteHeight * aspectRatio;

    // Base Y position
    const spriteY = CANVAS_HEIGHT * baseYRatio;

    // Calculate screen position
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (!isSpriteVisible(rayData, startColumn, endColumn, correctedDistance)) return;
    if (adjustedScreenX + spriteWidth / 2 < 0 || adjustedScreenX - spriteWidth / 2 > CANVAS_WIDTH) return;

    // Draw sprite
    renderEngine.drawImage(
        sprite,
        adjustedScreenX - spriteWidth / 2,
        spriteY - playerVantagePointY.playerVantagePointY,
        spriteWidth,
        spriteHeight
    );

    return { adjustedScreenX, spriteWidth, spriteY, spriteHeight }; // Return for additional rendering (e.g., health bars)
}