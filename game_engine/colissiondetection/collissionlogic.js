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
    const playerRadius = 10;
    const buffer = 0.1; // Small buffer to prevent sticking

    // Calculate movement delta
    const deltaX = playerPosition.x - previousPosition.x;
    const deltaZ = playerPosition.z - previousPosition.z;

    // Get map cells for the player's bounding circle
    const minX = Math.floor((playerPosition.x - playerRadius) / tileSectors);
    const maxX = Math.floor((playerPosition.x + playerRadius) / tileSectors);
    const minZ = Math.floor((playerPosition.z - playerRadius) / tileSectors);
    const maxZ = Math.floor((playerPosition.z + playerRadius) / tileSectors);

    let newX = playerPosition.x;
    let newZ = playerPosition.z;
    let collisionX = false;
    let collisionZ = false;

    // Check for wall collisions
    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
                if (tile.type === "wall") {
                    const tileLeft = x * tileSectors;
                    const tileRight = (x + 1) * tileSectors;
                    const tileTop = z * tileSectors;
                    const tileBottom = (z + 1) * tileSectors;

                    // X-axis collision
                    if (deltaX > 0 && playerPosition.x + playerRadius > tileLeft && previousPosition.x + playerRadius <= tileLeft) {
                        newX = tileLeft - playerRadius - buffer;
                        collisionX = true;
                    } else if (deltaX < 0 && playerPosition.x - playerRadius < tileRight && previousPosition.x - playerRadius >= tileRight) {
                        newX = tileRight + playerRadius + buffer;
                        collisionX = true;
                    }

                    // Z-axis collision
                    if (deltaZ > 0 && playerPosition.z + playerRadius > tileTop && previousPosition.z + playerRadius <= tileTop) {
                        newZ = tileTop - playerRadius - buffer;
                        collisionZ = true;
                    } else if (deltaZ < 0 && playerPosition.z - playerRadius < tileBottom && previousPosition.z - playerRadius >= tileBottom) {
                        newZ = tileBottom + playerRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    // Apply collision response
    if (collisionX || collisionZ) {
        console.log(`Collision: X=${collisionX}, Z=${collisionZ}, Adjust to: x=${newX.toFixed(2)}, z=${newZ.toFixed(2)}`);
        playerPosition.x = collisionX ? newX : playerPosition.x;
        playerPosition.z = collisionZ ? newZ : playerPosition.z;
    }
}