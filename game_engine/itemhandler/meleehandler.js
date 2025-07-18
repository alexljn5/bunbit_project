import { playerInventory, inventoryState } from "../playerdata/playerinventory.js";
import { keys, playerPosition } from "../playerdata/playerlogic.js";
import { placeholderAIHealth } from "../ai/placeholderai.js";
import { map_01 } from "../mapdata/map_01.js";
import { tileSectors } from "../mapdata/maps.js";
import { isOccludedByWall } from "../ai/aihandler.js";
import { placeholderAISpriteWorldPos } from "../rendering/sprites/rendersprites.js";
import { playMetalSwingSound } from "../audio/soundhandler.js";

const meleeDamage = 10; // Base damage for metal pipe
const meleeRange = 30; // Melee attack range
let lastAttackTime = 0; // Cooldown tracker
const attackCooldown = 2000; // 2 seconds between attacks

function metalPipeHandler() {
    if (!keys[" "] || playerInventory[inventoryState.selectedInventoryIndex] !== "metal_pipe") {
        return;
    }

    const now = performance.now();
    if (now - lastAttackTime < attackCooldown) {
        return;
    }
    playMetalSwingSound();
    // Check for nearby enemies (e.g., placeholderAI)
    const dx = playerPosition.x - placeholderAISpriteWorldPos.x;
    const dz = playerPosition.z - placeholderAISpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check occlusion and range
    const isOccluded = isOccludedByWall(
        playerPosition.x, playerPosition.z,
        placeholderAISpriteWorldPos.x, placeholderAISpriteWorldPos.z,
        map_01, tileSectors
    );

    if (distance < meleeRange && !isOccluded && placeholderAIHealth > 0) {
        //setPlaceholderAIHealth(placeholderAIHealth - meleeDamage);
        console.log(`Hit Placeholder AI with metal pipe! Health: ${placeholderAIHealth}`);
        lastAttackTime = now;
    }

    keys[" "] = false; // Reset space key to prevent continuous firing
}

export function meleeHandlerGodFunction() {
    metalPipeHandler();
}
