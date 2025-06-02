import { keys, playerMovement, playerPosition, playerVantagePointX, playerVantagePointY, getPlayerBobbingOffset } from "./playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { tileSectors } from "./mapdata/maps.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./globals.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js";
import { playerInventory, selectedInventoryIndex } from "./playerdata/playerinventory.js"; // Add this import

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
//Items
export const metalPipeSprite = new Image(128, 128);
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

export const metalPipePlayerHandSprite = new Image(128, 128);
metalPipePlayerHandSprite.src = "./img/sprites/playerhand/playerhand_metal_pipe.png";
export let metalPipePlayerHandLoaded = false;
metalPipePlayerHandSprite.onload = () => {
    metalPipePlayerHandLoaded = true;
    console.log("Metal pipe player hand sprite loaded");
};

export const genericGunSprite = new Image(128, 128);
genericGunSprite.src = "./img/sprites/items/generic_gun.png";
export let genericGunSpriteLoaded = false;
genericGunSprite.onload = () => {
    genericGunSpriteLoaded = true;
    console.log("Generic gun sprite loaded");
};

export const genericGunPlayerHandSprite = new Image(128, 128);
genericGunPlayerHandSprite.src = "./img/sprites/playerhand/playerhand_generic_gun.png";
export let genericGunPlayerHandLoaded = false;
genericGunPlayerHandSprite.onload = () => {
    genericGunPlayerHandLoaded = true;
    console.log("Generic gun player hand sprite loaded");
}

export const nineMMAmmoSprite = new Image(128, 128);
nineMMAmmoSprite.src = "./img/sprites/items/9mm_ammo_box.png"
export let nineMMAmmoSpriteLoaded = false;
nineMMAmmoSprite.onload = () => {
    nineMMAmmoSpriteLoaded = true;
    console.log("Generic nine MM ammo loaded");
}
export const nineMMAmmoSpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };

//End of Items

export const boyKisserEnemySprite = new Image(128, 128);
boyKisserEnemySprite.src = "./img/sprites/enemy/boykisser.png";
//boyKisserEnemySprite.src = "./img/sprites/enemy/carenemytest.png";
export let boyKisserEnemySpriteLoaded = false;
boyKisserEnemySprite.onload = () => {
    boyKisserEnemySpriteLoaded = true;
    console.log("Boy kisser loaded!");
}
export const boyKisserEnemySpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };

export const casperLesserDemonSprite = new Image(128, 128);
casperLesserDemonSprite.src = "./img/sprites/enemy/casperdemon.png";
export let casperLesserDemonSpriteLoaded = false;
casperLesserDemonSprite.onload = () => {
    casperLesserDemonSpriteLoaded = true;
    console.log("Casper loaded!");
}
export const casperLesserDemonSpriteWorldPos = { x: 5.5 * tileSectors, z: 11.3 * tileSectors };

export let boyKisserEnemyHealth = 5; // Example: 5 health points
if (typeof window !== 'undefined') window.boyKisserEnemyHealth = boyKisserEnemyHealth;
else if (typeof globalThis !== 'undefined') globalThis.boyKisserEnemyHealth = boyKisserEnemyHealth;


export function playerHandSpriteFunction() {
    // Determine which hand sprite to render based on selected inventory slot
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
    // Bobbing effect
    const bobbingY = 400 + getPlayerBobbingOffset();
    renderEngine.drawImage(handSprite, 450, bobbingY, 256, 512);
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
    if (!nineMMAmmoSpriteLoaded) return;

    // Sprite world position relative to player
    const dx = nineMMAmmoSpriteWorldPos.x - playerPosition.x;
    const dz = nineMMAmmoSpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return; // Avoid division by zero or too-close sprites

    // Calculate sprite size (same as before)
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight; // Maintain aspect ratio

    // Get screen X position and column range
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);

    // Check if sprite is visible
    if (!isSpriteVisible(rayData, startColumn, endColumn, correctedDistance)) return;
    if (adjustedScreenX + spriteWidth / 2 < 0 || adjustedScreenX - spriteWidth / 2 > CANVAS_WIDTH) return;

    // Calculate floor Y-position using floor projection (same as renderRaycastFloors)
    const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
    const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
    const halfTile = tileSectors * 0.5;

    // Assume sprite is at floor level (z = 0), so rowDistance matches floor at sprite's distance
    const rowDistance = correctedDistance; // Sprite is at floor level
    const spriteYBottom = halfCanvasHeight + (halfTile / rowDistance) * projectionPlaneDist;

    // Draw sprite with bottom aligned to floor
    renderEngine.drawImage(
        nineMMAmmoSprite,
        adjustedScreenX - spriteWidth / 2,
        spriteYBottom - spriteHeight - playerVantagePointY.playerVantagePointY, // Align bottom to floor
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

    // Calculate distance from player to sprite
    const dx = creamSpinWorldPos.x - playerPosition.x;
    const dz = creamSpinWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) {
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
    if (!pillar01Loaded) return;
    const dx = pillar01SpriteWorldPos.x - playerPosition.x;
    const dz = pillar01SpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight;
    const spriteY = 400;
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (isSpriteVisible(rayData, startColumn, endColumn, correctedDistance) && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            pillar01Sprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    }
}

function boyKisserEnemySpriteFunction(rayData) {
    if (!boyKisserEnemySpriteLoaded) return;
    const dx = boyKisserEnemySpriteWorldPos.x - playerPosition.x;
    const dz = boyKisserEnemySpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80);
    const spriteY = 400;
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    // Sync global health value for rendering
    if (typeof window !== 'undefined' && typeof window.boyKisserEnemyHealth === 'number') {
        boyKisserEnemyHealth = window.boyKisserEnemyHealth;
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.boyKisserEnemyHealth === 'number') {
        boyKisserEnemyHealth = globalThis.boyKisserEnemyHealth;
    }
    if (isSpriteVisible(rayData, startColumn, endColumn, correctedDistance) && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            boyKisserEnemySprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
        // Draw a simple health bar above the sprite
        const barWidth = 60;
        const barHeight = 8;
        const maxHealth = 5;
        const healthPercent = Math.max(0, Math.min(1, boyKisserEnemyHealth / maxHealth));
        const barX = adjustedScreenX - barWidth / 2;
        const barY = spriteY - playerVantagePointY.playerVantagePointY - barHeight - 10;
        // Background
        renderEngine.fillStyle = '#222';
        renderEngine.fillRect(barX, barY, barWidth, barHeight);
        // Health
        renderEngine.fillStyle = '#FFD700';
        renderEngine.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        // Border
        renderEngine.strokeStyle = '#000';
        renderEngine.lineWidth = 2;
        renderEngine.strokeRect(barX, barY, barWidth, barHeight);
    }
}

function casperLesserDemonSpriteFunction(rayData) {
    if (!casperLesserDemonSpriteLoaded) return;
    const dx = casperLesserDemonSpriteWorldPos.x - playerPosition.x;
    const dz = casperLesserDemonSpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80);
    const spriteY = 400;
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (isSpriteVisible(rayData, startColumn, endColumn, correctedDistance) && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            casperLesserDemonSprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    }
}

function corpse1SpriteFunction(rayData) {
    if (!corpse1Loaded) return;
    const dx = corpse1WorldPos.x - playerPosition.x;
    const dz = corpse1WorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80);
    const spriteY = 400;
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (isSpriteVisible(rayData, startColumn, endColumn, correctedDistance) && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            corpse1Sprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    }
}

function metalPipeSpriteFunction(rayData) {
    if (!metalPipeSprite || !metalPipeLoaded || spriteState.isMetalPipeCollected) return;
    const dx = metalPipeWorldPos.x - playerPosition.x;
    const dz = metalPipeWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 0.1) return;
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors / 2;
    const spriteWidth = spriteHeight * (128 / 80);
    const spriteY = 500;
    const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
    if (isSpriteVisible(rayData, startColumn, endColumn, correctedDistance) && adjustedScreenX + spriteWidth / 2 >= 0 && adjustedScreenX - spriteWidth / 2 <= CANVAS_WIDTH) {
        renderEngine.drawImage(
            metalPipeSprite,
            adjustedScreenX - spriteWidth / 2,
            spriteY - playerVantagePointY.playerVantagePointY,
            spriteWidth,
            spriteHeight
        );
    }
}

// Cleaned up render sprites for clarity and maintainability