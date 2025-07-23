import { renderEngine } from "../rendering/renderengine.js";
import { compiledTextStyle } from "../debugtools.js";
import { staminaBarMeterOnCanvas, healthMeterOnCanvas } from "./playerui.js";
import { playerMovementDisabled as catMovementDisabled } from "../ai/friendlycat.js";
import { playerMovementDisabled as pickupMovementDisabled } from "../interactions/interactionlogic.js";
import { wallCollision } from "../collissiondetection/collissionwalllogic.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { drawRespawnMenu } from "../menus/menurespawn.js";

export let playerVantagePointX = { playerVantagePointX: 0 };
export let playerVantagePointY = { playerVantagePointY: 0 };

export const keys = Object.fromEntries([
    ["w", false], ["a", false], ["s", false], ["d", false],
    ["q", false], ["e", false], [" ", false], ["shift", false],
    ["alt", false], ["p", false], ["t", false], ["enter", false],
    ["i", false], ["1", false], ["2", false], ["3", false], ["4", false],
    ["5", false], ["6", false], ["7", false], ["8", false], ["9", false],
    ["f3", false], ["f4", false], ["escape", false], ["y", false]
]);

let playerMovementSpeed = 100;
let playerRotationSpeed = Math.PI / 3;
let lastTime = performance.now();
export const playerStamina = { playerStaminaBar: 100 };
let maxStamina = 100;
let drainRate = 50;
let regenRate = 20;
let maxHealth = 100;
export let playerHealthBar = 100;
export const playerHealth = { playerHealth: 100 };
export let gameOver = false;
let showDebugTools = false;

const canvas = document.getElementById('mainGameRender');
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

export let playerPosition = { x: 2.5 * 50 / 2, z: 2.5 * 50 / 2, angle: 0 };
export let previousPosition = { x: playerPosition.x, z: playerPosition.z };
export let playerMovement = { x: 0, z: 0 };

// --- Bobbing effect state ---
let bobbingTime = 0;
let bobbingOffset = 0;
const BOBBING_SPEED = 8; // Higher = faster bobbing
const BOBBING_AMPLITUDE = 14; // Higher = more vertical movement

// --- Input Listeners ---
window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.ctrlKey && (key === "w")) {
        event.preventDefault();
        keys.w = true;
        keys.alt = true;
        return false;
    }
    if (key in keys) {
        event.preventDefault();
        keys[key] = true;
    }
    // Toggle debug tools with F3
    if (event.key === "F3" || event.key === "f3") {
        showDebugTools = !showDebugTools;
    }
}, true);

window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) {
        event.preventDefault();
        keys[key] = false;
    }
});

window.addEventListener("blur", () => {
    for (let key in keys) keys[key] = false;
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && document.mozPointerLockElement !== canvas) {
        for (let key in keys) keys[key] = false;
    }
});

// Import showTerminal from terminal.js
import { showTerminal } from "../console/terminal/terminal.js";

// Define the onRespawn function
export function onRespawn() {
    playerHealth.playerHealth = maxHealth; // Reset health
    playerHealthBar = maxHealth;
    playerStamina.playerStaminaBar = maxStamina; // Reset stamina
    playerPosition = { x: 2.5 * 50 / 2, z: 2.5 * 50 / 2, angle: 0 }; // Reset position
    gameOver = false; // Reset game over state
    canvas.onclick = null; // Clear click handler to avoid conflicts
}

export function playerLogic() {
    // Block all movement if game over, terminal is open, or movement is disabled by cat or pickup
    if (gameOver || showTerminal || catMovementDisabled || pickupMovementDisabled) return;

    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    // Health and stamina management
    playerHealthBar = playerHealth.playerHealth;
    let isSprinting = false;
    if (keys.alt && (keys.w || keys.s || keys.q || keys.e) && playerStamina.playerStaminaBar > 0) {
        isSprinting = true;
        playerStamina.playerStaminaBar = Math.max(0, playerStamina.playerStaminaBar - drainRate * deltaTime);
    } else if (playerStamina.playerStaminaBar < maxStamina) {
        playerStamina.playerStaminaBar = Math.min(maxStamina, playerStamina.playerStaminaBar + regenRate * deltaTime);
    }

    // Store previous position before updating
    previousPosition.x = playerPosition.x;
    previousPosition.z = playerPosition.z;

    // Movement
    if (keys.a) playerPosition.angle -= playerRotationSpeed * deltaTime;
    if (keys.d) playerPosition.angle += playerRotationSpeed * deltaTime;
    const cosAngle = Math.cos(playerPosition.angle);
    const sinAngle = Math.sin(playerPosition.angle);
    const sprintMultiplier = isSprinting && playerStamina.playerStaminaBar > 0 ? 2 : 1;
    const slowMultiplier = keys.shift ? 0.5 : 1;
    let isMoving = keys.w || keys.s || keys.q || keys.e;
    if (keys.w) {
        playerPosition.x += cosAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z += sinAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }
    if (keys.s) {
        playerPosition.x -= cosAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z -= sinAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }
    if (keys.q) {
        playerPosition.x += sinAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z -= cosAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }
    if (keys.e) {
        playerPosition.x -= sinAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z += cosAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }

    // --- Bobbing effect update ---
    if (isMoving) {
        bobbingTime += deltaTime * (isSprinting ? BOBBING_SPEED * 1.5 : BOBBING_SPEED);
        bobbingOffset = Math.sin(bobbingTime) * (isSprinting ? BOBBING_AMPLITUDE * 1.2 : BOBBING_AMPLITUDE);
    } else {
        // Smoothly return to zero when not moving
        bobbingOffset *= 0.85;
        bobbingTime += deltaTime * BOBBING_SPEED * 0.5;
    }

    // Apply collision detection
    wallCollision(isSprinting, playerMovementSpeed, deltaTime);

    // Update vantage point
    playerMovement.x = playerPosition.x - 2.5 * 50 / 2;
    playerMovement.z = playerPosition.z - 2.5 * 50 / 2;
    playerVantagePointX.playerVantagePointX = playerMovement.x * 0.02;
    playerVantagePointY.playerVantagePointY = playerMovement.z * 0.02;

    if (playerHealth.playerHealth <= 0) {
        gameOver = true;
        // Draw death screen with canvas and onRespawn
        drawRespawnMenu(canvas, onRespawn);
        staminaBarMeterOnCanvas();
        healthMeterOnCanvas();
    }
}

// --- Bobbing offset getter for use in sprite rendering ---
export function getPlayerBobbingOffset() {
    return bobbingOffset;
}

// --- Interaction Key Handling ---
export function isInteractionKeyPressed() {
    return keys.t;
}

export { showDebugTools };