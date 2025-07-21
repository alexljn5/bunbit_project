import { updateGraphicsSettings, numCastRays, maxRayDepth } from "../rendering/raycasting.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { updateCanvasResolution } from "../globals.js";
import { drawButton } from "./menusettings.js";
import { drawMenuOverlay } from "./menuhandler.js";

export const graphicsPresets = {
    potato: {
        numCastRays: 100,
        maxRayDepth: 20
    },
    very_low: {
        numCastRays: 150,
        maxRayDepth: 25
    },
    low: {
        numCastRays: 200,
        maxRayDepth: 30
    },
    medium: {
        numCastRays: 300,
        maxRayDepth: 40
    },
    high: {
        numCastRays: 400,
        maxRayDepth: 50
    },
    extreme: {
        numCastRays: 500,
        maxRayDepth: 60
    },
    nasa: {
        numCastRays: 600,
        maxRayDepth: 70
    }
};

export let currentGraphicsPreset = "low";

export function applyGraphicsPreset(preset) {
    if (!graphicsPresets[preset]) return false;
    currentGraphicsPreset = preset;
    updateGraphicsSettings(graphicsPresets[preset]);
    const lowResPresets = ["potato", "very_low", "low"];
    const highResPresets = ["medium", "high", "extreme", "nasa"];
    if (lowResPresets.includes(preset)) {
        updateCanvasResolution(false);
    } else if (highResPresets.includes(preset)) {
        updateCanvasResolution(true);
    }
    return true;
}

export function getGraphicsSettings() {
    return {
        numCastRays,
        maxRayDepth,
        preset: currentGraphicsPreset
    };
}

export function initializeGraphicsSettings() {
    const isLowEnd = /Mobi|Android/i.test(navigator.userAgent) || navigator.hardwareConcurrency <= 4;
    applyGraphicsPreset(isLowEnd ? "low" : "high");
}


export function drawGraphicsOverlay(renderEngine, SCALE_X, SCALE_Y, showGraphics) {
    const overlayX = 350 * SCALE_X;
    const overlayY = 120 * SCALE_Y;
    const overlayWidth = 400 * SCALE_X;
    const overlayHeight = 600 * SCALE_Y;
    // Use reusable overlay function with alpha 0.95 and clip to overlay area
    renderEngine.save();
    renderEngine.beginPath();
    renderEngine.rect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.clip();
    drawMenuOverlay(0.95);
    renderEngine.restore();

    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${22 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Graphics Settings", overlayX, overlayY + 40 * SCALE_Y);

    const currentSettings = getGraphicsSettings();
    renderEngine.font = `${16 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText(`Current: ${currentSettings.preset.toUpperCase()}`, overlayX + 10 * SCALE_X, overlayY + 70 * SCALE_Y);
    renderEngine.fillText(`Rays: ${currentSettings.numCastRays}`, overlayX + 10 * SCALE_X, overlayY + 100 * SCALE_Y);
    renderEngine.fillText(`Render Distance: ${currentSettings.maxRayDepth}`, overlayX + 10 * SCALE_X, overlayY + 130 * SCALE_Y);

    const presetButtons = Object.keys(graphicsPresets).map((preset, index) => ({
        name: preset.charAt(0).toUpperCase() + preset.slice(1).replace('_', ' '),
        x: overlayX + 20 * SCALE_X,
        y: overlayY + (160 + index * 50) * SCALE_Y,
        width: 360 * SCALE_X,
        height: 40 * SCALE_Y,
        preset: preset,
        hovered: false
    }));

    presetButtons.forEach(button => {
        drawButton(renderEngine, button, currentSettings.preset === button.preset);
    });

    const backButton = {
        name: "Back",
        x: 60 * SCALE_X,
        y: 470 * SCALE_Y,
        width: 100 * SCALE_X,
        height: 36 * SCALE_Y,
        hovered: false
    };
    drawButton(renderEngine, backButton, showGraphics, 30, 25);

    return presetButtons;
}

export function handleGraphicsMenuClick(e, renderEngine, SCALE_X, SCALE_Y, presetButtons, setShowGraphics, setNeedsRedraw) {
    const canvas = renderEngine.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const backButton = {
        name: "Back",
        x: 60 * SCALE_X,
        y: 470 * SCALE_Y,
        width: 100 * SCALE_X,
        height: 36 * SCALE_Y,
        hovered: false
    };

    if (e.type === 'click') {
        for (const button of presetButtons) {
            if (
                mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height
            ) {
                applyGraphicsPreset(button.preset);
                setNeedsRedraw(true);
                return;
            }
        }
        if (
            mouseX >= backButton.x && mouseX <= backButton.x + backButton.width &&
            mouseY >= backButton.y && mouseY <= backButton.y + backButton.height
        ) {
            setShowGraphics(false);
            setNeedsRedraw(true);
        }
    }

    presetButtons.forEach(button => {
        button.hovered = (
            mouseX >= button.x && mouseX <= button.x + button.width &&
            mouseY >= button.y && mouseY <= button.y + button.height
        );
    });
    backButton.hovered = (
        mouseX >= backButton.x && mouseX <= backButton.x + backButton.width &&
        mouseY >= backButton.y && mouseY <= backButton.y + backButton.height
    );
}