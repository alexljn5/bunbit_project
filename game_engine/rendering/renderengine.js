// renderengine.js
import { gameLoop } from "../main_game.js";
import { playerLogic, playerPosition, showDebugTools, gameOver, onRespawn } from "../playerdata/playerlogic.js";
import { drawRespawnMenu } from "../menus/menurespawn.js";
import { playerInventoryGodFunction } from "../playerdata/playerinventory.js";
import { compiledDevTools } from "../debugtools.js";
import { tileSectors } from "../mapdata/maps.js";
import { castRays, numCastRays, playerFOV, initializeMap } from "./raycasting.js";
import { drawSprites } from "./sprites/rendersprites.js";
import { mainGameMenu, setupMenuClickHandler } from "../menus/menu.js";
import { texturesLoaded, tileTexturesMap, getDemonLaughingCurrentFrame } from "../mapdata/maptexturesloader.js";
import { playerUI } from "../playerdata/playerui.js";
import { collissionGodFunction } from "../collissiondetection/collissionlogichandler.js";
import { enemyAiGodFunction, friendlyAiGodFunction } from "../ai/aihandler.js";
import { menuActive, setMenuActive, isPaused, setPaused } from "../gamestate.js";
import { playMusicGodFunction } from "../audio/audiohandler.js";
import { menuHandler } from "../menus/menuhandler.js";
import { animationHandler } from "../animations/animationhandler.js";
import { introActive, newGameStartAnimation } from "../animations/newgamestartanimation.js";
import { itemHandlerGodFunction } from "../itemhandler/itemhandler.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fastSin, fastCos, Q_rsqrt } from "../globals.js";
import { eventHandler } from "../events/eventhandler.js";
import { decorationHandlerGodFunction } from "../decorationhandler/decorationhandler.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { renderRaycastFloors } from "./renderfloors.js";
import { consoleHandler } from "../console/consolehandler.js";
import { flickeringEffect } from "../atmosphere/flickerlogic.js";
import { keys } from "../playerdata/playerlogic.js";
import { SCALE_X, SCALE_Y } from "../globals.js";

// --- DOM Elements ---
const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
    playGameButton: document.getElementById("playGameButton"),
    stopGameButton: document.getElementById("stopGameButton"),
    debugGameButton: document.getElementById("debugGameButton"),
};

export const renderEngine = domElements.mainGameRender.getContext("2d");

export let game = null;
let isRenderingFrame = false;
let renderWorkersInitialized = false;

const renderWorker1 = new Worker("/game_engine/rendering/renderworkers/renderengineworker.js", { type: "module" });
const renderWorker2 = new Worker("/game_engine/rendering/renderworkers/renderengineworker.js", { type: "module" });

// --- Button Handlers ---
domElements.playGameButton.onclick = function () {
    setMenuActive(true);
    setupMenuClickHandler();
    if (!game) mainGameRender();
    game.start();
};

domElements.stopGameButton.onclick = function () {
    if (game) {
        game.stop();
        // Reset game state
        isRenderingFrame = false;
        setMenuActive(true); // Show main menu
        setDialogueActive(false); // Reset BoyKisser dialogue
        setPlayerMovementDisabled(false); // Re-enable player movement
        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear canvas
        cleanupRenderWorkers(); // Terminate workers
        console.log("Game stopped via stop button! *chao chao*");
    } else {
        console.warn("No game instance to stop! *tilts head*");
    }
};

domElements.debugGameButton && (domElements.debugGameButton.onclick = () => {
    showDebugTools = !showDebugTools;
});

export function mainGameRender() {
    game = gameLoop(gameRenderEngine);
}

// Main game render loop
function renderPauseMenu() {
    renderEngine.save();
    // Semi-transparent dark overlay
    renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pause menu text
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${32 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.textAlign = "center";

    // Title
    renderEngine.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);

    // Instructions
    renderEngine.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Press ESC or P to resume", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    renderEngine.fillText("Press M to return to main menu", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    renderEngine.restore();
}

async function gameRenderEngine() {
    if (isRenderingFrame) return;
    isRenderingFrame = true;
    try {
        if (menuActive) {
            mainGameMenu();
            isRenderingFrame = false;
            return;
        }

        // Handle pause input
        if (keys["Escape"] || keys["p"]) {
            setPaused(!isPaused);
            keys["Escape"] = false;
            keys["p"] = false;
        }

        // Handle return to menu from pause
        if (isPaused && keys["m"]) {
            setPaused(false);
            setMenuActive(true);
            keys["m"] = false;
        }
        /*
        if (introActive) {
            newGameStartAnimation();
            isRenderingFrame = false;
            return;
        }
        animationHandler();
        */
        menuHandler();
        // Ensure map is initialized
        if (!mapHandler.activeMapKey) {
            console.log("No active map, loading map_01 *twirls*");
            mapHandler.loadMap("map_01", playerPosition);
        }
        let rayData = await castRays();
        if (!rayData || rayData.every(ray => ray === null)) {
            console.warn(`Invalid rayData: ${JSON.stringify(rayData)} *pouts*`);
            renderEngine.fillStyle = "gray";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            isRenderingFrame = false;
            return;
        }
        await renderRaycastFloors();
        renderRaycastWalls(rayData);
        decorationHandlerGodFunction();
        drawSprites(rayData);
        eventHandler();
        if (showDebugTools) compiledDevTools();

        // Only update game state if not paused
        if (!isPaused) {
            playerLogic();
            playerInventoryGodFunction();
            itemHandlerGodFunction();
            collissionGodFunction();
            friendlyAiGodFunction();
            enemyAiGodFunction();
        }

        // Always render UI and handle console
        playerUI();
        playMusicGodFunction();
        consoleHandler();

        // Render respawn menu if game over
        if (gameOver) {
            drawRespawnMenu(renderEngine.canvas, onRespawn);
        }

        // Render pause menu if paused
        if (isPaused) {
            renderPauseMenu();
        }
        //flickeringEffect();
    } catch (error) {
        console.error("gameRenderEngine error:", error);
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } finally {
        isRenderingFrame = false;
    }
}

// --- Utility Functions ---

function drawQuad({ topX, topY, leftX, leftY, rightX, rightY, color, texture, textureX }) {
    renderEngine.beginPath();
    renderEngine.moveTo(topX, topY);
    renderEngine.lineTo(leftX, leftY);
    renderEngine.lineTo(rightX, rightY);
    renderEngine.closePath();
    if (texture && textureX !== undefined && texturesLoaded) {
        const destWidth = rightX - leftX;
        renderEngine.drawImage(
            texture,
            textureX * texture.width, 0, 1, texture.height,
            leftX, topY, destWidth, rightY - topY
        );
    } else {
        renderEngine.fillStyle = color;
        renderEngine.fill();
    }
}

function initializeRenderWorkers() {
    if (renderWorkersInitialized) return;
    const staticData = {
        type: "init",
        tileSectors,
        CANVAS_HEIGHT,
        CANVAS_WIDTH
    };
    renderWorker1.postMessage(staticData);
    renderWorker2.postMessage(staticData);
    renderWorkersInitialized = true;
}

function cleanupRenderWorkers() {
    renderWorker1.terminate();
    renderWorker2.terminate();
    renderWorkersInitialized = false;
}

// --- Raycast Rendering ---
function renderRaycastWalls(rayData) {
    if (!texturesLoaded) {
        console.warn("Textures not loaded, rendering gray walls *pouts*");
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        return;
    }
    const colWidth = CANVAS_WIDTH / numCastRays;
    for (let i = 0; i < rayData.length; i++) {
        const ray = rayData[i];
        if (!ray) continue;
        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
        const wallBottom = wallTop + wallHeight;
        let textureX = ray.hitSide === "x"
            ? (ray.hitX % tileSectors) / tileSectors
            : (ray.hitY % tileSectors) / tileSectors;
        textureX = Math.max(0, Math.min(1, textureX));
        let texture = tileTexturesMap.get(ray.textureKey) || tileTexturesMap.get("wall_creamlol");
        if (ray.textureKey === "wall_laughing_demon") {
            texture = getDemonLaughingCurrentFrame() || tileTexturesMap.get("wall_creamlol");
        }
        if (!texture) {
            console.warn(`Missing wall texture: ${ray.textureKey} *tilts head*`);
            continue;
        }
        drawQuad({
            topX: i * colWidth,
            topY: wallTop,
            leftX: i * colWidth,
            leftY: wallBottom,
            rightX: (i + 1) * colWidth,
            rightY: wallBottom,
            color: "gray",
            texture,
            textureX
        });
    }
}

export { initializeRenderWorkers };