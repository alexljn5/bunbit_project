// src/rendering/lightengine/renderlight.js
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerFOV, numCastRays } from "../raycasting.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { vertexShaderSource, fragmentShaderSource } from "./shaders.js";

const MAX_LIGHTS = 4;

const QUAD_VERTICES = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
]);

const lightingCanvas = document.createElement("canvas");
lightingCanvas.width = CANVAS_WIDTH;
lightingCanvas.height = CANVAS_HEIGHT;

let gl = null;
let program = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;
let locations = null;

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
    gl = lightingCanvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported");
        return false;
    }

    program = createProgram(gl, vertexShaderSource, fragmentShaderSource(CANVAS_WIDTH, CANVAS_HEIGHT));
    if (!program) return false;

    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

    // player-following light
    lights = [createLight([playerPosition.x, playerPosition.z, 1], "#ff0000", 1.0)];

    locations = {
        a_position: gl.getAttribLocation(program, "a_position"),
        u_sceneTexture: gl.getUniformLocation(program, "u_sceneTexture"),
        u_depthTexture: gl.getUniformLocation(program, "u_depthTexture"),
        u_playerPos: gl.getUniformLocation(program, "u_playerPos"),
        u_fov: gl.getUniformLocation(program, "u_fov"),
        u_resolution: gl.getUniformLocation(program, "u_resolution"),
        u_lightPos: gl.getUniformLocation(program, "u_lightPos"),
        u_lightColor: gl.getUniformLocation(program, "u_lightColor"),
        u_lightIntensity: gl.getUniformLocation(program, "u_lightIntensity"),
        u_lightCount: gl.getUniformLocation(program, "u_lightCount")
    };

    return true;
}

export function updateLights(customLights = []) {
    if (customLights.length > 0) {
        lights = customLights.slice(0, MAX_LIGHTS).map(l =>
            createLight(l.position ?? [0, 0, 1], l.color ?? "#fff", l.intensity ?? 1.0)
        );
    }
    if (lights[0]) {
        lights[0].position[0] = playerPosition.x;
        lights[0].position[1] = playerPosition.z;
    }
}

export function applyLighting(sceneCanvas, rayData) {
    if (!gl || !program) return;

    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.useProgram(program);

    // Scene texture
    if (!sceneTexture) sceneTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(locations.u_sceneTexture, 0);

    // Depth texture
    if (!depthTexture) depthTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);

    const floatExt = gl.getExtension("OES_texture_float");
    const useFloat = !!floatExt;
    const depthArray = useFloat ? new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT) : new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
    const colWidth = CANVAS_WIDTH / numCastRays;

    for (let i = 0; i < numCastRays; i++) {
        const depth = rayData[i]?.distance ?? 1000;
        const start = Math.floor(i * colWidth);
        const end = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
        for (let x = start; x < end; x++) {
            for (let y = 0; y < CANVAS_HEIGHT; y++) {
                const idx = y * CANVAS_WIDTH + x;
                depthArray[idx] = useFloat ? depth / 1000 : Math.floor(Math.min(depth / 1000, 1) * 255);
            }
        }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, CANVAS_WIDTH, CANVAS_HEIGHT, 0,
        gl.LUMINANCE, useFloat ? gl.FLOAT : gl.UNSIGNED_BYTE, depthArray);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(locations.u_depthTexture, 1);

    // Player
    gl.uniform3fv(locations.u_playerPos, new Float32Array([playerPosition.x, playerPosition.z, playerPosition.angle]));
    gl.uniform1f(locations.u_fov, playerFOV);
    gl.uniform2f(locations.u_resolution, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Lights
    const posArray = new Float32Array(MAX_LIGHTS * 3);
    const colorArray = new Float32Array(MAX_LIGHTS * 3);
    const intensityArray = new Float32Array(MAX_LIGHTS);

    for (let i = 0; i < MAX_LIGHTS; i++) {
        const l = lights[i];
        if (l) {
            posArray.set(l.position, i * 3);
            colorArray.set(l.color, i * 3);
            intensityArray[i] = l.intensity;
        }
    }

    gl.uniform3fv(locations.u_lightPos, posArray);
    gl.uniform3fv(locations.u_lightColor, colorArray);
    gl.uniform1fv(locations.u_lightIntensity, intensityArray);
    gl.uniform1i(locations.u_lightCount, Math.min(lights.length, MAX_LIGHTS));

    // Draw
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(locations.a_position);
    gl.vertexAttribPointer(locations.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ---------- Cleanup ----------
export function cleanupLightingEngine() {
    if (!gl) return;
    [program, quadBuffer, sceneTexture, depthTexture].forEach(obj => { if (obj) gl.delete(obj); });
    gl = program = quadBuffer = sceneTexture = depthTexture = null;
    lights = [];
}

// ---------- Shader helpers ----------
function createProgram(gl, vsSource, fsSource) {
    const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Shader link error", gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

function compileShader(gl, src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error", gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}
