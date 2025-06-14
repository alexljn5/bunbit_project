import { keys, playerMovement, playerPosition, playerVantagePointX, playerVantagePointY, getPlayerBobbingOffset } from "./playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { tileSectors } from "./mapdata/maps.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "./globals.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js";
import { playerInventory, inventoryState } from "./playerdata/playerinventory.js";

// Define rendering layers
export const LAYERS = {
    BACKGROUND: 'background',
    MIDGROUND: 'midground',
    FOREGROUND: 'foreground'
};

// Sprite class to encapsulate sprite data
class Sprite {
    constructor({ id, image, worldPos, isLoaded, renderFunction, layer = LAYERS.MIDGROUND, scaleFactor = 0.5, aspectRatio = 1, baseWidthRatio = 0.25, baseHeightRatio = 0.25, baseYRatio = 0.5 }) {
        this.id = id;
        this.image = image;
        this.worldPos = worldPos || null;
        this._isLoaded = isLoaded;
        this.renderFunction = renderFunction || this.defaultRender.bind(this);
        this.layer = layer;
        this.scaleFactor = scaleFactor;
        this.aspectRatio = aspectRatio;
        this.baseWidthRatio = baseWidthRatio;
        this.baseHeightRatio = baseHeightRatio;
        this.baseYRatio = baseYRatio;
    }

    get isLoaded() {
        return typeof this._isLoaded === 'boolean' ? this._isLoaded : false;
    }

    set isLoaded(value) {
        this._isLoaded = value;
    }

    defaultRender(rayData, renderEngine) {
        if (!this.isLoaded || !this.image || !this.worldPos) {
            return null;
        }
        return renderSprite({
            sprite: this.image,
            isLoaded: this.isLoaded,
            worldPos: this.worldPos,
            rayData,
            baseWidthRatio: this.baseWidthRatio,
            baseHeightRatio: this.baseHeightRatio,
            aspectRatio: this.aspectRatio,
            baseYRatio: this.baseYRatio,
            scaleFactor: this.scaleFactor,
            spriteId: this.id
        });
    }
}

// SpriteManager to handle sprite registration and layered rendering
class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.layers = {
            [LAYERS.BACKGROUND]: [],
            [LAYERS.MIDGROUND]: [],
            [LAYERS.FOREGROUND]: []
        };
    }

    addSprite(sprite) {
        this.sprites.set(sprite.id, sprite);
        this.layers[sprite.layer].push(sprite);
    }

    renderSprites(rayData) {
        if (!rayData) {
            return;
        }
        // Render Background layer (no sorting)
        this.layers[LAYERS.BACKGROUND].forEach(sprite => sprite.renderFunction(rayData, renderEngine));

        // Render Midground layer (sorted by distance)
        const midgroundSprites = this.layers[LAYERS.MIDGROUND]
            .map(sprite => {
                if (!sprite.worldPos) return null;
                const dx = sprite.worldPos.x - playerPosition.x;
                const dz = sprite.worldPos.z - playerPosition.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                return { sprite, distance };
            })
            .filter(s => s)
            .sort((a, b) => b.distance - a.distance); // Farthest first
        midgroundSprites.forEach(({ sprite }) => sprite.renderFunction(rayData, renderEngine));

        // Render Foreground layer (no sorting)
        this.layers[LAYERS.FOREGROUND].forEach(sprite => sprite.renderFunction(rayData, renderEngine));
    }

    getSprite(id) {
        return this.sprites.get(id);
    }
}

export const spriteManager = new SpriteManager();

// Preload Sprites
export const playerHandSprite = new Image(100, 100);
playerHandSprite.src = "./img/sprites/playerhand/playerhand_default.png";
export let handLoaded = false;
playerHandSprite.onload = () => {
    handLoaded = true;
    spriteManager.getSprite('playerHand').isLoaded = true;
};
playerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_default.png");
};

export const pillar01Sprite = new Image();
pillar01Sprite.src = "./img/sprites/decoration/pillar_01.png";
export let pillar01Loaded = false;
pillar01Sprite.onload = () => {
    pillar01Loaded = true;
    spriteManager.getSprite('pillar01').isLoaded = true;
};
pillar01Sprite.onerror = () => {
    console.error("Failed to load pillar_01.png");
};
export const pillar01SpriteWorldPos = { x: 2.5 * tileSectors, z: 6 * tileSectors };

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
            spriteManager.getSprite('creamSpin').isLoaded = true;
        }
    };
    img.onerror = () => {
        console.error(`Failed to load creamspin${i}.png`);
    };
}

export const corpse1Sprite = new Image();
corpse1Sprite.src = "./img/sprites/decoration/corpse_1.png";
export let corpse1Loaded = false;
corpse1Sprite.onload = () => {
    corpse1Loaded = true;
    spriteManager.getSprite('corpse1').isLoaded = true;
};
corpse1Sprite.onerror = () => {
    console.error("Failed to load corpse_1.png");
};
export const corpse1WorldPos = { x: 1.3 * tileSectors, z: 11.7 * tileSectors };

// Items
export const metalPipeSprite = new Image();
metalPipeSprite.src = "./img/sprites/items/metal_pipe.png";
export let metalPipeLoaded = false;
metalPipeSprite.onload = () => {
    metalPipeLoaded = true;
    spriteManager.getSprite('metalPipe').isLoaded = true;
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
    spriteManager.getSprite('playerHand').isLoaded = true;
};

export const genericGunSprite = new Image();
genericGunSprite.src = "./img/sprites/items/generic_gun.png";
export let genericGunSpriteLoaded = false;
genericGunSprite.onload = () => {
    genericGunSpriteLoaded = true;
};

export const genericGunPlayerHandSprite = new Image();
genericGunPlayerHandSprite.src = "./img/sprites/playerhand/playerhand_generic_gun.png";
export let genericGunPlayerHandLoaded = false;
genericGunPlayerHandSprite.onload = () => {
    genericGunPlayerHandLoaded = true;
    spriteManager.getSprite('playerHand').isLoaded = true;
};

export const nineMMAmmoSprite = new Image();
nineMMAmmoSprite.src = "./img/sprites/items/9mm_ammo_box.png";
export let nineMMAmmoSpriteLoaded = false;
nineMMAmmoSprite.onload = () => {
    nineMMAmmoSpriteLoaded = true;
    spriteManager.getSprite('nineMMAmmo').isLoaded = true;
};
export const nineMMAmmoSpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };

// End of Items
export const boyKisserEnemySprite = new Image();
boyKisserEnemySprite.src = "./img/sprites/enemy/boykisser.png";
export let boyKisserEnemySpriteLoaded = false;
boyKisserEnemySprite.onload = () => {
    boyKisserEnemySpriteLoaded = true;
    spriteManager.getSprite('boyKisser').isLoaded = true;
};
export const boyKisserEnemySpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };

export const casperLesserDemonSprite = new Image();
casperLesserDemonSprite.src = "./img/sprites/enemy/casperdemon.png";
export let casperLesserDemonSpriteLoaded = false;
casperLesserDemonSprite.onload = () => {
    casperLesserDemonSpriteLoaded = true;
    spriteManager.getSprite('casperLesserDemon').isLoaded = true;
};
export const casperLesserDemonSpriteWorldPos = { x: 5.5 * tileSectors, z: 11.3 * tileSectors };

export let boyKisserEnemyHealth = 5;
if (typeof window !== 'undefined') window.boyKisserEnemyHealth = boyKisserEnemyHealth;
else if (typeof globalThis !== 'undefined') globalThis.boyKisserEnemyHealth = boyKisserEnemyHealth;

// Animation state for creamSpin
let defaultFrameSpeed = 10;
let creamSpinFrameIndex = 0;
let creamSpinFrameTimer = 0;
const creamSpinFrameDelay = defaultFrameSpeed;
export const creamSpinWorldPos = { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors };

// Register Sprites with SpriteManager
spriteManager.addSprite(new Sprite({
    id: 'pillar01',
    image: pillar01Sprite,
    worldPos: pillar01SpriteWorldPos,
    isLoaded: pillar01Loaded,
    layer: LAYERS.BACKGROUND,
    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
    baseHeightRatio: 128 / REF_CANVAS_HEIGHT,
    aspectRatio: 1,
    baseYRatio: 400 / REF_CANVAS_HEIGHT,
    scaleFactor: 0.5
}));

spriteManager.addSprite(new Sprite({
    id: 'corpse1',
    image: corpse1Sprite,
    worldPos: corpse1WorldPos,
    isLoaded: corpse1Loaded,
    layer: LAYERS.BACKGROUND,
    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
    baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
    aspectRatio: 128 / 80,
    baseYRatio: 400 / REF_CANVAS_HEIGHT,
    scaleFactor: 0.5
}));

spriteManager.addSprite(new Sprite({
    id: 'metalPipe',
    image: metalPipeSprite,
    worldPos: metalPipeWorldPos,
    isLoaded: metalPipeLoaded,
    layer: LAYERS.MIDGROUND,
    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
    baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
    aspectRatio: 128 / 80,
    baseYRatio: 500 / REF_CANVAS_HEIGHT,
    scaleFactor: 0.5,
    renderFunction: (rayData, renderEngine) => {
        if (spriteState.isMetalPipeCollected) return null;
        return renderSprite({
            sprite: metalPipeSprite,
            isLoaded: metalPipeLoaded,
            worldPos: metalPipeWorldPos,
            rayData,
            baseWidthRatio: 128 / REF_CANVAS_WIDTH,
            baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
            aspectRatio: 128 / 80,
            baseYRatio: 500 / REF_CANVAS_HEIGHT,
            scaleFactor: 0.5,
            spriteId: 'metalPipe'
        });
    }
}));

spriteManager.addSprite(new Sprite({
    id: 'nineMMAmmo',
    image: nineMMAmmoSprite,
    worldPos: nineMMAmmoSpriteWorldPos,
    isLoaded: nineMMAmmoSpriteLoaded,
    layer: LAYERS.MIDGROUND,
    scaleFactor: 0.5,
    aspectRatio: 1,
    baseYRatio: 400 / REF_CANVAS_HEIGHT,
    renderFunction: (rayData, renderEngine) => {
        if (spriteState.isNineMmAmmoCollected) return null;
        const dx = nineMMAmmoSpriteWorldPos.x - playerPosition.x;
        const dz = nineMMAmmoSpriteWorldPos.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
        const correctedDistance = distance * Math.cos(relativeAngle);
        if (correctedDistance < 0.1) return null;
        const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * 0.5;
        const spriteWidth = spriteHeight;
        const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
        const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
        const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
        const halfTile = tileSectors * 0.5;
        const rowDistance = correctedDistance;
        const spriteYBottom = halfCanvasHeight + (halfTile / rowDistance) * projectionPlaneDist;
        const result = renderSprite({
            sprite: nineMMAmmoSprite,
            isLoaded: nineMMAmmoSpriteLoaded,
            worldPos: nineMMAmmoSpriteWorldPos,
            rayData,
            spriteWidth,
            spriteHeight,
            spriteY: spriteYBottom - spriteHeight,
            adjustedScreenX,
            startColumn,
            endColumn,
            correctedDistance,
            spriteId: 'nineMMAmmo'
        });
        return result ? { adjustedScreenX, spriteWidth, spriteY: spriteYBottom - spriteHeight, spriteHeight } : null;
    }
}));

spriteManager.addSprite(new Sprite({
    id: 'boyKisser',
    image: boyKisserEnemySprite,
    worldPos: boyKisserEnemySpriteWorldPos,
    isLoaded: boyKisserEnemySpriteLoaded,
    layer: LAYERS.MIDGROUND,
    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
    baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
    aspectRatio: 128 / 80,
    baseYRatio: 400 / REF_CANVAS_HEIGHT,
    scaleFactor: 0.5,
    renderFunction: (rayData, renderEngine) => {
        if (!boyKisserEnemySpriteLoaded) return null;
        const result = renderSprite({
            sprite: boyKisserEnemySprite,
            isLoaded: boyKisserEnemySpriteLoaded,
            worldPos: boyKisserEnemySpriteWorldPos,
            rayData,
            baseWidthRatio: 128 / REF_CANVAS_WIDTH,
            baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
            aspectRatio: 128 / 80,
            baseYRatio: 400 / REF_CANVAS_HEIGHT,
            scaleFactor: 0.5,
            spriteId: 'boyKisser'
        });
        if (result) {
            if (typeof window !== 'undefined' && typeof window.boyKisserEnemyHealth === 'number') {
                boyKisserEnemyHealth = window.boyKisserEnemyHealth;
            } else if (typeof globalThis !== 'undefined' && typeof globalThis.boyKisserEnemyHealth === 'number') {
                boyKisserEnemyHealth = globalThis.boyKisserEnemyHealth;
            }
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
            return result;
        }
        return null;
    }
}));

spriteManager.addSprite(new Sprite({
    id: 'casperLesserDemon',
    image: casperLesserDemonSprite,
    worldPos: casperLesserDemonSpriteWorldPos,
    isLoaded: casperLesserDemonSpriteLoaded,
    layer: LAYERS.MIDGROUND,
    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
    baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
    aspectRatio: 128 / 80,
    baseYRatio: 400 / REF_CANVAS_HEIGHT,
    scaleFactor: 0.5
}));

spriteManager.addSprite(new Sprite({
    id: 'creamSpin',
    image: creamSpinFrames[0], // Placeholder, updated in render
    worldPos: creamSpinWorldPos,
    isLoaded: creamSpinLoaded,
    layer: LAYERS.MIDGROUND,
    scaleFactor: 1,
    aspectRatio: 150 / 250,
    baseYRatio: 0.5,
    renderFunction: (rayData, renderEngine) => {
        if (!creamSpinLoaded) return null;
        const currentFrame = getCreamSpinCurrentFrame();
        if (!currentFrame) return null;
        const dx = creamSpinWorldPos.x - playerPosition.x;
        const dz = creamSpinWorldPos.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
        const correctedDistance = distance * Math.cos(relativeAngle);
        if (correctedDistance < 0.1) return null;
        const spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors;
        const spriteWidth = spriteHeight * (150 / 250);
        const spriteY = CANVAS_HEIGHT * 0.5 - spriteHeight / 2;
        const { adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth);
        const result = renderSprite({
            sprite: currentFrame,
            isLoaded: creamSpinLoaded,
            worldPos: creamSpinWorldPos,
            rayData,
            spriteWidth,
            spriteHeight,
            spriteY,
            adjustedScreenX,
            startColumn,
            endColumn,
            correctedDistance,
            spriteId: 'creamSpin'
        });
        return result;
    }
}));

spriteManager.addSprite(new Sprite({
    id: 'playerHand',
    image: playerHandSprite,
    isLoaded: handLoaded,
    layer: LAYERS.FOREGROUND,
    renderFunction: (rayData, renderEngine) => {
        if (!handLoaded && !metalPipePlayerHandLoaded && !genericGunPlayerHandLoaded) return null;
        let handSprite = playerHandSprite;
        const selectedItem = playerInventory[inventoryState.selectedInventoryIndex];
        if (selectedItem === "metal_pipe" && metalPipePlayerHandLoaded) {
            handSprite = metalPipePlayerHandSprite;
        } else if (selectedItem === "generic_gun" && genericGunPlayerHandLoaded) {
            handSprite = genericGunPlayerHandSprite;
        }
        const bobbingY = (400 * SCALE_Y) + getPlayerBobbingOffset();
        const spriteWidth = 256 * SCALE_X;
        const spriteHeight = 512 * SCALE_Y;
        const spriteX = 450 * SCALE_X;
        renderEngine.drawImage(handSprite, spriteX, bobbingY, spriteWidth, spriteHeight);
        return null; // No depth info needed
    }
}));

export function drawSprites(rayData) {
    if (!rayData) return;
    spriteManager.renderSprites(rayData);
}

export function getCreamSpinCurrentFrame() {
    if (!creamSpinLoaded) return null;
    creamSpinFrameTimer++;
    if (creamSpinFrameTimer >= creamSpinFrameDelay) {
        creamSpinFrameIndex = (creamSpinFrameIndex + 1) % creamSpinFrameCount;
        creamSpinFrameTimer = 0;
    }
    return creamSpinFrames[creamSpinFrameIndex];
}

function isSpriteVisible(rayData, startColumn, endColumn, correctedDistance, spriteName = 'unknown') {
    startColumn = Math.max(0, Math.min(numCastRays - 1, Math.floor(startColumn)));
    endColumn = Math.max(0, Math.min(numCastRays - 1, Math.ceil(endColumn)));
    if (correctedDistance <= 0) return { visible: false, visibleStartCol: startColumn, visibleEndCol: startColumn };
    let visibleStartCol = -1;
    let visibleEndCol = -1;
    for (let col = startColumn; col <= endColumn; col++) {
        const ray = rayData[col];
        if (!ray || correctedDistance < ray.distance) {
            if (visibleStartCol === -1) visibleStartCol = col;
            visibleEndCol = col;
        }
    }
    const visible = visibleStartCol !== -1 && visibleEndCol !== -1;
    console.log(`Sprite ${spriteName} visibility: visible=${visible}, columns=${visibleStartCol}-${visibleEndCol}, distance=${correctedDistance}`);
    return { visible, visibleStartCol, visibleEndCol };
}

function getSpriteScreenParams(relativeAngle, spriteWidth) {
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
    const screenX = (CANVAS_WIDTH / 2) + (CANVAS_WIDTH / 2) * (relativeAngle / (playerFOV / 2));
    const adjustedScreenX = screenX - playerVantagePointX.playerVantagePointX;
    const startColumn = (adjustedScreenX - spriteWidth / 2) / (CANVAS_WIDTH / numCastRays);
    const endColumn = (adjustedScreenX + spriteWidth / 2) / (CANVAS_WIDTH / numCastRays);
    return { adjustedScreenX, startColumn, endColumn };
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
    scaleFactor = 0.5,
    spriteId = 'unknown',
    spriteWidth: providedWidth,
    spriteHeight: providedHeight,
    spriteY: providedY,
    adjustedScreenX: providedScreenX,
    startColumn: providedStartCol,
    endColumn: providedEndCol,
    correctedDistance: providedDistance
}) {
    if (!isLoaded || !sprite || !worldPos) return null;

    let spriteWidth, spriteHeight, spriteY, adjustedScreenX, startColumn, endColumn, correctedDistance;

    if (providedWidth && providedHeight && providedY && providedScreenX && providedStartCol !== undefined && providedEndCol !== undefined && providedDistance) {
        spriteWidth = providedWidth;
        spriteHeight = providedHeight;
        spriteY = providedY;
        adjustedScreenX = providedScreenX;
        startColumn = providedStartCol;
        endColumn = providedEndCol;
        correctedDistance = providedDistance;
    } else {
        const dx = worldPos.x - playerPosition.x;
        const dz = worldPos.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
        correctedDistance = distance * Math.cos(relativeAngle);
        if (correctedDistance < 0.1) return null;
        spriteHeight = (CANVAS_HEIGHT / correctedDistance) * tileSectors * scaleFactor;
        spriteWidth = spriteHeight * aspectRatio;
        spriteY = CANVAS_HEIGHT * baseYRatio;
        ({ adjustedScreenX, startColumn, endColumn } = getSpriteScreenParams(relativeAngle, spriteWidth));
    }

    const visibility = isSpriteVisible(rayData, startColumn, endColumn, correctedDistance, spriteId);
    if (!visibility.visible) return null;

    if (adjustedScreenX + spriteWidth / 2 < 0 || adjustedScreenX - spriteWidth / 2 > CANVAS_WIDTH) return null;

    const visibleStartCol = Math.max(startColumn, visibility.visibleStartCol);
    const visibleEndCol = Math.min(endColumn, visibility.visibleEndCol);

    const colWidth = CANVAS_WIDTH / numCastRays;
    const spriteLeftX = adjustedScreenX - spriteWidth / 2;
    const visibleLeftX = spriteLeftX + (visibleStartCol - startColumn) * colWidth;
    const visibleRightX = spriteLeftX + (visibleEndCol - startColumn + 1) * colWidth;
    const visibleScreenWidth = visibleRightX - visibleLeftX;

    const spriteImageWidth = sprite.width;
    const visibleFractionStart = (visibleStartCol - startColumn) / (endColumn - startColumn + 1);
    const visibleFractionEnd = (visibleEndCol - startColumn + 1) / (endColumn - startColumn + 1);
    const sx = visibleFractionStart * spriteImageWidth;
    const sWidth = (visibleFractionEnd - visibleFractionStart) * spriteImageWidth;

    renderEngine.drawImage(
        sprite,
        sx, 0, sWidth, sprite.height,
        visibleLeftX, spriteY - playerVantagePointY.playerVantagePointY,
        visibleScreenWidth, spriteHeight
    );

    return { adjustedScreenX, spriteWidth: visibleScreenWidth, spriteY, spriteHeight };
}