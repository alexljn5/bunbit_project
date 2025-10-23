import {
    fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye,
    fullTileBrickGraffiti01, fullTileLaughingDemon, fullTileBrickDoor01Closed, fullTileBrickDoor01Open,
    fullTileFenceWallTest, fullTileBrickCream, fullTileBrickEye, fullTileCasper01
} from './maptexturesloader.js';
import { addMapLight } from '../rendering/lightengine/renderlight.js';

// ------------------------
// Sector grids
// ------------------------

// Starting room (13x13-ish)
export const map_01_sector1 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileCasper01, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrickEye, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrickCream, fullTileBrick, fullTileBrick],
];

// Hallway
export const map_01_sector2 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, fullTileBrick, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, fullTileBrickDoor01Closed, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
];

// Test sector
export const map_01_sector3 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileLaughingDemon],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrickCream, fullTileBrick, fullTileBrick, fullTileBrick],
];

// ------------------------
// Sector metadata
// ------------------------
export const map_01_sectors = [
    { id: "sector1", data: map_01_sector1, startX: 0, startY: 0, width: map_01_sector1[0].length, height: map_01_sector1.length },
    { id: "sector2", data: map_01_sector2, startX: 5, startY: 0, width: map_01_sector2[0].length, height: map_01_sector2.length },
    { id: "sector3", data: map_01_sector3, startX: 11, startY: 0, width: map_01_sector3[0].length, height: map_01_sector3.length },
];

// ------------------------
// Core grid setup
// ------------------------
const mapHeight = Math.max(...map_01_sectors.map(s => s.startY + s.height));
const mapWidth = Math.max(...map_01_sectors.map(s => s.startX + s.width));
export const map_01 = Array(mapHeight).fill().map(() => Array(mapWidth).fill(emptyTile));
map_01_sectors.forEach(({ data, startY, startX }) => {
    for (let y = 0; y < data.length; y++) {
        for (let x = 0; x < data[0].length; x++) {
            map_01[startY + y][startX + x] = data[y][x];
        }
    }
});

// ------------------------
// Map metadata with floor and lights
// ------------------------

export const map_01_data = {
    grid: map_01,
    sectors: map_01_sectors,
    floorTextureId: 50, // floor_concrete

    // Lights inside map grid
    lights: [
        // sector1 - soft red near Casper tile
        addMapLight([2.5, 4.5], '#ff5555', 1.2, 5.0),

        // sector2 - cyan in the hallway
        addMapLight([6.5, 2.0], '#aaffff', 0.8, 4.0),

        // sector3 - yellow near laughing demon
        addMapLight([4.0, 5.5], '#cfa415ff', 1.4, 5.5)
    ]
};
