let roofBuffer32;
let textureData;
let textureWidth = 0;
let textureHeight = 0;
let CANVAS_WIDTH = 0;
let CANVAS_HEIGHT = 0;
let tileSectors = 0;
let playerFOV = 0;

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
        console.log(`Worker received roof texture: ${textureWidth}x${textureHeight} *chao chao*`);
        return;
    }

    if (type === 'render') {
        const { playerPosition, startY, endY, workerId, clipYBuffer } = e.data;
        const playerAngle = playerPosition.angle;
        const playerX = playerPosition.x;
        const playerZ = playerPosition.z;

        const rowCount = endY - startY;
        const roofBuffer = new ArrayBuffer(CANVAS_WIDTH * rowCount * 4);
        roofBuffer32 = new Uint32Array(roofBuffer);

        const halfHeight = CANVAS_HEIGHT * 0.5;
        const projectionDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);

        const floorColor = 0xFF000000;
        if (startY < halfHeight) {
            const ceilingEndY = Math.min(endY, Math.floor(halfHeight));
            const workerClipY = new Float32Array(clipYBuffer);

            const texScaleX = textureWidth / tileSectors;
            const texScaleY = textureHeight / tileSectors;

            for (let y = startY; y < ceilingEndY; y++) {
                const yCorrected = halfHeight - y;
                const yOffset = (y - startY) * CANVAS_WIDTH;

                let pixelColor = floorColor;
                if (yCorrected <= 0) {
                    for (let x = 0; x < CANVAS_WIDTH; x++) {
                        roofBuffer32[yOffset + x] = pixelColor;
                    }
                    continue;
                }

                const distance = (projectionDist * tileSectors * 0.5) / yCorrected;
                const rayAngleLeft = playerAngle - playerFOV * 0.5;
                const rayAngleRight = playerAngle + playerFOV * 0.5;

                const ceilX_left = playerX + distance * fastCos(rayAngleLeft);
                const ceilZ_left = playerZ + distance * fastSin(rayAngleLeft);
                const ceilX_right = playerX + distance * fastCos(rayAngleRight);
                const ceilZ_right = playerZ + distance * fastSin(rayAngleRight);

                const ceilX_step = (ceilX_right - ceilX_left) / CANVAS_WIDTH;
                const ceilZ_step = (ceilZ_right - ceilZ_left) / CANVAS_WIDTH;

                const texX_step = ceilX_step * texScaleX;
                const texY_step = ceilZ_step * texScaleY;

                let texX = (ceilX_left % tileSectors) * texScaleX;
                let texY = (ceilZ_left % tileSectors) * texScaleY;

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    pixelColor = floorColor;
                    if (y <= workerClipY[x]) {
                        const intTexX = Math.floor(texX) & (textureWidth - 1);
                        const intTexY = Math.floor(texY) & (textureHeight - 1);
                        const texOffset = intTexY * textureWidth + intTexX;
                        pixelColor = textureData[texOffset];
                    }
                    roofBuffer32[yOffset + x] = pixelColor;

                    texX += texX_step;
                    texY += texY_step;
                }
            }
        }

        for (let y = Math.max(startY, Math.floor(halfHeight)); y < endY; y++) {
            const yOffset = (y - startY) * CANVAS_WIDTH;
            for (let x = 0; x < CANVAS_WIDTH; x++) {
                roofBuffer32[yOffset + x] = floorColor;
            }
        }

        self.postMessage(
            {
                type: 'render_done',
                roofBuffer: roofBuffer32.buffer,
                startY,
                endY,
                workerId
            },
            [roofBuffer32.buffer]
        );
    }
};