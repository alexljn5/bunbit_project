import { casperLesserDemon } from "./casperlesserdemon.js";
import { boyKisserNpcAIGodFunction } from "./friendlycat.js";
import { placeholderAI, placeholderAIGodFunction } from "./placeholderai.js";
import { playerVantagePointX, playerVantagePointY } from "../playerdata/playerlogic.js";

// Cleaned up AI handler for clarity and maintainability
export function friendlyAiGodFunction() {
    boyKisserNpcAIGodFunction();
}

export function enemyAiGodFunction() {
    casperLesserDemon();
    placeholderAIGodFunction();
}

export function isOccludedByWall(x0, z0, x1, z1, map, tileSectors) {
    // Always check from player to AI for occlusion
    const dx = x1 - x0;
    const dz = z1 - z0;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.max(10, Math.ceil(distance / (tileSectors / 4))); // More steps for accuracy
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
        } else {
            return false; // Out-of-bounds, assume no occlusion
        }
    }
    return false;
}

/**
 * Draws a health bar statically above the AI sprite in screen space, using perspective projection.
 * The bar scales with distance and stays fixed above the sprite, preventing off-screen issues.
 * @param {number} worldX - AI world X position
 * @param {number} worldZ - AI world Z position
 * @param {number} health - Current health (0-100)
 * @param {object} [options] - { spriteHeight, barHeight, color, label, occlusionCheck, renderEngine, CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, playerPosition, playerFOV }
 */
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
        playerFOV = Math.PI / 3, // 60 degrees
        tileSectors = 50, // fallback
        scaleFactor = 0.5,
        aspectRatio = 128 / 80,
        baseYRatio = 400 / 600 // fallback for vertical placement
    } = options;
    if (!engine) return;
    if (isNaN(worldX) || isNaN(worldZ) || isNaN(playerPosition.x) || isNaN(playerPosition.z) || isNaN(playerPosition.angle)) return;
    if (typeof occlusionCheck === 'function' && occlusionCheck()) return;

    // --- Project AI world position to screen (matches sprite renderer) ---
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
    // Projected sprite size and position
    const projectedSpriteHeight = (h / correctedDistance) * tileSectors * scaleFactor;
    const projectedSpriteWidth = projectedSpriteHeight * aspectRatio;
    const spriteY = h * baseYRatio;
    const screenX = (w / 2) + (w / 2) * (relA / halfFOV);
    // Sprite top in screen space
    const spriteYTop = spriteY - projectedSpriteHeight / 2;
    // Bar position: just above sprite top
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