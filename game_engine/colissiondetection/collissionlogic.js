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
    const buffer = 0.1;

    // Calculate proposed movement
    const deltaX = playerPosition.x - previousPosition.x;
    const deltaZ = playerPosition.z - previousPosition.z;

    let proposedX = playerPosition.x;
    let proposedZ = playerPosition.z;

    // Check X-axis movement separately
    let newX = proposedX;
    let collisionX = false;
    const xMin = Math.floor((proposedX - playerRadius) / tileSectors);
    const xMax = Math.floor((proposedX + playerRadius) / tileSectors);
    const zMin = Math.floor((previousPosition.z - playerRadius) / tileSectors);
    const zMax = Math.floor((previousPosition.z + playerRadius) / tileSectors);

    for (let x = xMin; x <= xMax; x++) {
        for (let z = zMin; z <= zMax; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
                if (tile.type === "wall") {
                    const tileLeft = x * tileSectors;
                    const tileRight = (x + 1) * tileSectors;

                    if (proposedX + playerRadius > tileLeft && proposedX - playerRadius < tileRight) {
                        if (deltaX > 0) {
                            newX = tileLeft - playerRadius - buffer;
                        } else if (deltaX < 0) {
                            newX = tileRight + playerRadius + buffer;
                        }
                        collisionX = true;
                    }
                }
            }
        }
    }

    // Check Z-axis movement separately
    let newZ = proposedZ;
    let collisionZ = false;
    const zMin2 = Math.floor((proposedZ - playerRadius) / tileSectors);
    const zMax2 = Math.floor((proposedZ + playerRadius) / tileSectors);
    const xMin2 = Math.floor((newX - playerRadius) / tileSectors);
    const xMax2 = Math.floor((newX + playerRadius) / tileSectors);

    for (let x = xMin2; x <= xMax2; x++) {
        for (let z = zMin2; z <= zMax2; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
                if (tile.type === "wall") {
                    const tileTop = z * tileSectors;
                    const tileBottom = (z + 1) * tileSectors;

                    if (proposedZ + playerRadius > tileTop && proposedZ - playerRadius < tileBottom) {
                        if (deltaZ > 0) {
                            newZ = tileTop - playerRadius - buffer;
                        } else if (deltaZ < 0) {
                            newZ = tileBottom + playerRadius + buffer;
                        }
                        collisionZ = true;
                    }
                }
            }
        }
    }

    // Apply the corrected position
    if (collisionX || collisionZ) {
        console.log(`Collision: X=${collisionX}, Z=${collisionZ}, Adjusted to: x=${newX.toFixed(2)}, z=${newZ.toFixed(2)}`);
    }

    playerPosition.x = collisionX ? newX : proposedX;
    playerPosition.z = collisionZ ? newZ : proposedZ;
}
