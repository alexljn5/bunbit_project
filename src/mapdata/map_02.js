import { fullTileBrick, emptyTile, fullTileBrickDoor01Open } from './maptexturesloader.js';

// Example sector for map_02
export const map_02_sector1 = [
    [fullTileBrick, fullTileBrick, fullTileBrick],
    [fullTileBrick, emptyTile, fullTileBrick],
    [fullTileBrick, fullTileBrickDoor01Open, fullTileBrick]
];

export const map_02_sectors = [
    {
        id: "sector1",
        data: map_02_sector1,
        startX: 0,
        startY: 0,
        width: map_02_sector1[0].length,
        height: map_02_sector1.length
    }
];

// Core grid setup
const mapHeight = map_02_sectors[0].height;
const mapWidth = map_02_sectors[0].width;
export const map_02 = Array(mapHeight).fill().map(() => Array(mapWidth).fill(emptyTile));
map_02_sectors.forEach(({ data, startY, startX }) => {
    for (let y = 0; y < data.length; y++) {
        for (let x = 0; x < data[0].length; x++) {
            map_02[startY + y][startX + x] = data[y][x];
        }
    }
});

// Map metadata with floor texture
export const map_02_data = {
    grid: map_02,
    sectors: map_02_sectors,
    floorTextureId: 51 // floor_test
};