import { playerPosition } from "./playerdata/playerlogic.js";
import { tileSectors, mapTable } from "./mapdata/maps.js";
import { textureIdMap } from "./mapdata/maptextures.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./renderengine.js";

export const playerFOV = Math.PI / 6;
export const numCastRays = 500;
export const maxRayDepth = 10;

let map_01 = mapTable.get("map_01");

export function castRays() {
    const posX = playerPosition.x;
    const posZ = playerPosition.z;
    const mapWidth = map_01[0].length;
    const mapHeight = map_01.length;

    const rayData = [];

    for (let x = 0; x < numCastRays; x++) {
        const rayAngle = playerPosition.angle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);

        let distance = 0;
        let hit = false;
        let hitWallType = null;
        let rayX = posX;
        let rayY = posZ;
        let stepX, stepY, cellX, cellY;
        let hitSide = null;
        let textureKey = null;

        const cosAngle = Math.cos(rayAngle);
        const sinAngle = Math.sin(rayAngle);

        // Initialize cellX and cellY
        cellX = Math.floor(rayX / tileSectors);
        cellY = Math.floor(rayY / tileSectors);

        // Calculate initial distances to next tile boundary
        let distToNextX = cosAngle !== 0 ? ((cosAngle > 0 ? cellX + 1 : cellX) * tileSectors - rayX) / cosAngle : Infinity;
        let distToNextY = sinAngle !== 0 ? ((sinAngle > 0 ? cellY + 1 : cellY) * tileSectors - rayY) / sinAngle : Infinity;

        // Step sizes for DDA
        const deltaDistX = Math.abs(tileSectors / cosAngle) || Infinity;
        const deltaDistY = Math.abs(tileSectors / sinAngle) || Infinity;

        while (distance < maxRayDepth * tileSectors && !hit) {
            if (distToNextX < distToNextY) {
                distance = distToNextX;
                cellX += cosAngle > 0 ? 1 : -1;
                distToNextX += deltaDistX;
                hitSide = "y"; // Vertical wall
            } else {
                distance = distToNextY;
                cellY += sinAngle > 0 ? 1 : -1;
                distToNextY += deltaDistY;
                hitSide = "x"; // Horizontal wall
            }

            if (cellX >= 0 && cellX < mapWidth && cellY >= 0 && cellY < mapHeight) {
                const tile = map_01[cellY][cellX];
                if (tile.type === "wall") {
                    hit = true;
                    hitWallType = tile.type;
                    textureKey = textureIdMap.get(tile.textureId) || "wall_creamlol";
                } else if (tile.type === "empty") {
                    continue;
                }
            } else {
                break;
            }
        }

        if (hit) {
            const correctedDistance = distance * Math.cos(rayAngle - playerPosition.angle);
            let hitX = rayX + distance * cosAngle;
            let hitY = rayY + distance * sinAngle;

            // Snap hit position to tile boundary
            if (hitSide === "y") {
                hitX = (cosAngle > 0 ? cellX : cellX + 1) * tileSectors; // Adjust for ray direction
            } else {
                hitY = (sinAngle > 0 ? cellY : cellY + 1) * tileSectors;
            }

            // Debug tile boundary alignment check. Keep just in case.
            /*
            const expectedHitX = Math.round(hitX / tileSectors) * tileSectors;
            const expectedHitY = Math.round(hitY / tileSectors) * tileSectors;
            if (Math.abs(hitX - expectedHitX) > 0.01 || Math.abs(hitY - expectedHitY) > 0.01) {
                console.warn(`Ray ${x}: Hit position misaligned! HitX: ${hitX.toFixed(2)}, ExpectedX: ${expectedHitX.toFixed(2)}, HitY: ${hitY.toFixed(2)}, ExpectedY: ${expectedHitY.toFixed(2)}`);
            }
                */

            // Validate hit position
            if (isNaN(hitX) || isNaN(hitY) || Math.abs(hitX) > CANVAS_WIDTH || Math.abs(hitY) > CANVAS_WIDTH) {
                console.warn(`Ray ${x}: Invalid hit position (HitX: ${hitX}, HitY: ${hitY})`);
                rayData.push(null);
                continue;
            }

            rayData.push({
                column: x * (CANVAS_WIDTH / numCastRays),
                distance: correctedDistance,
                wallType: hitWallType,
                hitX: hitX,
                hitY: hitY,
                hitSide: hitSide,
                textureKey: textureKey
            });
        } else {
            rayData.push(null);
        }
    }

    return rayData;
}