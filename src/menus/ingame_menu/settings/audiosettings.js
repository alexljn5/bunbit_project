import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, GLOBAL_FONT } from "../../../globals.js";
import { volumeSlidersGodFunction, setupAudioSliderHandlers } from "../../../audio/audiohandler.js";
import { drawButton, drawMenuOverlay } from "../../overlays.js";

// Avoid circular dependency with renderengine.js
function getRenderEngine() { return window.__renderEngine || null; }

export function drawAudioOverlay() {
    const engine = getRenderEngine();
    if (!engine) return;
    const overlayX = 350 * SCALE_X;
    const overlayY = 120 * SCALE_Y;
    const overlayWidth = 400 * SCALE_X;
    const overlayHeight = 400 * SCALE_Y;
    engine.fillStyle = "rgba(10, 10, 10, 0.95)";
    engine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
    engine.strokeStyle = "#555555";
    engine.lineWidth = 1;
    engine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
    engine.fillStyle = "#cccccc";
    engine.font = `bold ${Math.floor(22 * Math.min(SCALE_X, SCALE_Y))}px ${GLOBAL_FONT}`;
    engine.fillText("Audio Settings", overlayX, overlayY + 40 * SCALE_Y);
    volumeSlidersGodFunction();
    setupAudioSliderHandlers();
    const backButton = {
        name: "Back",
        x: 60 * SCALE_X,
        y: 470 * SCALE_Y,
        width: 100 * SCALE_X,
        height: 36 * SCALE_Y,
        hovered: false
    };
    drawButton(engine, backButton, false, 30, 25);
}
