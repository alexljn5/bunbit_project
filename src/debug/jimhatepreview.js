// Jim Hate Debug Preview
// Debug-only module that creates a canvas overlay for visualising
// the Jim Hate entity. This is a consumer of the actual Jim Hate
// implementation — not a second implementation.
//
// The preview canvas is designed so it can later be embedded or
// overlaid onto the actual game rendering.

import { JimHate } from '../entities/jim-hate/JimHate.js';
import { SCALE_X, SCALE_Y } from '../globals.js';

let previewActive = false;
let previewJimHate = null;
let previewCanvas = null;
let previewContainer = null;
let previewControls = null;
let previewRafId = null;
let previewLastTime = 0;

// Control state
const controls = {
    canvasScale: 1.0,
    spriteScale: 1.0,
    faceOffsetX: 0,
    faceOffsetY: -20,
    handsOffsetX: 0,
    handsOffsetY: 40,
    animationSpeed: 1.0,
    paused: false,
};

const PREVIEW_WIDTH = 800;
const PREVIEW_HEIGHT = 800;

export function toggleJimHatePreview() {
    if (previewActive) {
        closePreview();
    } else {
        openPreview();
    }
}

function openPreview() {
    previewActive = true;

    // Create container
    previewContainer = document.createElement('div');
    previewContainer.id = 'jim-hate-preview-container';
    previewContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        background: #0a0a0a;
        border: 2px solid #ff0000;
        border-radius: 8px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        max-width: 95vw;
        max-height: 95vh;
        overflow: auto;
    `;

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
        color: #ff4444;
        font: bold 14px monospace;
        width: 100%;
        text-align: center;
        cursor: move;
    `;
    titleBar.textContent = 'JIM HATE PREVIEW';
    previewContainer.appendChild(titleBar);

    // Canvas
    previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'jim-hate-preview-canvas';
    previewCanvas.width = PREVIEW_WIDTH;
    previewCanvas.height = PREVIEW_HEIGHT;
    previewCanvas.style.cssText = `
        background: #0a0a0a;
        image-rendering: pixelated;
        cursor: crosshair;
        max-width: ${PREVIEW_WIDTH * controls.canvasScale}px;
        max-height: ${PREVIEW_HEIGHT * controls.canvasScale}px;
    `;
    previewContainer.appendChild(previewCanvas);

    // Controls panel
    previewControls = document.createElement('div');
    previewControls.id = 'jim-hate-preview-controls';
    previewControls.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 12px;
        font: 11px monospace;
        color: #aaa;
        width: 100%;
        max-width: ${PREVIEW_WIDTH * controls.canvasScale}px;
    `;
    previewContainer.appendChild(previewControls);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = `
        position: absolute;
        top: 4px;
        right: 8px;
        background: #330000;
        color: #ff4444;
        border: 1px solid #ff4444;
        cursor: pointer;
        font: bold 12px monospace;
    `;
    closeBtn.addEventListener('click', closePreview);
    previewContainer.appendChild(closeBtn);

    document.body.appendChild(previewContainer);

    // Initialize Jim Hate entity
    previewJimHate = new JimHate(previewCanvas, {
        canvasWidth: PREVIEW_WIDTH,
        canvasHeight: PREVIEW_HEIGHT,
    });

    // Set up control bindings
    _buildControls();

    // Apply initial control values to entity
    _applyControlsToEntity();

    // Start render loop
    previewLastTime = 0;
    previewRafId = requestAnimationFrame(_previewLoop);
}

function _buildControls() {
    const c = controls;
    const defs = [
        { id: 'canvasScale', label: 'Canvas Scale', type: 'range', min: 0.2, max: 2, step: 0.05, val: c.canvasScale },
        { id: 'spriteScale', label: 'Sprite Scale', type: 'range', min: 0.1, max: 3, step: 0.05, val: c.spriteScale },
        { id: 'faceOffsetX', label: 'Face X', type: 'range', min: -200, max: 200, step: 1, val: c.faceOffsetX },
        { id: 'faceOffsetY', label: 'Face Y', type: 'range', min: -200, max: 200, step: 1, val: c.faceOffsetY },
        { id: 'handsOffsetX', label: 'Hands X', type: 'range', min: -200, max: 200, step: 1, val: c.handsOffsetX },
        { id: 'handsOffsetY', label: 'Hands Y', type: 'range', min: -200, max: 200, step: 1, val: c.handsOffsetY },
        { id: 'animationSpeed', label: 'Anim Speed', type: 'range', min: 0, max: 3, step: 0.05, val: c.animationSpeed },
        { id: 'paused', label: 'Pause', type: 'checkbox', val: c.paused },
    ];

    for (const d of defs) {
        const label = document.createElement('label');
        label.style.cssText = 'color: #ff8888; cursor: pointer;';
        label.textContent = d.label;
        previewControls.appendChild(label);

        let input;
        if (d.type === 'checkbox') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = d.val;
            input.addEventListener('change', () => {
                controls[d.id] = input.checked;
                if (d.id === 'paused' && previewJimHate) {
                    previewJimHate.state.paused = input.checked;
                }
            });
        } else {
            input = document.createElement('input');
            input.type = 'range';
            input.min = d.min;
            input.max = d.max;
            input.step = d.step;
            input.value = d.val;
            input.addEventListener('input', () => {
                controls[d.id] = parseFloat(input.value);
                _applyControlsToEntity();
            });
        }
        previewControls.appendChild(input);
    }

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.style.cssText = `
        grid-column: span 2;
        background: #1a0000;
        color: #ff4444;
        border: 1px solid #ff4444;
        cursor: pointer;
        font: bold 11px monospace;
        padding: 4px;
    `;
    resetBtn.addEventListener('click', () => {
        if (previewJimHate) {
            previewJimHate.reset();
            controls.faceOffsetX = 0;
            controls.faceOffsetY = -20;
            controls.handsOffsetX = 0;
            controls.handsOffsetY = 40;
            controls.spriteScale = 1.0;
            controls.animationSpeed = 1.0;
            controls.paused = false;
            _buildControls();
            _applyControlsToEntity();
        }
    });
    previewControls.appendChild(resetBtn);
}

function _applyControlsToEntity() {
    if (!previewJimHate) return;
    const c = controls;
    previewJimHate.setFaceOffset(c.faceOffsetX, c.faceOffsetY);
    previewJimHate.setHandsOffset(c.handsOffsetX, c.handsOffsetY);
    previewJimHate.setScales(c.spriteScale, c.spriteScale);
    previewJimHate.state.animationSpeed = c.animationSpeed;
    previewJimHate.state.paused = c.paused;

    // Update canvas scale
    const scale = c.canvasScale;
    previewCanvas.style.maxWidth = `${PREVIEW_WIDTH * scale}px`;
    previewCanvas.style.maxHeight = `${PREVIEW_HEIGHT * scale}px`;
}

function _previewLoop(time) {
    if (!previewActive) return;

    const rawDeltaMs = previewLastTime ? (time - previewLastTime) : 1000 / 60;
    previewLastTime = time;
    const deltaSeconds = rawDeltaMs / 1000;

    if (previewJimHate) {
        previewJimHate.update(deltaSeconds);
        previewJimHate.render();
    }

    previewRafId = requestAnimationFrame(_previewLoop);
}

function closePreview() {
    previewActive = false;

    if (previewRafId) {
        cancelAnimationFrame(previewRafId);
        previewRafId = null;
    }

    if (previewJimHate) {
        previewJimHate.stop();
        previewJimHate = null;
    }

    if (previewContainer) {
        previewContainer.remove();
        previewContainer = null;
    }

    previewCanvas = null;
    previewControls = null;
}
