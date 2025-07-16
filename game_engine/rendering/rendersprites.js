// game_engine/rendering/rendersprites.js
// Manages sprite rendering and loading across multiple maps in the game.

import { keys, playerMovement, playerPosition, playerVantagePointX, playerVantagePointY, getPlayerBobbingOffset } from "../playerdata/playerlogic.js";
import { renderEngine } from "./renderengine.js";
import { tileSectors } from "../mapdata/maps.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, SCALE_X, SCALE_Y, fastSin, fastCos, Q_rsqrt } from "../globals.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js";
import { playerInventory, inventoryState } from "../playerdata/playerinventory.js";
import { map_debug } from "../mapdata/map_debug.js";

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

// SpriteManager to handle per-map sprites
class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.layers = {
            [LAYERS.BACKGROUND]: [],
            [LAYERS.MIDGROUND]: [],
            [LAYERS.FOREGROUND]: []
        };
        this.mapSprites = new Map(); // mapKey -> array of sprite configs
        this.currentMapKey = null;
    }

    addSprite(sprite, mapKey = null) {
        if (mapKey) {
            if (!this.mapSprites.has(mapKey)) this.mapSprites.set(mapKey, []);
            this.mapSprites.get(mapKey).push(sprite);
        }
    }

    clearSprites() {
        this.sprites.clear();
        this.layers = {
            [LAYERS.BACKGROUND]: [],
            [LAYERS.MIDGROUND]: [],
            [LAYERS.FOREGROUND]: []
        };
    }

    loadSpritesForMap(mapKey) {
        this.clearSprites();
        this.currentMapKey = mapKey;
        const sprites = this.mapSprites.get(mapKey) || [];
        console.log(`Loading sprites for map ${mapKey}:`, sprites.map(s => ({ id: s.id, worldPos: s.worldPos })));
        for (const sprite of sprites) {
            this.sprites.set(sprite.id, sprite);
            this.layers[sprite.layer].push(sprite);
            // Sync boyKisserEnemySpriteWorldPos with boyKisser sprite's worldPos
            if (sprite.id === "boyKisser" && sprite.worldPos) {
                boyKisserEnemySpriteWorldPos = { x: sprite.worldPos.x, z: sprite.worldPos.z };
            }
        }
    }

    renderSprites(rayData) {
        if (!rayData) return;
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

    getSprite(id) { return this.sprites.get(id); }

    addSpriteForMaps(spriteConfig, mapKeys, mapSpecificProps = {}) {
        for (const mapKey of mapKeys) {
            // Create a new Sprite instance for each map to allow map-specific properties
            const sprite = new Sprite({
                ...spriteConfig,
                worldPos: mapSpecificProps[mapKey]?.worldPos || spriteConfig.worldPos,
                scaleFactor: mapSpecificProps[mapKey]?.scaleFactor || spriteConfig.scaleFactor,
                baseYRatio: mapSpecificProps[mapKey]?.baseYRatio || spriteConfig.baseYRatio
            });
            this.addSprite(sprite, mapKey);
        }
    }
}

export const spriteManager = new SpriteManager();

// Animation state for creamSpin
let defaultFrameSpeed = 10;
let creamSpinFrameIndex = 0;
let creamSpinFrameTimer = 0;
const creamSpinFrameDelay = defaultFrameSpeed;
export const creamSpinWorldPos = { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors };
export const creamSpinFrameCount = 7;
export let creamSpinLoaded = false;

// Preload Sprites
export const playerHandSprite = new Image(100, 100);
export let handLoaded = false;
export const pillar01Sprite = new Image();
export let pillar01Loaded = false;
export const pillar01SpriteWorldPos = { x: 2.5 * tileSectors, z: 6 * tileSectors };
export const creamSpinFrames = [];
export const corpse1Sprite = new Image();
export let corpse1Loaded = false;
export const corpse1WorldPos = { x: 1.3 * tileSectors, z: 11.7 * tileSectors };
export const metalPipeSprite = new Image();
export let metalPipeLoaded = false;
export const metalPipeWorldPos = { x: 2.5 * tileSectors, z: 4.5 * tileSectors };
export const spriteState = {
    isMetalPipeCollected: false,
    isNineMmAmmoCollected: false
};
export const metalPipePlayerHandSprite = new Image();
export let metalPipePlayerHandLoaded = false;
export const genericGunSprite = new Image();
export let genericGunSpriteLoaded = false;
export const genericGunPlayerHandSprite = new Image();
export let genericGunPlayerHandLoaded = false;
export const nineMMAmmoSprite = new Image();
export let nineMMAmmoSpriteLoaded = false;
export const nineMMAmmoSpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };
export const boyKisserEnemySprite = new Image();
export let boyKisserEnemySpriteLoaded = false;
export let boyKisserEnemySpriteWorldPos = null;
export const casperLesserDemonSprite = new Image();
export let casperLesserDemonSpriteLoaded = false;
export let casperLesserDemonSpriteWorldPos = { x: 5.5 * tileSectors, z: 11.3 * tileSectors };
export const placeholderAiSprite = new Image();
export let placeholderAiSpriteLoaded = false;
export let placeholderAISpriteWorldPos = { x: 2.5 * tileSectors, z: 11.3 * tileSectors };
export let boyKisserEnemyHealth = 5;

// Register Sprites with SpriteManager
const playerHand = new Sprite({
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
});
spriteManager.addSpriteForMaps(playerHand, ["map_01", "map_02", "map_debug"], {
    map_01: { worldPos: null }, // No worldPos for FOREGROUND sprites
    map_02: { worldPos: null },
    map_debug: { worldPos: null }
});

const pillar01 = new Sprite({
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
});
spriteManager.addSpriteForMaps(pillar01, ["map_01", "map_02"], {
    map_01: { worldPos: { x: 2.5 * tileSectors, z: 6 * tileSectors } },
    map_02: { worldPos: { x: 3.0 * tileSectors, z: 5.0 * tileSectors } }
});

const corpse1 = new Sprite({
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
});
spriteManager.addSpriteForMaps(corpse1, ["map_01", "map_debug"], {
    map_01: { worldPos: { x: 1.3 * tileSectors, z: 11.7 * tileSectors } },
    map_debug: { worldPos: { x: 1.3 * tileSectors, z: 11.7 * tileSectors } }
});

const metalPipe = new Sprite({
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
});
spriteManager.addSpriteForMaps(metalPipe, ["map_01", "map_02", "map_debug"], {
    map_01: { worldPos: { x: 2.5 * tileSectors, z: 4.5 * tileSectors } },
    map_02: { worldPos: { x: 2.0 * tileSectors, z: 3.5 * tileSectors } },
    map_debug: { worldPos: { x: 2.5 * tileSectors, z: 4.5 * tileSectors } }
});

const nineMMAmmo = new Sprite({
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
});
spriteManager.addSpriteForMaps(nineMMAmmo, ["map_01", "map_02"], {
    map_01: { worldPos: { x: 3.4 * tileSectors, z: 1.2 * tileSectors } },
    map_02: { worldPos: { x: 4.0 * tileSectors, z: 2.0 * tileSectors } }
});

const boyKisser = new Sprite({
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
});
spriteManager.addSpriteForMaps(boyKisser, ["map_01", "map_debug"], {
    map_01: { worldPos: { x: 3.4 * tileSectors, z: 1.2 * tileSectors } },
    map_debug: { worldPos: { x: 10.4 * tileSectors, z: 1.2 * tileSectors } }
});

const casperLesserDemon = new Sprite({
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
});
spriteManager.addSpriteForMaps(casperLesserDemon, ["map_01", "map_02"], {
    map_01: { worldPos: { x: 5.5 * tileSectors, z: 11.3 * tileSectors } },
    map_02: { worldPos: { x: 6.0 * tileSectors, z: 10.0 * tileSectors } }
});

const creamSpin = new Sprite({
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
});
spriteManager.addSpriteForMaps(creamSpin, ["map_01", "map_02"], {
    map_01: { worldPos: { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors } },
    map_02: { worldPos: { x: 3.5 * tileSectors, z: 12.0 * tileSectors } }
});

const placeholderAI = new Sprite({
    id: 'placeholderAI',
    image: placeholderAiSprite,
    worldPos: placeholderAISpriteWorldPos,
    isLoaded: placeholderAiSpriteLoaded,
    layer: LAYERS.MIDGROUND,
    baseWidthRatio: 128 / REF_CANVAS_WIDTH,
    baseHeightRatio: 80 / REF_CANVAS_HEIGHT,
    aspectRatio: 128 / 80,
    baseYRatio: 400 / REF_CANVAS_HEIGHT,
    scaleFactor: 0.5
});
spriteManager.addSpriteForMaps(placeholderAI, ["map_01"], {
    map_01: { worldPos: { x: 2.5 * tileSectors, z: 11.3 * tileSectors } }
});

// Set up image loading AFTER sprite registration
playerHandSprite.src = "./img/sprites/playerhand/playerhand_default.png";
playerHandSprite.onload = () => {
    handLoaded = true;
    playerHand.isLoaded = true;
};
playerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_default.png");
};

pillar01Sprite.src = "./img/sprites/decoration/pillar_01.png";
pillar01Sprite.onload = () => {
    pillar01Loaded = true;
    pillar01.isLoaded = true;
};
pillar01Sprite.onerror = () => {
    console.error("Failed to load pillar_01.png");
};

for (let i = 0; i < creamSpinFrameCount; i++) {
    const img = new Image(150, 250);
    img.src = `./img/sprites/creamspin/creamspin${i}.png`;
    img.onload = () => {
        creamSpinFrames[i] = img;
        if (creamSpinFrames.filter(f => f).length === creamSpinFrameCount) {
            creamSpinLoaded = true;
            creamSpin.isLoaded = true;
        }
    };
    img.onerror = () => {
        console.error(`Failed to load creamspin${i}.png`);
    };
}

corpse1Sprite.src = "./img/sprites/decoration/corpse_1.png";
corpse1Sprite.onload = () => {
    corpse1Loaded = true;
    corpse1.isLoaded = true;
};
corpse1Sprite.onerror = () => {
    console.error("Failed to load corpse_1.png");
};

metalPipeSprite.src = "./img/sprites/items/metal_pipe.png";
metalPipeSprite.onload = () => {
    metalPipeLoaded = true;
    metalPipe.isLoaded = true;
};
metalPipeSprite.onerror = () => {
    console.error("Failed to load metal_pipe.png");
};

metalPipePlayerHandSprite.src = "./img/sprites/playerhand/playerhand_metal_pipe.png";
metalPipePlayerHandSprite.onload = () => {
    metalPipePlayerHandLoaded = true;
    playerHand.isLoaded = true;
};
metalPipePlayerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_metal_pipe.png");
};

genericGunSprite.src = "./img/sprites/items/generic_gun.png";
genericGunSprite.onload = () => {
    genericGunSpriteLoaded = true;
};
genericGunSprite.onerror = () => {
    console.error("Failed to load generic_gun.png");
};

genericGunPlayerHandSprite.src = "./img/sprites/playerhand/playerhand_generic_gun.png";
genericGunPlayerHandSprite.onload = () => {
    genericGunPlayerHandLoaded = true;
    playerHand.isLoaded = true;
};
genericGunPlayerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_generic_gun.png");
};

nineMMAmmoSprite.src = "./img/sprites/items/9mm_ammo_box.png";
nineMMAmmoSprite.onload = () => {
    nineMMAmmoSpriteLoaded = true;
    nineMMAmmo.isLoaded = true;
};
nineMMAmmoSprite.onerror = () => {
    console.error("Failed to load 9mm_ammo_box.png");
};

boyKisserEnemySprite.src = "./img/sprites/enemy/boykisser.png";
boyKisserEnemySprite.onload = () => {
    boyKisserEnemySpriteLoaded = true;
    boyKisser.isLoaded = true;
};
boyKisserEnemySprite.onerror = () => {
    console.error("Failed to load boykisser.png");
};

casperLesserDemonSprite.src = "./img/sprites/enemy/casperdemon.png";
casperLesserDemonSprite.onload = () => {
    casperLesserDemonSpriteLoaded = true;
    casperLesserDemon.isLoaded = true;
};
casperLesserDemonSprite.onerror = () => {
    console.error("Failed to load casperdemon.png");
};

placeholderAiSprite.src = "./img/sprites/enemy/carenemytest.png";
placeholderAiSprite.onload = () => {
    placeholderAiSpriteLoaded = true;
    placeholderAI.isLoaded = true;
};
placeholderAiSprite.onerror = () => {
    console.error("Failed to load carenemytest.png");
};

if (typeof window !== 'undefined') window.boyKisserEnemyHealth = boyKisserEnemyHealth;
else if (typeof globalThis !== 'undefined') globalThis.boyKisserEnemyHealth = boyKisserEnemyHealth;

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