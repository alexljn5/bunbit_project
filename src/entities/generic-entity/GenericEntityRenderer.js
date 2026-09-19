import { GENERIC_ENTITY_CONFIG } from './GenericEntityConfig.js';

export class GenericEntityRenderer {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = { ...GENERIC_ENTITY_CONFIG, ...config };

        this.components = [];
        this._loadSprites();

        this.width = config.canvasWidth || this.config.defaultCanvasWidth;
        this.height = config.canvasHeight || this.config.defaultCanvasHeight;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    _loadSprites() {
        for (const comp of this.config.spriteComponents) {
            const image = new Image();
            image.src = comp.spritePath;
            const entry = {
                id: comp.id,
                label: comp.label,
                image,
                loaded: false,
                width: comp.defaultWidth,
                height: comp.defaultHeight,
            };
            image.onload = () => { entry.loaded = true; };
            image.onerror = () => { console.error('[GenericEntityRenderer] Failed to load sprite:', comp.spritePath); };
            this.components.push(entry);
        }
    }

    get isLoaded() {
        return this.components.length > 0 && this.components.every(c => c.loaded);
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

        for (const comp of this.components) {
            const offset = state.components?.[comp.id];
            if (comp.loaded && offset) {
                this._drawComponent(ctx, comp, state, entityCenterX, entityCenterY, offset);
            } else if (comp.loaded) {
                this._drawComponent(ctx, comp, state, entityCenterX, entityCenterY, {
                    offsetX: 0,
                    offsetY: 0,
                    scale: 1,
                });
            } else {
                // Procedural placeholder for unloaded sprite
                const placeholderOffset = offset || { offsetX: 0, offsetY: 0, scale: 1 };
                this._drawSpritePlaceholder(ctx, comp, entityCenterX, entityCenterY, placeholderOffset);
            }
        }

        this._drawBounds(ctx, entityCenterX, entityCenterY, state);
        this._drawStateInfo(ctx, state);
        this._drawCenter(ctx, entityCenterX, entityCenterY);
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

    _drawComponent(ctx, comp, state, cx, cy, offset) {
        const img = comp.image;
        const scale = offset.scale;
        const w = comp.width * scale;
        const h = comp.height * scale;
        const x = cx + offset.offsetX - w / 2;
        const y = cy + offset.offsetY - h / 2;
        ctx.drawImage(img, 0, 0, comp.width, comp.height, x, y, w, h);
    }

    _drawSpritePlaceholder(ctx, comp, cx, cy, offset) {
        const scale = offset.scale || 1;
        const w = (comp.defaultWidth || 200) * scale;
        const h = (comp.defaultHeight || 200) * scale;
        const x = cx + (offset.offsetX || 0) - w / 2;
        const y = cy + (offset.offsetY || 0) - h / 2;
        const color = comp.placeholderColor || '#2a2a3a';
        const borderColor = comp.placeholderBorderColor || '#5a5a7a';

        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(comp.label || comp.id, x + w / 2, y + h / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
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
        const componentLines = Object.entries(state.components || {}).map(([id, comp]) => {
            return `${id}: (${comp.offsetX}, ${comp.offsetY}) s=${comp.scale}`;
        });
        const lines = [
            `State: ${state.activeState}`,
            `Time: ${state.time.toFixed(2)}`,
            `Paused: ${state.paused}`,
            ...componentLines,
            `Sprites: ${this.isLoaded ? 'OK' : 'LOAD'}`,
        ];
        lines.forEach((line, i) => { ctx.fillText(line, 8, 16 + i * 14); });
        ctx.textAlign = 'left';
    }

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

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
