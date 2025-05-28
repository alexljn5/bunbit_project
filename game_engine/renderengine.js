import { gameLoop } from "./main_game.js";
import { playerVantagePointX, playerVantagePointY, playerLogic, playerPosition } from "./playerdata/playerlogic.js";
import { playerInventoryGodFunction } from "./playerdata/playerinventory.js";
import { compiledDevTools, compiledTextStyle } from "./debugtools.js";
import { mapTable, tileSectors } from "./mapdata/maps.js";
import { castRays, testAnimationFuckingAround, testFuckingAround, playerFOV, numCastRays } from "./raycasting.js";
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

domElements.playGameButton.addEventListener("click", playGameButton);
domElements.stopGameButton.addEventListener("click", stopGameButton);
domElements.debugGameButton.addEventListener("click", debugGameButton);

function playGameButton() {
    if (!game) {
        mainGameRender();
    }
    game.start();
    console.log("Starting >.<!!!!");
}

function stopGameButton() {
    if (game) {
        game.stop();
        compiledTextStyle();
        renderEngine.fillText("Stopped", 890, 30);
    }
    console.log("Stopped <3 ^u^");
}

function debugGameButton() {
    showDebugTools = !showDebugTools;
}

function mainGameRender() {
    game = gameLoop(gameRenderEngine);
}

function gameRenderEngine() {
    drawBackground();
    const rayData = castRays(); // Store raycasting data
    renderRaycastWalls(rayData); // Pass to walls
    renderRaycastFloors(rayData);
    drawSprites(rayData); // Pass to sprites
    if (showDebugTools) {
        compiledDevTools();
    }
    playerLogic();
    playerInventoryGodFunction();
    playerUI();
    collissionGodFunction();
    enemyAiGodFunction();
    //testAnimationFuckingAround();
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

        drawQuad({
            topX: ray.column,
            topY: wallTop,
            leftX: ray.column,
            leftY: wallBottom,
            rightX: ray.column + 1,
            rightY: wallBottom,
            color: "red",
            texture: texture,
            textureX: textureX
        });
    }
}

function renderRaycastFloors(rayData) {
    if (!texturesLoaded) {
        console.warn("Textures not loaded, skipping floor rendering");
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        return;
    }

    const playerHeight = tileSectors / 2;
    const projectionPlaneDist = (CANVAS_WIDTH / 2) / Math.tan(playerFOV / 2);

    // Precompute cos/sin for each ray column
    const rayAngles = new Array(numCastRays);
    const cosAngles = new Array(numCastRays);
    const sinAngles = new Array(numCastRays);

    for (let x = 0; x < numCastRays; x++) {
        rayAngles[x] = playerPosition.angle + (-playerFOV / 2 + (x / numCastRays) * playerFOV);
        cosAngles[x] = Math.cos(rayAngles[x]);
        sinAngles[x] = Math.sin(rayAngles[x]);
    }

    for (let x = 0; x < numCastRays; x++) {
        const ray = rayData[x];
        if (!ray || !ray.floorTextureKey) continue;

        const texture = tileTexturesMap.get(ray.floorTextureKey);
        if (!texture) continue;

        const wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
        const wallBottom = (CANVAS_HEIGHT + wallHeight) / 2;

        const cosA = cosAngles[x];
        const sinA = sinAngles[x];
        const texWidth = texture.width;
        const texHeight = texture.height;

        for (let y = Math.floor(wallBottom); y < CANVAS_HEIGHT; y += 2) { // Skip 1 row for perf
            const rowDistance = (tileSectors / 2) / ((y - CANVAS_HEIGHT / 2) / projectionPlaneDist);
            const floorX = playerPosition.x + rowDistance * cosA;
            const floorY = playerPosition.z + rowDistance * sinA;

            const textureX = ((floorX % tileSectors + tileSectors) % tileSectors) / tileSectors;
            const textureY = ((floorY % tileSectors + tileSectors) % tileSectors) / tileSectors;

            const texX = (textureX * texWidth) | 0;
            const texY = (textureY * texHeight) | 0;

            renderEngine.drawImage(
                texture,
                texX, texY, 1, 1,
                x * (CANVAS_WIDTH / numCastRays), y, (CANVAS_WIDTH / numCastRays), 2
            );
        }
    }
}