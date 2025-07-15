// game_engine/mapdata/map_test_data.js
import { fullTile, emptyTile, fullTileSchizoEye } from './maptextures.js';
import { buildMapGrid } from './maputils.js';

// Test map sector (8x8 square room)
export const map_test_sector1 = [
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
export const map_test_sectors = [
    {
        id: "test_sector1",
        data: map_test_sector1,
        startX: 0,
        startY: 0,
        width: map_test_sector1[0].length,
        height: map_test_sector1.length
    }
];

// Core grid setup
export const map_test = buildMapGrid(map_test_sectors);

// Map metadata with floor texture
export const map_test_data = {
    grid: map_test,
    sectors: map_test_sectors,
    floorTextureId: 50 // floor_concrete
};