import { getSpriteScreenParams } from "../rendering/sprites/spriteutils.js";
import { numCastRays } from "../rendering/raycasting.js";
import { playerVantagePointX, playerVantagePointY } from "../playerdata/playerlogic.js";
import { boyKisserNpcAIGodFunction } from "./friendlycat.js";
import { placeholderAIGodFunction } from "./placeholderai.js";
import { casperLesserDemon } from "./casperlesserdemon.js";
import { mapTable, tileSectors } from "../mapdata/maps.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { map_01 } from "../mapdata/map_01.js"; // Import legacy map_01 for fallback
import { computerAIGodFunction } from "./computerai/computerai.js";

// AI registries per map
const enemyAiRegistry = new Map();
const friendlyAiRegistry = new Map();
let currentMapKey = "map_01"; // Default map

// Initialize AI registries for all maps
function initializeAiRegistries() {
    console.log("Initializing AI registries for maps:", Array.from(mapTable.keys()));
    const maps = ["map_01", "map_02", "map_03", "map_04", "map_05", "map_06", "map_07", "map_debug", "map_test"];

    maps.forEach(mapKey => {
        const mapData = mapTable.get(mapKey);
        const grid = mapData?.grid || mapHandler.getFullMap(mapKey) || (mapKey === "map_01" ? map_01 : null);
        console.log(`Map ${mapKey} in mapTable:`, mapData && mapData.grid && Array.isArray(mapData.grid) && mapData.grid[0] && Array.isArray(mapData.grid[0])
            ? `Valid (rows: ${mapData.grid.length}, cols: ${mapData.grid[0].length})`
            : `Invalid (mapData: ${JSON.stringify(mapData).slice(0, 50)}...)`);
        console.log(`Map ${mapKey} in fullMapCache:`, grid && Array.isArray(grid) && grid[0] && Array.isArray(grid[0])
            ? `Valid (rows: ${grid.length}, cols: ${grid[0].length})`
            : `Invalid (grid: ${JSON.stringify(grid).slice(0, 50)}...)`);
    });

    maps.forEach(mapKey => {
        const enemyFunctions = [];
        const friendlyFunctions = [];
        // In initializeAiRegistries, inside maps.forEach(mapKey => {...})

        // Register AIs for each map directly (no wrappers, no map_01 swapping)
        enemyFunctions.push(casperLesserDemon);
        enemyFunctions.push(placeholderAIGodFunction);
        friendlyFunctions.push(boyKisserNpcAIGodFunction);
        friendlyFunctions.push(computerAIGodFunction);

        enemyAiRegistry.set(mapKey, enemyFunctions);
        friendlyAiRegistry.set(mapKey, friendlyFunctions);
        console.log(`Registered AI for ${mapKey}: ${enemyFunctions.length} enemy, ${friendlyFunctions.length} friendly`);
    });
}

// Call initialization once
initializeAiRegistries();

// Public method to switch maps
export function setCurrentMap(mapKey) {
    if (!mapKey) {
        console.error("setCurrentMap called with undefined or null key! Falling back to map_01.");
        currentMapKey = "map_01";
        return;
    }
    const mapData = mapTable.get(mapKey);
    const grid = mapData?.grid || mapHandler.getFullMap(mapKey) || (mapKey === "map_01" ? map_01 : null);
    if (grid && Array.isArray(grid) && grid[0] && Array.isArray(grid[0])) {
        currentMapKey = mapKey;
        console.log(`Switched to map: ${mapKey} (rows: ${grid.length}, cols: ${grid[0].length})`);
    } else {
        console.error(`Map ${mapKey} is invalid in both mapTable and fullMapCache! Falling back to map_01.`);
        currentMapKey = "map_01";
    }
}

// God functions to execute AI for the current map
export function enemyAiGodFunction() {
    if (!mapTable.has(currentMapKey)) {
        console.error(`Invalid currentMapKey ${currentMapKey || 'undefined'}! Skipping enemy AI.`);
        return;
    }
    const mapData = mapTable.get(currentMapKey);
    const grid = mapData?.grid || mapHandler.getFullMap(currentMapKey) || (currentMapKey === "map_01" ? map_01 : null);
    if (!grid || !Array.isArray(grid) || !grid[0] || !Array.isArray(grid[0])) {
        console.error(`Invalid map data for ${currentMapKey} in enemyAiGodFunction! Grid:`, grid);
        return;
    }
    const enemyFunctions = enemyAiRegistry.get(currentMapKey) || [];
    for (const func of enemyFunctions) func();
}

export function friendlyAiGodFunction() {
    if (!mapTable.has(currentMapKey)) {
        console.error(`Invalid currentMapKey ${currentMapKey || 'undefined'}! Skipping friendly AI.`);
        return;
    }
    const mapData = mapTable.get(currentMapKey);
    const grid = mapData?.grid || mapHandler.getFullMap(currentMapKey) || (currentMapKey === "map_01" ? map_01 : null);
    if (!grid || !Array.isArray(grid) || !grid[0] || !Array.isArray(grid[0])) {
        console.error(`Invalid map data for ${currentMapKey} in friendlyAiGodFunction! Grid:`, grid);
        return;
    }
    const friendlyFunctions = friendlyAiRegistry.get(currentMapKey) || [];
    for (const func of friendlyFunctions) func();
}

// Occlusion checker with map validation
export function isOccludedByWall(x0, z0, x1, z1, map, tileSectors) {
    const effectiveMap = map || mapHandler.getFullMap(mapHandler.activeMapKey || "map_01") || (mapHandler.activeMapKey === "map_01" ? map_01 : null);
    if (!effectiveMap || !Array.isArray(effectiveMap) || !effectiveMap[0] || !Array.isArray(effectiveMap[0])) {
        console.error(`Invalid map in isOccludedByWall! Map:`, effectiveMap, `Falling back to map_01.`);
        if (mapHandler.activeMapKey === "map_01" && map_01 && Array.isArray(map_01) && map_01[0] && Array.isArray(map_01[0])) {
            return isOccludedByWall(x0, z0, x1, z1, map_01, tileSectors); // Recursive fallback
        }
        console.error(`Fallback map_01 also invalid! Skipping occlusion check.`);
        return false;
    }
    const dx = x1 - x0;
    const dz = z1 - z0;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.max(10, Math.ceil(distance / (tileSectors / 4)));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = x0 + t * dx;
        const checkZ = z0 + t * dz;
        const cellX = Math.floor(checkX / tileSectors);
        const cellZ = Math.floor(checkZ / tileSectors);
        if (cellX >= 0 && cellX < effectiveMap[0].length && cellZ >= 0 && cellZ < effectiveMap.length) {
            if (effectiveMap[cellZ][cellX] && effectiveMap[cellZ][cellX].type === "wall") return true;
        } else {
            return false;
        }
    }
    return false;
}

// Draw healthbar for AIs
export function drawAIHealthBar(worldX, worldZ, health, options = {}) {
    const {
        occlusionCheck = null,
        renderEngine: engine = typeof renderEngine !== 'undefined' ? renderEngine : null,
        CANVAS_WIDTH: w = typeof CANVAS_WIDTH !== 'undefined' ? CANVAS_WIDTH : 800,
        CANVAS_HEIGHT: h = typeof CANVAS_HEIGHT !== 'undefined' ? CANVAS_HEIGHT : 600,
        SCALE_X = 1,
        SCALE_Y = 1,
        playerPosition = { x: 0, z: 0, angle: 0 },
        playerFOV = Math.PI / 3,
        tileSectors = 50,
        scaleFactor = 0.5,
        aspectRatio = 128 / 80
    } = options;

    const barHeight = 8 * SCALE_Y;
    const color = health > 50 ? 'green' : health > 20 ? 'yellow' : 'red';
    const label = `${Math.floor(health)} HP`;

    if (!engine || isNaN(worldX) || isNaN(worldZ) || isNaN(playerPosition.x) || isNaN(playerPosition.z) || isNaN(playerPosition.angle)) return;
    if (typeof occlusionCheck === 'function' && occlusionCheck()) return;

    const dx = worldX - playerPosition.x;
    const dz = worldZ - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const relativeAngle = Math.atan2(dz, dx) - playerPosition.angle;
    let relA = relativeAngle;
    while (relA > Math.PI) relA -= 2 * Math.PI;
    while (relA < -Math.PI) relA += 2 * Math.PI;
    const halfFOV = playerFOV / 2;
    if (Math.abs(relA) > halfFOV) return;
    const correctedDistance = distance * Math.cos(relA);
    if (correctedDistance < 0.1) return;

    const projectedSpriteHeight = (h / correctedDistance) * tileSectors * scaleFactor;
    const projectedSpriteWidth = projectedSpriteHeight * aspectRatio;

    // Correctly calculate the sprite's top position on the screen using perspective projection
    const projectionPlaneDist = (w / 2) / Math.tan(playerFOV / 2);
    const spriteYBottom = (h / 2) + (projectionPlaneDist * (tileSectors / 2)) / correctedDistance;
    const spriteYTop = spriteYBottom - projectedSpriteHeight;

    const { adjustedScreenX: screenX } = getSpriteScreenParams(relA, projectedSpriteWidth);

    const offset = 6 * SCALE_Y;
    const barWidth = Math.max(24 * SCALE_X, Math.min(60 * SCALE_X, projectedSpriteWidth * 0.7));
    const barX = screenX - barWidth / 2;
    const barY = spriteYTop - barHeight - offset;
    if (barX + barWidth < 0 || barX > w || barY < 0 || barY > h) return;

    engine.save();
    engine.globalAlpha = 0.85;
    engine.fillStyle = 'black';
    engine.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    const healthWidth = (health / 100) * barWidth;
    engine.fillStyle = color;
    engine.fillRect(barX, barY, healthWidth, barHeight);
    engine.strokeStyle = 'white';
    engine.lineWidth = 1;
    engine.strokeRect(barX, barY, barWidth, barHeight);
    if (barWidth > 32 * SCALE_X) {
        engine.fillStyle = 'white';
        engine.font = `${10 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        engine.textAlign = 'center';
        engine.fillText(label, screenX, barY - 2);
    }
    engine.restore();
}

//Somehow I need these exports to make the code work wtf, DO NOT delete.
export function registerFriendlyAiFunctionsForMap() {

}

export function registerEnemyAiFunctionsForMap() {

}