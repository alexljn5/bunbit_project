import { playerPosition } from "../playerdata/playerlogic.js";
import { getDemonLaughingCurrentFrame } from "../mapdata/maptextures.js";
import { renderEngine } from "../rendering/renderengine.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y } from "../globals.js";
import { casperLesserDemonSprite } from "../rendering/rendersprites.js";
import { fuckTheScreenUpBaby } from "../rendering/raycasting.js"; // Fixed import
import { playDemonRumble } from "../audio/audiohandler.js";
import { mapHandler } from "../mapdata/maphandler.js";

// Map-local state
const state = {
    startX: 0,
    startY: 0,
    numRows: 31,
    numCols: 15,
    demonInterval: 20,
    eventDemonStep: 10,
    eventStartTime: 0,
    eventDemonActive: false,
    deathDemonActive: false,
    eventStartTimeGlobal: null,
    TIME_LIMIT: 50000,
    casperTimeoutId: null,
    casperSpawnInterval: 500,
    lastFovEffect: 0, // Added to throttle fuckTheScreenUpBaby
};

// Reset state when map changes
export function resetMap01Events() {
    state.eventStartTimeGlobal = null;
    state.eventDemonActive = false;
    state.deathDemonActive = false;
    state.eventStartTime = 0;
    state.eventDemonStep = 10;
    state.lastFovEffect = 0;
    if (state.casperTimeoutId) clearTimeout(state.casperTimeoutId);
    state.casperTimeoutId = null;
}

export function map01EventsGodFunction(onComplete = () => { }) {
    if (mapHandler.activeMapKey !== "map_01") {
        console.log("map_01_events.js: map_01 not active, skipping events.");
        return;
    }
    console.log("map_01_events.js: map_01 active, running events *giggles*");
    if (typeof onComplete !== "function") onComplete = () => { };
    if (!state.eventStartTimeGlobal) state.eventStartTimeGlobal = performance.now();
    map01Event01(onComplete);
}

function map01Event01(onComplete) {
    const elapsed = performance.now() - state.eventStartTimeGlobal;
    if (elapsed > state.TIME_LIMIT) {
        state.eventDemonActive = false;
        onComplete();
        return;
    }
    // Adjust trigger area based on map bounds
    const bounds = mapHandler.getSectorBounds();
    const mapWidth = bounds ? bounds.width * 50 : 1550; // 31 * tileSectors (50)
    if (playerPosition.x > 600 && playerPosition.z < 610) {
        if (!state.eventDemonActive && !state.deathDemonActive) {
            state.eventDemonStep = 0;
            state.eventStartTime = performance.now();
            state.eventDemonActive = true;
            renderEngine.fillStyle = "rgba(0, 0, 0, 0.4)";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            animateDemons(onComplete);
            playDemonRumble();
        }
    } else {
        state.eventDemonActive = false;
    }
}

function animateDemons(onComplete) {
    let animationId = null;
    let lastCasperSpawn = 0;
    const baseWidth = 128 * SCALE_X;
    const baseHeight = 128 * SCALE_Y;

    function render(now) {
        if (!state.eventDemonActive || state.deathDemonActive || mapHandler.activeMapKey !== "map_01") {
            state.eventDemonActive = false;
            cancelAnimationFrame(animationId);
            if (state.casperTimeoutId) clearTimeout(state.casperTimeoutId);
            state.casperTimeoutId = null;
            onComplete();
            return;
        }

        const elapsed = now - state.eventStartTime;
        if (elapsed >= 10000) {
            state.eventDemonActive = false;
            cancelAnimationFrame(animationId);
            if (state.casperTimeoutId) clearTimeout(state.casperTimeoutId);
            state.casperTimeoutId = null;
            onComplete();
            return;
        }

        const totalDemons = state.numRows * state.numCols;
        state.eventDemonStep = Math.min(totalDemons, Math.floor(elapsed / state.demonInterval));

        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.fillStyle = "rgba(20, 0, 0, 0.5)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const demonFrame = getDemonLaughingCurrentFrame();

        renderEngine.save();
        for (let i = 0; i < state.eventDemonStep; i++) {
            const row = Math.floor(i / state.numCols);
            const col = i % state.numCols;
            const x = (state.startX + col * 128) * SCALE_X;
            const y = (state.startY + row * 128) * SCALE_Y;

            if (demonFrame) {
                renderEngine.drawImage(demonFrame, x, y, baseWidth, baseHeight);
            }

            if (elapsed - lastCasperSpawn >= state.casperSpawnInterval) {
                lastCasperSpawn = elapsed;
                renderEngine.fillStyle = "rgba(50, 0, 0, 0.7)";
                renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                const pulse = 1 + 0.2 * Math.sin(elapsed * 0.005);
                const width = baseWidth * pulse;
                const height = baseHeight * pulse;
                const offsetX = x + (baseWidth * (1 - pulse)) / 2;
                const offsetY = y + (baseHeight * (1 - pulse)) / 2;

                renderEngine.shadowColor = "rgba(255, 0, 0, 0.5)";
                renderEngine.shadowBlur = 20;
                renderEngine.globalAlpha = 0.5 + 0.5 * Math.sin(elapsed * 0.003);
                renderEngine.drawImage(casperLesserDemonSprite, offsetX, offsetY, width, height);
                renderEngine.globalAlpha = 1.0;
                renderEngine.shadowBlur = 0;
            }
        }

        // Random Casper spawn
        if (elapsed - lastCasperSpawn >= state.casperSpawnInterval * (0.5 + Math.random())) {
            lastCasperSpawn = elapsed;
            renderEngine.fillStyle = "rgba(80, 0, 0, 0.4)";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const spriteWidth = baseWidth * 1.5;
            const spriteHeight = baseHeight * 1.5;
            const randomX = Math.random() * (CANVAS_WIDTH - spriteWidth) + Math.sin(elapsed * 0.01) * 20;
            const randomY = Math.random() * (CANVAS_HEIGHT - spriteHeight) + Math.cos(elapsed * 0.01) * 20;

            if (elapsed - state.lastFovEffect >= 1000) {
                state.lastFovEffect = elapsed;
                fuckTheScreenUpBaby();
            }
            renderEngine.translate(randomX + spriteWidth / 2, randomY + spriteHeight / 2);
            renderEngine.rotate(Math.sin(elapsed * 0.002) * 0.2);
            renderEngine.globalAlpha = 0.7 + 0.3 * Math.sin(elapsed * 0.004);
            renderEngine.shadowColor = "rgba(255, 0, 0, 0.5)";
            renderEngine.shadowBlur = 20;
            renderEngine.drawImage(casperLesserDemonSprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
            renderEngine.globalAlpha = 1.0;
            renderEngine.shadowBlur = 0;
        }
        renderEngine.restore();

        animationId = requestAnimationFrame(render);
    }
    animationId = requestAnimationFrame(render);
}

export function casperLesserDemonDeathScreen() {
    if (state.eventDemonActive || state.deathDemonActive || mapHandler.activeMapKey !== "map_01") return;

    if (state.casperTimeoutId) clearTimeout(state.casperTimeoutId);
    state.casperTimeoutId = null;

    let deathDemonStep = 0;
    const deathStartTime = performance.now();
    state.deathDemonActive = true;

    let animationId = null;
    const duration = 10000;
    const baseWidth = 128 * SCALE_X;
    const baseHeight = 128 * SCALE_Y;

    function render(now) {
        if (!state.deathDemonActive || mapHandler.activeMapKey !== "map_01") {
            state.deathDemonActive = false;
            cancelAnimationFrame(animationId);
            return;
        }

        const elapsed = now - deathStartTime;
        if (elapsed >= duration) {
            state.deathDemonActive = false;
            cancelAnimationFrame(animationId);
            return;
        }

        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.fillStyle = "rgba(255, 0, 0, 0.1)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const demonFrame = getDemonLaughingCurrentFrame();

        renderEngine.save();
        for (let i = 0; i < deathDemonStep; i++) {
            const row = Math.floor(i / state.numCols);
            const col = i % state.numCols;
            const x = (state.startX + col * 128) * SCALE_X;
            const y = (state.startY + row * 128) * SCALE_Y;

            if (demonFrame) {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
                renderEngine.fillRect(x, y, baseWidth, baseHeight);
                renderEngine.drawImage(demonFrame, x, y, baseWidth, baseHeight);
            }

            if (elapsed > 1000) {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
                renderEngine.fillRect(x, y, baseWidth, baseHeight);
                renderEngine.drawImage(casperLesserDemonSprite, x, y, baseWidth, baseHeight);
            }
        }

        renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (elapsed - state.lastFovEffect >= 1000) {
            state.lastFovEffect = elapsed;
            fuckTheScreenUpBaby();
        }
        const spriteWidth = CANVAS_WIDTH / 2;
        const spriteHeight = CANVAS_HEIGHT / 2;
        const spriteX = (CANVAS_WIDTH - spriteWidth) / 2;
        const spriteY = (CANVAS_HEIGHT - spriteHeight / 4 + 50) / 2;
        renderEngine.drawImage(casperLesserDemonSprite, spriteX, spriteY, spriteWidth, spriteHeight);
        renderEngine.restore();

        animationId = requestAnimationFrame(render);
    }

    animationId = requestAnimationFrame(render);
}