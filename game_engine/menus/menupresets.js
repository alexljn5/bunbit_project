import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

// Color schemes
export const MENU_COLORS = {
    primary: {
        background: "#222",
        text: "#fff",
        hover: "#555",
        accent: "#444",
        error: "#f00"
    },
    overlay: {
        dark: "rgba(0, 0, 0, 0.8)",
        medium: "rgba(0, 0, 0, 0.6)",
        light: "rgba(0, 0, 0, 0.4)"
    },
    ui: {
        healthBar: "#ff0000",
        staminaBar: "#00ff00",
        ammoCounter: "#ffff00"
    },
    buttons: {
        normal: "#222",
        hover: "#555",
        active: "#666",
        border: "#fff"
    }
};

// Font configurations
export const MENU_FONTS = {
    title: () => `${32 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    subtitle: () => `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    button: () => `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    body: () => `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`,
    small: () => `${14 * Math.min(SCALE_X, SCALE_Y)}px Arial`
};

// Standard button dimensions
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

// Dialog box presets
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

// Menu layouts
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
    // Debug log to verify button properties
    console.log(`Button properties:`, {
        x: button.x,
        y: button.y,
        width: button.width,
        height: button.height,
        text: text,
        isHovered: isHovered
    });

    // Draw button background
    context.fillStyle = isHovered ? MENU_COLORS.buttons.hover : MENU_COLORS.buttons.normal;
    context.fillRect(button.x, button.y, button.width, button.height);

    // Draw button border
    context.strokeStyle = MENU_COLORS.buttons.border;
    context.strokeRect(button.x, button.y, button.width, button.height);

    // Draw button text
    context.fillStyle = MENU_COLORS.primary.text;
    context.font = MENU_FONTS.button();
    const textX = button.x + (button.width * 0.1); // 10% padding from left
    const textY = button.y + (button.height * 0.6); // 60% down for vertical centering
    context.fillText(text, textX, textY);
}

export function drawDialogBox(context, box, alpha = 0.8) {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = MENU_COLORS.primary.background;
    context.fillRect(box.x, box.y, box.width, box.height);
    context.globalAlpha = 1;
    context.strokeStyle = MENU_COLORS.primary.text;
    context.strokeRect(box.x, box.y, box.width, box.height);
    context.restore();
}

export function drawText(context, text, x, y, font = MENU_FONTS.body(), color = MENU_COLORS.primary.text) {
    context.fillStyle = color;
    context.font = font;
    context.fillText(text, x, y);
}

// Utility function for centering text
export function centerText(context, text, y, font = MENU_FONTS.body()) {
    context.font = font;
    const textWidth = context.measureText(text).width;
    return {
        x: (CANVAS_WIDTH - textWidth) / 2,
        y: y
    };
}

// Animation presets
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
