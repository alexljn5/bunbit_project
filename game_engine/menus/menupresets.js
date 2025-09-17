import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '../globals.js';
import { themeManager } from '../themes/thememanager.js';
import { evilGlitchSystem } from '../themes/eviltheme.js';

// Font configurations (unchanged)
export const MENU_FONTS = {
    title: () => `${32 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    subtitle: () => `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    button: () => `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    body: () => `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    small: () => `${14 * Math.min(SCALE_X, SCALE_Y)}px Arial`
};

// Standard button dimensions (unchanged)
export const BUTTON_PRESETS = {
    standard: {
        width: 100 * SCALE_X,
        height: 40 * SCALE_Y,
        textOffsetX: 20 * SCALE_X,
        textOffsetY: 25 * SCALE_Y
    },
    wide: {
        width: 200 * SCALE_X,
        height: 40 * SCALE_Y,
        textOffsetX: 30 * SCALE_X,
        textOffsetY: 25 * SCALE_Y
    },
    small: {
        width: 80 * SCALE_X,
        height: 30 * SCALE_Y,
        textOffsetX: 15 * SCALE_X,
        textOffsetY: 20 * SCALE_Y
    }
};

// Dialog box presets (unchanged)
export const DIALOG_PRESETS = {
    standard: {
        width: 400 * SCALE_X,
        height: 150 * SCALE_Y,
        padding: 20 * SCALE_X
    },
    wide: {
        width: 600 * SCALE_X,
        height: 200 * SCALE_Y,
        padding: 30 * SCALE_X
    },
    notification: {
        width: 300 * SCALE_X,
        height: 100 * SCALE_Y,
        padding: 15 * SCALE_X
    }
};

// Menu layouts (unchanged)
export const MENU_LAYOUTS = {
    centerColumn: (items, startY = CANVAS_HEIGHT / 3) => {
        return items.map((item, index) => ({
            x: (CANVAS_WIDTH - BUTTON_PRESETS.standard.width) / 2,
            y: startY + (index * (BUTTON_PRESETS.standard.height + 20 * SCALE_Y)),
            ...BUTTON_PRESETS.standard
        }));
    },
    rightColumn: (items, offsetX = 50) => {
        return items.map((item, index) => ({
            x: CANVAS_WIDTH - BUTTON_PRESETS.standard.width - offsetX * SCALE_X,
            y: CANVAS_HEIGHT / 3 + (index * (BUTTON_PRESETS.standard.height + 20 * SCALE_Y)),
            ...BUTTON_PRESETS.standard
        }));
    }
};

// Helper functions for common UI elements
export function drawStandardButton(context, button, text, isHovered = false) {
    const theme = themeManager.getCurrentTheme() || {
        background: '#000000',
        text: '#ffffff',
        border: '#ffffff',
        buttonBg: '#333333',
        buttonHover: '#666666'
    };

    // Apply glitch effect for 'evil' theme
    let displayText = text;
    if (themeManager.currentTheme.name === 'evil' && evilGlitchSystem.textGlitch) {
        displayText = evilGlitchSystem.applyTextGlitch(text);
    }

    // Debug log to verify button properties
    console.log(`Drawing button:`, {
        x: button.x,
        y: button.y,
        width: button.width,
        height: button.height,
        text: displayText,
        isHovered,
        theme: themeManager.currentTheme.name
    });

    // Draw button background
    context.fillStyle = isHovered ? theme.buttonHover : theme.buttonBg;
    context.fillRect(button.x, button.y, button.width, button.height);

    // Apply flicker effect for 'evil' theme
    if (themeManager.currentTheme.name === 'evil') {
        context.globalAlpha = evilGlitchSystem.flicker;
    }

    // Draw button border
    context.strokeStyle = theme.border;
    context.strokeRect(button.x, button.y, button.width, button.height);

    // Draw button text
    context.fillStyle = theme.text;
    context.font = MENU_FONTS.button();
    const textX = button.x + (button.width * 0.1); // 10% padding from left
    const textY = button.y + (button.height * 0.6); // 60% down for vertical centering
    context.fillText(displayText, textX, textY);

    // Reset globalAlpha
    context.globalAlpha = 1;
}

export function drawDialogBox(context, box, alpha = 0.8) {
    const theme = themeManager.getCurrentTheme() || {
        background: '#000000',
        text: '#ffffff',
        border: '#ffffff'
    };

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = theme.background;
    context.fillRect(box.x, box.y, box.width, box.height);
    context.globalAlpha = 1;
    context.strokeStyle = theme.border;
    context.strokeRect(box.x, box.y, box.width, box.height);
    context.restore();
}

export function drawText(context, text, x, y, font = MENU_FONTS.body(), color) {
    const theme = themeManager.getCurrentTheme() || {
        text: '#ffffff'
    };

    // Apply glitch effect for 'evil' theme
    let displayText = text;
    if (themeManager.currentTheme.name === 'evil' && evilGlitchSystem.textGlitch) {
        displayText = evilGlitchSystem.applyTextGlitch(text);
    }

    context.fillStyle = color || theme.text;
    context.font = font;
    context.fillText(displayText, x, y);
}

export function centerText(context, text, y, font = MENU_FONTS.body()) {
    const theme = themeManager.getCurrentTheme() || {
        text: '#ffffff'
    };

    // Apply glitch effect for 'evil' theme
    let displayText = text;
    if (themeManager.currentTheme.name === 'evil' && evilGlitchSystem.textGlitch) {
        displayText = evilGlitchSystem.applyTextGlitch(text);
    }

    context.font = font;
    const textWidth = context.measureText(displayText).width;
    return {
        x: (CANVAS_WIDTH - textWidth) / 2,
        y: y
    };
}

// Animation presets (unchanged)
export const ANIMATION_PRESETS = {
    fadeIn: {
        duration: 500,
        steps: 20,
        initialAlpha: 0,
        finalAlpha: 1
    },
    fadeOut: {
        duration: 500,
        steps: 20,
        initialAlpha: 1,
        finalAlpha: 0
    },
    slideIn: {
        duration: 300,
        distance: 100 * SCALE_X
    }
};

// Redraw UI elements when theme changes
function redrawUI() {
    console.log('Theme changed, redrawing UI elements! *chao chao*');
    // Assuming a global canvas context (e.g., from gameRenderEngine)
    const canvas = document.getElementById('mainGameRender');
    if (!canvas || !canvas.getContext) {
        console.warn('Cannot redraw UI: canvas not found! *pouts*');
        return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
        console.warn('Cannot redraw UI: context not available! *pouts*');
        return;
    }

    // Example: Redraw a sample menu (replace with your actual UI rendering logic)
    const sampleButtons = ['Start', 'Options', 'Exit'];
    const buttonLayout = MENU_LAYOUTS.centerColumn(sampleButtons);
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    buttonLayout.forEach((button, index) => {
        drawStandardButton(context, button, sampleButtons[index], false);
    });
}

// Listen for theme changes
window.addEventListener('themeChanged', () => {
    redrawUI();
});

// Initialize glitch effects for 'evil' theme
function updateGlitchEffects() {
    if (themeManager.currentTheme.name === 'evil') {
        evilGlitchSystem.updateGlitchEffects(0.5); // Adjust intensity as needed
        setTimeout(updateGlitchEffects, 100); // Update every 100ms
    }
}

// Start glitch effects if 'evil' theme is active
if (themeManager.currentTheme.name === 'evil') {
    updateGlitchEffects();
}