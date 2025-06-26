import { tileSectors } from "../mapdata/maps.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { emptyTile } from "../mapdata/maptextures.js";

const STAIR_COUNT = 5;
const STEP_WIDTH = tileSectors / STAIR_COUNT;
const STEP_HEIGHT = 5;
const CEILING_HEIGHT = 100;

export function stairBuilderGodFunction(mapName = "map_01", tileX = 2, tileY = 4) {
    console.log(`Building stairs in ${mapName} at tile (${tileX}, ${tileY}) *twirls*`);

    const stairSectors = [];
    const sectorData = Array(1).fill().map(() => Array(STAIR_COUNT).fill(emptyTile));

    for (let i = 0; i < STAIR_COUNT; i++) {
        const floorHeight = i * STEP_HEIGHT;
        sectorData[0][i] = {
            ...emptyTile,
            floorHeight,
            isStep: true,
            floorTextureId: 50,
            ceilingTextureId: 1
        };
    }

    const stairSector = {
        id: `stair_${tileX}_${tileY}`,
        data: sectorData,
        startX: tileX,
        startY: tileY,
        width: STAIR_COUNT,
        height: 1,
        floorHeight: 0,
        ceilingHeight: CEILING_HEIGHT
    };

    stairSectors.push(stairSector);
    mapHandler.addStairSectors(mapName, stairSectors);
    console.log(`Added ${stairSectors.length} stair sector to ${mapName} *giggles*`);
}