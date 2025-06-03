import { playerPosition, previousPosition } from "../playerdata/playerlogic.js";
import { tileSectors } from "../mapdata/maps.js";
import { spriteState, metalPipeWorldPos, nineMMAmmoSpriteWorldPos, nineMMAmmoSprite } from "../rendersprites.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { map_01 } from "../mapdata/map_01.js";
import { genericGunAmmo, setGenericGunAmmo } from "../itemhandler/gunhandler.js"; // Import the setter

export function simpleCollissionTest() {
    if (spriteState.isMetalPipeCollected) return;

    const dx = metalPipeWorldPos.x - playerPosition.x;
    const dz = metalPipeWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const pickupDistance = 50;

    if (distance <= pickupDistance && !playerInventory.includes("metal_pipe")) {
        playerInventory.push("metal_pipe");
        spriteState.isMetalPipeCollected = true;
    }
}

export function nineMMAmmoCollission() {
    if (spriteState.isNineMmAmmoCollected) return;

    const dx = nineMMAmmoSpriteWorldPos.x - playerPosition.x;
    const dz = nineMMAmmoSpriteWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const pickupDistance = 20;
    playerInventory.push("9mm_ammo_box");
    if (distance <= pickupDistance && playerInventory.includes("9mm_ammo_box")) {
        spriteState.isNineMmAmmoCollected = true;
        setGenericGunAmmo(10);
        console.log("Ammo picked up! Inventory:", playerInventory);
    }
}