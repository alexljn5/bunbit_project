// src/rendering/renderworkers/lightworker.js
// OffscreenCanvas-based WebGL lighting worker (fully precomputed)

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { vertexShaderSource, fragmentShaderSource, createShaderProgramSafe } from "../lightengine/shaders.js";

let gl = null;
let lightingProgram = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;
let offscreenCanvas = null;

const MAX_LIGHTS = 4;
let lights = [];
let staticData = null;

// ---------------- Math Tables ----------------
const SIN_TABLE_BITS = 11;
const SIN_TABLE_SIZE = 1 << SIN_TABLE_BITS;
const SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
const FIXED_POINT_SHIFT = 16;
const ANGLE_SCALE = (SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (Math.PI * 2) | 0;

const sinTable = new Float32Array(SIN_TABLE_SIZE);
const cosTable = new Float32Array(SIN_TABLE_SIZE);

for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = (i * 2 * Math.PI) / SIN_TABLE_SIZE;
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

function fastSin(angle) {
    const idx = ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return sinTable[idx];
}

function fastCos(angle) {
    const idx = ((angle * ANGLE_SCALE) | 0) >>> FIXED_POINT_SHIFT & SIN_TABLE_MASK;
    return cosTable[idx];
}

// Ultra-fast inverse square root
const buf = new ArrayBuffer(4);
const f = new Float32Array(buf);
const i = new Uint32Array(buf);
function Q_rsqrt(number) {
    const x2 = number * 0.5;
    f[0] = number;
    i[0] = 0x5f3759df - (i[0] >> 1);
    f[0] = f[0] * (1.5 - x2 * f[0] * f[0]);
    return f[0];
}

// ---------------- Color Utilities ----------------
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

// ---------------- Light API ----------------
function createLight(position = [0, 0, 1], color = "#fff", intensity = 1.0) {
    return { position: [...position], color: normalizeColorInput(color), intensity };
}

function addLight(position, color = "#fff", intensity = 1.0) {
    if (lights.length >= MAX_LIGHTS) return false;
    const l = createLight(position, color, intensity);
    lights.push(l);
    return l;
}

function setLight(index, { position, color, intensity }) {
    if (index < 0 || index >= lights.length) return false;
    if (position) lights[index].position = [...position];
    if (color) lights[index].color = normalizeColorInput(color);
    if (intensity !== undefined) lights[index].intensity = intensity;
    return true;
}

// ---------------- Initialization ----------------
self.onmessage = function (e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init': initLightingEngine(data); break;
        case 'updateLights': updateLights(data); break;
        case 'applyLighting': applyLighting(data); break;
        case 'cleanup': cleanupLightingEngine(); break;
    }
};

function initLightingEngine(data) {
    if (gl) return;

    offscreenCanvas = data.offscreenCanvas;
    gl = offscreenCanvas.getContext('webgl2', { premultipliedAlpha: false }) ||
        offscreenCanvas.getContext('webgl', { premultipliedAlpha: false });
    if (!gl) return self.postMessage({ type: 'init_response', success: false, error: 'WebGL not supported' });

    lightingProgram = createShaderProgramSafe(gl, vertexShaderSource, fragmentShaderSource);
    if (!lightingProgram) return self.postMessage({ type: 'init_response', success: false, error: 'Shader failed' });

    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    sceneTexture = gl.createTexture();
    depthTexture = gl.createTexture();

    lights = [
        createLight([data.playerPos.x, data.playerPos.z, 1.0], [1.0, 0.9, 0.7], 1.2)
    ];

    // Store static data for precomputation
    staticData = {
        numCastRays: data.numCastRays,
        CANVAS_WIDTH: data.CANVAS_WIDTH,
        tileSectors: data.tileSectors,
        maxRayDepth: data.maxRayDepth,
        textureTransparencyMap: data.textureTransparencyMap || {},
    };

    // Precompute per-column angles and sin/cos
    staticData.rayAngles = new Float32Array(staticData.numCastRays);
    staticData.rayCos = new Float32Array(staticData.numCastRays);
    staticData.raySin = new Float32Array(staticData.numCastRays);

    for (let i = 0; i < staticData.numCastRays; i++) {
        const angle = -data.playerFOV / 2 + (i / staticData.numCastRays) * data.playerFOV;
        staticData.rayAngles[i] = angle;
        staticData.rayCos[i] = fastCos(angle);
        staticData.raySin[i] = fastSin(angle);
    }

    self.postMessage({ type: 'init_response', success: true });
}

// ---------------- Light Updates ----------------
function updateLights(data) {
    if (data.customLights) {
        lights = data.customLights.map(l => ({ ...l, color: normalizeColorInput(l.color) }));
    }
    if (lights[0]) {
        lights[0].position[0] = data.playerPos.x;
        lights[0].position[1] = data.playerPos.z;
    }
}

// ---------------- Apply Lighting ----------------
function applyLighting(data) {
    if (!gl || !lightingProgram) return;

    const { playerPos, sceneImageBitmap, playerFOV } = data;

    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.clearColor(0.02, 0.02, 0.03, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(lightingProgram);

    // Scene Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneImageBitmap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_sceneTexture'), 0);

    // Depth Texture (preallocated once)
    if (!staticData.depthData) {
        staticData.depthData = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
    }
    const depthData = staticData.depthData;
    depthData.fill(0); // clear depth buffer (or fill precomputed depths if you want)

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CANVAS_WIDTH, CANVAS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, depthData);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_depthTexture'), 1);

    // Player Uniforms
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_playerPos'),
        new Float32Array([playerPos.x, playerPos.z, playerPos.angle]));
    gl.uniform1f(gl.getUniformLocation(lightingProgram, 'u_fov'), playerFOV);
    gl.uniform2f(gl.getUniformLocation(lightingProgram, 'u_resolution'), CANVAS_WIDTH, CANVAS_HEIGHT);

    // Lights Uniforms (preallocated flat arrays)
    if (!staticData.lightPosFlat) {
        staticData.lightPosFlat = new Float32Array(MAX_LIGHTS * 3);
        staticData.lightColorFlat = new Float32Array(MAX_LIGHTS * 3);
        staticData.lightIntensityFlat = new Float32Array(MAX_LIGHTS);
    }
    const lightPosFlat = staticData.lightPosFlat;
    const lightColorFlat = staticData.lightColorFlat;
    const lightIntensityFlat = staticData.lightIntensityFlat;

    for (let i = 0; i < MAX_LIGHTS; i++) {
        if (lights[i]) {
            lightPosFlat.set(lights[i].position, i * 3);
            lightColorFlat.set(lights[i].color, i * 3);
            lightIntensityFlat[i] = lights[i].intensity ?? 1.0;
        }
    }

    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_lightPos'), lightPosFlat);
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_lightColor'), lightColorFlat);
    gl.uniform1fv(gl.getUniformLocation(lightingProgram, 'u_lightIntensity'), lightIntensityFlat);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_lightCount'), Math.min(lights.length, MAX_LIGHTS));

    // Draw Fullscreen Quad
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(lightingProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Transfer ImageBitmap
    const imageBitmap = offscreenCanvas.transferToImageBitmap();
    self.postMessage({ type: 'lighting_applied', imageBitmap }, [imageBitmap]);
}

// ---------------- Cleanup ----------------
function cleanupLightingEngine() {
    if (!gl) return;
    if (lightingProgram) gl.deleteProgram(lightingProgram);
    if (quadBuffer) gl.deleteBuffer(quadBuffer);
    if (sceneTexture) gl.deleteTexture(sceneTexture);
    if (depthTexture) gl.deleteTexture(depthTexture);

    gl = null;
    lightingProgram = null;
    quadBuffer = null;
    sceneTexture = null;
    depthTexture = null;
    lights = [];
    offscreenCanvas = null;
    staticData = null;

    self.postMessage({ type: 'cleanup_done' });
}
