import {
    fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye,
    fullTileBrickGraffiti01, fullTileLaughingDemon, fullTileBrickDoor01Closed, fullTileBrickDoor01Open
} from './maptexturesloader.js';
import { buildMapGrid } from './maputils.js';
import { addMapLight } from '../rendering/lightengine/renderlight.js';

// Debug sector (16x16 square room)
export const map_debug_sector1 = [
    [fullTile, fullTileBrickDoor01Open, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile, emptyTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, fullTile, fullTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, fullTile, emptyTile, emptyTile, fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
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
    floorTextureId: 51, // floor_test (uses creamlol.png)

    lights: [
        // sector1 - soft red near Casper tile
        addMapLight([2.5, 4.5], '#ff5555', 1.2, 5.0),

        // sector2 - cyan in the hallway
        addMapLight([1.5, 2.0], '#aaffff', 5.8, 4.0),

        // sector3 - yellow near laughing demon
        addMapLight([4.0, 5.5], '#cfa415ff', 1.4, 5.5)
    ]
};