import { gameLoop } from "../main_game.js";
import { playerLogic, playerPosition, showDebugTools, gameOver, onRespawn, keys } from "../playerdata/playerlogic.js";
import { drawRespawnMenu } from "../menus/menurespawn.js";
import { playerInventoryGodFunction } from "../playerdata/playerinventory.js";
import { compiledDevTools } from "../debugtools.js";
import { tileSectors } from "../mapdata/maps.js";
import { castRays } from "./raycasting.js";
import { drawSprites } from "./sprites/rendersprites.js";
import { mainGameMenu, setupMenuClickHandler } from "../menus/menu.js";
import { texturesLoaded } from "../mapdata/maptexturesloader.js";
import { playerUI } from "../playerdata/playerui.js";
import { collissionGodFunction } from "../collissiondetection/collissionlogichandler.js";
import { enemyAiGodFunction, friendlyAiGodFunction } from "../ai/aihandler.js";
import { menuActive, setMenuActive, isPaused, setPaused } from "../gamestate.js";
import { playMusicGodFunction } from "../audio/audiohandler.js";
import { menuHandler } from "../menus/menuhandler.js";
import { animationHandler } from "../animations/animationhandler.js";
import { introActive, newGameStartAnimation } from "../animations/newgamestartanimation.js";
import { itemHandlerGodFunction } from "../itemhandler/itemhandler.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { eventHandler } from "../events/eventhandler.js";
import { decorationHandlerGodFunction } from "../decorationhandler/decorationhandler.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { consoleHandler } from "../console/consolehandler.js";
import { renderRaycastWalls } from "./renderwalls.js";
import { interactionHandlerGodFunction } from "../interactions/interactionhandler.js";
import { renderRaycastHorizons } from "./renderhorizons.js";
import { soundHandlerGodFunction } from "../audio/soundhandler.js";
import { showTerminal } from "../console/terminal/terminal.js";
import { debugHandlerGodFunction, drawDebugTerminal } from "../debug/debughandler.js";
import { titleHandlerGodFunction } from "../ui/titlehandler.js";

// --- DOM Elements ---
const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
};

export const renderEngine = domElements.mainGameRender.getContext("2d");
renderEngine.imageSmoothingEnabled = false;

const offscreenCanvas = document.createElement("canvas");
offscreenCanvas.width = CANVAS_WIDTH;
offscreenCanvas.height = CANVAS_HEIGHT;
const offscreenCtx = offscreenCanvas.getContext("2d");
offscreenCtx.imageSmoothingEnabled = false;

export let game = null;
let isRenderingFrame = false;
let renderWorkersInitialized = false;

const renderWorker1 = new Worker("/game_engine/rendering/renderworkers/renderengineworker.js", { type: "module" });
const renderWorker2 = new Worker("/game_engine/rendering/renderworkers/renderengineworker.js", { type: "module" });

// --- Game Loop Setup ---
export function mainGameRender() {
    game = gameLoop(gameRenderEngine);
}

function renderPauseMenu() {
    renderEngine.save();
    renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${32 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.textAlign = "center";
    renderEngine.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);
    renderEngine.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Press ESC or P to resume", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    renderEngine.fillText("Press M to return to main menu", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    renderEngine.restore();
}

// --- Render Engine ---
export async function gameRenderEngine(deltaTime) {
    titleHandlerGodFunction();
    drawDebugTerminal(); // just draw logs, terminal setup already done

    if (isRenderingFrame) return;
    isRenderingFrame = true;
    console.time('fullRender');

    try {
        if (menuActive) {
            mainGameMenu();
            return;
        }

        if (!introActive) {
            newGameStartAnimation();
            return;
        }

        if (!showTerminal && (keys["Escape"] || keys["p"])) {
            setPaused(!isPaused);
            keys["Escape"] = false;
            keys["p"] = false;
        }

        if (isPaused && keys["m"]) {
            setPaused(false);
            setMenuActive(true);
            keys["m"] = false;
        }

        menuHandler();
        if (!mapHandler.activeMapKey) {
            console.log("No active map, loading map_01 *twirls*");
            mapHandler.loadMap("map_01", playerPosition);
        }

        const rayData = await castRays();
        if (!rayData || rayData.every(ray => ray === null)) {
            console.warn(`Invalid rayData: ${JSON.stringify(rayData)} *pouts*`);
            renderEngine.fillStyle = "gray";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            return;
        }

        offscreenCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        await renderRaycastHorizons(rayData, offscreenCtx);

        // Draw offscreen canvas to main
        const offscreenImageData = offscreenCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.putImageData(offscreenImageData, 0, 0);

        renderRaycastWalls(rayData);
        decorationHandlerGodFunction();
        drawSprites(rayData);
        eventHandler();

        if (showDebugTools) compiledDevTools();

        if (!isPaused) {
            playerLogic();
            playerInventoryGodFunction();
            itemHandlerGodFunction();
            collissionGodFunction();
            friendlyAiGodFunction();
            enemyAiGodFunction();
            interactionHandlerGodFunction();
        }

        playerUI();
        playMusicGodFunction();
        soundHandlerGodFunction();
        consoleHandler();

        if (gameOver) {
            drawRespawnMenu(renderEngine.canvas, onRespawn);
        }

        if (isPaused) {
            renderPauseMenu();
        }

    } catch (error) {
        console.error("gameRenderEngine error:", error);
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } finally {
        isRenderingFrame = false;
        console.timeEnd('fullRender');
    }
}

// --- Draw Quad ---
export function drawQuad({ topX, topY, leftX, leftY, rightX, rightY, color, texture, textureX, alpha = 1.0 }) {
    renderEngine.save();
    renderEngine.globalAlpha = alpha;
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
    renderEngine.restore();
}

// --- Render Workers ---
function initializeRenderWorkers() {
    if (renderWorkersInitialized) return;
    const staticData = { type: "init", tileSectors, CANVAS_HEIGHT, CANVAS_WIDTH };
    renderWorker1.postMessage(staticData);
    renderWorker2.postMessage(staticData);
    renderWorkersInitialized = true;
}

export function cleanupRenderWorkers() {
    renderWorker1.terminate();
    renderWorker2.terminate();
    renderWorkersInitialized = false;
}

export { initializeRenderWorkers };

// --- Debug Terminal Setup (called once) ---
debugHandlerGodFunction(); // <--- only setup once at startup
