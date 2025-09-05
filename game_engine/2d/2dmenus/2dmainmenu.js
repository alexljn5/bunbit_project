import {
    MENU_COLORS,
    MENU_FONTS,
    MENU_LAYOUTS,
    drawStandardButton,
    drawText,
    centerText
} from "../../menus/menupresets.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";

let menuButtons = [];
let selectedButton = null;

export function init2DMainMenu() {
    // Create menu buttons using the centerColumn layout
    menuButtons = MENU_LAYOUTS.centerColumn([
        { name: "Play 2D Game", action: "play" },
        { name: "Settings", action: "settings" },
        { name: "Credits", action: "credits" },
        { name: "Back to 3D", action: "back" }
    ]);

    // Add hover property to each button
    menuButtons = menuButtons.map(button => ({
        ...button,
        hovered: false
    }));
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