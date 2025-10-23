import { renderEngine } from "../renderengine.js";
import { tileSectors } from "../../mapdata/maps.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { renderSprite } from "./spriteutils.js";
import { registerSprites } from "./spriteregistry.js";
import { dynamicSpriteHandler } from "./dynamicspritehandler.js";

// World position exports
export const pillar01SpriteWorldPos = { x: 2.5 * tileSectors, z: 6 * tileSectors };
export const corpse1WorldPos = { x: 1.3 * tileSectors, z: 11.7 * tileSectors };
export const metalPipeWorldPos = { x: 2.5 * tileSectors, z: 4.5 * tileSectors };
export const nineMMAmmoSpriteWorldPos = { x: 3.4 * tileSectors, z: 1.2 * tileSectors };
export let boyKisserEnemySpriteWorldPos = null;
export let casperLesserDemonSpriteWorldPos = null;
export let placeholderAISpriteWorldPos = null;

// Define rendering layers
export const LAYERS = {
    BACKGROUND: 'background',
    MIDGROUND: 'midground',
    FOREGROUND: 'foreground'
};

// Sprite class to encapsulate sprite data
export class Sprite {
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

    defaultRender(rayData, ctx) {
        if (!this.isLoaded || !this.image || !this.worldPos || typeof renderSprite !== 'function') {
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
            spriteId: this.id,
            ctx
        });
    }
}

// SpriteManager to handle per-map sprites
export class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.layers = {
            [LAYERS.BACKGROUND]: [],
            [LAYERS.MIDGROUND]: [],
            [LAYERS.FOREGROUND]: []
        };
        this.mapSprites = new Map(); // mapKey -> array of sprite configs
        this.currentMapKey = null;
        this.instanceId = Math.random().toString(36).substring(2); // Unique ID for debugging
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
            // Sync casperLesserDemonSpriteWorldPos with casperLesserDemon sprite's worldPos
            if (sprite.id === "casperLesserDemon" && sprite.worldPos) {
                casperLesserDemonSpriteWorldPos = { x: sprite.worldPos.x, z: sprite.worldPos.z };
            }
            if (sprite.id === "placeholderAI" && sprite.worldPos) {
                placeholderAISpriteWorldPos = { x: sprite.worldPos.x, z: sprite.worldPos.z };
            }
        }
    }

    renderSprites(rayData, ctx) {
        if (!rayData) return;
        // Render Background layer (no sorting)
        this.layers[LAYERS.BACKGROUND].forEach(sprite => sprite.renderFunction(rayData, ctx));

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
        midgroundSprites.forEach(({ sprite }) => sprite.renderFunction(rayData, ctx));

        // Render Foreground layer (no sorting)
        this.layers[LAYERS.FOREGROUND].forEach(sprite => sprite.renderFunction(rayData, ctx));
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

    removeSprite(spriteId) {
        this.sprites.delete(spriteId);
        // Remove from layers
        Object.values(LAYERS).forEach(layer => {
            this.layers[layer] = this.layers[layer].filter(sprite => sprite.id !== spriteId);
        });
        // Remove from mapSprites for the current map
        if (this.currentMapKey) {
            const mapSprites = this.mapSprites.get(this.currentMapKey) || [];
            this.mapSprites.set(this.currentMapKey, mapSprites.filter(sprite => sprite.id !== spriteId));
        }
        console.debug(`Removed sprite ${spriteId} from spriteManager`);
    }
}

export const spriteManager = new SpriteManager();

export function drawSprites(rayData, ctx) {
    if (!rayData) return;
    spriteManager.renderSprites(rayData, ctx);
}

export function initializeSprites() {
    registerSprites(); // Load static sprites from spriteregistry.js
    // Example: Spawn dynamic sprites (you can call this elsewhere based on game logic)
    dynamicSpriteHandler.spawnSprites({
        spriteType: "dynamicEnemy",
        image: new Image(), // Replace with actual image or load dynamically
        positions: [
            { x: 4.0, z: 5.0 },
            { x: 5.0, z: 6.0 }
        ],
        layer: LAYERS.MIDGROUND,
        mapKeys: ["map_01", "map_debug"],
        extraProps: {
            // Add custom properties, e.g., health for enemies
            health: 5
        }
    });
}

// Initialize sprites when the document is fully loaded
if (document.readyState === 'complete') {
    initializeSprites();
} else {
    window.addEventListener('load', initializeSprites);
}