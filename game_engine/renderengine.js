// renderengine.js
import { gameLoop } from "./main_game.js";
import { playerVantagePointX, playerVantagePointY, playerLogic, playerPosition } from "./playerdata/playerlogic.js";
import { playerInventoryGodFunction } from "./playerdata/playerinventory.js";
import { compiledDevTools, compiledTextStyle } from "./debugtools.js";
import { mapTable, tileSectors } from "./mapdata/maps.js";
import { castRays, cleanupWorkers, numCastRays, playerFOV, testAnimationFuckingAround } from "./raycasting.js"; // Import cleanupWorkers
import { drawSprites } from "./rendersprites.js";
import { mainGameMenu } from "./menu.js";
import { texturesLoaded, tileTexturesMap, getDemonLaughingCurrentFrame } from "./mapdata/maptextures.js";
import { playerUI } from "./playerdata/playerui.js";
import { collissionGodFunction } from "./colissiondetection/collissionlogic.js";
import { enemyAiGodFunction } from "./ai/enemyai.js";

const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
    playGameButton: document.getElementById("playGameButton"),
    stopGameButton: document.getElementById("stopGameButton"),
    debugGameButton: document.getElementById("debugGameButton")
};

export const renderEngine = domElements.mainGameRender.getContext("2d");

let game = null;
let showDebugTools = false;

// Create render workers once
const renderWorker1 = new Worker("./renderengineworker.js", { type: "module" });
const renderWorker2 = new Worker("./renderengineworker.js", { type: "module" });
let renderWorkersInitialized = false;

// Create floor render worker
const floorWorker = new Worker("./renderfloorworker.js", { type: "module" });
let floorWorkerFrameId = 0;
let floorWorkerPending = new Map();

domElements.playGameButton.addEventListener("click", playGameButton);
domElements.stopGameButton.addEventListener("click", stopGameButton);
domElements.debugGameButton.addEventListener("click", debugGameButton);

function playGameButton() {
    if (!game) {
        mainGameRender();
        initializeRenderWorkers();
    }
    game.start();
    console.log("Starting >.<!!!!");
}

function stopGameButton() {
    if (game) {
        game.stop();
        cleanupWorkers(); // Clean up raycast workers
        cleanupRenderWorkers(); // Clean up render workers
        compiledTextStyle();
        renderEngine.fillText("Stopped", 600, 500);
    }
    console.log("Stopped <3 ^u^");
}

function debugGameButton() {
    showDebugTools = !showDebugTools;
}

function mainGameRender() {
    game = gameLoop(gameRenderEngine);
}

let isRenderingFrame = false;

async function gameRenderEngine() {
    if (isRenderingFrame) return;
    isRenderingFrame = true;

    try {
        const rayData = await castRays();
        console.log("rayData:", rayData); // Debug: Inspect rayData
        if (!rayData || rayData.every(ray => ray === null)) {
            console.warn("No valid ray data, filling red");
            renderEngine.fillStyle = "red";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            return;
        }
        drawBackground();
        await renderRaycastWalls(rayData);
        await renderRaycastFloors(rayData);
        drawSprites(rayData);
        if (showDebugTools) compiledDevTools();
        playerLogic();
        playerInventoryGodFunction();
        playerUI();
        collissionGodFunction();
        enemyAiGodFunction();
        //testAnimationFuckingAround();
    } catch (error) {
        console.error("gameRenderEngine error:", error);
    } finally {
        isRenderingFrame = false;
    }
}

function drawBackground() {
    renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.fillStyle = "black";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 800;

function drawQuad({ topX, topY, leftX, leftY, rightX, rightY, color, texture, textureX }) {
    const adjustedTopX = topX - playerVantagePointX.playerVantagePointX;
    const adjustedTopY = topY - playerVantagePointY.playerVantagePointY;
    const adjustedLeftX = leftX - playerVantagePointX.playerVantagePointX;
    const adjustedLeftY = leftY - playerVantagePointY.playerVantagePointY;
    const adjustedRightX = rightX - playerVantagePointX.playerVantagePointX;
    const adjustedRightY = rightY - playerVantagePointY.playerVantagePointY;

    renderEngine.beginPath();
    renderEngine.moveTo(adjustedTopX, adjustedTopY);
    renderEngine.lineTo(adjustedLeftX, adjustedLeftY);
    renderEngine.lineTo(adjustedRightX, adjustedRightY);
    renderEngine.closePath();

    if (texture && textureX !== undefined && texturesLoaded) {
        const destWidth = adjustedRightX - adjustedLeftX;
        renderEngine.drawImage(
            texture,
            textureX * texture.width, 0, 1, texture.height,
            adjustedLeftX, adjustedTopY, destWidth, adjustedRightY - adjustedTopY
        );
    } else {
        renderEngine.fillStyle = color;
        renderEngine.fill();
    }
}

function initializeRenderWorkers() {
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

function renderRaycastWalls(rayData) {
    if (!texturesLoaded) {
        console.warn("Textures not loaded, using fallback");
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        return;
    }

    for (let i = 0; i < rayData.length; i++) {
        const ray = rayData[i];
        if (!ray) continue;

        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallTop = (CANVAS_HEIGHT - wallHeight) / 2;
        const wallBottom = wallTop + wallHeight;

        let textureX;
        if (ray.hitSide === "x") {
            textureX = (ray.hitX % tileSectors) / tileSectors;
        } else {
            textureX = (ray.hitY % tileSectors) / tileSectors;
        }
        textureX = Math.max(0, Math.min(1, textureX));

        let texture = tileTexturesMap.get(ray.textureKey) || tileTexturesMap.get("wall_creamlol");
        if (ray.textureKey === "wall_laughing_demon") {
            texture = getDemonLaughingCurrentFrame() || tileTexturesMap.get("wall_creamlol");
        }

        if (!texture) {
            console.error(`Texture not found for key: ${ray.textureKey}`);
            continue;
        }

        // PATCH: Use i (ray index) for column position, not ray.column
        drawQuad({
            topX: i * (CANVAS_WIDTH / numCastRays),
            topY: wallTop,
            leftX: i * (CANVAS_WIDTH / numCastRays),
            leftY: wallBottom,
            rightX: (i + 1) * (CANVAS_WIDTH / numCastRays),
            rightY: wallBottom,
            color: "red",
            texture: texture,
            textureX: textureX
        });
    }
}

function cleanupRenderWorkers() {
    renderWorker1.terminate();
    renderWorker2.terminate();
    renderWorkersInitialized = false;
    console.log("Render workers terminated");
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
    // Draw the floor pixels efficiently (new format: { texKey, data: Float32Array } per column)
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
                x * (CANVAS_WIDTH / numCastRays), y, (CANVAS_WIDTH / numCastRays), 2
            );
        }
    }
}

