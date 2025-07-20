// game_engine/rendering/renderworkers/floorrenderworker.js
let floorBuffer32;
let textureData;
let textureWidth = 0;
let textureHeight = 0;
let CANVAS_WIDTH = 0;
let CANVAS_HEIGHT = 0;
let tileSectors = 0;
let playerFOV = 0;

// Fast math functions, because we can't import them in the worker!
const SIN_TABLE_SIZE = 1024;
const TWO_PI = Math.PI * 2;
const TABLE_SCALE = SIN_TABLE_SIZE / TWO_PI;
const sinTable = new Float32Array(SIN_TABLE_SIZE);
const cosTable = new Float32Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    const angle = i * (TWO_PI / SIN_TABLE_SIZE);
    sinTable[i] = Math.sin(angle);
    cosTable[i] = Math.cos(angle);
}

function fastSin(angle) {
    let normAngle = angle - TWO_PI * Math.floor(angle / TWO_PI);
    if (normAngle < 0) normAngle += TWO_PI;
    const idx = (normAngle * TABLE_SCALE) | 0;
    return sinTable[idx];
}

function fastCos(angle) {
    let normAngle = angle - TWO_PI * Math.floor(angle / TWO_PI);
    if (normAngle < 0) normAngle += TWO_PI;
    const idx = (normAngle * TABLE_SCALE) | 0;
    return cosTable[idx];
}

self.onmessage = function (e) {
    const { type } = e.data;

    if (type === 'init') {
        CANVAS_WIDTH = e.data.CANVAS_WIDTH;
        CANVAS_HEIGHT = e.data.CANVAS_HEIGHT;
        tileSectors = e.data.tileSectors;
        playerFOV = e.data.playerFOV;
        self.postMessage({ type: 'init_done' });
        return;
    }

    if (type === 'texture') {
        textureData = new Uint32Array(e.data.textureData);
        textureWidth = e.data.textureWidth;
        textureHeight = e.data.textureHeight;
        return;
    }

    if (type === 'render') {
        const floorBuffer = new ArrayBuffer(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
        const floorBuffer32 = new Uint32Array(floorBuffer);
        const { playerPosition } = e.data;
        const playerAngle = playerPosition.angle;
        const playerX = playerPosition.x;
        const playerZ = playerPosition.z;

        const halfHeight = CANVAS_HEIGHT * 0.5;
        const projectionDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);

        const ceilingColor = 0xFF000000; // Opaque black (ABGR)
        for (let i = 0; i < CANVAS_WIDTH * halfHeight; i++) {
            floorBuffer32[i] = ceilingColor;
        }

        const texScaleX = textureWidth / tileSectors;
        const texScaleY = textureHeight / tileSectors;

        for (let y = Math.floor(halfHeight); y < CANVAS_HEIGHT; y++) {
            const yCorrected = y - halfHeight;
            if (yCorrected === 0) continue;

            const distance = (projectionDist * tileSectors * 0.5) / yCorrected;
            const rayAngleLeft = playerAngle - playerFOV * 0.5;
            const rayAngleRight = playerAngle + playerFOV * 0.5;

            const floorX_left = playerX + distance * fastCos(rayAngleLeft);
            const floorZ_left = playerZ + distance * fastSin(rayAngleLeft);
            const floorX_right = playerX + distance * fastCos(rayAngleRight);
            const floorZ_right = playerZ + distance * fastSin(rayAngleRight);

            const floorX_step = (floorX_right - floorX_left) / CANVAS_WIDTH;
            const floorZ_step = (floorZ_right - floorZ_left) / CANVAS_WIDTH;

            const texX_step = floorX_step * texScaleX;
            const texY_step = floorZ_step * texScaleY;

            let texX = (floorX_left % tileSectors) * texScaleX;
            let texY = (floorZ_left % tileSectors) * texScaleY;

            const yOffset = y * CANVAS_WIDTH;

            for (let x = 0; x < CANVAS_WIDTH; x++) {
                const intTexX = Math.floor(texX) & (textureWidth - 1);
                const intTexY = Math.floor(texY) & (textureHeight - 1);
                const texOffset = intTexY * textureWidth + intTexX;

                floorBuffer32[yOffset + x] = textureData[texOffset];

                texX += texX_step;
                texY += texY_step;
            }
        }
        self.postMessage({ type: 'render_done', floorBuffer: floorBuffer32.buffer }, [floorBuffer32.buffer]);
    }
};