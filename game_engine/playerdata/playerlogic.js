import { renderEngine, CANVAS_WIDTH, CANVAS_HEIGHT } from "../renderengine.js";
import { compiledTextStyle } from "../debugtools.js";

export let playerVantagePointX = {
    playerVantagePointX: 0
};

export let playerVantagePointY = {
    playerVantagePointY: 0
};

export const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    [" "]: false,
    shift: false,
    alt: false
};

let playerMovementSpeed = 100; // Speed in pixels per second
let playerRotationSpeed = Math.PI / 3; // 90°/s
let lastTime = performance.now();
export let playerStaminaBar = 100;
let maxStamina = 100;
let drainRate = 50; // Stamina per second when sprinting
let regenRate = 20; // Stamina per second when not sprinting
let maxHealth = 100;
export let playerHealthBar = 100; // This will now follow playerHealth.playerHealth
export const playerHealth = {
    playerHealth: 100,
};


const canvas = document.getElementById('mainGameRender');
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

export let playerPosition = {
    x: 2.5 * 50 / 2, // 62.5
    z: 2.5 * 50 / 2, // 62.5
    angle: 0
};

export let previousPosition = {
    x: playerPosition.x,
    z: playerPosition.z
}; // Add previousPosition

export let playerMovement = {
    x: 0,
    z: 0
};

// Dedicated listener for Ctrl+W and Ctrl+Shift+W
window.addEventListener(
    "keydown",
    (event) => {
        const key = event.key.toLowerCase();
        if (event.ctrlKey && (key === "w" || key === "W")) {
            console.log("Ctrl+W intercepted!");
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            keys.w = true;
            keys.alt = true;
            return false;
        }
    },
    true
);

// General keydown listener for other keys
window.addEventListener(
    "keydown",
    (event) => {
        const key = event.key.toLowerCase();
        if (key in keys) {
            event.preventDefault();
            event.stopPropagation();
            keys[key] = true;
        }
    },
    true
);

// Keyup listener
window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) {
        event.preventDefault();
        event.stopPropagation();
        keys[key] = false;
    }
});

// Reset keys on window blur or focus loss
window.addEventListener("blur", () => {
    console.log("Window blurred, resetting keys");
    for (let key in keys) {
        keys[key] = false;
    }
});

canvas.addEventListener('click', () => {
    canvas.requestFullscreen();
    canvas.requestPointerLock();
    canvas.focus();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
        console.log("Pointer lock acquired");
    } else {
        console.log("Pointer lock lost, resetting keys");
        for (let key in keys) {
            keys[key] = false;
        }
    }
});

export function playerLogic() {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    // Save current position before movement
    previousPosition.x = playerPosition.x;
    previousPosition.z = playerPosition.z;

    //Health management
    playerHealthBar = playerHealth.playerHealth;

    // Stamina management
    let isSprinting = false;
    if (keys.alt && (keys.w || keys.s || keys.q || keys.e) && playerStaminaBar > 0) {
        isSprinting = true;
        playerStaminaBar = Math.max(0, playerStaminaBar - drainRate * deltaTime);
    } else if (playerStaminaBar < maxStamina) {
        playerStaminaBar = Math.min(maxStamina, playerStaminaBar + regenRate * deltaTime);
    }

    // Movement
    if (keys.a) {
        playerPosition.angle -= playerRotationSpeed * deltaTime;
    }

    if (keys.d) {
        playerPosition.angle += playerRotationSpeed * deltaTime;
    }

    const cosAngle = Math.cos(playerPosition.angle);
    const sinAngle = Math.sin(playerPosition.angle);
    const sprintMultiplier = isSprinting && playerStaminaBar > 0 ? 2 : 1;
    const slowMultiplier = keys.shift ? 0.5 : 1;

    if (keys.w) {
        playerPosition.x += cosAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z += sinAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }

    if (keys.s) {
        playerPosition.x -= cosAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z -= sinAngle * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }

    if (keys.q) {
        playerPosition.x += Math.sin(playerPosition.angle) * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z -= Math.cos(playerPosition.angle) * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }

    if (keys.e) {
        playerPosition.x -= Math.sin(playerPosition.angle) * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
        playerPosition.z += Math.cos(playerPosition.angle) * playerMovementSpeed * sprintMultiplier * slowMultiplier * deltaTime;
    }

    if (keys[" "]) {
        console.log("shart");
    }

    playerMovement.x = playerPosition.x - 2.5 * 50 / 2;
    playerMovement.z = playerPosition.z - 2.5 * 50 / 2;
    playerVantagePointX.playerVantagePointX = playerMovement.x * 0.02;
    playerVantagePointY.playerVantagePointY = playerMovement.z * 0.02;

    if (playerHealth.playerHealth <= 0) {
        compiledTextStyle();
        renderEngine.fillText("DEAD", 100, 100);
    }

    staminaBarMeterOnCanvas();
    healthMeterOnCanvas();
}

function staminaBarMeterOnCanvas() {
    const barWidth = 180;
    const barHeight = 20;
    const x = (CANVAS_WIDTH - barWidth) / 100; // Center horizontally
    const y = CANVAS_HEIGHT - barHeight - 740; // Near bottom

    renderEngine.fillStyle = 'rgba(255, 255, 255, 0.5)';
    renderEngine.fillRect(x, y, barWidth, barHeight);

    renderEngine.fillStyle = playerStaminaBar <= 20 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)';
    renderEngine.fillRect(x, y, (barWidth * playerStaminaBar) / maxStamina, barHeight);

    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(x, y, barWidth, barHeight);
}

function healthMeterOnCanvas() {
    const barWidth = 180;
    const barHeight = 20;
    const x = (CANVAS_WIDTH - barWidth) / 100; // Center horizontally
    const y = CANVAS_HEIGHT - barHeight - 640; // Near bottom

    renderEngine.fillStyle = 'rgba(255, 255, 255, 0.5)';
    renderEngine.fillRect(x, y, barWidth, barHeight);

    renderEngine.fillStyle = playerHealthBar <= 20 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    renderEngine.fillRect(x, y, (barWidth * playerHealthBar) / maxHealth, barHeight);

    renderEngine.strokeStyle = "white";
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(x, y, barWidth, barHeight);
}