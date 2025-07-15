import { playerPosition, previousPosition } from "../playerdata/playerlogic.js";
import { spriteState, metalPipeWorldPos, nineMMAmmoSpriteWorldPos, nineMMAmmoSprite } from "../rendering/rendersprites.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { setGenericGunAmmo, genericGunAmmo } from "../itemhandler/guns/genericgun.js";

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

    const pickupDistance = 50;

    if (distance <= pickupDistance) {

        setGenericGunAmmo(genericGunAmmo + 5);
        spriteState.isNineMmAmmoCollected = true;
    }
}




