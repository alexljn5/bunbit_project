// dynamicSpriteHandler.js
import { Sprite, spriteManager, LAYERS } from "./rendersprites.js";
import { tileSectors } from "../../mapdata/maps.js";
import { renderSprite } from "./spriteutils.js";

// Class to handle dynamic sprite spawning
export class DynamicSpriteHandler {
    constructor() {
        this.dynamicSprites = new Map(); // Store dynamic sprites by ID
        this.spriteCounter = 0; // For unique IDs
    }

    // Spawn multiple sprites of a given type
    spawnSprites({
        spriteType, // e.g., "enemy", "item"
        image, // Image or array of images for animation
        positions, // Array of { x, z } world positions
        layer = LAYERS.MIDGROUND,
        scaleFactor = 0.5,
        aspectRatio = 1,
        baseWidthRatio = 0.25,
        baseHeightRatio = 0.25,
        baseYRatio = 0.5,
        renderFunction, // Optional custom render function
        mapKeys, // Maps to add these sprites to
        extraProps = {} // Additional sprite-specific properties
    }) {
        const sprites = [];
        for (const pos of positions) {
            const spriteId = `${spriteType}_${this.spriteCounter++}`;
            const sprite = new Sprite({
                id: spriteId,
                image,
                worldPos: { x: pos.x * tileSectors, z: pos.z * tileSectors },
                isLoaded: !!image, // Assume loaded if image provided
                layer,
                scaleFactor,
                aspectRatio,
                baseWidthRatio,
                baseHeightRatio,
                baseYRatio,
                renderFunction: renderFunction || this.defaultRender.bind(this),
                ...extraProps
            });
            this.dynamicSprites.set(spriteId, sprite);
            sprites.push(sprite);
        }

        // Register sprites for specified maps
        for (const mapKey of mapKeys) {
            sprites.forEach(sprite => spriteManager.addSprite(sprite, mapKey));
        }

        return sprites.map(sprite => sprite.id); // Return IDs for tracking
    }

    // Default render function for dynamic sprites
    defaultRender(rayData, renderEngine) {
        if (!this.isLoaded || !this.image || !this.worldPos) return null;
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

    // Update sprite properties (e.g., position for moving enemies)
    updateSprite(spriteId, updates) {
        const sprite = this.dynamicSprites.get(spriteId);
        if (sprite) {
            Object.assign(sprite, updates);
            // Update world position in SpriteManager if changed
            if (updates.worldPos) {
                spriteManager.sprites.set(spriteId, sprite);
                // Re-sync layers if needed
                if (spriteManager.currentMapKey) {
                    spriteManager.loadSpritesForMap(spriteManager.currentMapKey);
                }
            }
        }
    }

    // Remove a dynamic sprite
    removeSprite(spriteId, mapKey) {
        this.dynamicSprites.delete(spriteId);
        // Remove from SpriteManager's map-specific list
        const mapSprites = spriteManager.mapSprites.get(mapKey) || [];
        spriteManager.mapSprites.set(mapKey, mapSprites.filter(sprite => sprite.id !== spriteId));
        // Reload sprites for current map
        if (spriteManager.currentMapKey === mapKey) {
            spriteManager.loadSpritesForMap(mapKey);
        }
    }
}

export const dynamicSpriteHandler = new DynamicSpriteHandler();