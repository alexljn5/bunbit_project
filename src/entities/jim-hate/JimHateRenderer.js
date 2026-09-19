// Jim Hate Renderer
// Renders the Jim Hate entity on a canvas.
// Designed to be reusable — accepts any canvas/context so it can
// be used in debug preview or embedded in the game later.
//
// Renders each sprite component as an independent layer so they
// can be positioned and animated separately.
//
// Generic: iterates over state.components and config.spriteComponents.
// No hardcoded component names (face, hands, etc.).

import { JIM_HATE_CONFIG as JimHateConfig } from './JimHateConfig.js';

export class JimHateRenderer {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = { ...JimHateConfig, ...config };

        // Map of componentId -> Image object
        this.images = {};
        // Map of componentId -> loaded flag
        this.loaded = {};

        this.width = config.canvasWidth || this.config.defaultCanvasWidth;
        this.height = config.canvasHeight || this.config.defaultCanvasHeight;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this._loadSprites();
    }

    _loadSprites() {
        const spriteComponents = this.config.spriteComponents || [];
        for (const comp of spriteComponents) {
            const img = new Image();
            img.src = comp.spritePath;
            img.onload = () => { this.loaded[comp.id] = true; };
            img.onerror = () => {
                console.error(`[JimHateRenderer] Failed to load sprite: ${comp.spritePath}`);
                this.loaded[comp.id] = true; // mark as loaded so placeholder shows
            };
            this.images[comp.id] = img;
            this.loaded[comp.id] = false;
        }
    }

    get isLoaded() {
        const spriteComponents = this.config.spriteComponents || [];
        return spriteComponents.every(comp => this.loaded[comp.id]);
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

        // Sort components by numeric layer (lowest first = behind).
        // Equal layers keep a deterministic secondary order (original discovery order).
        const spriteComponents = this._getSortedComponents(state);

        for (const comp of spriteComponents) {
            const img = this.images[comp.id];
            const isLoaded = this.loaded[comp.id];
            const compState = state.components[comp.id];

            if (isLoaded && img && img.complete && img.naturalWidth > 0) {
                this._drawComponent(ctx, comp, compState, img, entityCenterX, entityCenterY);
            } else {
                this._drawPlaceholder(ctx, entityCenterX, entityCenterY, comp.id.toUpperCase() + ' LOADING', '#ff4444');
            }
        }

        this._drawBounds(ctx, entityCenterX, entityCenterY, state);
        this._drawStateInfo(ctx, state);
        this._drawCenter(ctx, entityCenterX, entityCenterY);
    }

    /**
     * Return a sorted copy of the sprite components ordered by layer.
     * Does not mutate the canonical component array.
     */
    _getSortedComponents(state) {
        const spriteComponents = this.config.spriteComponents || [];
        const indexed = spriteComponents.map((comp, index) => ({ comp, index }));

        indexed.sort((a, b) => {
            const layerA = (state.components[a.comp.id] && state.components[a.comp.id].layer) ?? a.comp.defaultLayer ?? 0;
            const layerB = (state.components[b.comp.id] && state.components[b.comp.id].layer) ?? b.comp.defaultLayer ?? 0;
            if (layerA !== layerB) return layerA - layerB;
            // Deterministic secondary order: original discovery order
            return a.index - b.index;
        });

        return indexed.map(entry => entry.comp);
    }

    _drawComponent(ctx, comp, compState, img, cx, cy) {
        const scale = compState ? compState.scale : 1;
        const offsetX = compState ? compState.offsetX : 0;
        const offsetY = compState ? compState.offsetY : 0;
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        const x = cx + offsetX - w / 2;
        const y = cy + offsetY - h / 2;
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, w, h);
    }

    _drawPlaceholder(ctx, x, y, text, color) {
        ctx.fillStyle = color;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.textAlign = 'left';
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
        const compIds = Object.keys(state.components);
        const compInfo = compIds.map(id => {
            const c = state.components[id];
            return `${id}:(${c.offsetX},${c.offsetY}) s=${c.scale}`;
        });
        const lines = [
            `State: ${state.activeState}`,
            `Time: ${state.time.toFixed(2)}`,
            ...compInfo,
            `Paused: ${state.paused}`,
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

    /**
     * Draw a small crosshair at the entity centre.
     * Useful while developing offsets so the pivot is visible.
     */
    _drawCenter(ctx, cx, cy) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, cy);
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx, cy + 8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        ctx.restore();
    }
}
