// game_engine/mapdata/map_06_data.js
import { fullTile, emptyTile, fullTileSchizoEye } from './maptexturesloader.js';
import { buildMapGrid } from './maputils.js';

// Test map sector (8x8 square room)
export const map_06_sector1 = [
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, fullTileSchizoEye, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile]
];

// Test map sector metadata
export const map_06_sectors = [
    {
        id: "06_sector1",
        data: map_06_sector1,
        startX: 0,
        startY: 0,
        width: map_06_sector1[0].length,
        height: map_06_sector1.length
    }
];

// Core grid setup
export const map_06 = buildMapGrid(map_06_sectors);

// Map metadata with floor texture
export const map_06_data = {
    grid: map_06,
    sectors: map_06_sectors,
    floorTextureId: 50 // floor_concrete
};