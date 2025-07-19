// game_engine/mapdata/map_05_data.js
import { fullTile, emptyTile, fullTileSchizoEye } from './maptexturesloader.js';
import { buildMapGrid } from './maputils.js';

// Test map sector (8x8 square room)
export const map_05_sector1 = [
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
export const map_05_sectors = [
    {
        id: "05_sector1",
        data: map_05_sector1,
        startX: 0,
        startY: 0,
        width: map_05_sector1[0].length,
        height: map_05_sector1.length
    }
];

// Core grid setup
export const map_05 = buildMapGrid(map_05_sectors);

// Map metadata with floor texture
export const map_05_data = {
    grid: map_05,
    sectors: map_05_sectors,
    floorTextureId: 50 // floor_concrete
};