import { playerPosition } from "../playerdata/playerlogic.js";
import { getDemonLaughingCurrentFrame } from "../mapdata/maptextures.js";
import { renderEngine } from "../renderengine.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y } from "../globals.js";
import { casperLesserDemonSprite } from "../rendersprites.js";
import { fuckTheScreenUp } from "../animations/fuckthescreenup.js";

const startX = 0;
const startY = 0;
const numRows = 31;
const numCols = 15;
let demonInterval = 20;
let eventDemonStep = 10; // Isolated state
let eventStartTime = 0;
let eventDemonActive = false;
let deathDemonActive = false;
let eventStartTimeGlobal = null;
const TIME_LIMIT = 50000;
let casperTimeoutId = null;
const casperSpawnInterval = 500;

export function map01EventsGodFunction(onComplete = () => { }) {
    console.log(playerPosition.x);
    console.log(playerPosition.z);
    map01Event01();
}

function map01Event01(onComplete) {
    const elapsed = performance.now() - eventStartTimeGlobal;
    if (elapsed > TIME_LIMIT) {
        eventDemonActive = false;
        onComplete();
        return;
    }
    if (playerPosition.x > 600 && playerPosition.z < 610) {
        console.log("shart");
        if (!eventDemonActive && !deathDemonActive) {
            console.log("map01Event01 triggered");
            eventDemonStep = 0;
            eventStartTime = performance.now();
            eventDemonActive = true;
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            renderEngine.fillStyle = "rgba(0, 0, 0, 0.4)";
            animateDemons(onComplete);
        }
    } else {
        eventDemonActive = false;
    }
}

function animateDemons(onComplete) {
    let animationId = null;
    let lastCasperSpawn = 0;

    function render(now) {
        const elapsed = now - eventStartTime;
        if (elapsed >= 10000 || !eventDemonActive || deathDemonActive) {
            eventDemonActive = false;
            cancelAnimationFrame(animationId);
            if (casperTimeoutId) {
                clearTimeout(casperTimeoutId);
                casperTimeoutId = null;
            }
            onComplete();
            return;
        }

        const totalDemons = numRows * numCols;
        eventDemonStep = Math.min(totalDemons, Math.floor(elapsed / demonInterval));

        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.fillStyle = "rgba(20, 0, 0, 0.5)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        for (let i = 0; i < eventDemonStep; i++) {
            const row = Math.floor(i / numCols);
            const col = i % numCols;
            const x = (startX + col * 128) * SCALE_X;
            const y = (startY + row * 128) * SCALE_Y;
            let width = 128 * SCALE_X;
            let height = 128 * SCALE_Y;

            const demonFrame = getDemonLaughingCurrentFrame();
            if (demonFrame) {
                renderEngine.drawImage(demonFrame, x, y, width, height);
            }

            if (elapsed - lastCasperSpawn >= casperSpawnInterval) {
                lastCasperSpawn = elapsed;
                renderEngine.save();
                renderEngine.fillStyle = "rgba(50, 0, 0, 0.7)";
                renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                const pulse = 1 + 0.2 * Math.sin(elapsed * 0.005);
                width *= pulse;
                height *= pulse;
                const offsetX = x + (128 * SCALE_X * (1 - pulse)) / 2;
                const offsetY = y + (128 * SCALE_Y * (1 - pulse)) / 2;

                renderEngine.shadowColor = "rgba(255, 0, 0, 0.5)";
                renderEngine.shadowBlur = 20;
                renderEngine.globalAlpha = 0.5 + 0.5 * Math.sin(elapsed * 0.003);
                renderEngine.drawImage(casperLesserDemonSprite, offsetX, offsetY, width, height);
                renderEngine.globalAlpha = 1.0;
                renderEngine.shadowBlur = 0;
                renderEngine.restore();
            }
        }

        if (elapsed - lastCasperSpawn >= casperSpawnInterval * (0.5 + Math.random())) {
            lastCasperSpawn = elapsed;
            renderEngine.save();
            renderEngine.fillStyle = "rgba(80, 0, 0, 0.4)";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const spriteWidth = 128 * SCALE_X * 1.5;
            const spriteHeight = 128 * SCALE_Y * 1.5;
            const randomX = Math.random() * (CANVAS_WIDTH - spriteWidth) + Math.sin(elapsed * 0.01) * 20;
            const randomY = Math.random() * (CANVAS_HEIGHT - spriteHeight) + Math.cos(elapsed * 0.01) * 20;

            fuckTheScreenUp();
            renderEngine.translate(randomX + spriteWidth / 2, randomY + spriteHeight / 2);
            renderEngine.rotate(Math.sin(elapsed * 0.002) * 0.2);
            renderEngine.globalAlpha = 0.7 + 0.3 * Math.sin(elapsed * 0.004);
            renderEngine.shadowColor = "rgba(255, 0, 0, 0.5)";
            renderEngine.shadowBlur = 20;
            renderEngine.drawImage(casperLesserDemonSprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
            renderEngine.globalAlpha = 1.0;
            renderEngine.shadowBlur = 0;
            renderEngine.restore();
        }

        animationId = requestAnimationFrame(render);
    }
    console.log("Starting animateDemons");
    animationId = requestAnimationFrame(render);
}

export function casperLesserDemonDeathScreen() {
    if (eventDemonActive || deathDemonActive) return;

    if (casperTimeoutId) {
        clearTimeout(casperTimeoutId);
        casperTimeoutId = null;
    }

    let deathDemonStep = 0;
    let deathStartTime = performance.now();
    deathDemonActive = true;

    let animationId = null;
    const duration = 10000;

    function render(now) {
        const elapsed = now - deathStartTime;
        if (elapsed >= duration || !deathDemonActive) {
            deathDemonActive = false;
            cancelAnimationFrame(animationId);
            return;
        }

        const totalDemons = numRows * numCols;
        deathDemonStep = Math.min(totalDemons, Math.floor(elapsed / demonInterval));

        renderEngine.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderEngine.fillStyle = "rgba(255, 0, 0, 0.1)";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        for (let i = 0; i < deathDemonStep; i++) {
            const row = Math.floor(i / numCols);
            const col = i % numCols;
            const x = (startX + col * 128) * SCALE_X;
            const y = (startY + row * 128) * SCALE_Y;
            const width = 128 * SCALE_X;
            const height = 128 * SCALE_Y;

            const demonFrame = getDemonLaughingCurrentFrame();
            if (demonFrame) {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
                renderEngine.fillRect(x, y, width, height);
                renderEngine.drawImage(demonFrame, x, y, width, height);
            }

            if (elapsed > 1000) {
                renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
                renderEngine.fillRect(x, y, width, height);
                renderEngine.drawImage(casperLesserDemonSprite, x, y, width, height);
            }
        }

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