// game_engine/playerdata/collisionlogic.js
// Handles collision checks for item pickups, ensuring they only occur on maps where sprites are loaded.

import { playerPosition, previousPosition } from "../playerdata/playerlogic.js";
import { spriteState, spriteManager } from "../rendering/sprites/rendersprites.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { setGenericGunAmmo, genericGunAmmo } from "../itemhandler/guns/genericgun.js";

export function simpleCollissionTest() {
    // Check if metalPipe sprite is loaded for the current map
    const metalPipeSprite = spriteManager.getSprite("metalPipe");
    const dx = metalPipeSprite ? metalPipeSprite.worldPos.x - playerPosition.x : null;
    const dz = metalPipeSprite ? metalPipeSprite.worldPos.z - playerPosition.z : null;
    const distance = dx && dz ? Math.sqrt(dx * dx + dz * dz) : null;
    // Debug log with detailed coordinates
    console.log("MetalPipe Collision Check:", {
        currentMapKey: spriteManager.currentMapKey,
        hasSprite: !!metalPipeSprite,
        isLoaded: metalPipeSprite?.isLoaded,
        isCollected: spriteState.isMetalPipeCollected,
        worldPos: metalPipeSprite?.worldPos,
        playerPos: playerPosition,
        distance,
        canPickup: distance !== null && distance <= 100 && !playerInventory.includes("metal_pipe")
    });
    if (!metalPipeSprite || spriteState.isMetalPipeCollected) {
        if (metalPipeSprite && !metalPipeSprite.isLoaded) {
            console.warn("MetalPipe sprite is rendering but isLoaded is false. Check image path or onload handler in rendersprites.js.");
        }
        return;
    }

    const pickupDistance = 100; // Increased to test map_debug

    if (distance <= pickupDistance && !playerInventory.includes("metal_pipe")) {
        console.log("Picking up metal_pipe on", spriteManager.currentMapKey);
        playerInventory.push("metal_pipe");
        spriteState.isMetalPipeCollected = true;
    }
}

export function nineMMAmmoCollission() {
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
    if (!nineMMAmmoSprite || spriteState.isNineMmAmmoCollected) {
        if (nineMMAmmoSprite && !nineMMAmmoSprite.isLoaded) {
            console.warn("NineMMAmmo sprite is rendering but isLoaded is false. Check image path or onload handler in rendersprites.js.");
        }
        return;
    }

    const pickupDistance = 100; // Increased to test map_debug

    if (distance <= pickupDistance) {
        console.log("Picking up 9mm ammo on", spriteManager.currentMapKey);
        setGenericGunAmmo(genericGunAmmo + 5);
        spriteState.isNineMmAmmoCollected = true;
    }
}