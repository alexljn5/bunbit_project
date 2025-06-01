import { menuSettingsGodFunction } from './menusettings.js';
import { renderEngine } from '../renderengine.js';

// Cleaned up menu handler for clarity and maintainability
export function menuHandler() {
    menuSettingsGodFunction();
}

export function basicPickUpMenuStyle() {
    // Centered 400x200 rectangle on 800x800 canvas
    const width = 400;
    const height = 150;
    const x = (800 - width) / 2;
    const y = (800 - height) / 2;
    renderEngine.save();
    renderEngine.globalAlpha = 0.8;
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(x, y, width, height);
    renderEngine.globalAlpha = 1.0;
    renderEngine.restore();
}
