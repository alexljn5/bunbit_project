import { renderEngine, mainGameRender, initializeRenderWorkers } from "../rendering/renderengine.js";
import { compiledTextStyle } from "../debugtools.js";
import { setMenuActive } from "../gamestate.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { mapTable } from "../mapdata/maps.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { playerPosition } from "../playerdata/playerlogic.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { gameVersionNumber, gameName } from "../globals.js";

let buttons = [
    { name: "Play", x: (CANVAS_WIDTH / 2 - 50 * SCALE_X), y: (CANVAS_HEIGHT / 2 - 200 * SCALE_Y), width: 100 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
    { name: "Maps", x: (CANVAS_WIDTH / 2 - 50 * SCALE_X), y: (CANVAS_HEIGHT / 2 - 80 * SCALE_Y), width: 100 * SCALE_X, height: 40 * SCALE_Y, hovered: false }
];

let showMapSelect = false;
let mapButtons = [];
let selectedMapName = null;

export function mainGameMenu() {
    menuBackGround();
    menuSimpleText();
    if (showMapSelect) {
        drawMapSelectOverlay();
    } else {
        menuButtons();
    }
}

let menuBackgroundImage = null;
let menuBackgroundLoaded = false;
function menuBackGround() {
    if (!menuBackgroundImage) {
        menuBackgroundImage = new Image();
        menuBackgroundImage.src = "./img/menu/goon.png";
        menuBackgroundImage.onload = () => {
            menuBackgroundLoaded = true;
        };
    }
    if (menuBackgroundLoaded) {
        renderEngine.drawImage(menuBackgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        renderEngine.fillStyle = '#222';
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

function menuSimpleText() {
    compiledTextStyle();
    renderEngine.fillStyle = "#fff";
    renderEngine.fillText(gameName, CANVAS_WIDTH - 500 * SCALE_X, 100 * SCALE_Y);
    renderEngine.fillText(`Version ${gameVersionNumber}`, CANVAS_WIDTH - 490 * SCALE_X, 150 * SCALE_Y);
}

function menuButtons() {
    buttons.forEach(button => {
        renderEngine.fillStyle = button.hovered ? "#555" : "#222";
        renderEngine.fillRect(button.x, button.y, button.width, button.height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(button.x, button.y, button.width, button.height);
        renderEngine.fillStyle = "#fff";
        compiledTextStyle();
        renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText(button.name, button.x + 20 * SCALE_X, button.y + 25 * SCALE_Y);
    });
}

function drawMapSelectOverlay() {
    renderEngine.save();
    renderEngine.globalAlpha = 0.95;
    renderEngine.fillStyle = "#111";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "#fff";
    compiledTextStyle();
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Select a Map", CANVAS_WIDTH / 2 - 80 * SCALE_X, 100 * SCALE_Y);
    const mapNames = Array.from(mapTable.keys());
    mapButtons = mapNames.map((name, i) => {
        const width = 180 * SCALE_X;
        const height = 40 * SCALE_Y;
        const x = (CANVAS_WIDTH / 2 - width / 2);
        const y = 180 * SCALE_Y + i * (height + 20 * SCALE_Y);
        renderEngine.fillStyle = (selectedMapName === name) ? "#444" : "#222";
        renderEngine.fillRect(x, y, width, height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(x, y, width, height);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText(name, x + 20 * SCALE_X, y + 25 * SCALE_Y);
        return { name, x, y, width, height };
    });
    renderEngine.restore();
}

export function setupMenuClickHandler() {
    const canvas = renderEngine.canvas;
    if (!canvas) return;
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        if (showMapSelect) {
            mapButtons.forEach(btn => {
                btn.hovered = (
                    mouseX >= btn.x && mouseX <= btn.x + btn.width &&
                    mouseY >= btn.y && mouseY <= btn.y + btn.height
                );
            });
        } else {
            buttons.forEach(button => {
                button.hovered = (
                    mouseX >= button.x && mouseX <= button.x + button.width &&
                    mouseY >= button.y && mouseY <= button.y + button.height
                );
            });
        }
    };
    canvas.onclick = function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        if (showMapSelect) {
            for (let btn of mapButtons) {
                if (
                    mouseX >= btn.x && mouseX <= btn.x + btn.width &&
                    mouseY >= btn.y && mouseY <= btn.y + btn.height
                ) {
                    selectedMapName = btn.name;
                    if (selectedMapName === "map_debug") {
                        playerPosition.x = 10 * 50;
                        playerPosition.z = 10 * 50;
                        playerPosition.angle = 0;
                    } else if (selectedMapName === "map_01") {
                        playerPosition.x = 2.5 * 50 / 2;
                        playerPosition.z = 2.5 * 50 / 2;
                        playerPosition.angle = 0;
                    } else if (selectedMapName === "map_02") {
                        playerPosition.x = 1.5 * 50;
                        playerPosition.z = 1.5 * 50;
                        playerPosition.angle = 0;
                    }
                    if (mapHandler.loadMap(selectedMapName, playerPosition)) {
                        spriteManager.loadSpritesForMap(selectedMapName); // Load sprites for selected map
                        setMenuActive(false);
                        mainGameRender();
                        initializeRenderWorkers();
                        showMapSelect = false;
                    } else {
                        renderEngine.fillStyle = "#f00";
                        renderEngine.fillText(`Failed to load ${selectedMapName}!`, CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT - 100 * SCALE_Y);
                    }
                    return;
                }
            }
            showMapSelect = false;
        } else {
            buttons.forEach(button => {
                if (
                    mouseX >= button.x && mouseX <= button.x + button.width &&
                    mouseY >= button.y && mouseY <= button.y + button.height
                ) {
                    if (button.name === "Play") {
                        selectedMapName = "map_01";
                        playerPosition.x = 2.5 * 50 / 2;
                        playerPosition.z = 2.5 * 50 / 2;
                        playerPosition.angle = 0;
                        if (mapHandler.loadMap(selectedMapName, playerPosition)) {
                            spriteManager.loadSpritesForMap(selectedMapName); // Load sprites for default map
                            setMenuActive(false);
                            mainGameRender();
                            initializeRenderWorkers();
                        } else {
                            renderEngine.fillStyle = "#f00";
                            renderEngine.fillText("Failed to load map_01!", CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT - 100 * SCALE_Y);
                        }
                    } else if (button.name === "Maps") {
                        showMapSelect = true;
                        selectedMapName = null;
                    }
                }
            });
        }
    };
}

window.addEventListener('keydown', function (e) {
    if (e.key === 'F11') {
        e.preventDefault();
        const canvas = renderEngine.canvas;
        if (!document.fullscreenElement) {
            if (canvas.requestFullscreen) canvas.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    }
});