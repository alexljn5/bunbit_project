import { renderEngine, CANVAS_WIDTH, CANVAS_HEIGHT } from "./renderengine.js";
import { compiledTextStyle } from "./debugtools.js";

export function mainGameMenu() {
    menuBackGround();
    menuSimpleText();
    menuButtons();
}

function menuBackGround() {
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function menuSimpleText() {
    compiledTextStyle();
    renderEngine.fillText("Idle Test 2.5D", CANVAS_WIDTH - 600, 100);
    renderEngine.fillText("Version Alpha 0.0.3", CANVAS_WIDTH - 630, 150);
}

function menuButtons() {
    playButton();
    mapsButton();
}

function playButton() {
    const buttonX = CANVAS_WIDTH / 2;
    const buttonY = CANVAS_HEIGHT / 2;
    compiledTextStyle();
    renderEngine.fillRect(buttonX, buttonY, 100, 40);
    renderEngine.fillText("Play", buttonX - 35, buttonY + 25);
}

function mapsButton() {
    const buttonX = CANVAS_WIDTH / 2;
    const buttonY = CANVAS_HEIGHT / 2;
    compiledTextStyle();
    renderEngine.fillRect(buttonX, buttonY, 100, 40);
    renderEngine.fillText("Maps", buttonX + 155, buttonY + 70);
}