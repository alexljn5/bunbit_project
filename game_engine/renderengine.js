import { gameLoop } from "./main_game.js";
import { playerVantagePointX, playerVantagePointY, playerLogic, playerPosition, showDebugTools } from "./playerdata/playerlogic.js";
import { playerInventoryGodFunction } from "./playerdata/playerinventory.js";
import { compiledDevTools, compiledTextStyle } from "./debugtools.js";
import { mapTable, tileSectors } from "./mapdata/maps.js";
import { castRays, cleanupWorkers, numCastRays, playerFOV } from "./raycasting.js";
import { drawSprites } from "./rendersprites.js";
import { mainGameMenu, setupMenuClickHandler } from "./menus/menu.js";
import { texturesLoaded, tileTexturesMap, getDemonLaughingCurrentFrame } from "./mapdata/maptextures.js";
import { playerUI } from "./playerdata/playerui.js";
import { collissionGodFunction } from "./colissiondetection/collissionlogic.js";
import { enemyAiGodFunction } from "./ai/enemyai.js";
import { boyKisserNpcAIGodFunction } from "./ai/boykissernpc.js";
import { menuActive, setMenuActive } from "./gameState.js";
import { playMusicGodFunction } from "./audio/audiohandler.js";
import { gunHandlerGodFunction } from "./itemhandler/gunhandler.js";
import { menuHandler } from "./menus/menuhandler.js";
import { animationHandler } from "./animations/animationhandler.js";
import { introActive } from "./animations/newgamestartanimation.js";


// --- DOM Elements ---
const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
    playGameButton: document.getElementById("playGameButton"),
    debugGameButton: document.getElementById("debugGameButton"),
};

export const renderEngine = domElements.mainGameRender.getContext("2d");
export const CANVAS_WIDTH = domElements.mainGameRender.width;
export const CANVAS_HEIGHT = domElements.mainGameRender.height;

let game = null;
let isRenderingFrame = false;
let renderWorkersInitialized = false;
let floorWorkerFrameId = 0;
const floorWorkerPending = new Map();

const renderWorker1 = new Worker("./workers/renderengineworker.js", { type: "module" });
const renderWorker2 = new Worker("./workers/renderengineworker.js", { type: "module" });
const floorWorker = new Worker("./workers/renderfloorworker.js", { type: "module" });

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

// --- Main Render Loop ---
async function gameRenderEngine() {
    if (isRenderingFrame) return;
    isRenderingFrame = true;
    try {
        if (menuActive) {
            mainGameMenu();
            isRenderingFrame = false;
            return;
        }
        menuHandler();
        let rayData = await castRays();
        if (!rayData || rayData.every(ray => ray === null)) {
            renderEngine.fillStyle = "red";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            return;
        }
        drawBackground();
        if (introActive) {
            animationHandler();
            isRenderingFrame = false;
            return;
        }
        await renderRaycastWalls(rayData);
        await renderRaycastFloors(rayData);
        //drawSprites(rayData);
        if (showDebugTools) compiledDevTools();
        playerLogic();
        playerInventoryGodFunction();
        gunHandlerGodFunction();
        playerUI();
        collissionGodFunction();
        boyKisserNpcAIGodFunction();
        //enemyAiGodFunction();
        //playMusicGodFunction();
    } catch (error) {
        console.error("gameRenderEngine error:", error);
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
        if (!texture) continue;
        drawQuad({
            topX: i * colWidth,
            topY: wallTop,
            leftX: i * colWidth,
            leftY: wallBottom,
            rightX: (i + 1) * colWidth,
            rightY: wallBottom,
            color: "red",
            texture,
            textureX
        });
    }
}

floorWorker.onmessage = (e) => {
    const { frameId, floorPixels } = e.data;
    if (floorWorkerPending.has(frameId)) {
        floorWorkerPending.get(frameId)(floorPixels);
        floorWorkerPending.delete(frameId);
    }
};

async function renderRaycastFloors(rayData) {
    if (!texturesLoaded) {
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        return;
    }
    floorWorkerFrameId++;
    const frameId = floorWorkerFrameId;
    const playerX = playerPosition.x;
    const playerZ = playerPosition.z;
    const playerAngleVal = playerPosition.angle;
    const floorTextures = {};
    tileTexturesMap.forEach((tex, key) => { floorTextures[key] = { width: tex.width, height: tex.height }; });
    const msg = {
        rayData,
        playerX,
        playerZ,
        playerAngle: playerAngleVal,
        playerFOV,
        tileSectors,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        numCastRays,
        floorTextures,
        frameId
    };
    const floorPromise = new Promise((resolve) => {
        floorWorkerPending.set(frameId, resolve);
    });
    floorWorker.postMessage(msg);
    const floorPixels = await floorPromise;
    const colWidth = CANVAS_WIDTH / numCastRays;
    for (let x = 0; x < floorPixels.length; x++) {
        const col = floorPixels[x];
        if (!col || !col.data || !col.texKey) continue;
        const texture = tileTexturesMap.get(col.texKey);
        if (!texture) continue;
        const arr = col.data;
        for (let i = 0; i < arr.length; i += 3) {
            const y = arr[i];
            const texX = arr[i + 1];
            const texY = arr[i + 2];
            const texPx = Math.floor(texX * texture.width);
            const texPy = Math.floor(texY * texture.height);
            renderEngine.drawImage(
                texture,
                texPx, texPy, 1, 1,
                x * colWidth, y, colWidth, 2
            );
        }
    }
}

// Export mainGameRender and initializeRenderWorkers for menu.js
export { initializeRenderWorkers };