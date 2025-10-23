// src/rendering/lightengine/renderlight.js
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerFOV, numCastRays } from "../raycasting.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { vertexShaderSource, fragmentShaderSource, createShaderProgramSafe, ensureDepthTextureUpload } from "./shaders.js";
import { createBuffer } from "./buffers.js";

const MAX_LIGHTS = 4;

const lightingCanvas = document.createElement("canvas");
lightingCanvas.width = CANVAS_WIDTH;
lightingCanvas.height = CANVAS_HEIGHT;

let gl = null;
let lightingProgram = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;
let lights = [];

// ---------- Color utilities ----------
function hexToRgbArray(hex) {
    if (!hex) return [1, 1, 1];
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const val = parseInt(hex, 16);
    return [((val >> 16) & 255) / 255, ((val >> 8) & 255) / 255, (val & 255) / 255];
}

function normalizeColorInput(col) {
    if (Array.isArray(col)) {
        const is255 = col.some(c => c > 1);
        return col.map(c => (is255 ? c / 255 : c));
    }
    return hexToRgbArray(col);
}

// ---------- Light API ----------
export function createLight(position = [0, 0, 1], color = "#fff", intensity = 1.0) {
    return { position: [...position], color: normalizeColorInput(color), intensity };
}

export function addLight(position, color = "#fff", intensity = 1.0) {
    if (lights.length >= MAX_LIGHTS) return false;
    const l = createLight(position, color, intensity);
    lights.push(l);
    return l;
}

export function setLight(index, { position, color, intensity }) {
    if (index < 0 || index >= lights.length) return false;
    if (position) lights[index].position = [...position];
    if (color) lights[index].color = normalizeColorInput(color);
    if (intensity !== undefined) lights[index].intensity = intensity;
    return true;
}

export function getLights() {
    return lights.slice();
}

// ---------- Engine lifecycle ----------
export function initLightingEngine() {
    if (gl) return true; // already initialized
    console.log("Initializing WebGL lighting *giggles*");
    // prefer webgl2 where available
    gl = lightingCanvas.getContext('webgl2', { premultipliedAlpha: false }) || lightingCanvas.getContext('webgl', { premultipliedAlpha: false });
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

export function updateLights(customLights = []) {
    if (customLights && customLights.length) lights = customLights;
    if (lights[0]) lights[0].position[0] = playerPosition.x, lights[0].position[1] = playerPosition.z;
}

export function applyLighting(rayData, offscreenCanvas, offscreenCtx) {
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
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
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
        offscreenCtx.drawImage(lightingCanvas, 0, 0);
        offscreenCtx.restore();
    } catch (err) {
        console.warn("Could not copy GL canvas into offscreenCtx:", err);
    }

    console.timeEnd('applyLighting');
}

// ---------- Cleanup ----------
export function cleanupLightingEngine() {
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


