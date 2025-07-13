import {
    fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye,
    fullTileBrickGraffiti01, fullTileLaughingDemon, fullTileBrickDoor01Closed, fullTileBrickDoor01Open
} from './maptextures.js';
import { buildMapGrid } from './maputils.js';

// Debug sector (16x16 square room)
export const map_debug_sector1 = [
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileSchizoEye, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileSchizoEye, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, fullTileLaughingDemon, emptyTile, emptyTile, fullTileSchizoEye, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileSchizoEye, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileSchizoEye, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, fullTile, fullTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, fullTile, fullTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTile, emptyTile, emptyTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, emptyTile, emptyTile, fullTile],
];

// Debug sector metadata
export const map_debug_sectors = [
    {
        id: "debug_sector1",
        data: map_debug_sector1,
        startX: 0,
        startY: 0,
        width: map_debug_sector1[0].length,
        height: map_debug_sector1.length
    }
];

// Core grid setup using global function
export const map_debug = buildMapGrid(map_debug_sectors);

// Map metadata with floor texture
export const map_debug_data = {
    grid: map_debug,
    sectors: map_debug_sectors,
    floorTextureId: 51 // floor_test (uses creamlol.png)
};