// src/rendering/lightengine/renderlight.js

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerFOV } from "../raycasting.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { numCastRays } from "../raycasting.js";
import { vertexShaderSource, fragmentShaderSource } from "./shaders.js";

const lightingCanvas = document.createElement("canvas");
lightingCanvas.width = CANVAS_WIDTH;
lightingCanvas.height = CANVAS_HEIGHT;

let gl = null;
let lightingProgram = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;
let lights = []; // Initialize as empty to avoid init error

// Init lighting
export function initLightingEngine() {
    console.log("Initializing WebGL lighting *giggles*");
    gl = lightingCanvas.getContext('webgl');
    if (!gl) {
        console.error("WebGL not supported! Lighting disabled. *pouts*");
        return false;
    }
    console.log("WebGL context created, version:", gl.getParameter(gl.VERSION));
    const fsSource = fragmentShaderSource(CANVAS_WIDTH, CANVAS_HEIGHT);
    lightingProgram = createShaderProgram(gl, vertexShaderSource, fsSource);
    if (!lightingProgram) {
        console.error("Failed to create lighting program *sad chao*");
        return false;
    }
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    console.log("Quad buffer created *twirls*");

    // Init lights
    lights = [
        { position: [playerPosition.x, playerPosition.z, 1], color: [1, 1, 0.8], intensity: 1.0 }
    ];
    console.log("Lights initialized:", JSON.stringify(lights));

    // Check WebGL state
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error after init:", error);
    }
    return true;
}

// Update lights (call in loop)
export function updateLights(customLights = []) {
    if (customLights.length) {
        lights = customLights;
    }
    // Update first light to follow player (example)
    if (lights[0]) {
        lights[0].position = [playerPosition.x, playerPosition.z, 1];
    }
    console.log("Lights updated:", JSON.stringify(lights));
}

// Apply lighting post-process
export function applyLighting(sceneCanvas, rayData) {
    if (!gl || !lightingProgram) {
        console.warn("Lighting skipped: WebGL or program not ready *pouts*");
        return;
    }
    console.time('applyLighting');
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.useProgram(lightingProgram);

    // Update scene texture from sceneCanvas
    if (!sceneTexture) sceneTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_sceneTexture'), 0);
    console.log("Scene texture bound, size:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);

    // Update depth texture from rayData
    if (!depthTexture) depthTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    const depthData = new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT);
    const colWidth = CANVAS_WIDTH / numCastRays;
    for (let i = 0; i < numCastRays; i++) {
        const depth = rayData[i]?.distance || 1000;
        const startCol = Math.floor(i * colWidth);
        const endCol = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
        for (let col = startCol; col < endCol; col++) {
            for (let row = 0; row < CANVAS_HEIGHT; row++) {
                depthData[row * CANVAS_WIDTH + col] = depth / 1000;
            }
        }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, CANVAS_WIDTH, CANVAS_HEIGHT, 0, gl.LUMINANCE, gl.FLOAT, depthData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_depthTexture'), 1);
    console.log("Depth texture bound, sample:", depthData[0]);

    // Set uniforms
    const playerPos = [playerPosition.x, playerPosition.z, playerPosition.angle];
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_playerPos'), new Float32Array(playerPos));
    gl.uniform1f(gl.getUniformLocation(lightingProgram, 'u_fov'), playerFOV);
    gl.uniform2f(gl.getUniformLocation(lightingProgram, 'u_resolution'), CANVAS_WIDTH, CANVAS_HEIGHT);
    const lightPos = lights.flatMap(l => l.position);
    const lightColor = lights.flatMap(l => l.color);
    const lightIntensity = lights.map(l => l.intensity);
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_lightPos'), new Float32Array(lightPos));
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, 'u_lightColor'), new Float32Array(lightColor));
    gl.uniform1fv(gl.getUniformLocation(lightingProgram, 'u_lightIntensity'), new Float32Array(lightIntensity));
    gl.uniform1i(gl.getUniformLocation(lightingProgram, 'u_lightCount'), lights.length);
    console.log("Uniforms set - playerPos:", playerPos, "fov:", playerFOV, "lightCount:", lights.length);

    // Draw quad
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(lightingProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    console.log("Lighting quad drawn *sparkles*");

    // Check WebGL errors
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error in applyLighting:", error);
    }
    console.timeEnd('applyLighting');
}

// Cleanup lighting
export function cleanupLightingEngine() {
    if (gl) {
        gl.deleteProgram(lightingProgram);
        gl.deleteBuffer(quadBuffer);
        gl.deleteTexture(sceneTexture);
        gl.deleteTexture(depthTexture);
        console.log("Lighting cleaned up! *chao chao*");
    }
}

// Create shader program
function createShaderProgram(gl, vsSource, fsSource) {
    console.log("Creating shader program *twirls*");
    const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) {
        console.error("Shader compilation failed *pouts*");
        return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader link error:", gl.getProgramInfoLog(program));
        return null;
    }
    console.log("Shader program linked successfully! *sparkles*");
    return program;
}

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compile error (${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'}):`, gl.getShaderInfoLog(shader));
        return null;
    }
    console.log(`Shader compiled: ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} *chao chao*`);
    return shader;
}
