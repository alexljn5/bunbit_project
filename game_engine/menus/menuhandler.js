import { menuSettingsGodFunction } from './menusettings.js';
import { renderEngine } from '../renderengine.js';
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