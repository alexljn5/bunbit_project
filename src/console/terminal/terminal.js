import { keys } from "../../playerdata/playerlogic.js";
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT, showTerminal, setShowTerminal, GLOBAL_FONT } from "../../globals.js";
import { renderEngine } from "../../rendering/renderengine.js";
import { terminalGodFunction } from "./terminalhandler.js";

// Re-export showTerminal for backward compatibility
export { showTerminal };

let currentCommand = "";
let inputActive = false;
let lastKeyStates = {};
let copyFeedbackTimer = null;
let copyFeedback = false;
let isPasting = false;
let isCopying = false;
let lastPasteTime = 0;
let lastCopyTime = 0;
const clipboardCooldown = 500; // ms between clipboard operations

//Helper function to check if on electron or tauri
function isElectron() {
    return typeof window !== "undefined"
        && typeof window.process === "object"
        && !!window.process.versions?.electron;
}

//Helper function to check if on tauri
function isTauri() {
    return typeof window !== "undefined"
        && window.__TAURI__ !== undefined;
}

export function displayTheTerminal() {
    // Terminal toggle is now handled by F3 in playerlogic.js
    // This function only renders the terminal when showTerminal is true

    if (showTerminal) {
        terminalOverLay();
        inputIntoTheTerminal();
        keys["escape"] = false;
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
    renderEngine.font = `${Math.floor(22 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    renderEngine.fillText("Terminal", overlayX + 20 * SCALE_X, overlayY + 40 * SCALE_Y);

    // Display available commands
    renderEngine.font = `${Math.floor(16 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    const commands = [
        "/godmode - Toggle infinite health and stamina",
        "/spawnenemy <type> [count] - Spawn enemies (placeholderai, lesserdemon/casperlesserdemon, boykisser)",
        "/setfloortexture <key> - Change floor texture for screenshots",
        "/resetfloortexture - Restore original floor texture",
        "/clearenemies - Remove all spawned enemies",
        "/setammo <amount> - Set gun ammo",
        "/setdamage <amount> - Set gun damage",
        "/setrange <amount> - Set gun range",
        "/giveitem <item_id> - Add item to inventory",
        "/clearinv - Clear inventory",
        "/help - Show all commands"
    ];

    // Display copy/paste shortcuts
    const shortcuts = [
        "CTRL+C - Copy current command",
        "CTRL+V / CTRL+P - Paste from clipboard"
    ];
    shortcuts.forEach((shortcut, i) => {
        renderEngine.fillStyle = "#888888";
        renderEngine.fillText(shortcut, overlayX + 20 * SCALE_X, overlayY + (80 + commands.length * 30 + 10 + i * 20) * SCALE_Y);
    });
    renderEngine.fillStyle = "#fff";

    // Display copy feedback
    if (copyFeedback) {
        renderEngine.fillStyle = "#00ff00";
        renderEngine.font = `${Math.floor(18 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
        renderEngine.fillText("Copied!", overlayX + 20 * SCALE_X, overlayY + (80 + commands.length * 30 + 10 + shortcuts.length * 20 + 10) * SCALE_Y);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${Math.floor(16 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    }

    commands.forEach((cmd, i) => {
        renderEngine.fillText(cmd, overlayX + 20 * SCALE_X, overlayY + (80 + i * 30) * SCALE_Y);
    });

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
    renderEngine.font = `${Math.floor(22 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
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

async function copyToClipboard(text) {
    if (isCopying) return false;
    isCopying = true;
    try {
        // Use Tauri clipboard API if available
        if (isTauri() && window.__TAURI__?.clipboard) {
            await window.__TAURI__.clipboard.writeText(text);
            return true;
        }
        // Fallback to browser Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        // Fallback to execCommand
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return true;
    } catch (err) {
        console.error("Clipboard write failed:", err);
        return false;
    } finally {
        isCopying = false;
    }
}

async function pasteFromClipboard() {
    if (isPasting) return null;
    isPasting = true;
    try {
        // Use Tauri clipboard API if available
        if (isTauri() && window.__TAURI__?.clipboard) {
            return await window.__TAURI__.clipboard.readText();
        }
        // Fallback to browser Clipboard API
        if (navigator.clipboard && navigator.clipboard.readText) {
            return await navigator.clipboard.readText();
        }
        // Fallback: return null (no paste possible)
        console.warn("No clipboard API available for paste");
        return null;
    } catch (err) {
        console.error("Clipboard read failed:", err);
        return null;
    } finally {
        isPasting = false;
    }
}

function showCopyFeedback() {
    copyFeedback = true;
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = setTimeout(() => {
        copyFeedback = false;
    }, 1500);
}

function setupTerminalKeyHandler() {
    window.addEventListener("keydown", (event) => {
        if (!showTerminal || !inputActive) return;

        // Handle CTRL+C (copy), CTRL+V (paste), CTRL+P (paste)
        const now = performance.now();
        if (event.ctrlKey || event.metaKey) {
            if (event.key === "c" || event.key === "C") {
                event.preventDefault();
                if (currentCommand && now - lastCopyTime > clipboardCooldown) {
                    lastCopyTime = now;
                    copyToClipboard(currentCommand).then((success) => {
                        if (success) {
                            showCopyFeedback();
                            console.log("Copied to clipboard: " + currentCommand);
                        } else {
                            console.log("Copy failed");
                        }
                    });
                }
                return;
            } else if (event.key === "v" || event.key === "V" || event.key === "p" || event.key === "P") {
                event.preventDefault();
                if (now - lastPasteTime > clipboardCooldown) {
                    lastPasteTime = now;
                    pasteFromClipboard().then((text) => {
                        if (text !== null) {
                            currentCommand += text;
                            console.log("Pasted: " + text);
                        } else {
                            console.log("Paste failed or clipboard empty");
                        }
                    });
                }
                return;
            }
        }

        const key = event.key;
        // Only process if key is newly pressed
        if (!lastKeyStates[key]) {
            lastKeyStates[key] = true;
            if (key === "Enter") {
                if (currentCommand) {
                    terminalGodFunction(currentCommand);
                    currentCommand = "";
                    inputActive = false; // Reset inputActive after submitting command
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