// aihandler.js
import { playerVantagePointX, playerVantagePointY } from "../playerdata/playerlogic.js";

// === AI Function Registries ===
let currentEnemyAiFunctions = [];
let currentFriendlyAiFunctions = [];

// === Public Registration Methods ===
export function registerEnemyAiFunctionsForMap(aiArray) {
    currentEnemyAiFunctions = aiArray;
}

export function registerFriendlyAiFunctionsForMap(aiArray) {
    currentFriendlyAiFunctions = aiArray;
}

// === God Functions ===
export function enemyAiGodFunction() {
    for (const func of currentEnemyAiFunctions) func();
}

export function friendlyAiGodFunction() {
    for (const func of currentFriendlyAiFunctions) func();
}

// === Occlusion Checker ===
export function isOccludedByWall(x0, z0, x1, z1, map, tileSectors) {
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
        if (cellX >= 0 && cellX < map[0].length && cellZ >= 0 && cellZ < map.length) {
            if (map[cellZ][cellX].type === "wall") return true;
        } else {
            return false;
        }
    }
    return false;
}

// === Draw Healthbar for AIs ===
export function drawAIHealthBar(worldX, worldZ, health, options = {}) {
    const {
        spriteHeight = 128 * (typeof SCALE_Y !== 'undefined' ? SCALE_Y : 1),
        barHeight = 8 * (typeof SCALE_Y !== 'undefined' ? SCALE_Y : 1),
        color = health > 50 ? 'green' : health > 20 ? 'yellow' : 'red',
        label = `${Math.floor(health)} HP`,
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
        aspectRatio = 128 / 80,
        baseYRatio = 400 / 600
    } = options;

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
    const spriteY = h * baseYRatio;
    const screenX = (w / 2) + (w / 2) * (relA / halfFOV);
    const spriteYTop = spriteY - projectedSpriteHeight / 2;

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
