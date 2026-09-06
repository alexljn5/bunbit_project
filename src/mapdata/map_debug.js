import {
    fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye,
    fullTileBrickGraffiti01, fullTileLaughingDemon, fullTileBrickDoor01Closed, fullTileBrickDoor01Open,
    transparentWall
} from './maptexturesloader.js';
import { buildMapGrid } from './maputils.js';
import { addMapLight } from '../rendering/lightengine/renderlight.js';

// Debug sector - extremely wide open area (64x16) with transparent border walls
// Perfect for testing skybox and transparent walls - no roof, just sky
const WIDTH = 64;
const HEIGHT = 16;
const map_debug_sector1 = Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => {
        // Border walls are transparent (invisible but block rays)
        if (y === 0 || y === HEIGHT - 1 || x === 0 || x === WIDTH - 1) {
            return transparentWall;
        }
        // Interior is completely empty
        return emptyTile;
    })
);


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

// Map metadata - no roof texture for skybox testing
export const map_debug_data = {
    grid: map_debug,
    sectors: map_debug_sectors,
    floorTextureId: 51, // floor_test (uses creamlol.png)
    noRoof: true, // Flag to skip roof rendering for this map

    lights: [
        // Soft ambient light in the center
        addMapLight([32, 8], '#ffffff', 2.0, 20.0)
    ]
};