import { playerPosition } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";
import { corpse1WorldPos, metalPipeWorldPos } from "../rendering/sprites/rendersprites.js";
import { drawMetalPipePickupBox, drawRustyKeyPickupBox } from "../menus/overlays.js";
import { metalPipeSprite } from "../rendering/sprites/spritetextures.js";

const spriteRadius = 60;
let rustyKeyPickupBoxShown = false;
let metalPipePickupBoxShown = false;
let lastCorpseTState = false;
let metalPipeTState = false;
export let playerMovementDisabled = false; // Exported for playerlogic.js

export function corpseSpriteRustyKeyInteraction() {
    const dx = playerPosition.x - corpse1WorldPos.x;
    const dz = playerPosition.z - corpse1WorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Toggle pickup box display with 'T' key
    if (keys.t && !lastCorpseTState && distance < spriteRadius) {
        rustyKeyPickupBoxShown = !rustyKeyPickupBoxShown;
        playerMovementDisabled = rustyKeyPickupBoxShown; // Disable movement when box is shown, enable when closed
        if (rustyKeyPickupBoxShown && !playerInventory.includes("rusty_key") && distance < spriteRadius) {
            playerInventory.push("rusty_key");
            console.log("You picked up the rusty key! *giggles*");
        } else if (playerInventory.includes("rusty_key")) {
            rustyKeyPickupBoxShown = false;
            playerMovementDisabled = false; // Ensure movement is re-enabled if key is already picked up
        }
    }
    lastCorpseTState = keys.t;

    // Draw the pickup box if it should be shown
    if (rustyKeyPickupBoxShown) {
        drawRustyKeyPickupBox();
    }
}

// game_engine/interactions/interactionlogic.js
export function metalPipeSpriteInteraction() {
    const dx = playerPosition.x - metalPipeWorldPos.x;
    const dz = playerPosition.z - metalPipeWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Toggle pickup box display with 'T' key
    if (keys.t && !metalPipeTState && distance < spriteRadius) {
        metalPipePickupBoxShown = !metalPipePickupBoxShown;
        playerMovementDisabled = metalPipePickupBoxShown; // Disable movement when box is shown
        if (metalPipePickupBoxShown && !playerInventory.includes("metal_pipe") && distance < spriteRadius) {
            playerInventory.push("metal_pipe");
            console.log("Yay, I picked up the metal pipe! *giggles* It’s kinda heavy, but Cheese thinks it’s cool!");
        } else if (playerInventory.includes("metal_pipe")) {
            metalPipePickupBoxShown = false;
            playerMovementDisabled = false; // Re-enable movement if already picked up
            console.log("Oh, I already have the metal pipe, Cheese! *smiles* Let’s keep exploring!");
        }
    }
    metalPipeTState = keys.t;

    // Draw the pickup box if it should be shown
    if (metalPipePickupBoxShown) {
        drawMetalPipePickupBox();
    }
}