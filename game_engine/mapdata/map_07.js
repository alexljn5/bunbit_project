// game_engine/mapdata/map_07_data.js
import { fullTile, emptyTile, fullTileSchizoEye } from './maptexturesloader.js';
import { buildMapGrid } from './maputils.js';

// Test map sector (8x8 square room)
export const map_07_sector1 = [
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
export const map_07_sectors = [
    {
        id: "07_sector1",
        data: map_07_sector1,
        startX: 0,
        startY: 0,
        width: map_07_sector1[0].length,
        height: map_07_sector1.length
    }
];

// Core grid setup
export const map_07 = buildMapGrid(map_07_sectors);

// Map metadata with floor texture
export const map_07_data = {
    grid: map_07,
    sectors: map_07_sectors,
    floorTextureId: 50 // floor_concrete
};