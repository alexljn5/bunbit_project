import {
    MENU_COLORS,
    MENU_FONTS,
    drawStandardButton,
    drawText,
    centerText
} from "../../menus/menupresets.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";

let menuButtons = [];
let selectedButton = null;

export function init2DMainMenu() {
    console.log("Initializing 2D menu... *twirls*");
    // Fallback centerColumn implementation
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonSpacing = 20;
    const startY = CANVAS_HEIGHT / 2 - 100;

    menuButtons = [
        { name: "Play 2D Game", action: "play" },
        { name: "Settings", action: "settings" },
        { name: "Credits", action: "credits" },
        { name: "Back to 3D", action: "back" }
    ].map((button, index) => ({
        name: button.name,
        action: button.action,
        x: (CANVAS_WIDTH - buttonWidth) / 2,
        y: startY + index * (buttonHeight + buttonSpacing),
        width: buttonWidth,
        height: buttonHeight,
        hovered: false
    }));

    console.log("Menu buttons created:", menuButtons);
}

export function render2DMainMenu(context) {
    // Draw background
    context.fillStyle = MENU_COLORS.primary.background;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw title
    const titlePos = centerText(context, "IDLE TEST 2D", CANVAS_HEIGHT / 4, MENU_FONTS.title());
    drawText(context, "IDLE TEST 2D", titlePos.x, titlePos.y, MENU_FONTS.title());

    // Draw version
    const versionPos = centerText(context, "Alpha Version 0.0.1", titlePos.y + 40, MENU_FONTS.subtitle());
    drawText(context, "Alpha Version 0.0.1", versionPos.x, versionPos.y, MENU_FONTS.subtitle());

    // Draw buttons
    menuButtons.forEach(button => {
        console.log(`Drawing button: ${button.name} at ${button.x},${button.y}`);
        drawStandardButton(context, button, button.name, button.hovered);
    });
}

export function handle2DMenuClick(x, y) {
    for (const button of menuButtons) {
        if (x >= button.x &&
            x <= button.x + button.width &&
            y >= button.y &&
            y <= button.y + button.height) {
            selectedButton = button.action;
            console.log(`Button clicked: ${button.action} *chao chao*`);
            return button.action;
        }
    }
    return null;
}

export function handle2DMenuHover(x, y) {
    menuButtons.forEach(button => {
        button.hovered = (
            x >= button.x &&
            x <= button.x + button.width &&
            y >= button.y &&
            y <= button.y + button.height
        );
    });
}

export function getSelectedButton() {
    return selectedButton;
}

export function clearSelection() {
    selectedButton = null;
}