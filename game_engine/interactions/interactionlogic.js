import { playerPosition } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";
import { corpse1WorldPos } from "../rendering/sprites/rendersprites.js";
import { drawRustyKeyPickupBox } from "../menus/overlays.js";

const spriteRadius = 60;
let showPickupBox = false;
let lastTState = false;


//TODO: Ensure that playermovement is disabled once the pickupbox is shown.
export function corpseSpriteRustyKeyInteraction() {
    const dx = playerPosition.x - corpse1WorldPos.x;
    const dz = playerPosition.z - corpse1WorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Toggle pickup box display with 'T' key
    if (keys.t && !lastTState && distance < spriteRadius) {
        showPickupBox = !showPickupBox;
        if (showPickupBox && !playerInventory.includes("rusty_key") && distance < spriteRadius) {
            playerInventory.push("rusty_key");
            console.log("You picked up the rusty key!");
        } else if (playerInventory.includes("rusty_key")) {
            console.log("You already have the rusty key!");
        }
    }
    lastTState = keys.t;

    // Draw the pickup box if it should be shown
    if (showPickupBox) {
        drawRustyKeyPickupBox();
    }
}
