// Avoid circular dependency with renderengine.js
function getRenderEngine() { return window.__renderEngine || null; }

import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT, GLOBAL_FONT } from "../globals.js";
import { genericGunSprite, rustyKeySprite, metalPipeSprite } from "../rendering/sprites/spritetextures.js";

// Style constants — cohesive dark fantasy theme matching dialogue boxes
const COLORS = {
    background: "#0a0a0a",
    text: "#cccccc",
    boxBackgroundAlpha: 0.85,
    boxBackgroundAlphaSolid: 1.0
};

const FONTS = {
    get base() {
        return `${Math.floor(24 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    }
};

const BOX = {
    get npcDialogue() {
        return {
            x: 100 * SCALE_X,
            y: 600 * SCALE_Y,
            width: 600 * SCALE_X,
            height: 150 * SCALE_Y,
            paddingX: 20 * SCALE_X,
            paddingY: 30 * SCALE_Y,
            maxTextWidth: 560 * SCALE_X,
            lineHeight: 32 * SCALE_Y
        };
    },
    get pickup() {
        return {
            x: (CANVAS_WIDTH - 400 * SCALE_X) / 2,
            y: (CANVAS_HEIGHT - 150 * SCALE_Y) / 2,
            width: 400 * SCALE_X,
            height: 150 * SCALE_Y,
            paddingX: 20 * SCALE_X,
            paddingY: 20 * SCALE_Y,
            maxTextWidth: 360 * SCALE_X,
            lineHeight: 32 * SCALE_Y,
            imgY: 90 * SCALE_Y,
            imgWidth: 96 * SCALE_X,
            imgHeight: 48 * SCALE_Y
        };
    }
};

// Helper function to draw word-wrapped text
function drawWrappedText(text, x, y, maxWidth, lineHeight) {
    const engine = getRenderEngine();
    if (!engine) return;
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = engine.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
            engine.fillText(currentLine.trim(), x, currentY);
            currentLine = words[i] + ' ';
            currentY += lineHeight;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        engine.fillText(currentLine.trim(), x, currentY);
    }
}

export function drawNpcDialogue(dialogueLines, currentDialogueIndex) {
    const engine = getRenderEngine();
    if (!engine) return;
    engine.save();
    engine.globalAlpha = COLORS.boxBackgroundAlpha;
    engine.fillStyle = COLORS.background;
    const box = BOX.npcDialogue;
    engine.fillRect(box.x, box.y, box.width, box.height);
    engine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    engine.fillStyle = COLORS.text;
    engine.font = FONTS.base;
    const line = dialogueLines[currentDialogueIndex];
    if (line) {
        drawWrappedText(line, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    }
    engine.restore();
}

export function drawMetalPipePickupBox() {
    const engine = getRenderEngine();
    if (!engine) return;
    basicPickUpMenuStyle();
    engine.save();
    engine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    engine.fillStyle = COLORS.text;
    engine.font = FONTS.base;
    const text = "You found a metal pipe! It looks like it could be useful. Press [Space] to swing and T to continue.";
    const box = BOX.pickup;
    drawWrappedText(text, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    const imgX = box.x + (box.width - box.imgWidth) / 2
    engine.drawImage(metalPipeSprite, imgX, box.y + box.imgY, box.imgWidth, box.imgHeight);
    engine.restore();
}

export function drawGunPickupBox() {
    const engine = getRenderEngine();
    if (!engine) return;
    basicPickUpMenuStyle();
    engine.save();
    engine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    engine.fillStyle = COLORS.text;
    engine.font = FONTS.base;
    const text = "You received a generic gun!";
    const box = BOX.pickup;
    drawWrappedText(text, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    const imgX = box.x + (box.width - box.imgWidth) / 2;
    engine.drawImage(genericGunSprite, imgX, box.y + box.imgY, box.imgWidth, box.imgHeight);
    engine.restore();
}

export function drawRustyKeyPickupBox() {
    const engine = getRenderEngine();
    if (!engine) return;
    basicPickUpMenuStyle();
    engine.save();
    engine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    engine.fillStyle = COLORS.text;
    engine.font = FONTS.base;
    const text = "You rummaged through warm flesh and amidst the bones you found a rusty key!";
    const box = BOX.pickup;
    drawWrappedText(text, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    const imgX = box.x + (box.width - box.imgWidth) / 2;
    engine.drawImage(rustyKeySprite, imgX, box.y + box.imgY, box.imgWidth, box.imgHeight);
    engine.restore();
}

export function basicPickUpMenuStyle() {
    const engine = getRenderEngine();
    if (!engine) return;
    const box = BOX.pickup;
    engine.save();
    engine.globalAlpha = COLORS.boxBackgroundAlpha;
    engine.fillStyle = COLORS.background;
    engine.fillRect(box.x, box.y, box.width, box.height);
    engine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    engine.restore();
}

export function drawMenuOverlay(alpha = 0.8) {
    const engine = getRenderEngine();
    if (!engine) return;
    engine.save();
    engine.globalAlpha = alpha;
    engine.fillStyle = COLORS.background;
    engine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    engine.globalAlpha = 1.0;
    engine.restore();
}

export function drawButton(context, button, isSelected = false, textOffsetX = 20, textOffsetY = 25) {
    context.fillStyle = button.hovered || isSelected ? "#333333" : "#1a1a1a";
    context.fillRect(button.x, button.y, button.width, button.height);
    context.strokeStyle = "#555555";
    context.lineWidth = 1;
    context.strokeRect(button.x, button.y, button.width, button.height);
    context.fillStyle = button.hovered || isSelected ? "#ffffff" : "#cccccc";
    context.font = `bold ${Math.floor(18 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    context.textAlign = 'center';
    context.fillText(button.name, button.x + button.width / 2, button.y + button.height / 2 + textOffsetY * Math.min(SCALE_X, SCALE_Y) * 0.3);
    context.textAlign = 'left';
}
