// Noise map settings
const width = 256;
const height = 256;
const scale = 10;

const domElements = {
    noiseCanvas: document.getElementById("noiseCanvas"),
    generate2DNoiseButton: document.getElementById("generate2DNoise"),
    setSeedButton: document.getElementById("setSeedButton"),
    noiseSeed: document.getElementById("noiseSeed"),
    playGameButton: document.getElementById("playGameButton"),
    mainPageButton: document.getElementById("mainPageButton")
};

// Global seed variable to hold setSeedButton output
let currentSeed = null;

domElements.generate2DNoiseButton.addEventListener("click", generateAndDrawNoise);
domElements.setSeedButton.addEventListener("click", setSeedButton);
domElements.playGameButton.addEventListener("click", playGameButton);
domElements.mainPageButton.addEventListener("click", mainPageButton);

generateAndDrawNoise();

function playGameButton() {
    window.location.href = "main_game.html";
}

function mainPageButton() {
    window.location.href = "../index.html";
}

function setSeedButton() {
    let inputValue = domElements.noiseSeed.value;
    if (inputValue !== "" && inputValue !== null && inputValue !== undefined) {
        let seedNumber;
        // Check if input is a pure number (e.g., "90", "-123")
        if (/^-?\d+$/.test(inputValue)) {
            seedNumber = parseInt(inputValue, 10); // Use the number directly
        } else if (typeof inputValue === "string") {
            // If it’s a string (not just numbers), generate a random integer
            let hash = 0;
            for (let i = 0; i < inputValue.length; i++) {
                hash = (hash * 31) + inputValue.charCodeAt(i);
                hash = hash | 0;
            }
            seedNumber = hash;
        }
        currentSeed = seedNumber; // Store it
        console.log(seedNumber);
    }
}

function generateWhiteNoise() {
    const noise = [];
    let seed = currentSeed !== null ? currentSeed : Math.floor(Math.random() * 1000000);

    for (let y = 0; y < height; y++) {
        noise[y] = [];
        for (let x = 0; x < width; x++) {
            let value = (seed + x + y * width) * 1103515245 + 12345;
            value = (value >>> 0) / 4294967296;
            noise[y][x] = value - Math.floor(value);
        }
    }
    return noise;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smoothNoise(noise) {
    const smooth = [];
    const samplePeriod = scale;
    const sampleFrequency = 1 / samplePeriod;

    for (let y = 0; y < height; y++) {
        smooth[y] = [];
        for (let x = 0; x < width; x++) {
            const sampleX0 = Math.floor(x / samplePeriod) * samplePeriod;
            const sampleX1 = (sampleX0 + samplePeriod) % width;
            const sampleY0 = Math.floor(y / samplePeriod) * samplePeriod;
            const sampleY1 = (sampleY0 + samplePeriod) % height;

            const fx = (x - sampleX0) * sampleFrequency;
            const fy = (y - sampleY0) * sampleFrequency;

            const top = lerp(noise[sampleY0][sampleX0], noise[sampleY0][sampleX1], fx);
            const bottom = lerp(noise[sampleY1][sampleX0], noise[sampleY1][sampleX1], fx);
            smooth[y][x] = lerp(top, bottom, fy);
        }
    }
    return smooth;
}

function drawNoiseMap(noise) {
    const ctx = domElements.noiseCanvas.getContext("2d");
    if (!ctx) {
        console.error("Canvas context not available!");
        return;
    }

    const imageData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = noise[y][x];
            const pixelIndex = (y * width + x) * 4;
            const color = Math.floor(value * 255);
            imageData.data[pixelIndex] = color;
            imageData.data[pixelIndex + 1] = color;
            imageData.data[pixelIndex + 2] = color;
            imageData.data[pixelIndex + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function generateAndDrawNoise() {
    console.log("Generating noise map with seed:", currentSeed);
    const whiteNoise = generateWhiteNoise();
    const noiseMap = smoothNoise(whiteNoise);
    drawNoiseMap(noiseMap);
}