import { playerPosition, previousPosition } from "../playerdata/playerlogic.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { spriteState } from "../rendering/sprites/spritetextures.js";
import { genericGunAmmo, setGenericGunAmmo } from "../itemhandler/guns/gunregistry.js";
import { LAYERS } from "../rendering/sprites/rendersprites.js";
import { drawMetalPipePickupBox } from "../menus/overlays.js";
import { keys } from "../playerdata/playerlogic.js";
import { metalPipeSpriteInteraction } from "../interactions/interactionlogic.js";

export function simpleCollissionTest() {
    // Detailed sprite debug info
    console.debug("MetalPipe collision check - Sprite state:", {
        spriteManager: !!spriteManager,
        instanceId: spriteManager?.instanceId,
        currentMap: spriteManager.currentMapKey,
        spritesInCurrentMap: spriteManager.sprites.size,
        layerInfo: {
            background: spriteManager.layers[LAYERS.BACKGROUND].length,
            midground: spriteManager.layers[LAYERS.MIDGROUND].length,
            foreground: spriteManager.layers[LAYERS.FOREGROUND].length
        },
        metalPipeSpriteDetails: spriteManager.getSprite("metalPipe"),
        hasRemoveSprite: typeof spriteManager.removeSprite === 'function'
    });

    // Check if metalPipe sprite is loaded for the current map
    const metalPipeSprite = spriteManager.getSprite("metalPipe");
    if (!metalPipeSprite || !metalPipeSprite.worldPos) {
        console.debug("MetalPipe sprite not available or missing worldPos in map:", spriteManager.currentMapKey);
        return;
    }

    const dx = metalPipeSprite.worldPos.x - playerPosition.x;
    const dz = metalPipeSprite.worldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Debug log with detailed coordinates
    console.log("MetalPipe Collision Check:", {
        currentMapKey: spriteManager.currentMapKey,
        hasSprite: !!metalPipeSprite,
        isLoaded: metalPipeSprite?.isLoaded,
        isCollected: spriteState.isMetalPipeCollected,
        spriteWorldPos: metalPipeSprite.worldPos,
        playerPos: playerPosition,
        distance,
        canPickup: distance <= 100 && !playerInventory.includes("metal_pipe"),
        tKeyPressed: keys.t
    });

    // If the item is already collected, just return
    if (spriteState.isMetalPipeCollected) {
        return;
    }

    const pickupDistance = 100;

    // Show pickup box if player is close enough or presses 'T' and hasn't picked up the item
    if (distance <= pickupDistance && !playerInventory.includes("metal_pipe")) {
        console.log("Player near metal pipe on", spriteManager.currentMapKey);
        drawMetalPipePickupBox(); // Show prompt automatically
        if (keys.t) {
            metalPipeSpriteInteraction(); // Handle pickup logic
        }
    }
}

export function nineMMAmmoCollission() {
    // Detailed sprite debug info
    console.debug("9mmAmmo collision check - Sprite state:", {
        spriteManager: !!spriteManager,
        instanceId: spriteManager?.instanceId,
        currentMap: spriteManager.currentMapKey,
        spritesInCurrentMap: spriteManager.sprites.size,
        layerInfo: {
            background: spriteManager.layers[LAYERS.BACKGROUND].length,
            midground: spriteManager.layers[LAYERS.MIDGROUND].length,
            foreground: spriteManager.layers[LAYERS.FOREGROUND].length
        }
    });

    // Check if nineMMAmmo sprite is loaded for the current map
    const nineMMAmmoSprite = spriteManager.getSprite("nineMMAmmo");
    const dx = nineMMAmmoSprite ? nineMMAmmoSprite.worldPos.x - playerPosition.x : null;
    const dz = nineMMAmmoSprite ? nineMMAmmoSprite.worldPos.z - playerPosition.z : null;
    const distance = dx && dz ? Math.sqrt(dx * dx + dz * dz) : null;
    // Debug log with detailed coordinates
    console.log("NineMMAmmo Collision Check:", {
        currentMapKey: spriteManager.currentMapKey,
        hasSprite: !!nineMMAmmoSprite,
        isLoaded: nineMMAmmoSprite?.isLoaded,
        isCollected: spriteState.isNineMmAmmoCollected,
        worldPos: nineMMAmmoSprite?.worldPos,
        playerPos: playerPosition,
        distance,
        canPickup: distance !== null && distance <= 100
    });
    // If the item is already collected, just return without warning
    if (spriteState.isNineMmAmmoCollected) {
        return;
    }

    // Only check if sprite exists and has position
    if (!nineMMAmmoSprite || !nineMMAmmoSprite.worldPos) {
        console.debug("9mm Ammo sprite not available in this map");
        return;
    }

    const pickupDistance = 100;

    if (distance <= pickupDistance) {
        console.log("Picking up 9mm ammo on", spriteManager.currentMapKey);
        setGenericGunAmmo(genericGunAmmo.current + 5);
        spriteState.isNineMmAmmoCollected = true;
    }
}