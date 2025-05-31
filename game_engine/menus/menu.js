import { renderEngine, mainGameRender, initializeRenderWorkers } from "../renderengine.js";
import { compiledTextStyle } from "../debugtools.js";
import { menuActive, setMenuActive } from "../gameState.js";
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 800;

console.log("menu.js loaded"); // DEBUG: script loaded

let buttons = [
    { name: "Play", x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT / 2 - 200, width: 100, height: 40, hovered: false },
    { name: "Maps", x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT / 2 - 80, width: 100, height: 40, hovered: false }
];

export function mainGameMenu() {
    console.log("mainGameMenu called, menuActive:", menuActive); // DEBUG
    menuBackGround();
    menuSimpleText();
    menuButtons();
}

let menuBackgroundImage = null;
let menuBackgroundLoaded = false;
function menuBackGround() {
    if (!menuBackgroundImage) {
        menuBackgroundImage = new Image();
        menuBackgroundImage.src = "./img/menu/cream_ascii.png";
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
    if (!canvas) {
        console.error("Canvas not found! Click handler not attached.");
        return;
    }
    canvas.style.border = "3px solid red"; // DEBUG
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
        console.log("Canvas onclick handler fired, menuActive:", menuActive); // DEBUG
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        console.log("Canvas click at:", mouseX, mouseY);

        buttons.forEach(button => {
            if (
                mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height
            ) {
                console.log(`DEBUG: ${button.name} button clicked at`, mouseX, mouseY);
                if (button.name === "Play") {
                    console.log("Before setMenuActive(false), menuActive:", menuActive); // DEBUG
                    setMenuActive(false);
                    console.log("After setMenuActive(false), menuActive:", menuActive); // DEBUG
                    mainGameRender();
                    initializeRenderWorkers();
                } else if (button.name === "Maps") {
                    console.log("Maps button action triggered!");
                    renderEngine.fillStyle = "#000";
                    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    renderEngine.fillStyle = "#fff";
                    compiledTextStyle();
                    renderEngine.fillText("Maps Screen (Coming Soon!)", CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2);
                }
            }
        });
    };
    console.log("setupMenuClickHandler attached to canvas", canvas); // DEBUG
}

// Optional: F11 toggles fullscreen
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