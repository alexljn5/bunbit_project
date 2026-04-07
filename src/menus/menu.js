import { compiledTextStyle } from "../debugtools.js";
import { setMenuActive } from "../gamestate.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { mapTable } from "../mapdata/maps.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { gameVersionNumber, gameName } from "../globals.js";

// Lazy getters to avoid circular dependency
function getRenderEngine() {
    if (window.__renderEngine) {
        return window.__renderEngine;
    }
    // Return a minimal fallback to prevent crashes
    return {
        canvas: null,
        drawImage: () => { },
        fillStyle: '#222',
        fillRect: () => { },
        fillText: () => { },
        strokeStyle: '#fff',
        strokeRect: () => { },
        font: '12px Arial',
        globalAlpha: 1.0,
        save: () => { },
        restore: () => { }
    };
}

function getPlayerPosition() {
    return window.__playerPosition || { x: 100, z: 100, y: 128, angle: 0 };
}

function getMainGameRender() {
    return window.__mainGameRender || (() => { });
}

function getInitializeRenderWorkers() {
    // Return the function from renderengine (imported dynamically)
    return window.__initializeRenderWorkers || (() => { });
}

let buttons = [
    { name: "Play", x: (CANVAS_WIDTH / 2 - 50 * SCALE_X), y: (CANVAS_HEIGHT / 2 - 200 * SCALE_Y), width: 100 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
    { name: "Maps", x: (CANVAS_WIDTH / 2 - 50 * SCALE_X), y: (CANVAS_HEIGHT / 2 - 80 * SCALE_Y), width: 100 * SCALE_X, height: 40 * SCALE_Y, hovered: false },
    { name: "Fractal", x: (CANVAS_WIDTH / 2 - 50 * SCALE_X), y: (CANVAS_HEIGHT / 2 + 40 * SCALE_Y), width: 100 * SCALE_X, height: 40 * SCALE_Y, hovered: false }
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
    const renderEngine = getRenderEngine();
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
    const renderEngine = getRenderEngine();
    compiledTextStyle();
    renderEngine.fillStyle = "#fff";
    renderEngine.fillText(gameName, CANVAS_WIDTH - 500 * SCALE_X, 100 * SCALE_X);
    renderEngine.fillText(`Version ${gameVersionNumber}`, CANVAS_WIDTH - 490 * SCALE_X, 150 * SCALE_X);
}

function menuButtons() {
    const renderEngine = getRenderEngine();
    buttons.forEach(button => {
        renderEngine.fillStyle = button.hovered ? "#555" : "#222";
        renderEngine.fillRect(button.x, button.y, button.width, button.height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(button.x, button.y, button.width, button.height);
        renderEngine.fillStyle = "#fff";
        compiledTextStyle();
        renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText(button.name, button.x + 20 * SCALE_X, button.y + 25 * SCALE_X);
    });
}

function drawMapSelectOverlay() {
    const renderEngine = getRenderEngine();
    renderEngine.save();
    renderEngine.globalAlpha = 0.95;
    renderEngine.fillStyle = "#111";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.globalAlpha = 1.0;
    renderEngine.fillStyle = "#fff";
    compiledTextStyle();
    renderEngine.font = `${24 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Select a Map", CANVAS_WIDTH / 2 - 80 * SCALE_X, 100 * SCALE_X);
    const mapNames = Array.from(mapTable.keys());
    mapButtons = mapNames.map((name, i) => {
        const width = 180 * SCALE_X;
        const height = 40 * SCALE_X;
        const x = (CANVAS_WIDTH / 2 - width / 2);
        const y = 180 * SCALE_X + i * (height + 20 * SCALE_X);
        renderEngine.fillStyle = (selectedMapName === name) ? "#444" : "#222";
        renderEngine.fillRect(x, y, width, height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(x, y, width, height);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText(name, x + 20 * SCALE_X, y + 25 * SCALE_X);
        return { name, x, y, width, height };
    });
    renderEngine.restore();
}

export function setupMenuClickHandler() {
    const renderEngine = getRenderEngine();
    const canvas = renderEngine.canvas;
    if (!canvas) {
        console.error('Canvas not ready for click handler! Retrying in 100ms... *pouts*');
        setTimeout(setupMenuClickHandler, 100); // Retry if canvas not ready
        return;
    }
    console.log('Setting up menu click handler! *chao chao*');
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
        e.preventDefault(); // Stop browser/Electron from eating clicks
        e.stopPropagation(); // Prevent bubbling to other elements
        console.log('Canvas clicked at:', e.clientX, e.clientY); // Debug click coords
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
                    const playerPos = getPlayerPosition();
                    console.log('Map button clicked:', btn.name); // Debug
                    selectedMapName = btn.name;
                    if (selectedMapName === "map_debug") {
                        playerPos.x = 10 * 50;
                        playerPos.z = 10 * 50;
                        playerPos.angle = 0;
                    } else if (selectedMapName === "map_01") {
                        playerPos.x = 2.5 * 50 / 2;
                        playerPos.z = 2.5 * 50 / 2;
                        playerPos.angle = 0;
                    } else if (selectedMapName === "map_02") {
                        playerPos.x = 1.5 * 50;
                        playerPos.z = 1.5 * 50;
                        playerPos.angle = 0;
                    }
                    try {
                        if (mapHandler.loadMap(selectedMapName, playerPos)) {
                            spriteManager.loadSpritesForMap(selectedMapName); // Load sprites
                            setMenuActive(false);
                            getMainGameRender()();
                            getInitializeRenderWorkers()();
                            showMapSelect = false;
                            console.log('Map loaded successfully:', selectedMapName); // Debug
                        } else {
                            console.error('Failed to load map:', selectedMapName);
                            getRenderEngine().fillStyle = "#f00";
                            getRenderEngine().fillText(`Failed to load ${selectedMapName}!`, CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT - 100 * SCALE_Y);
                        }
                    } catch (error) {
                        console.error('Error in map load or render:', error.message); // Catch errors
                        getRenderEngine().fillStyle = "#f00";
                        getRenderEngine().fillText(`Error: ${error.message}`, CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT - 100 * SCALE_Y);
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
                    console.log('Menu button clicked:', button.name); // Debug
                    if (button.name === "Play") {
                        const playerPos = getPlayerPosition();
                        selectedMapName = "map_01";
                        playerPos.x = 2.5 * 50 / 2;
                        playerPos.z = 2.5 * 50 / 2;
                        playerPos.angle = 0;
                        try {
                            if (mapHandler.loadMap(selectedMapName, playerPos)) {
                                spriteManager.loadSpritesForMap(selectedMapName); // Load sprites
                                setMenuActive(false);
                                getMainGameRender()();
                                getInitializeRenderWorkers()();
                                console.log('Play started, map loaded:', selectedMapName); // Debug
                            } else {
                                console.error('Failed to load map_01');
                                getRenderEngine().fillStyle = "#f00";
                                getRenderEngine().fillText("Failed to load map_01!", CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT - 100 * SCALE_Y);
                            }
                        } catch (error) {
                            console.error('Error in Play button:', error.message); // Catch errors
                            getRenderEngine().fillStyle = "#f00";
                            getRenderEngine().fillText(`Error: ${error.message}`, CANVAS_WIDTH / 2 - 80 * SCALE_X, CANVAS_HEIGHT - 100 * SCALE_Y);
                        }
                    } else if (button.name === "Fractal") {
                        // Toggle fractal overlay. Fractal canvas is non-interactive by default.
                        try {
                            if (window.__fractalActive) {
                                stopFractal();
                                console.log('Fractal stopped');
                            } else {
                                startFractal({ maxIter: 120 });
                                console.log('Fractal started');
                            }
                        } catch (err) {
                            console.error('Fractal toggle error:', err);
                        }
                    } else if (button.name === "Maps") {
                        showMapSelect = true;
                        selectedMapName = null;
                        console.log('Maps button clicked, showing map select'); // Debug
                    }
                }
            });
        }
    };
}

// Wait for DOM content loaded to ensure all modules (like renderEngine) are ready
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing menu handlers... *chao chao*');
    function initMenuHandlers() {
        const renderEngine = getRenderEngine();
        if (!renderEngine || !renderEngine.canvas) {
            console.warn('renderEngine or canvas not ready, retrying in 100ms... *pouts*');
            setTimeout(initMenuHandlers, 100);
            return;
        }
        setupMenuClickHandler();
    }
    initMenuHandlers();
});

window.addEventListener('keydown', function (e) {
    if (e.key === 'F11') {
        e.preventDefault();
        const renderEngine = getRenderEngine();
        const canvas = renderEngine.canvas;
        if (!document.fullscreenElement) {
            // Request fullscreen on the container that holds canvas and overlays so DOM overlays stay interactive
            const container = canvas ? (canvas.closest('.game-container') || canvas.parentElement) : null;
            const target = container || canvas || document.documentElement;
            try {
                if (target.requestFullscreen) {
                    target.requestFullscreen();
                } else if (target.webkitRequestFullscreen) {
                    target.webkitRequestFullscreen();
                } else if (target.mozRequestFullScreen) {
                    target.mozRequestFullScreen();
                } else if (target.msRequestFullscreen) {
                    target.msRequestFullscreen();
                }
            } catch (err) {
                console.error('Failed to request fullscreen on container, falling back to canvas:', err);
                if (canvas && canvas.requestFullscreen) canvas.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    }
});