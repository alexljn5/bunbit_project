
import { fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye, fullTileBrickGraffiti01, fullTileLaughingDemon } from './maptextures.js';

// Starting room (10x8)
/*
const map_01_sector1 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTile, fullTileBrick, fullTileBrick, fullTileBrick],
];
*/


const map_01_sector1 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, emptyTile],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, emptyTile],
    [fullTileBrick, fullTileBrick, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile, fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileLaughingDemon, fullTileBrick],
];


// Hallway (8x4)
const map_01_sector2 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
];

// Test sector (7x4)
const map_01_sector3 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, fullTileBrick],
    [emptyTile, emptyTile, emptyTile, fullTile],
    [emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick,],
];

// Combine sectors into a flat 2D map_01
const sectorPositions = [
    { sector: map_01_sector1, startY: 0, startX: 0 },
    { sector: map_01_sector2, startY: 0, startX: 8 },
    { sector: map_01_sector3, startY: 0, startX: 12 },
];

// Calculate map size dynamically
export const mapHeight = Math.max(...sectorPositions.map(s => s.startY + s.sector.length));
export const mapWidth = Math.max(...sectorPositions.map(s => s.startX + s.sector[0].length));

// Initialize map_01 with empty tiles
const map_01 = Array(mapHeight).fill().map(() => Array(mapWidth).fill(emptyTile));

// Place all sectors into map_01 using sectorPositions
sectorPositions.forEach(({ sector, startY, startX }) => {
    for (let y = 0; y < sector.length; y++) {
        for (let x = 0; x < sector[0].length; x++) {
            map_01[startY + y][startX + x] = sector[y][x];
        }
    }
});

export { map_01 };