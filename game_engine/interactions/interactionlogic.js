import { playerPosition } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";
import { corpse1WorldPos } from "../rendering/sprites/rendersprites.js";
import { drawMetalPipePickupBox, drawRustyKeyPickupBox } from "../menus/overlays.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { spriteState } from "../rendering/sprites/spritetextures.js";

const spriteRadius = 100; // Match nineMMAmmoCollission and simpleCollissionTest
let rustyKeyPickupBoxShown = false;
let metalPipePickupBoxShown = false;
let lastCorpseTState = false;
let lastMetalPipeTState = false;
export let playerMovementDisabled = false; // Exported for playerlogic.js

export function corpseSpriteRustyKeyInteraction() {
    const dx = playerPosition.x - corpse1WorldPos.x;
    const dz = playerPosition.z - corpse1WorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Show pickup box and handle pickup with 'T' key
    if (distance < spriteRadius && !playerInventory.includes("rusty_key")) {
        drawRustyKeyPickupBox();
        if (keys.t && !lastCorpseTState) {
            playerInventory.push("rusty_key");
            rustyKeyPickupBoxShown = false;
            playerMovementDisabled = false;
            console.log("You picked up the rusty key! *giggles*");
        }
    }
    lastCorpseTState = keys.t;

    // Draw the pickup box if it should be shown
    if (rustyKeyPickupBoxShown) {
        drawRustyKeyPickupBox();
    }
}

export function metalPipeSpriteInteraction() {
    const metalPipeSprite = spriteManager.getSprite("metalPipe");
    if (!metalPipeSprite || !metalPipeSprite.worldPos || spriteState.isMetalPipeCollected) {
        //console.debug("MetalPipe sprite not available, missing worldPos, or already collected");
        return false;
    }

    const dx = playerPosition.x - metalPipeSprite.worldPos.x;
    const dz = playerPosition.z - metalPipeSprite.worldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Show pickup box and handle pickup with 'T' key
    if (distance < spriteRadius && !playerInventory.includes("metal_pipe")) {
        playerMovementDisabled = true;
        drawMetalPipePickupBox();
        if (keys.t && !lastMetalPipeTState) {
            playerInventory.push("metal_pipe");
            spriteState.isMetalPipeCollected = true;
            if (typeof spriteManager.removeSprite === 'function') {
                spriteManager.removeSprite("metalPipe"); // Remove sprite from rendering
                console.log("Yay, I picked up the metal pipe! *giggles* It’s kinda heavy, but Cheese thinks it’s cool!");
            } else {
                console.error("spriteManager.removeSprite is not a function. Sprite not removed.");
            }
            metalPipePickupBoxShown = false;
            playerMovementDisabled = false;
            return true;
        }
    } else if (playerInventory.includes("metal_pipe")) {
        metalPipePickupBoxShown = false;
        playerMovementDisabled = false;
        console.log("Oh, I already have the metal pipe, Cheese! *smiles* Let’s keep exploring!");
    }
    lastMetalPipeTState = keys.t;
    return false;
}