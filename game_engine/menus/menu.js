import { renderEngine, mainGameRender, initializeRenderWorkers } from "../renderengine.js";
import { compiledTextStyle } from "../debugtools.js";
import { setMenuActive } from "../gamestate.js";
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 800;

let buttons = [
    { name: "Play", x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT / 2 - 200, width: 100, height: 40, hovered: false },
    { name: "Maps", x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT / 2 - 80, width: 100, height: 40, hovered: false }
];

export function mainGameMenu() {
    menuBackGround();
    menuSimpleText();
    menuButtons();
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
    renderEngine.fillText("Idle Test 2.5D", CANVAS_WIDTH - 500, 100);
    renderEngine.fillText("Version Alpha 0.0.3", CANVAS_WIDTH - 530, 150);
}

function menuButtons() {
    buttons.forEach(button => {
        renderEngine.fillStyle = button.hovered ? "#555" : "#222";
        renderEngine.fillRect(button.x, button.y, button.width, button.height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(button.x, button.y, button.width, button.height);
        renderEngine.fillStyle = "#fff";
        compiledTextStyle();
        renderEngine.fillText(button.name, button.x + 20, button.y + 25);
    });
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
        buttons.forEach(button => {
            button.hovered = (
                mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height
            );
        });
    };
    canvas.onclick = function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        buttons.forEach(button => {
            if (
                mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height
            ) {
                if (button.name === "Play") {
                    setMenuActive(false);
                    mainGameRender();
                    initializeRenderWorkers();
                } else if (button.name === "Maps") {
                    renderEngine.fillStyle = "#000";
                    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    renderEngine.fillStyle = "#fff";
                    compiledTextStyle();
                    renderEngine.fillText("Maps Screen (Coming Soon!)", CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2);
                }
            }
        });
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