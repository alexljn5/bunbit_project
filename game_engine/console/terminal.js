import { keys } from "../playerdata/playerlogic.js";
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { renderEngine } from "../rendering/renderengine.js";

let showTerminal = false;
let lastTState = false;
let currentCommand = "";
let inputActive = false;
let lastKeyStates = {};

export function terminalGodFunction(command) {
    displayTheTerminal();
}

export function displayTheTerminal() {
    // Toggle terminal with 'T' key
    if (keys.y && !lastTState) {
        showTerminal = !showTerminal;
        if (!showTerminal) {
            inputActive = false;
            currentCommand = "";
        }
        console.log("Terminal toggled:", showTerminal);
    }
    lastTState = keys.y;

    if (showTerminal) {
        terminalOverLay();
        inputIntoTheTerminal();
    }
}

function setupTerminal() {
    setupTerminalClickHandler();
    setupTerminalKeyHandler();
}

function terminalOverLay() {
    renderEngine.save();
    // Main overlay (800x600, full canvas)
    const overlayX = 0 * SCALE_X;
    const overlayY = 0 * SCALE_Y;
    const overlayWidth = 800 * SCALE_X;
    const overlayHeight = 600 * SCALE_Y;
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

    // Terminal title
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${22 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Terminal", overlayX + 20 * SCALE_X, overlayY + 40 * SCALE_Y);

    renderEngine.restore();
}

function inputIntoTheTerminal() {
    setupTerminal();
    renderEngine.save();
    // Input overlay (800x40, bottom of main overlay)
    const overlayX = 0 * SCALE_X;
    const overlayY = 560 * SCALE_Y;
    const overlayWidth = 800 * SCALE_X;
    const overlayHeight = 40 * SCALE_Y;
    renderEngine.fillStyle = inputActive ? "rgba(40, 40, 40, 0.95)" : "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${22 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Input Command: " + (currentCommand || ""), overlayX + 10 * SCALE_X, overlayY + 30 * SCALE_Y);
    renderEngine.restore();
}

function setupTerminalClickHandler() {
    const canvas = renderEngine.canvas;
    if (!canvas) {
        console.error("renderEngine.canvas is null or undefined");
        return;
    }
    canvas.onclick = function (e) {
        if (!showTerminal) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Input overlay bounds (scaled)
        const overlayX = 0 * SCALE_X;
        const overlayWidth = 800 * SCALE_X;
        const overlayHeight = 40 * SCALE_Y;
        const inputY = 560 * SCALE_Y;

        // Debug click coordinates and bounds
        console.log("Click at:", { mouseX, mouseY });
        console.log("Input overlay bounds:", {
            xMin: overlayX,
            xMax: overlayX + overlayWidth,
            yMin: inputY,
            yMax: inputY + overlayHeight
        });

        if (
            mouseX >= overlayX &&
            mouseX <= overlayX + overlayWidth &&
            mouseY >= inputY &&
            mouseY <= inputY + overlayHeight
        ) {
            inputActive = true;
            console.log("Input overlay activated");
        }
    };
}

function setupTerminalKeyHandler() {
    window.addEventListener("keydown", (event) => {
        if (!showTerminal || !inputActive) return;
        const key = event.key;
        // Only process if key is newly pressed
        if (!lastKeyStates[key]) {
            lastKeyStates[key] = true;
            if (key === "Enter") {
                if (currentCommand) {
                    terminalGodFunction(currentCommand);
                    currentCommand = "";
                }
            } else if (key === "Escape") {
                currentCommand = "";
                inputActive = false;
            } else if (key === "Backspace") {
                currentCommand = currentCommand.slice(0, -1);
            } else if (key.length === 1 && currentCommand.length < 50) { // Limit input length
                currentCommand += key;
            }
        }
    });
    window.addEventListener("keyup", (event) => {
        const key = event.key;
        lastKeyStates[key] = false; // Reset key state on release
    });
}
