import { updateGraphicsSettings, numCastRays, maxRayDepth } from "../raycasting.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";
import { updateCanvasResolution } from "../globals.js";

export const graphicsPresets = {
    potato: {
        numCastRays: 100, // Very few rays for low-end devices
        maxRayDepth: 20   // Short render distance
    },
    very_low: {
        numCastRays: 150, // Slightly more rays for very low-end devices    
        maxRayDepth: 25   // Slightly longer render distance
    },
    low: {
        numCastRays: 200, // Fewer rays for performance
        maxRayDepth: 30   // Shorter render distance
    },
    medium: {
        numCastRays: 300, // Balanced number of rays
        maxRayDepth: 40   // Moderate render distance
    },
    high: {
        numCastRays: 400, // More rays for quality
        maxRayDepth: 50   // Longer render distance
    },
    extreme: {
        numCastRays: 500, // Maximum rays for high-end devices
        maxRayDepth: 60   // Maximum render distance
    },
    nasa: {
        numCastRays: 600, // Insane number of rays for top-tier devices
        maxRayDepth: 70   // Maximum render distance
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
        updateCanvasResolution(false); // 400x400 with scale
    } else if (highResPresets.includes(preset)) {
        updateCanvasResolution(true); // 800x800 native
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
    const overlayHeight = 400 * SCALE_Y; // Increased height to fit all presets
    renderEngine.fillStyle = "rgba(20, 20, 20, 0.95)";
    renderEngine.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
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

    // Define buttons for all presets
    const presetButtons = Object.keys(graphicsPresets).map((preset, index) => ({
        name: preset.charAt(0).toUpperCase() + preset.slice(1).replace('_', ' '),
        x: overlayX + 20 * SCALE_X,
        y: overlayY + (160 + index * 50) * SCALE_Y,
        width: 360 * SCALE_X,
        height: 40 * SCALE_Y,
        preset: preset,
        hovered: false
    }));

    // Draw preset buttons
    presetButtons.forEach(button => {
        renderEngine.fillStyle = currentSettings.preset === button.preset ? "#555" : "#222";
        renderEngine.fillRect(button.x, button.y, button.width, button.height);
        renderEngine.strokeStyle = "#fff";
        renderEngine.strokeRect(button.x, button.y, button.width, button.height);
        renderEngine.fillStyle = "#fff";
        renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
        renderEngine.fillText(button.name, button.x + 20 * SCALE_X, button.y + 25 * SCALE_Y);
    });

    // Draw Back button
    const backButtonX = 60 * SCALE_X;
    const backButtonY = 470 * SCALE_Y;
    const backButtonWidth = 100 * SCALE_X;
    const backButtonHeight = 36 * SCALE_Y;
    renderEngine.fillStyle = showGraphics ? "#555" : "#222";
    renderEngine.fillRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
    renderEngine.strokeStyle = "#fff";
    renderEngine.strokeRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Back", backButtonX + 30 * SCALE_X, backButtonY + 25 * SCALE_Y);

    return presetButtons; // Return buttons for click handling
}

export function handleGraphicsMenuClick(e, renderEngine, SCALE_X, SCALE_Y, presetButtons, setShowGraphics, setNeedsRedraw) {
    const canvas = renderEngine.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const backButtonX = 60 * SCALE_X;
    const backButtonY = 470 * SCALE_Y;
    const backButtonWidth = 100 * SCALE_X;
    const backButtonHeight = 36 * SCALE_Y;

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
            mouseX >= backButtonX && mouseX <= backButtonX + backButtonWidth &&
            mouseY >= backButtonY && mouseY <= backButtonY + backButtonHeight
        ) {
            setShowGraphics(false);
            setNeedsRedraw(true);
        }
    }

    // Update hover states
    presetButtons.forEach(button => {
        button.hovered = (
            mouseX >= button.x && mouseX <= button.x + button.width &&
            mouseY >= button.y && mouseY <= button.y + button.height
        );
    });
}