// src/rendering/lightengine/renderlight.js
//
// Creamified version 🐰✨
// No more mysterious magic numbers — just cute, clean, self-documenting WebGL!
//

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerFOV, numCastRays } from "../raycasting.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { vertexShaderSource, fragmentShaderSource } from "./shaders.js";

// 🧩 Constants for clarity
const MAX_DEPTH = 1000.0; // Used to normalize ray depth data
const DEPTH_TEXTURE_LEVEL = 0;

// Quad geometry for fullscreen lighting pass
const QUAD_VERTICES = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
]);

// Texture units
const TEXTURE_UNIT_SCENE = 0;
const TEXTURE_UNIT_DEPTH = 1;

// Vertex attributes
const POSITION_COMPONENTS = 2;
const VERTEX_STRIDE = 0;
const VERTEX_OFFSET = 0;
const VERTEX_COUNT = 4;

// Lighting canvas for rendering
const lightingCanvas = document.createElement("canvas");
lightingCanvas.width = CANVAS_WIDTH;
lightingCanvas.height = CANVAS_HEIGHT;

// WebGL variables
let gl = null;
let lightingProgram = null;
let quadBuffer = null;
let sceneTexture = null;
let depthTexture = null;
let lights = []; // Dynamic light array

// 🌟 Initialize the lighting engine
export function initLightingEngine() {
    console.log("Initializing WebGL lighting *giggles*");

    gl = lightingCanvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL not supported! Lighting disabled. *pouts*");
        return false;
    }

    // Cache important GL enums for clarity
    const {
        ARRAY_BUFFER,
        STATIC_DRAW,
        TRIANGLE_STRIP,
        FLOAT,
        TEXTURE_2D,
        TEXTURE_MIN_FILTER,
        TEXTURE_MAG_FILTER,
        LINEAR,
        NEAREST,
        RGBA,
        LUMINANCE,
        UNSIGNED_BYTE
    } = gl;

    console.log("WebGL context created, version:", gl.getParameter(gl.VERSION));

    // Build shaders
    const fsSource = fragmentShaderSource(CANVAS_WIDTH, CANVAS_HEIGHT);
    lightingProgram = createShaderProgram(gl, vertexShaderSource, fsSource);
    if (!lightingProgram) {
        console.error("Failed to create lighting program *sad chao*");
        return false;
    }

    // Create fullscreen quad
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(ARRAY_BUFFER, quadBuffer);
    gl.bufferData(ARRAY_BUFFER, QUAD_VERTICES, STATIC_DRAW);
    console.log("Quad buffer created *twirls*");

    // Init single dynamic light following the player
    lights = [
        { position: [playerPosition.x, playerPosition.z, 1.0], color: [1.0, 1.0, 0.8], intensity: 1.0 }
    ];
    console.log("Lights initialized:", JSON.stringify(lights));

    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error after init:", error);
    }
    return true;
}

// 🕯 Update lights (can be called per frame)
export function updateLights(customLights = []) {
    if (customLights.length > 0) {
        lights = customLights;
    }

    // Example: main light follows player
    if (lights[0]) {
        lights[0].position = [playerPosition.x, playerPosition.z, 1.0];
    }

    console.log("Lights updated:", JSON.stringify(lights));
}

// 💡 Apply lighting post-process to the rendered scene
export function applyLighting(sceneCanvas, rayData) {
    if (!gl || !lightingProgram) {
        console.warn("Lighting skipped: WebGL or program not ready *pouts*");
        return;
    }

    console.time("applyLighting");
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.useProgram(lightingProgram);

    const {
        ARRAY_BUFFER,
        FLOAT,
        TEXTURE_2D,
        TEXTURE_MIN_FILTER,
        TEXTURE_MAG_FILTER,
        LINEAR,
        NEAREST,
        RGBA,
        LUMINANCE
    } = gl;

    // 🎨 Upload scene texture
    if (!sceneTexture) sceneTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + TEXTURE_UNIT_SCENE);
    gl.bindTexture(TEXTURE_2D, sceneTexture);
    gl.texImage2D(TEXTURE_2D, 0, RGBA, RGBA, UNSIGNED_BYTE, sceneCanvas);
    gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, LINEAR);
    gl.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, LINEAR);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, "u_sceneTexture"), TEXTURE_UNIT_SCENE);
    console.log("Scene texture bound, size:", CANVAS_WIDTH, "x", CANVAS_HEIGHT);

    // 🌫 Build depth texture from ray data
    if (!depthTexture) depthTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + TEXTURE_UNIT_DEPTH);
    gl.bindTexture(TEXTURE_2D, depthTexture);

    const depthData = new Float32Array(CANVAS_WIDTH * CANVAS_HEIGHT);
    const colWidth = CANVAS_WIDTH / numCastRays;
    for (let i = 0; i < numCastRays; i++) {
        const depth = rayData[i]?.distance || MAX_DEPTH;
        const startCol = Math.floor(i * colWidth);
        const endCol = Math.min(Math.floor((i + 1) * colWidth), CANVAS_WIDTH);
        for (let col = startCol; col < endCol; col++) {
            for (let row = 0; row < CANVAS_HEIGHT; row++) {
                depthData[row * CANVAS_WIDTH + col] = depth / MAX_DEPTH;
            }
        }
    }

    gl.texImage2D(
        TEXTURE_2D,
        DEPTH_TEXTURE_LEVEL,
        LUMINANCE,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        0,
        LUMINANCE,
        FLOAT,
        depthData
    );
    gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, NEAREST);
    gl.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, NEAREST);
    gl.uniform1i(gl.getUniformLocation(lightingProgram, "u_depthTexture"), TEXTURE_UNIT_DEPTH);
    console.log("Depth texture bound (first sample):", depthData[0]);

    // 🎛 Set shader uniforms
    const playerPos = [playerPosition.x, playerPosition.z, playerPosition.angle];
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, "u_playerPos"), new Float32Array(playerPos));
    gl.uniform1f(gl.getUniformLocation(lightingProgram, "u_fov"), playerFOV);
    gl.uniform2f(gl.getUniformLocation(lightingProgram, "u_resolution"), CANVAS_WIDTH, CANVAS_HEIGHT);

    const lightPos = lights.flatMap(l => l.position);
    const lightColor = lights.flatMap(l => l.color);
    const lightIntensity = lights.map(l => l.intensity);

    gl.uniform3fv(gl.getUniformLocation(lightingProgram, "u_lightPos"), new Float32Array(lightPos));
    gl.uniform3fv(gl.getUniformLocation(lightingProgram, "u_lightColor"), new Float32Array(lightColor));
    gl.uniform1fv(gl.getUniformLocation(lightingProgram, "u_lightIntensity"), new Float32Array(lightIntensity));
    gl.uniform1i(gl.getUniformLocation(lightingProgram, "u_lightCount"), lights.length);

    console.log(
        "Uniforms set:",
        "\nPlayerPos:", playerPos,
        "\nFOV:", playerFOV,
        "\nLightCount:", lights.length
    );

    // 🧱 Draw fullscreen lighting quad
    gl.bindBuffer(ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(lightingProgram, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, POSITION_COMPONENTS, FLOAT, false, VERTEX_STRIDE, VERTEX_OFFSET);
    gl.drawArrays(gl.TRIANGLE_STRIP, VERTEX_OFFSET, VERTEX_COUNT);
    console.log("Lighting quad drawn *sparkles*");

    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error in applyLighting:", error);
    }

    console.timeEnd("applyLighting");
}

// 🧹 Cleanup
export function cleanupLightingEngine() {
    if (gl) {
        gl.deleteProgram(lightingProgram);
        gl.deleteBuffer(quadBuffer);
        gl.deleteTexture(sceneTexture);
        gl.deleteTexture(depthTexture);
        console.log("Lighting cleaned up! *chao chao*");
    }
}

// 🧠 Shader utility helpers
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
        console.error(
            `Shader compile error (${type === gl.VERTEX_SHADER ? "vertex" : "fragment"}):`,
            gl.getShaderInfoLog(shader)
        );
        return null;
    }

    console.log(`Shader compiled: ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} *chao chao*`);
    return shader;
}
