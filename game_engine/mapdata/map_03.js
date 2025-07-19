// game_engine/mapdata/map_03_data.js
import { fullTile, emptyTile, fullTileSchizoEye } from './maptexturesloader.js';
import { buildMapGrid } from './maputils.js';

// Test map sector (8x8 square room)
export const map_03_sector1 = [
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
export const map_03_sectors = [
    {
        id: "03_sector1",
        data: map_03_sector1,
        startX: 0,
        startY: 0,
        width: map_03_sector1[0].length,
        height: map_03_sector1.length
    }
];

// Core grid setup
export const map_03 = buildMapGrid(map_03_sectors);

// Map metadata with floor texture
export const map_03_data = {
    grid: map_03,
    sectors: map_03_sectors,
    floorTextureId: 50 // floor_concrete
};