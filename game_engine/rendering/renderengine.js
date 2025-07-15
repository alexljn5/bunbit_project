// renderengine.js
import { gameLoop } from "../main_game.js";
import { playerLogic, playerPosition, showDebugTools } from "../playerdata/playerlogic.js";
import { playerInventoryGodFunction } from "../playerdata/playerinventory.js";
import { compiledDevTools } from "../debugtools.js";
import { tileSectors } from "../mapdata/maps.js";
import { castRays, numCastRays, playerFOV, initializeMap } from "./raycasting.js";
import { drawSprites } from "./rendersprites.js";
import { mainGameMenu, setupMenuClickHandler } from "../menus/menu.js";
import { texturesLoaded, tileTexturesMap, getDemonLaughingCurrentFrame } from "../mapdata/maptexturesloader.js";
import { playerUI } from "../playerdata/playerui.js";
import { collissionGodFunction } from "../collissiondetection/collissionlogichandler.js";
import { enemyAiGodFunction, friendlyAiGodFunction } from "../ai/aihandler.js";
import { menuActive, setMenuActive } from "../gamestate.js";
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

// --- DOM Elements ---
const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
    playGameButton: document.getElementById("playGameButton"),
    debugGameButton: document.getElementById("debugGameButton"),
};

export const renderEngine = domElements.mainGameRender.getContext("2d");

export let game = null;
let isRenderingFrame = false;
let renderWorkersInitialized = false;

const renderWorker1 = new Worker("./workers/renderengineworker.js", { type: "module" });
const renderWorker2 = new Worker("./workers/renderengineworker.js", { type: "module" });

// --- Button Handlers ---
domElements.playGameButton.onclick = function () {
    setMenuActive(true);
    setupMenuClickHandler();
    if (!game) mainGameRender();
    game.start();
};

domElements.debugGameButton && (domElements.debugGameButton.onclick = () => {
    showDebugTools = !showDebugTools;
});

export function mainGameRender() {
    game = gameLoop(gameRenderEngine);
}

// Main game render loop
async function gameRenderEngine() {
    if (isRenderingFrame) return;
    isRenderingFrame = true;
    try {
        if (menuActive) {
            mainGameMenu();
            isRenderingFrame = false;
            return;
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
        drawBackground();
        await renderRaycastWalls(rayData);
        await renderRaycastFloors(rayData);
        decorationHandlerGodFunction();
        drawSprites(rayData);
        eventHandler();
        if (showDebugTools) compiledDevTools();
        playerLogic();
        playerInventoryGodFunction();
        itemHandlerGodFunction();
        playerUI();
        collissionGodFunction();
        friendlyAiGodFunction();
        enemyAiGodFunction();
        playMusicGodFunction();
        consoleHandler();
    } catch (error) {
        console.error("gameRenderEngine error:", error);
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } finally {
        isRenderingFrame = false;
    }
}

// --- Utility Functions ---
function drawBackground() {
    renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

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