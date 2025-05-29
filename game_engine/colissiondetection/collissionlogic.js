import { playerPosition, previousPosition } from "../playerdata/playerlogic.js";
import { tileSectors } from "../mapdata/maps.js";
import { spriteState, metalPipeWorldPos } from "../rendersprites.js";
import { playerInventory } from "../playerdata/playerinventory.js";
import { map_01 } from "../mapdata/map_01.js";

export function collissionGodFunction() {
    simpleCollissionTest();
    wallCollision();
}

function simpleCollissionTest() {
    if (spriteState.isMetalPipeCollected) return;

    const dx = metalPipeWorldPos.x - playerPosition.x;
    const dz = metalPipeWorldPos.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const pickupDistance = 50;

    if (distance <= pickupDistance && !playerInventory.includes("metal_pipe")) {
        playerInventory.push("metal_pipe");
        spriteState.isMetalPipeCollected = true;
        console.log("Picked up metal pipe! Inventory:", playerInventory);
    }
}

function wallCollision() {
    const mapWidth = map_01[0].length;
    const mapHeight = map_01.length;
    const playerRadius = 10; // Increased for stability
    const buffer = 0.1; // Slightly larger to prevent sticking
    const epsilon = 0.01;

    // Store proposed position
    const proposedX = playerPosition.x;
    const proposedZ = playerPosition.z;
    const deltaX = proposedX - previousPosition.x;
    const deltaZ = proposedZ - previousPosition.z;

    let newX = proposedX;
    let newZ = proposedZ;
    let collision = false;

    // Check tiles in a small radius around the player
    const xMin = Math.floor((proposedX - playerRadius - epsilon) / tileSectors);
    const xMax = Math.floor((proposedX + playerRadius + epsilon) / tileSectors);
    const zMin = Math.floor((proposedZ - playerRadius - epsilon) / tileSectors);
    const zMax = Math.floor((proposedZ + playerRadius + epsilon) / tileSectors);

    const normalX = { value: 0 };
    const normalZ = { value: 0 };

    for (let x = xMin; x <= xMax; x++) {
        for (let z = zMin; z <= zMax; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
                if (tile.type !== "wall") continue;

                const tileLeft = x * tileSectors;
                const tileRight = (x + 1) * tileSectors;
                const tileTop = z * tileSectors;
                const tileBottom = (z + 1) * tileSectors;

                // Check if player overlaps with tile
                const closestX = Math.max(tileLeft, Math.min(proposedX, tileRight));
                const closestZ = Math.max(tileTop, Math.min(proposedZ, tileBottom));
                const dx = proposedX - closestX;
                const dz = proposedZ - closestZ;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance < playerRadius + epsilon) {
                    collision = true;
                    // Calculate penetration depth
                    const overlap = playerRadius - distance;
                    if (distance > 0) {
                        normalX.value += dx / distance;
                        normalZ.value += dz / distance;
                    } else {
                        // Player is exactly on the wall, push away along movement direction
                        normalX.value += deltaX !== 0 ? -Math.sign(deltaX) : 0;
                        normalZ.value += deltaZ !== 0 ? -Math.sign(deltaZ) : 0;
                    }
                }
            }
        }
    }

    if (collision) {
        // Normalize the collision normal
        const normalLength = Math.sqrt(normalX.value * normalX.value + normalZ.value * normalZ.value);
        if (normalLength > 0) {
            normalX.value /= normalLength;
            normalZ.value /= normalLength;
        }

        // Push player out of the wall
        const penetrationDepth = playerRadius + buffer;
        newX += normalX.value * penetrationDepth;
        newZ += normalZ.value * penetrationDepth;

        // Slide along the wall
        const dot = deltaX * normalX.value + deltaZ * normalZ.value;
        const slideX = deltaX - dot * normalX.value;
        const slideZ = deltaZ - dot * normalZ.value;
        newX += slideX;
        newZ += slideZ;

        console.log(`Collision: Adjusted to x=${newX.toFixed(2)}, z=${newZ.toFixed(2)}, Normal=(${normalX.value.toFixed(2)}, ${normalZ.value.toFixed(2)}), Slide=(${slideX.toFixed(2)}, ${slideZ.toFixed(2)})`);
    }

    // Update position
    playerPosition.x = newX;
    playerPosition.z = newZ;

    // Update previous position for next frame
    previousPosition.x = newX;
    previousPosition.z = newZ;
}