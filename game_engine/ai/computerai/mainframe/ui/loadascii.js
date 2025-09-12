import { computerAICanvas, computerAIRenderEngine } from "../../computerai.js";
import { REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y } from "../../../../globals.js";


let asciiArtLines = []; // Global to store the lines once loaded

// Load the ASCII art when the login screen initializes (call this in drawComputerAICanvas or initInputHandler)
// loadascii.js
export function loadAsciiArt() {
    return fetch("/game_engine/ai/computerai/mainframe/ui/asciiart/bunbitos.txt")
        .then(response => {
            if (!response.ok) throw new Error("Couldn't load ASCII art!");
            return response.text();
        })
        .then(text => {
            asciiArtLines = text.split("\n");
            console.log("ASCII art loaded!");
        })
        .catch(err => {
            console.error(err);
            asciiArtLines = ["Error loading art :("];
        });
}


// New drawing function—call this after bunbitOSText() in your main login render
export function drawAsciiArt() {
    if (asciiArtLines.length === 0) return;

    const fontSize_logical = 12;  // SMALLER font size! Was 12 - too big!
    computerAIRenderEngine.fillStyle = "#FC0000";
    computerAIRenderEngine.font = `${fontSize_logical * SCALE_X}px Courier`;
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "top";

    // Find the widest line
    let maxWidth_logical = 0;
    asciiArtLines.forEach(line => {
        const width = computerAIRenderEngine.measureText(line).width / SCALE_X;
        if (width > maxWidth_logical) maxWidth_logical = width;
    });

    // BETTER POSITIONING - higher up and centered
    const startX_logical = REF_CANVAS_WIDTH / 2;
    const startY_logical = 10;  // Much higher up! Was -100 which is off-screen!

    // Draw with debug borders to see where it's going
    computerAIRenderEngine.strokeStyle = "#FC0000";
    computerAIRenderEngine.strokeRect(
        (startX_logical - maxWidth_logical / 2) * SCALE_X,
        startY_logical * SCALE_Y,
        maxWidth_logical * SCALE_X,
        asciiArtLines.length * fontSize_logical * SCALE_Y
    );

    asciiArtLines.forEach((line, index) => {
        computerAIRenderEngine.fillText(
            line,
            startX_logical * SCALE_X,  // Center X
            (startY_logical + index * fontSize_logical * 1.2) * SCALE_Y  // Add some line spacing
        );
    });
}