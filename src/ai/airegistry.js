import { drawAIHealthBar } from "./aihandler.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { renderEngine } from "../rendering/renderengine.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../globals.js";
import { playerPosition } from "../playerdata/playerlogic.js";


//airegistry.js
export const placeholderAIHealths = new Map();

export function initPlaceholderAIHealth(spriteId) {
    placeholderAIHealths.set(spriteId, { value: 100 });
}

export function placeholderAIHealthBar() {
    placeholderAIHealths.forEach((health, spriteId) => {
        const sprite = spriteManager.getSprite(spriteId);
        if (!sprite?.worldPos || health.value <= 0) return;
        drawAIHealthBar(
            sprite.worldPos.x,
            sprite.worldPos.z,
            health.value,
            {
                renderEngine,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
                SCALE_X,
                SCALE_Y,
                playerPosition,
            }
        );
    });
}

export function handleSpriteDeath(spriteId) {
    const sprite = spriteManager.getSprite(spriteId);
    if (sprite) {
        // By setting worldPos to null, the sprite's render function will skip drawing it.
        sprite.worldPos = null;
        console.log(`Sprite '${spriteId}' has been marked as defeated and will no longer be rendered.`);
    } else {
        console.warn(`handleSpriteDeath: Could not find sprite with id '${spriteId}' to remove.`);
    }
}