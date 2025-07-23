import { renderEngine } from "../rendering/renderengine.js";
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { genericGunSprite, rustyKeySprite, metalPipeSprite } from "../rendering/sprites/spritetextures.js";

// Style constants
const COLORS = {
    background: "black",
    text: "white",
    boxBackgroundAlpha: 0.85,
    boxBackgroundAlphaSolid: 1.0
};

const FONTS = {
    get base() {
        return `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
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
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = renderEngine.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
            renderEngine.fillText(currentLine.trim(), x, currentY);
            currentLine = words[i] + ' ';
            currentY += lineHeight;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        renderEngine.fillText(currentLine.trim(), x, currentY);
    }
}

export function drawNpcDialogue(dialogueLines, currentDialogueIndex) {
    renderEngine.save();
    renderEngine.globalAlpha = COLORS.boxBackgroundAlpha;
    renderEngine.fillStyle = COLORS.background;
    const box = BOX.npcDialogue;
    renderEngine.fillRect(box.x, box.y, box.width, box.height);
    renderEngine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    renderEngine.fillStyle = COLORS.text;
    renderEngine.font = FONTS.base;
    const line = dialogueLines[currentDialogueIndex];
    if (line) {
        drawWrappedText(line, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    }
    renderEngine.restore();
}

export function drawMetalPipePickupBox() {
    basicPickUpMenuStyle();
    renderEngine.save();
    renderEngine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    renderEngine.fillStyle = COLORS.text;
    renderEngine.font = FONTS.base;
    const text = "You found a metal pipe! It looks like it could be useful. Press [Space] to swing.";
    const box = BOX.pickup;
    drawWrappedText(text, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    const imgX = box.x + (box.width - box.imgWidth) / 2
    renderEngine.drawImage(metalPipeSprite, imgX, box.y + box.imgY, box.imgWidth, box.imgHeight);
    renderEngine.restore();
}

export function drawGunPickupBox() {
    basicPickUpMenuStyle();
    renderEngine.save();
    renderEngine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    renderEngine.fillStyle = COLORS.text;
    renderEngine.font = FONTS.base;
    const text = "You received a generic gun!";
    const box = BOX.pickup;
    drawWrappedText(text, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    const imgX = box.x + (box.width - box.imgWidth) / 2;
    renderEngine.drawImage(genericGunSprite, imgX, box.y + box.imgY, box.imgWidth, box.imgHeight);
    renderEngine.restore();
}

export function drawRustyKeyPickupBox() {
    basicPickUpMenuStyle();
    renderEngine.save();
    renderEngine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    renderEngine.fillStyle = COLORS.text;
    renderEngine.font = FONTS.base;
    const text = "You rummaged through warm flesh and amidst the bones you found a rusty key!";
    const box = BOX.pickup;
    drawWrappedText(text, box.x + box.paddingX, box.y + box.paddingY, box.maxTextWidth, box.lineHeight);
    const imgX = box.x + (box.width - box.imgWidth) / 2;
    renderEngine.drawImage(rustyKeySprite, imgX, box.y + box.imgY, box.imgWidth, box.imgHeight);
    renderEngine.restore();
}

export function basicPickUpMenuStyle() {
    const box = BOX.pickup;
    renderEngine.save();
    renderEngine.globalAlpha = COLORS.boxBackgroundAlpha;
    renderEngine.fillStyle = COLORS.background;
    renderEngine.fillRect(box.x, box.y, box.width, box.height);
    renderEngine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    renderEngine.restore();
}

export function drawMenuOverlay(alpha = 0.8) {
    renderEngine.save();
    renderEngine.globalAlpha = alpha;
    renderEngine.fillStyle = COLORS.background;
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.globalAlpha = 1.0;
    renderEngine.restore();
}

export function drawButton(context, button, isSelected = false, textOffsetX = 20, textOffsetY = 25) {
    context.fillStyle = button.hovered || isSelected ? "#555" : "#222";
    context.fillRect(button.x, button.y, button.width, button.height);
    context.strokeStyle = COLORS.text;
    context.strokeRect(button.x, button.y, button.width, button.height);
    context.fillStyle = COLORS.text;
    context.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    context.fillText(button.name, button.x + textOffsetX * SCALE_X, button.y + textOffsetY * SCALE_Y);
}