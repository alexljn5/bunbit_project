import { keys, playerMovement, playerPosition, playerVantagePointX, playerVantagePointY } from "./playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { tileSectors } from "./maps.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./renderengine.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js"; // Ensure imports

// Preload Sprites
export const playerHandSprite = new Image(100, 100);
playerHandSprite.src = "img/sprites/playerhand/playerhand_default.png";
export let handLoaded = false;
playerHandSprite.onload = () => {
    handLoaded = true;
    console.log("Player hand sprite loaded");
};

export const creamTestSprite = new Image(200, 50);
creamTestSprite.src = "img/sprites/creamtest.png";
export let creamTestLoaded = false;
creamTestSprite.onload = () => {
    creamTestLoaded = true;
    console.log("Cream test sprite loaded");
};

export const firingSprite = new Image(32, 32);
firingSprite.src = "img/sprites/placeholder.png";
export let firingLoaded = false;
firingSprite.onload = () => {
    firingLoaded = true;
    console.log("Firing sprite loaded");
};

export const creamSpinFrames = [];
export const creamSpinFrameCount = 7;
export let creamSpinLoaded = false;
for (let i = 0; i < creamSpinFrameCount; i++) {
    const img = new Image(150, 250);
    img.src = `img/sprites/creamspin/creamspin${i}.png`;
    img.onload = () => {
        creamSpinFrames[i] = img;
        if (creamSpinFrames.filter(f => f).length === creamSpinFrameCount) {
            creamSpinLoaded = true;
            console.log("All cream spin frames loaded");
        }
    };
}

export function drawSprites(rayData) {
    drawStaticSprites();
    animatedSpriteRenderer(rayData);
}

function drawStaticSprites() {
    playerHandSpriteFunction();
}

function animatedSpriteRenderer(rayData) {
    creamSpinTestSprite(rayData);
}

function playerHandSpriteFunction() {
    const handX = 450;
    const handY = 400;
    const handWidth = 100;
    const handHeight = 100;

    if (handLoaded) {
        renderEngine.drawImage(playerHandSprite, handX, handY, handWidth, handHeight);
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
    if (!creamSpinLoaded) return;

    // Calculate distance from player to sprite
    const dx = creamSpinWorldPos.x - playerPosition.x;
    const dz = creamSpinWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Apply perspective correction (same as walls)
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    const correctedDistance = distance * Math.cos(relativeAngle);
    if (correctedDistance < 1) return; // Skip if too close

    // Calculate sprite size based on distance, matching wall scaling
    const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors;
    const spriteWidth = spriteHeight * (150 / 250); // Maintain aspect ratio (150x250 sprite)
    const spriteY = (CANVAS_HEIGHT - spriteHeight) / 2; // Center vertically, like walls

    // Calculate screen X position
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));

    // Apply vantage point offset (same as walls)
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
    }
}