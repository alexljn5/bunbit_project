// In enemyai.js
import { casperLesserDemon } from "./casperlesserdemon.js";
import { boyKisserNpcAIGodFunction } from "./friendlycat.js";
import { tileSectors } from "../mapdata/maps.js";


export function friendlyAiGodFunction() {
    boyKisserNpcAIGodFunction();
}

export function enemyAiGodFunction() {
    casperLesserDemon();
}

export function isOccludedByWall(x0, z0, x1, z1, map, tileSectors) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(distance / tileSectors);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = x0 + t * dx;
        const checkZ = z0 + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < map[0].length && cellZ >= 0 && cellZ < map.length) {
            if (map[cellZ][cellX].type === "wall") {
                return true;
            }
        }
    }
    return false;
}