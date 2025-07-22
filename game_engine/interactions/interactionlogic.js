import { playerPosition } from "../playerdata/playerlogic.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { keys } from "../playerdata/playerlogic.js";
import { corpse1WorldPos } from "../rendering/sprites/rendersprites.js";

const spriteRadius = 30;

export function corpseSpriteRustyKeyInteraction(sprite) {
    const dx = playerPosition.x - corpse1WorldPos.x;
    const dz = playerPosition.z - corpse1WorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (!keys.t) {
        return;
    }
    if (keys.t && playerInventory.includes("rusty_key")) {
        console.log("You already have the rusty key!");
        return;
    }
    if (keys.t && !playerInventory.includes("rusty_key") && distance < spriteRadius) {
        playerInventory.push("rusty_key");
        console.log("You picked up the rusty key!");
        keys.t = false; // Reset the key state
    }
}
