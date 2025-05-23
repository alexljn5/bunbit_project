const fullTile = 1;
const emptyTile = 0;

// Starting room (10x8)
const map_02_sector1 = [
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, emptyTile, fullTile],
    [fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile, fullTile],
];

// Hallway (8x4)
const map_02_sector2 = [
    [fullTile, fullTile, fullTile, fullTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [emptyTile, emptyTile, emptyTile, emptyTile],
    [fullTile, fullTile, fullTile, fullTile],
];

// Combine sectors into a flat 2D map_01
const map_02 = [];
const sectorPositions = [
    { sector: map_02_sector1, startY: 0, startX: 0 },
    { sector: map_02_sector2, startY: 1, startX: 8 },
];
const mapHeight = Math.max(...sectorPositions.map(s => s.startY + s.sector.length));
const mapWidth = Math.max(...sectorPositions.map(s => s.startX + s.sector[0].length));

for (let y = 0; y < mapHeight; y++) {
    map_02[y] = [];
    for (let x = 0; x < mapWidth; x++) {
        map_02[y][x] = emptyTile;
    }
}

// Place map_01_sector1 at (0, 0) to (9, 7)
for (let y = 0; y < map_02_sector1.length; y++) {
    for (let x = 0; x < map_02_sector1[0].length; x++) {
        map_02[y][x] = map_02_sector1[y][x];
    }
}

// Place map_02_sector2 at (1, 8) to (8, 11)
for (let y = 0; y < map_02_sector2.length; y++) {
    for (let x = 0; x < map_02_sector2[0].length; x++) {
        map_02[y + 1][x + 8] = map_02_sector2[y][x];
    }
}

export { map_02 };