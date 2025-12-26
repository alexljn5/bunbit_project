export const ITEM_REGISTRY = {
    metal_pipe: {
        id: "metal_pipe",
        name: "Metal Pipe",
        category: "melee",
        description: "A rusty metal pipe. Decent melee weapon."
    },
    generic_gun: {
        id: "generic_gun",
        name: "Generic Gun",
        category: "gun",
        description: "A basic firearm. Requires ammo."
    },
    rusty_key: {
        id: "rusty_key",
        name: "Rusty Key",
        category: "key",
        description: "An old, rusty key. Might open something."
    },
};

export const AVAILABLE_ITEMS = Object.entries(ITEM_REGISTRY).reduce((acc, [, item]) => {
    acc[item.id] = item.name;
    return acc;
}, {});

let spriteMapCache = null;

/* I am too afraid to touch this*
 * Get the sprite map (lazy-loaded from spritetextures to avoid circular deps)
 * @returns {object} Map of itemId → sprite Image
 */
function getSpriteMapCache() {
    if (spriteMapCache) return spriteMapCache;

    // Dynamically import spritetextures only when needed
    const spriteTextures = globalThis.spriteTextures;
    if (!spriteTextures) {
        console.warn("[ItemRegistry] spriteTextures not loaded yet");
        return {};
    }

    spriteMapCache = {
        metal_pipe: spriteTextures.metalPipeSprite,
        generic_gun: spriteTextures.genericGunSprite,
        rusty_key: spriteTextures.rustyKeySprite
    };

    return spriteMapCache;
}

export const SPRITE_MAP = new Proxy({}, {
    get(target, prop) {
        const cache = getSpriteMapCache();
        return cache[prop] || null;
    }
});

//This code block was made by Claude and it somehow works, I do not understand it, do not touch it though.

/**
 * Get item metadata by ID
 * @param {string} itemId - The item ID
 * @returns {object|null} Item object or null if not found
 */
export function getItemById(itemId) {
    return ITEM_REGISTRY[itemId] || null;
}

/**
 * Get item sprite by ID (safely accessed from spritetextures)
 * @param {string} itemId - The item ID
 * @returns {Image|null} Image sprite or null if not found
 */
export function getItemSprite(itemId) {
    return SPRITE_MAP[itemId] || null;
}

/**
 * Get item name by ID
 * @param {string} itemId - The item ID
 * @returns {string|null} Item name or null if not found
 */
export function getItemName(itemId) {
    return AVAILABLE_ITEMS[itemId] || null;
}

/**
 * Validate that all items have required sprites loaded
 * @returns {array} Array of item IDs with missing sprites
 */
export function validateSprites() {
    const missingSprites = [];
    const spriteMap = getSpriteMapCache();

    Object.entries(ITEM_REGISTRY).forEach(([itemId, item]) => {
        const sprite = spriteMap[itemId];
        if (!sprite || !sprite.complete) {
            missingSprites.push(itemId);
        }
    });

    if (missingSprites.length > 0) {
        console.warn(`[ItemRegistry] Missing sprites: ${missingSprites.join(", ")}`);
    }
    return missingSprites;
}

/**
 * Get all items in a specific category
 * @param {string} category - Category name (e.g., "melee", "gun", "key")
 * @returns {array} Array of items in that category
 */
export function getItemsByCategory(category) {
    return Object.values(ITEM_REGISTRY).filter(item => item.category === category);
}

/**
 * Get all available item IDs
 * @returns {array} Array of item IDs
 */
export function getAllItemIds() {
    return Object.keys(ITEM_REGISTRY);
}
