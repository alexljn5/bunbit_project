// Jim Hate Renderer
// Renders the Jim Hate entity on a canvas.
// Designed to be reusable — accepts any canvas/context so it can
// be used in debug preview or embedded in the game later.
//
// Renders face and hands as independent sprites so they can be
// positioned and animated separately.

import { JIM_HATE_CONFIG } from './JimHateConfig.js';

export class JimHateRenderer {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = { ...JIM_HATE_CONFIG, ...config };

        this.faceImage = null;
        this.handsImage = null;
        this.faceLoaded = false;
        this.handsLoaded = false;

        this.width = config.canvasWidth || this.config.defaultCanvasWidth;
        this.height = config.canvasHeight || this.config.defaultCanvasHeight;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this._loadSprites();
    }

    _loadSprites() {
        this.faceImage = new Image();
        this.faceImage.src = this.config.faceSpritePath;
        this.faceImage.onload = () => { this.faceLoaded = true; };
        this.faceImage.onerror = () => { console.error('[JimHateRenderer] Failed to load face sprite:', this.config.faceSpritePath); };

        this.handsImage = new Image();
        this.handsImage.src = this.config.handsSpritePath;
        this.handsImage.onload = () => { this.handsLoaded = true; };
        this.handsImage.onerror = () => { console.error('[JimHateRenderer] Failed to load hands sprite:', this.config.handsSpritePath); };
    }

    get isLoaded() {
        return this.faceLoaded && this.handsLoaded;
    }

    render(state, options = {}) {
        const ctx = this.ctx;
        const cx = options.centerX !== undefined ? options.centerX : this.width / 2;
        const cy = options.centerY !== undefined ? options.centerY : this.height / 2;

        ctx.fillStyle = this.config.previewBackgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);

        this._drawGrid(ctx);

        const animOffset = state._animOffsets || { x: 0, y: 0 };
        const entityCenterX = cx + animOffset.x;
        const entityCenterY = cy + animOffset.y;

        if (this.faceLoaded && this.faceImage) {
            this._drawFace(ctx, state, entityCenterX, entityCenterY);
        } else {
            this._drawPlaceholder(ctx, entityCenterX, entityCenterY - 20, 'FACE LOADING', '#ff4444');
        }

        if (this.handsLoaded && this.handsImage) {
            this._drawHands(ctx, state, entityCenterX, entityCenterY);
        } else {
            this._drawPlaceholder(ctx, entityCenterX, entityCenterY + 40, 'HANDS LOADING', '#44ff44');
        }

        this._drawBounds(ctx, entityCenterX, entityCenterY, state);
        this._drawStateInfo(ctx, state);
    }

    _drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - 10, this.height / 2);
        ctx.lineTo(this.width / 2 + 10, this.height / 2);
        ctx.moveTo(this.width / 2, this.height / 2 - 10);
        ctx.lineTo(this.width / 2, this.height / 2 + 10);
        ctx.stroke();
    }

    _drawFace(ctx, state, cx, cy) {
        const img = this.faceImage;
        const scale = state.faceScale;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = cx + state.faceOffsetX - w / 2;
        const y = cy + state.faceOffsetY - h / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
    }

    _drawHands(ctx, state, cx, cy) {
        const img = this.handsImage;
        const scale = state.handsScale;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = cx + state.handsOffsetX - w / 2;
        const y = cy + state.handsOffsetY - h / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
    }

    _drawPlaceholder(ctx, x, y, text, color) {
        ctx.fillStyle = color;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.textAlign = 'left';
    }

    _drawBounds(ctx, cx, cy, state) {
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cx - state.width / 2, cy - state.height / 2, state.width, state.height);
        ctx.setLineDash([]);
    }

    _drawStateInfo(ctx, state) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        const lines = [
            `State: ${state.activeState}`,
            `Time: ${state.time.toFixed(2)}`,
            `Face: (${state.faceOffsetX}, ${state.faceOffsetY}) s=${state.faceScale}`,
            `Hands: (${state.handsOffsetX}, ${state.handsOffsetY}) s=${state.handsScale}`,
            `Paused: ${state.paused}`,
            `Sprites: ${this.faceLoaded ? 'OK' : 'LOAD'}face ${this.handsLoaded ? 'OK' : 'LOAD'}hands`,
        ];
        lines.forEach((line, i) => { ctx.fillText(line, 8, 16 + i * 14); });
        ctx.textAlign = 'left';
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
