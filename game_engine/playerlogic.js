export let playerVantagePointX = {
    playerVantagePointX: 0 // No offset at start
};

export let playerVantagePointY = {
    playerVantagePointY: 0 // No offset at start
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
    control: false
};

let playerMovementSpeed = 100; // Speed in pixels per second
let playerRotationSpeed = Math.PI / 3; // Rotation speed in radians per second (90°/s)
let lastTime = performance.now();
export let playerStaminaBar = 100;
const maxStamina = 100;
const drainRate = 50; // Stamina per second when sprinting
const regenRate = 20; // Stamina per second when not sprinting

// Stamina bar canvas setup
const staminaCanvas = document.createElement("canvas");
staminaCanvas.id = 'staminaBar';
staminaCanvas.width = 200;
staminaCanvas.height = 30;
staminaCanvas.style.position = "absolute";
staminaCanvas.style.top = "400px"; // Random value, adjust later
staminaCanvas.style.left = "850px"; // Random value, adjust later
document.body.appendChild(staminaCanvas);
const staminaContext = staminaCanvas.getContext("2d");

const canvas = document.getElementById('mainGameRender');
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

// Capture Ctrl+W early
window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        event.stopPropagation();
        keys.w = true;
        keys.control = true;
    }
}, true);

addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = true;
        if (event.ctrlKey || (event.shiftKey && (key === "w" || key === "s" || key === "q" || key === "e"))) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
});

addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;
        if (event.ctrlKey || event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
});

canvas.addEventListener('click', () => {
    canvas.requestFullscreen();
    canvas.requestPointerLock();
    canvas.focus();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
    } else {
        for (let key in keys) {
            keys[key] = false;
        }
    }
});

export let playerPosition = {
    x: 2.5 * 50 / 2,
    z: 2.5 * 50 / 2,
    angle: 0
};

export let playerMovement = {
    x: 0,
    z: 0
};

export function playerLogic() {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    // Stamina management
    const isSprinting = keys.control && (keys.w || keys.s || keys.q || keys.e) && playerStaminaBar > 0;
    if (isSprinting) {
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
    const sprintMultiplier = isSprinting ? 2 : 1;
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

    // Strafing logic (Q = left, E = right)
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

    staminaBarMeterOnCanvas();
}

function staminaBarMeterOnCanvas() {
    const barWidth = 180; // Slightly smaller than canvas for border
    const barHeight = 200;
    const x = (staminaCanvas.width - barWidth) / 2;
    const y = (staminaCanvas.height - barHeight) / 2;

    // Clear the canvas
    staminaContext.clearRect(0, 0, staminaCanvas.width, staminaCanvas.height);

    // Draw background
    staminaContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    staminaContext.fillRect(x, y, barWidth, barHeight);

    // Draw stamina bar
    staminaContext.fillStyle = playerStaminaBar <= 20 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)'; // Red when low
    staminaContext.fillRect(x, y, (barWidth * playerStaminaBar) / maxStamina, barHeight);

    // Draw border (like minimap)
    staminaContext.strokeStyle = "white";
    staminaContext.lineWidth = 2;
    staminaContext.strokeRect(x, y, barWidth, barHeight);
}