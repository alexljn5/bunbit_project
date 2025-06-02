import { gameLoop } from "./main_game.js";
import { playerLogic, playerPosition, showDebugTools } from "./playerdata/playerlogic.js";
import { playerInventoryGodFunction } from "./playerdata/playerinventory.js";
import { compiledDevTools } from "./debugtools.js";
import { tileSectors } from "./mapdata/maps.js";
import { castRays, cleanupWorkers, numCastRays, playerFOV } from "./raycasting.js";
import { drawSprites } from "./rendersprites.js";
import { mainGameMenu, setupMenuClickHandler } from "./menus/menu.js";
import { texturesLoaded, tileTexturesMap, getDemonLaughingCurrentFrame } from "./mapdata/maptextures.js";
import { playerUI } from "./playerdata/playerui.js";
import { collissionGodFunction } from "./collissiondetection/collissionlogichandler.js";
import { enemyAiGodFunction } from "./ai/aihandler.js";
import { boyKisserNpcAIGodFunction } from "./ai/friendlycat.js";
import { menuActive, setMenuActive } from "./gamestate.js";
import { playMusicGodFunction } from "./audio/audiohandler.js";
import { menuHandler } from "./menus/menuhandler.js";
import { animationHandler } from "./animations/animationhandler.js";
import { introActive } from "./animations/newgamestartanimation.js";
import { itemHandlerGodFunction } from "./itemhandler/itemhandler.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./globals.js";

// --- DOM Elements ---
const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
    playGameButton: document.getElementById("playGameButton"),
    debugGameButton: document.getElementById("debugGameButton"),
};

export const renderEngine = domElements.mainGameRender.getContext("2d");

let game = null;
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
        /*
        if (introActive) {
            animationHandler();
            isRenderingFrame = false;
            return;
        }
            */
        await renderRaycastWalls(rayData);
        await renderRaycastFloors(rayData);
        drawSprites(rayData);
        if (showDebugTools) compiledDevTools();
        playerLogic();
        playerInventoryGodFunction();
        itemHandlerGodFunction();
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

async function renderRaycastFloors(rayData) {
    if (!texturesLoaded) {
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        return;
    }
    const floorRayStep = 2; // Use every 2nd ray for 100 columns (numCastRays / 2)
    const colWidth = CANVAS_WIDTH / (numCastRays / floorRayStep);
    const projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
    const halfCanvasHeight = CANVAS_HEIGHT * 0.5;
    const halfTile = tileSectors * 0.5;
    const baseStep = 8; // Keep for performance
    const invTileSectors = 1 / tileSectors;

    // Precompute cos and sin for all rays to match worker
    const cosAngles = new Float32Array(numCastRays);
    const sinAngles = new Float32Array(numCastRays);
    const fovStep = playerFOV / numCastRays;
    let angle = playerPosition.angle - playerFOV / 2;
    for (let x = 0; x < numCastRays; ++x, angle += fovStep) {
        cosAngles[x] = Math.cos(angle);
        sinAngles[x] = Math.sin(angle);
    }

    for (let x = 0; x < numCastRays; x += floorRayStep) {
        const ray = rayData[x];
        if (!ray || !ray.floorTextureKey) continue;
        const texture = tileTexturesMap.get(ray.floorTextureKey);
        if (!texture) continue;

        const cosA = cosAngles[x];
        const sinA = sinAngles[x];
        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallBottom = (CANVAS_HEIGHT + wallHeight) * 0.5;
        let y = Math.min(Math.floor(wallBottom), CANVAS_HEIGHT);
        const yEnd = CANVAS_HEIGHT;
        if (y >= yEnd) continue;

        let rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
        let floorX = playerPosition.x + rowDistance * cosA;
        let floorY = playerPosition.z + rowDistance * sinA;
        let prevRowDistance = rowDistance;

        for (; y < yEnd; y += baseStep) {
            if (y !== Math.min(Math.floor(wallBottom), CANVAS_HEIGHT)) {
                rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
                const dr = rowDistance - prevRowDistance;
                floorX += dr * cosA;
                floorY += dr * sinA;
                prevRowDistance = rowDistance;
            }

            const texX = (floorX - Math.floor(floorX / tileSectors) * tileSectors) * invTileSectors;
            const texY = (floorY - Math.floor(floorY / tileSectors) * tileSectors) * invTileSectors;
            const texPx = Math.floor(texX * texture.width);
            const texPy = Math.floor(texY * texture.height);
            renderEngine.drawImage(
                texture,
                texPx, texPy, 1, 1, // Use 1x1 pixel sampling to match worker
                (x / floorRayStep) * colWidth, y, colWidth, baseStep
            );
        }
    }
}

// Export mainGame
export { initializeRenderWorkers };