import { emptyTile } from './maptexturesloader.js';

export function buildMapGrid(sectors) {
    const mapHeight = Math.max(...sectors.map(s => s.startY + s.height));
    const mapWidth = Math.max(...sectors.map(s => s.startX + s.width));
    const grid = Array(mapHeight).fill().map(() => Array(mapWidth).fill(emptyTile));
    sectors.forEach(({ data, startY, startX }) => {
        for (let y = 0; y < data.length; y++) {
            for (let x = 0; x < data[0].length; x++) {
                grid[startY + y][startX + x] = data[y][x];
            }
        }
    });
    return grid;
}