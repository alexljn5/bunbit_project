import { renderEngine } from "../rendering/renderengine.js";
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { genericGunSprite } from "../rendering/sprites/spritetextures.js";

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
    get gunPickup() {
        return {
            textY: 350 * SCALE_Y,
            imgY: 370 * SCALE_Y,
            imgWidth: 96 * SCALE_X,
            imgHeight: 48 * SCALE_Y
        };
    }
};

// Helper function to draw word-wrapped text
function drawWrappedText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = renderEngine.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
            renderEngine.fillText(currentLine, x, y);
            currentLine = words[i] + ' ';
            y += lineHeight;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        renderEngine.fillText(currentLine, x, y);
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

export function drawGunPickupBox() {
    basicPickUpMenuStyle(); // Already scaled in menuhandler.js
    renderEngine.save();
    renderEngine.globalAlpha = COLORS.boxBackgroundAlphaSolid;
    renderEngine.fillStyle = COLORS.text;
    renderEngine.font = FONTS.base;
    const text = "You received a generic gun!";
    const textMetrics = renderEngine.measureText(text);
    const textX = (CANVAS_WIDTH - textMetrics.width) / 2;
    const box = BOX.gunPickup;
    renderEngine.fillText(text, textX, box.textY);
    const gunImg = genericGunSprite;
    const imgX = (CANVAS_WIDTH - box.imgWidth) / 2;
    renderEngine.drawImage(gunImg, imgX, box.imgY, box.imgWidth, box.imgHeight);
    renderEngine.restore();
}

// Moved from menuhandler.js
export function basicPickUpMenuStyle() {
    // Centered 400x150 rectangle, scaled from 800x800 canvas
    const width = 400 * SCALE_X;
    const height = 150 * SCALE_Y;
    const x = (CANVAS_WIDTH - width) / 2;
    const y = (CANVAS_HEIGHT - height) / 2;
    renderEngine.save();
    renderEngine.globalAlpha = 0.8;
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(x, y, width, height);
    renderEngine.globalAlpha = 1.0;
    renderEngine.restore();
}

// Moved from menuhandler.js
export function drawMenuOverlay(alpha = 0.8) {
    renderEngine.save();
    renderEngine.globalAlpha = alpha;
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.globalAlpha = 1.0;
    renderEngine.restore();
}

// Moved from menuhandler.js
export function drawButton(context, button, isSelected = false, textOffsetX = 20, textOffsetY = 25) {
    context.fillStyle = button.hovered || isSelected ? "#555" : "#222";
    context.fillRect(button.x, button.y, button.width, button.height);
    context.strokeStyle = "#fff";
    context.strokeRect(button.x, button.y, button.width, button.height);
    context.fillStyle = "#fff";
    context.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    context.fillText(button.name, button.x + textOffsetX * SCALE_X, button.y + textOffsetY * SCALE_Y);
}
