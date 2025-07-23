import { playerPosition } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";
import { corpse1WorldPos } from "../rendering/sprites/rendersprites.js";
import { drawRustyKeyPickupBox } from "../menus/overlays.js";

const spriteRadius = 60;
let showPickupBox = false;
let lastTState = false;
export let playerMovementDisabled = false; // Exported for playerlogic.js

export function corpseSpriteRustyKeyInteraction() {
    const dx = playerPosition.x - corpse1WorldPos.x;
    const dz = playerPosition.z - corpse1WorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Toggle pickup box display with 'T' key
    if (keys.t && !lastTState && distance < spriteRadius) {
        showPickupBox = !showPickupBox;
        playerMovementDisabled = showPickupBox; // Disable movement when box is shown, enable when closed
        if (showPickupBox && !playerInventory.includes("rusty_key") && distance < spriteRadius) {
            playerInventory.push("rusty_key");
            console.log("You picked up the rusty key! *giggles*");
        } else if (playerInventory.includes("rusty_key")) {
            showPickupBox = false;
            playerMovementDisabled = false; // Ensure movement is re-enabled if key is already picked up
        }
    }
    lastTState = keys.t;

    // Draw the pickup box if it should be shown
    if (showPickupBox) {
        drawRustyKeyPickupBox();
    }
}