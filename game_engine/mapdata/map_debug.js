import {
    fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye,
    fullTileBrickGraffiti01, fullTileLaughingDemon, fullTileBrickDoor01Closed, fullTileBrickDoor01Open
} from './maptextures.js';

// Debug sector (10x10 square room)
export const map_debug_sector1 = [
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
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

// Core grid setup
const mapDebugHeight = map_debug_sectors[0].height;
const mapDebugWidth = map_debug_sectors[0].width;
export const map_debug = Array(mapDebugHeight).fill().map(() => Array(mapDebugWidth).fill(emptyTile));
map_debug_sectors.forEach(({ data, startY, startX }) => {
    for (let y = 0; y < data.length; y++) {
        for (let x = 0; x < data[0].length; x++) {
            map_debug[startY + y][startX + x] = data[y][x];
        }
    }
});

// Map metadata with floor texture
export const map_debug_data = {
    grid: map_debug,
    sectors: map_debug_sectors,
    floorTextureId: 51 // floor_test (uses creamlol.png)
};