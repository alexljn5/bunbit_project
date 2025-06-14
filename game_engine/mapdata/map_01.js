import {
    fullTile, emptyTile, fullTileAldi, fullTileBrick, fullTileSatanic, fullTileSchizoEye,
    fullTileBrickGraffiti01, fullTileLaughingDemon, fullTileBrickDoor01Closed, fullTileBrickDoor01Open
} from './maptextures.js';

// Starting room (10x8)
export const map_01_sector1 = [
    [fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrickDoor01Closed, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrick, emptyTile, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, fullTileBrick],
    [fullTileBrick, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTileBrick, fullTileBrick, fullTile, fullTileBrick, fullTileBrick, fullTileBrick],
];

// Hallway (8x4)
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
    [fullTileBrick, fullTileBrick, fullTile, fullTileBrick, fullTileBrick, fullTileBrick],
];

// Test sector (7x4)
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
    [fullTileBrick, fullTileBrick, fullTile, fullTileBrick, fullTileBrick, fullTileBrick],
];

// Sector metadata for MapHandler (world coordinates with tileSectors = 50)
export const map_01_sectors = [
    {
        id: "sector1",
        data: map_01_sector1,
        startX: 0, // World x (in tiles)
        startY: 0, // World y (in tiles)
        width: map_01_sector1[0].length, // 5 tiles
        height: map_01_sector1.length // 13 tiles
    },
    {
        id: "sector2",
        data: map_01_sector2,
        startX: 5,
        startY: 0,
        width: map_01_sector2[0].length, // 6 tiles
        height: map_01_sector2.length // 13 tiles
    },
    {
        id: "sector3",
        data: map_01_sector3,
        startX: 11,
        startY: 0,
        width: map_01_sector3[0].length, // 5 tiles
        height: map_01_sector3.length // 13 tiles
    }
];

// Optional: Keep combined map_01 for legacy or full-map rendering
const mapHeight = Math.max(...map_01_sectors.map(s => s.startY + s.height));
const mapWidth = Math.max(...map_01_sectors.map(s => s.startX + s.width));
const map_01 = Array(mapHeight).fill().map(() => Array(mapWidth).fill(emptyTile));
map_01_sectors.forEach(({ data, startY, startX }) => {
    for (let y = 0; y < data.length; y++) {
        for (let x = 0; x < data[0].length; x++) {
            map_01[startY + y][startX + x] = data[y][x];
        }
    }
});

export { map_01, mapHeight, mapWidth };