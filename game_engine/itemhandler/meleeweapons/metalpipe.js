import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { keys, playerPosition } from "../../playerdata/playerlogic.js";
import { map_01 } from "../../mapdata/map_01.js";
import { tileSectors } from "../../mapdata/maps.js";
import { isOccludedByWall } from "../../ai/aihandler.js";
import { spriteManager } from "../../rendering/sprites/rendersprites.js";
import { playMetalSwingSound } from "../../audio/soundhandler.js";
import { placeholderAIHealths } from "../../ai/airegistry.js";

let lastAttackTime = 0; // Cooldown tracker
const attackCooldown = 200; // 2 seconds between attacks

export function metalPipeHandler() {
    if (!keys[" "] || playerInventory[inventoryState.selectedInventoryIndex] !== "metal_pipe") {
        return;
    }

    const now = performance.now();
    if (now - lastAttackTime < attackCooldown) {
        return;
    }
    playMetalSwingSound();
    lastAttackTime = now;
    // Check for nearby enemies (e.g., placeholderAI)
    const sprite = spriteManager.getSprite("placeholderAI");
    if (sprite?.worldPos) {
        const dx = playerPosition.x - sprite.worldPos.x;
        const dz = playerPosition.z - sprite.worldPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        // Add melee hit detection logic here
    }

    keys[" "] = false; // Reset space key to prevent continuous firing
}

export function meleeHandlerGodFunction() {
    metalPipeHandler();
}
