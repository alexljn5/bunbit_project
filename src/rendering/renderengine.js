// Entire renderer with fixed WebGL lighting pipeline (no more black screen)

import { gameLoop } from "../main_game.js";
import { playerLogic, playerPosition, showDebugTools, gameOver, onRespawn, keys } from "../playerdata/playerlogic.js";
import { drawRespawnMenu } from "../menus/menurespawn.js";
import { playerInventoryGodFunction } from "../playerdata/playerinventory.js";
import { compiledDevTools } from "../debugtools.js";
import { tileSectors } from "../mapdata/maps.js";
import { castRays, numCastRays, playerFOV } from "./raycasting.js";
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

// Separate canvas for WebGL lighting (we attach this only when needed for debugging)
const glCanvas = document.createElement("canvas");
glCanvas.width = CANVAS_WIDTH;
glCanvas.height = CANVAS_HEIGHT;

export let game = null;
let isRenderingFrame = false;
let renderWorkersInitialized = false;

const renderWorker1 = new Worker("/src/rendering/renderworkers/renderengineworker.js", { type: "module" });
const renderWorker2 = new Worker("/src/rendering/renderworkers/renderengineworker.js", { type: "module" });

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
debugHandlerGodFunction(); // <--- only setup once at startup


// ========== LIGHTING SUBSYSTEM (fixed) ==========
let gl = null;
let lightingProgram = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;
let lights = []; // { position: [x,y,z], color:[r,g,b], intensity }

// Vertex shader (flip Y in v_texCoord)
const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        // map clip space [-1,1] to texcoord [0,1], and flip Y to match canvas
        v_texCoord = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
    }
`;

// Fragment shader (WebGL1-friendly, MAX_LIGHTS, base ambient)
const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_sceneTexture; // unit 0
    uniform sampler2D u_depthTexture; // unit 1
    uniform vec3 u_playerPos; // x, y, angle
    uniform float u_fov;
    uniform vec2 u_resolution;
    const int MAX_LIGHTS = 4;
    uniform int u_lightCount;
    uniform vec3 u_lightPos[MAX_LIGHTS];
    uniform vec3 u_lightColor[MAX_LIGHTS];
    uniform float u_lightIntensity[MAX_LIGHTS];

    void main() {
        vec3 sceneColor = texture2D(u_sceneTexture, v_texCoord).rgb;
        float depthSample = texture2D(u_depthTexture, v_texCoord).r;
        // convert normalized depth to world distance (matching CPU division by 1000)
        float actualDistance = clamp(depthSample * 1000.0, 0.001, 1000.0);

        float rayAngle = u_playerPos.z - u_fov / 2.0 + v_texCoord.x * u_fov;
        vec2 dir = vec2(cos(rayAngle), sin(rayAngle));
        vec2 worldPos = vec2(u_playerPos.x, u_playerPos.y) + dir * actualDistance;

        vec3 lightEffect = vec3(0.25); // base ambient so nothing is pure black

        for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i >= u_lightCount) break;
            vec2 lp = u_lightPos[i].xy;
            float lightDist = length(worldPos - lp);
            float attenuation = u_lightIntensity[i] / (1.0 + 0.01 * lightDist + 0.001 * lightDist * lightDist);
            lightEffect += u_lightColor[i] * attenuation;
        }

        vec3 outColor = sceneColor * lightEffect;

        // debug fallback if something's wrong with lighting
        if (length(outColor) < 0.01) {
            // show a faint blue so it's obvious lighting reduced brightness
            outColor = vec3(0.03, 0.03, 0.08);
        }

        gl_FragColor = vec4(outColor, 1.0);
    }
`;


function compileShaderSafe(glCtx, source, type) {
    const shader = glCtx.createShader(type);
    glCtx.shaderSource(shader, source);
    glCtx.compileShader(shader);
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error('Shader compile error:', glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
    }
    return shader;
}

function createShaderProgramSafe(glCtx, vsSrc, fsSrc) {
    const vs = compileShaderSafe(glCtx, vsSrc, glCtx.VERTEX_SHADER);
    const fs = compileShaderSafe(glCtx, fsSrc, glCtx.FRAGMENT_SHADER);
    if (!vs || !fs) return null;
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
        console.error('Program link error:', glCtx.getProgramInfoLog(prog));
        glCtx.deleteProgram(prog);
        return null;
    }
    return prog;
}

function initLightingEngine() {
    if (gl) return true; // already initialized
    console.log("Initializing WebGL lighting *giggles*");
    // prefer webgl2 where available
    gl = glCanvas.getContext('webgl2', { premultipliedAlpha: false }) || glCanvas.getContext('webgl', { premultipliedAlpha: false });
    if (!gl) {
        console.error("WebGL not supported! Lighting disabled. *pouts*");
        return false;
    }
    console.log("WebGL context:", gl.getParameter(gl.VERSION));

    // compile program
    lightingProgram = createShaderProgramSafe(gl, vertexShaderSource, fragmentShaderSource);
    if (!lightingProgram) {
        console.error("Failed to create lighting program *sad chao*");
        return false;
    }

    // create full-screen quad (6 verts -> 2 triangles)
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const quadVerts = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // textures will be created on first use
    sceneTexture = null;
    depthTexture = null;

    // default light (follow player)
    lights = [
        { position: [playerPosition.x, playerPosition.z, 1.0], color: [1.0, 0.9, 0.7], intensity: 1.2 }
    ];

    console.log("Lighting engine ready *twirls*");
    return true;
}

function updateLights(customLights = []) {
    if (customLights && customLights.length) lights = customLights;
    if (lights[0]) lights[0].position[0] = playerPosition.x, lights[0].position[1] = playerPosition.z;
}

// Convert float depth array -> Uint8 if no float texture support
function ensureDepthTextureUpload(glCtx, width, height, floatData) {
    const floatExt = glCtx.getExtension('OES_texture_float') || glCtx.getExtension('EXT_color_buffer_float');
    const canUseFloat = !!floatExt || (typeof WebGL2RenderingContext !== 'undefined' && glCtx instanceof WebGL2RenderingContext);
    if (canUseFloat) {
        glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.LUMINANCE, width, height, 0, glCtx.LUMINANCE, glCtx.FLOAT, floatData);
        return;
    }
    // fallback: pack into Uint8
    const u8 = new Uint8Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
        const v = Math.max(0.0, Math.min(1.0, floatData[i]));
        u8[i] = Math.floor(v * 255.0);
    }
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.LUMINANCE, width, height, 0, glCtx.LUMINANCE, glCtx.UNSIGNED_BYTE, u8);
}

function applyLighting(rayData) {
    if (!initLightingEngine()) return;

    if (!rayData || !Array.isArray(rayData)) return;

    console.time('applyLighting');
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.clearColor(0.02, 0.02, 0.03, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(lightingProgram);

    // --- Scene texture upload (unit 0) ---
    gl.activeTexture(gl.TEXTURE0);
    if (!sceneTexture) sceneTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_sceneTexture'), 0);

    // --- Depth texture upload (safe RGBA fallback) ---
    const depthData = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4); // RGBA
    const colWidth = CANVAS_WIDTH / numCastRays;
    for (let i = 0; i < numCastRays; i++) {
        const d = rayData[i]?.distance ?? 1000.0;
        const normalized = Math.min(1.0, Math.max(0.0, d / 1000.0));
        const byteVal = Math.floor(normalized * 255);
        const startCol = Math.floor(i * colWidth);
        const endCol = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
        for (let col = startCol; col < endCol; col++) {
            for (let row = 0; row < CANVAS_HEIGHT; row++) {
                const idx = (row * CANVAS_WIDTH + col) * 4;
                depthData[idx] = byteVal;
                depthData[idx + 1] = byteVal;
                depthData[idx + 2] = byteVal;
                depthData[idx + 3] = 255;
            }
        }
    }

    gl.activeTexture(gl.TEXTURE1);
    if (!depthTexture) depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CANVAS_WIDTH, CANVAS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, depthData);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_depthTexture'), 1);

    // --- Set uniforms ---
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_playerPos'), new Float32Array([playerPosition.x, playerPosition.z, playerPosition.angle]));
    gl.uniform1f(gl.getUniformLocation(lightingProgram, 'u_fov'), playerFOV);
    gl.uniform2f(gl.getUniformLocation(lightingProgram, 'u_resolution'), CANVAS_WIDTH, CANVAS_HEIGHT);

    const maxLights = 4;
    const lightPosFlat = new Float32Array(maxLights * 3);
    const lightColorFlat = new Float32Array(maxLights * 3);
    const lightIntensityFlat = new Float32Array(maxLights);
    for (let i = 0; i < maxLights; i++) {
        if (lights[i]) {
            lightPosFlat.set(lights[i].position, i * 3);
            lightColorFlat.set(lights[i].color, i * 3);
            lightIntensityFlat[i] = lights[i].intensity ?? 1.0;
        }
    }
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_lightPos'), lightPosFlat);
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_lightColor'), lightColorFlat);
    gl.uniform1fv(gl.getUniformLocation(lightingProgram, 'u_lightIntensity'), lightIntensityFlat);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_lightCount'), Math.min(lights.length, maxLights));

    // --- Draw quad ---
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(lightingProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- Copy to offscreen canvas ---
    try {
        if (typeof gl.finish === 'function') gl.finish();
        offscreenCtx.save();
        offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
        offscreenCtx.drawImage(glCanvas, 0, 0);
        offscreenCtx.restore();
    } catch (err) {
        console.warn("Could not copy GL canvas into offscreenCtx:", err);
    }

    console.timeEnd('applyLighting');
}



// Cleanup lighting
function cleanupLightingEngine() {
    if (!gl) return;
    try {
        if (lightingProgram) gl.deleteProgram(lightingProgram);
        if (quadBuffer) gl.deleteBuffer(quadBuffer);
        if (sceneTexture) gl.deleteTexture(sceneTexture);
        if (depthTexture) gl.deleteTexture(depthTexture);
    } catch (err) {
        console.warn("Error cleaning GL resources:", err);
    }
    gl = null;
    lightingProgram = null;
    quadBuffer = null;
    sceneTexture = null;
    depthTexture = null;
    lights = [];
    console.log("Lighting cleaned up! *chao chao*");
}


// --- Render Workers initialization (keeps your behavior) ---
function initializeRenderWorkers() {
    if (renderWorkersInitialized) return;
    const staticData = { type: "init", tileSectors, CANVAS_HEIGHT, CANVAS_WIDTH };
    renderWorker1.postMessage(staticData);
    renderWorker2.postMessage(staticData);
    renderWorkersInitialized = true;
    // Init lighting here too (ensure GL program exists)
    initLightingEngine();
}
export function cleanupRenderWorkers() {
    renderWorker1.terminate();
    renderWorker2.terminate();
    renderWorkersInitialized = false;
    cleanupLightingEngine();
}
export { initializeRenderWorkers };


// --- Main game render loop (mostly unchanged) ---
export async function gameRenderEngine(deltaTime) {
    titleHandlerGodFunction();
    drawDebugTerminal();
    if (isRenderingFrame) return;
    isRenderingFrame = true;
    console.time('fullRender');
    try {
        const minScale = Math.min(SCALE_X, SCALE_Y);
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
        // CPU rendering into offscreen 2D canvas
        offscreenCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        await renderRaycastHorizons(rayData, offscreenCtx);
        renderRaycastWalls(rayData, mapHandler.activeMapKey, offscreenCtx);
        decorationHandlerGodFunction();
        drawSprites(rayData);

        // Lighting pass: update lights and apply
        updateLights();
        applyLighting(rayData);

        // Draw final offscreen canvas to the visible canvas
        renderEngine.drawImage(offscreenCanvas, 0, 0);

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

// --- Draw Quad helper ---
export function drawQuad({ topX, topY, leftX, leftY, rightX, rightY, color, texture, textureX, alpha = 1.0, ctx }) {
    ctx = ctx || renderEngine;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (texture && textureX !== undefined && texturesLoaded) {
        const destWidth = rightX - leftX;
        const destHeight = rightY - topY;

        // Flip vertically by using transform
        ctx.translate(leftX, topY + destHeight); // move origin to bottom-left of quad
        ctx.scale(1, -1);                        // flip vertically
        ctx.drawImage(
            texture,
            textureX * texture.width, 0, 1, texture.height, // source rect
            0, 0, destWidth, destHeight                     // destination rect in flipped coords
        );
    } else {
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    ctx.restore();
}

