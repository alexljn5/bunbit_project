// loadascii.js
import { computerAICanvas, computerAIRenderEngine } from "../../computerai.js";
import { REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH, SCALE_X, SCALE_Y } from "../../../../globals.js";

let asciiArtLines = [];        // Stores the lines of art
let asciiOffscreen = null;     // Offscreen canvas for cached ASCII
let asciiWidth = 0;
let asciiHeight = 0;
let asciiX = 0;
let asciiY = 0;
let fontSize_logical = 12;
let loadPromise = null;        // To handle concurrent loads

// Load and preprocess the ASCII art
export function loadAsciiArt() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(async (resolve, reject) => {
        try {
            const response = await fetch("/game_engine/ai/computerai/mainframe/ui/asciiart/bunbitos.txt");
            if (!response.ok) throw new Error("Couldn't load ASCII art!");

            const text = await response.text();
            asciiArtLines = text.split("\n");

            // Precompute measurements
            computerAIRenderEngine.font = `${fontSize_logical * SCALE_X}px Courier`;
            let maxWidth = 0;
            let drawCommands = [];

            asciiArtLines.forEach((line, index) => {
                const width = computerAIRenderEngine.measureText(line).width / SCALE_X;
                if (width > maxWidth) maxWidth = width;

                drawCommands.push({
                    text: line,
                    x: maxWidth / 2,  // Center align relative to maxWidth
                    y: 10 + index * fontSize_logical * 1.2
                });
            });

            // Create offscreen canvas
            asciiWidth = maxWidth;
            asciiHeight = asciiArtLines.length * fontSize_logical * 1.2 + 20;
            asciiOffscreen = document.createElement('canvas');
            asciiOffscreen.width = asciiWidth * SCALE_X;
            asciiOffscreen.height = asciiHeight * SCALE_Y;
            const offCtx = asciiOffscreen.getContext('2d');
            offCtx.imageSmoothingEnabled = false;

            // Draw to offscreen
            offCtx.fillStyle = "#FC0000";
            offCtx.font = `${fontSize_logical * SCALE_X}px Courier`;
            offCtx.textAlign = "center";
            offCtx.textBaseline = "top";

            // Debug border
            offCtx.strokeStyle = "#FC0000";
            offCtx.strokeRect(0, 0, asciiWidth * SCALE_X, (asciiHeight - 10) * SCALE_Y);

            // Draw texts
            drawCommands.forEach(cmd => {
                offCtx.fillText(cmd.text, cmd.x * SCALE_X, (cmd.y - 10) * SCALE_Y);
            });

            // Position for drawing
            asciiX = (REF_CANVAS_WIDTH / 2 - asciiWidth / 2) * SCALE_X;
            asciiY = 0;  // Assuming top of screen; adjust if needed

            console.log("ASCII art loaded and cached to offscreen!");
            resolve();
        } catch (err) {
            console.error(err);
            asciiArtLines = ["Error loading art :("];
            resolve();  // Resolve anyway
        }
    });

    return loadPromise;
}

// Just draw the offscreen — super fast!
export function drawAsciiArt() {
    if (asciiOffscreen) {
        computerAIRenderEngine.drawImage(asciiOffscreen, asciiX, asciiY);
    }
}