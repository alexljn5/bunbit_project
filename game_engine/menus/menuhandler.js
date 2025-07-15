import { menuSettingsGodFunction } from './menusettings.js';
import { renderEngine } from '../rendering/renderengine.js';
import { SCALE_X, SCALE_Y, CANVAS_HEIGHT, CANVAS_WIDTH } from '../globals.js';

// Cleaned up menu handler for clarity and maintainability
export function menuHandler() {
    menuSettingsGodFunction();
}

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

// Reusable button-drawing function
export function drawButton(context, button, isSelected = false, textOffsetX = 20, textOffsetY = 25) {
    context.fillStyle = button.hovered || isSelected ? "#555" : "#222";
    context.fillRect(button.x, button.y, button.width, button.height);
    context.strokeStyle = "#fff";
    context.strokeRect(button.x, button.y, button.width, button.height);
    context.fillStyle = "#fff";
    context.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    context.fillText(button.name, button.x + textOffsetX * SCALE_X, button.y + textOffsetY * SCALE_Y);
}