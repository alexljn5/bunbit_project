// src/rendering/lightengine/renderlight.js
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerFOV, numCastRays } from "../raycasting.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { vertexShaderSource, fragmentShaderSource, createShaderProgramSafe } from "./shaders.js";

const MAX_LIGHTS = 8; // Increase max lights to support player + map lights

// ---------- Worker-based lighting ----------
const lightWorkerUrl = new URL("./renderworkers/lightworker.js", import.meta.url);
const lightWorker = new Worker(lightWorkerUrl, { type: "module" });
let lightWorkerInitialized = false;
let pendingLightingResolve = null;

// ---------- Offscreen/main-thread fallback ----------
const lightingCanvas = document.createElement("canvas");
lightingCanvas.width = CANVAS_WIDTH;
lightingCanvas.height = CANVAS_HEIGHT;

let gl = null;
let lightingProgram = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;

// Cached uniform locations
let u_sceneTexLoc, u_depthTexLoc, u_playerPosLoc, u_fovLoc, u_resolutionLoc;
let u_lightPosLoc, u_lightColorLoc, u_lightIntensityLoc, u_lightCountLoc;

// ---------- Lights ----------
let lights = [];       // dynamic/player lights
export const mapLights = []; // stationary map lights

// ---------- Worker message handling ----------
lightWorker.onmessage = (e) => {
    const { type, imageBitmap } = e.data;
    if (type === 'init_response') {
        lightWorkerInitialized = e.data.success;
        if (!lightWorkerInitialized) console.error("Light worker init failed:", e.data.error);
    } else if (type === 'lighting_applied' && pendingLightingResolve) {
        pendingLightingResolve(imageBitmap);
        pendingLightingResolve = null;
    } else if (type === 'cleanup_done') {
        console.log("Light worker cleanup done");
    }
};

// ---------- Utilities ----------
function hexToRgbArray(hex) {
    if (!hex) return [1, 1, 1];
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const val = parseInt(hex, 16);
    return [((val >> 16) & 255) / 255, ((val >> 8) & 255) / 255, (val & 255) / 255];
}

function normalizeColorInput(col) {
    if (Array.isArray(col)) return col.map(c => (c > 1 ? c / 255 : c));
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

// ---------- Map Lights ----------
export function createMapLight(position = [0, 0], color = "#fff", intensity = 1.0, radius = 5.0) {
    return { position: [position[0], position[1], 0], color: normalizeColorInput(color), intensity, radius };
}

export function addMapLight(position, color = "#fff", intensity = 1.0, radius = 5.0) {
    const l = createMapLight(position, color, intensity, radius);
    mapLights.push(l);
    return l;
}

export function setMapLight(index, { position, color, intensity, radius }) {
    if (index < 0 || index >= mapLights.length) return false;
    if (position) { mapLights[index].position[0] = position[0]; mapLights[index].position[1] = position[1]; }
    if (color) mapLights[index].color = normalizeColorInput(color);
    if (intensity !== undefined) mapLights[index].intensity = intensity;
    if (radius !== undefined) mapLights[index].radius = radius;
    return true;
}

export function getMapLights() {
    return mapLights.slice();
}

// ---------- Engine ----------
export function initLightingEngine() {
    if (gl) return true;

    gl = lightingCanvas.getContext('webgl2', { premultipliedAlpha: false }) ||
        lightingCanvas.getContext('webgl', { premultipliedAlpha: false });
    if (!gl) return false;

    lightingProgram = createShaderProgramSafe(gl, vertexShaderSource, fragmentShaderSource);
    if (!lightingProgram) return false;

    // Cache uniform locations
    u_sceneTexLoc = gl.getUniformLocation(lightingProgram, 'u_sceneTexture');
    u_depthTexLoc = gl.getUniformLocation(lightingProgram, 'u_depthTexture');
    u_playerPosLoc = gl.getUniformLocation(lightingProgram, 'u_playerPos');
    u_fovLoc = gl.getUniformLocation(lightingProgram, 'u_fov');
    u_resolutionLoc = gl.getUniformLocation(lightingProgram, 'u_resolution');
    u_lightPosLoc = gl.getUniformLocation(lightingProgram, 'u_lightPos');
    u_lightColorLoc = gl.getUniformLocation(lightingProgram, 'u_lightColor');
    u_lightIntensityLoc = gl.getUniformLocation(lightingProgram, 'u_lightIntensity');
    u_lightCountLoc = gl.getUniformLocation(lightingProgram, 'u_lightCount');

    // Quad buffer (only once)
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    // Create reusable textures
    sceneTexture = gl.createTexture();
    depthTexture = gl.createTexture();

    // Default player light
    lights = [createLight([playerPosition.x, playerPosition.z, 1.0], [1, 0.9, 0.9], 1.2)];

    console.log("Lighting engine initialized!");
    return true;
}

export function updateLights(customLights = []) {
    if (customLights.length) lights = customLights;
    if (lights[0]) {
        lights[0].position[0] = playerPosition.x;
        lights[0].position[1] = playerPosition.z;
    }
}

// ---------- Apply lighting ----------
export async function applyLighting(rayData, offscreenCanvas, offscreenCtx) {
    if (!rayData || !rayData.length) return;

    // Worker path
    if (lightWorkerInitialized) {
        lightWorker.postMessage({ type: 'updateLights', data: { customLights: lights, playerPos: playerPosition } });

        const offscreen = offscreenCanvas.transferControlToOffscreen?.() || offscreenCanvas;
        pendingLightingResolve = null;

        const imagePromise = new Promise(resolve => pendingLightingResolve = resolve);
        lightWorker.postMessage({
            type: 'applyLighting',
            data: { rayData, playerPos: playerPosition, playerFOV, numCastRays, offscreenCanvas: offscreen }
        }, [offscreen]);

        const result = await imagePromise;
        offscreenCtx.drawImage(result, 0, 0);
        return;
    }

    // Main-thread fallback
    if (!gl) initLightingEngine();

    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.clearColor(0.02, 0.02, 0.03, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(lightingProgram);

    // Upload scene texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(u_sceneTexLoc, 0);

    // Depth texture
    const depthData = new Uint8Array(numCastRays);
    for (let i = 0; i < numCastRays; i++) {
        const d = rayData[i]?.distance ?? 1000;
        depthData[i] = Math.min(255, Math.max(0, Math.floor((d / 1000) * 255)));
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, numCastRays, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, depthData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(u_depthTexLoc, 1);

    // Uniforms
    gl.uniform3fv(u_playerPosLoc, new Float32Array([playerPosition.x, playerPosition.z, playerPosition.angle]));
    gl.uniform1f(u_fovLoc, playerFOV);
    gl.uniform2f(u_resolutionLoc, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Merge lights + mapLights
    const allLights = [...lights, ...mapLights];
    const lightPosFlat = new Float32Array(MAX_LIGHTS * 3);
    const lightColorFlat = new Float32Array(MAX_LIGHTS * 3);
    const lightIntensityFlat = new Float32Array(MAX_LIGHTS);

    for (let i = 0; i < Math.min(allLights.length, MAX_LIGHTS); i++) {
        const l = allLights[i];
        lightPosFlat.set(l.position, i * 3);
        lightColorFlat.set(l.color, i * 3);
        lightIntensityFlat[i] = l.intensity ?? 1;
    }

    gl.uniform3fv(u_lightPosLoc, lightPosFlat);
    gl.uniform3fv(u_lightColorLoc, lightColorFlat);
    gl.uniform1fv(u_lightIntensityLoc, lightIntensityFlat);
    gl.uniform1i(u_lightCountLoc, Math.min(allLights.length, MAX_LIGHTS));

    // Draw full-screen quad
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(lightingProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Copy to 2D offscreen
    offscreenCtx.drawImage(lightingCanvas, 0, 0);
}

// ---------- Cleanup ----------
export function cleanupLightingEngine() {
    if (lightWorkerInitialized) {
        lightWorker.postMessage({ type: 'cleanup' });
        lightWorkerInitialized = false;
    }
    pendingLightingResolve = null;

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
    mapLights.length = 0;
    console.log("Lighting engine cleaned up!");
}
