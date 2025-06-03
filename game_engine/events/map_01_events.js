import { playerPosition } from "../playerdata/playerlogic.js";
import { getDemonLaughingCurrentFrame } from "../mapdata/maptextures.js";
import { renderEngine } from "../renderengine.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { casperLesserDemonSprite } from "../rendersprites.js";
import { fuckTheScreenUp } from "../animations/fuckthescreenup.js";

export function map01EventsGodFunction(onComplete = () => { }) {
    map01Event01(onComplete);
}

const startX = 0;
const startY = 0;
const numRows = 31;
const numCols = 15;
let demonInterval = 200; // ms between each demon
let demonStep = 0;
let startTime = 0;
let eventDemonActive = false; // Separate flag for event
let deathDemonActive = false; // Separate flag for death screen
let lastDemonTime = 0;
let eventStartTime = null;
const TIME_LIMIT = 50000; // 50 seconds
let casperTimeoutId = null;
const casperSpawnInterval = 500; // ms between Casper spawns

function map01Event01(onComplete) {
    if (casperTimeoutId) {
        clearTimeout(casperTimeoutId);
        casperTimeoutId = null;
    }

    if (eventStartTime === null) {
        eventStartTime = performance.now();
    }

    casperTimeoutId = setTimeout(() => {
        const elapsed = performance.now() - eventStartTime;

        if (elapsed > TIME_LIMIT) {
            eventDemonActive = false;
            onComplete();
            return;
        }

        if (playerPosition.x > 600 && playerPosition.z > 250) {
            if (!eventDemonActive) {
                demonStep = 0;
                startTime = performance.now();
                eventDemonActive = true;
                animateDemons(onComplete);
            }
        } else {
            eventDemonActive = false;
        }
    }, 2000);
}

function animateDemons(onComplete) {
    let animationId = null;
    let lastCasperSpawn = 0;

    function render(now) {
        const elapsed = now - startTime;
        if (elapsed >= 10000 || !eventDemonActive) {
            eventDemonActive = false;
            cancelAnimationFrame(animationId);
            if (casperTimeoutId) {
                clearTimeout(casperTimeoutId);
                casperTimeoutId = null;
            }
            onComplete();
            return;
        }

        // Update demonStep based on elapsed time
        const totalDemons = numRows * numCols;
        demonStep = Math.min(totalDemons, Math.floor(elapsed / demonInterval));

        // Clear canvas with black overlay
        renderEngine.fillStyle = "rgba(0, 0, 0, 0.1)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Render demons up to demonStep
        for (let i = 0; i < demonStep; i++) {
            const row = Math.floor(i / numCols);
            const col = i % numCols;
            const x = (startX + col * 128) * SCALE_X;
            const y = (startY + row * 128) * SCALE_Y;
            const width = 128 * SCALE_X;
            const height = 128 * SCALE_Y;

            // Demon laughing frame
            const demonFrame = getDemonLaughingCurrentFrame();
            if (demonFrame) {
                renderEngine.drawImage(demonFrame, x, y, width, height);
            }

            // Casper sprite at 1s mark, grid position
            if (elapsed - lastCasperSpawn >= casperSpawnInterval) {
                lastCasperSpawn = elapsed;
                setTimeout(() => {
                    renderEngine.fillStyle = "rgba(0, 0, 0, 0.2)";
                    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    renderEngine.fillStyle = "rgba(34, 2, 2, 0.6)";
                    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    renderEngine.fillStyle = "rgba(40, 0, 0, 0.4)";
                    renderEngine.drawImage(casperLesserDemonSprite, x, y, width, height);
                }, 4000);
            }
        }

        // Spawn random Casper sprite
        if (elapsed - lastCasperSpawn >= casperSpawnInterval) {
            lastCasperSpawn = elapsed;
            setTimeout(() => {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.3)";
                renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                renderEngine.fillStyle = "rgba(40, 0, 0, 0.4)";
                const spriteWidth = 128 * SCALE_X;
                const spriteHeight = 128 * SCALE_Y;
                const randomX = Math.random() * (CANVAS_WIDTH - spriteWidth);
                const randomY = Math.random() * (CANVAS_HEIGHT - spriteHeight);
                renderEngine.drawImage(casperLesserDemonSprite, randomX, randomY, spriteWidth, spriteHeight);
            }, 2000);
        }

        // Continue animation
        if (elapsed < 10000 && eventDemonActive) {
            animationId = requestAnimationFrame(render);
        } else {
            eventDemonActive = false;
            cancelAnimationFrame(animationId);
            onComplete();
        }
    }
    animationId = requestAnimationFrame(render);
}

export function casperLesserDemonDeathScreen() {
    if (!deathDemonActive) {
        demonStep = 0;
        lastDemonTime = performance.now();
        startTime = performance.now();
        deathDemonActive = true;
    }

    let animationId = null;
    const duration = 10000; // 10 seconds

    function render(now) {
        const elapsed = now - startTime;
        if (elapsed >= duration || !deathDemonActive) {
            deathDemonActive = false;
            cancelAnimationFrame(animationId);
            return;
        }

        const totalDemons = numRows * numCols;
        demonStep = Math.min(totalDemons, Math.floor(elapsed / demonInterval));

        renderEngine.fillStyle = "rgba(255, 0, 0, 0.1)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        for (let i = 0; i < demonStep; i++) {
            const row = Math.floor(i / numCols);
            const col = i % numCols;
            const x = (startX + col * 128) * SCALE_X;
            const y = (startY + row * 128) * SCALE_Y;
            const width = 128 * SCALE_X;
            const height = 128 * SCALE_Y;

            // Draw laughing demons
            const demonFrame = getDemonLaughingCurrentFrame();
            if (demonFrame) {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
                renderEngine.fillRect(x, y, width, height);
                renderEngine.drawImage(demonFrame, x, y, width, height);
            }

            // Draw Casper sprites and overlays at specific times
            if (elapsed > 1000) {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
                renderEngine.fillRect(x, y, width, height);
                renderEngine.drawImage(casperLesserDemonSprite, x, y, width, height);
            }
        }

        // Draw large centered Casper sprite
        renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        fuckTheScreenUp();
        const spriteWidth = CANVAS_WIDTH / 2;
        const spriteHeight = CANVAS_HEIGHT / 2;
        const spriteX = (CANVAS_WIDTH - spriteWidth) / 2;
        const spriteY = (CANVAS_HEIGHT - spriteHeight / 4 + 50) / 2;
        renderEngine.drawImage(casperLesserDemonSprite, spriteX, spriteY, spriteWidth, spriteHeight);

        animationId = requestAnimationFrame(render);
    }

    animationId = requestAnimationFrame(render);
}