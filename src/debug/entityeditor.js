import { getEntityDescriptor } from '../entities/entityregistry.js';
import { JIM_HATE_CONFIG as JimHateConfig } from '../entities/jim-hate/JimHateConfig.js';

/**
 * EntityEditor - A reusable editor class for visualising and editing game entities.
 *
 * This class is debug-only. It instantiates real entity implementations
 * (JimHate, etc.) and provides a canvas-based preview with controls.
 *
 * The editor enumerates entities from the EntityRegistry and loads their
 * sprite components dynamically.
 *
 * The editor uses the entity's own state/animator/renderer instances,
 * ensuring the preview is a true consumer of the entity implementation.
 */
export class EntityEditor {
    constructor(options = {}) {
        this.canvas = options.canvas || null;
        this.container = options.container || null;
        this.themeManager = options.themeManager || null;

        this.entity = null;
        this.state = null;
        this.animator = null;
        this.renderer = null;

        this.entityType = options.entityType || 'jim-hate';
        this.entityConfig = options.entityConfig || JimHateConfig;

        this.controls = {};
        this.controlValues = {};
        this.controlCallbacks = {};

        this.isRunning = false;
        this.lastTimestamp = 0;

        this._boundUpdate = this._update.bind(this);
    }

    /**
     * Initialise the editor: create canvas, entity, controls, and start the loop.
     */
    init() {
        this._createCanvas();
        this._createEntity();
        this._createControls();
        this._applyTheme();
        this._bindThemeListener();
        this.start();
    }

    /**
     * Create or reuse the canvas element.
     */
    _createCanvas() {
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            return;
        }

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'bunbit-entity-editor-container';
            document.body.appendChild(this.container);
        }

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'bunbit-entity-editor-canvas';
        this.canvas.width = this.entityConfig.defaultCanvasWidth || 800;
        this.canvas.height = this.entityConfig.defaultCanvasHeight || 800;
        this.container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Instantiate the entity and access its own state/animator/renderer.
     */
    _createEntity() {
        const entityDef = getEntityDescriptor(this.entityType);

        if (!entityDef) {
            console.error(`[EntityEditor] Entity type "${this.entityType}" not found in registry.`);
            return;
        }

        // Prefer the descriptor's config, then the injected config, then a fallback
        this.entityConfig = entityDef.config || this.entityConfig || {};

        // Create the entity with canvas and config
        this.entity = new entityDef.class(this.canvas, this.entityConfig);

        // Use the entity's own state/animator/renderer
        this.state = this.entity.state;
        this.animator = this.entity.animator;
        this.renderer = this.entity.renderer;
    }

    /**
     * Create the control panel with sliders and buttons.
     */
    _createControls() {
        if (!this.container) {
            this.container = document.getElementById('bunbit-entity-editor-container') ||
                document.createElement('div');
            if (!this.container.id) {
                this.container.id = 'bunbit-entity-editor-container';
                document.body.appendChild(this.container);
            }
        }

        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'bunbit-entity-editor-controls';
        this.container.appendChild(controlsContainer);

        const controlDefs = this._getControlDefinitions();

        controlDefs.forEach(def => {
            const wrapper = document.createElement('div');
            wrapper.className = 'bunbit-control-group';

            const label = document.createElement('label');
            label.htmlFor = `bunbit-ctrl-${def.key}`;
            label.textContent = def.label;
            wrapper.appendChild(label);

            const input = document.createElement('input');
            input.id = `bunbit-ctrl-${def.key}`;
            input.type = def.type;
            input.min = def.min;
            input.max = def.max;
            input.step = def.step;
            input.value = def.default;
            wrapper.appendChild(input);

            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'bunbit-control-value';
            valueDisplay.textContent = def.default;
            wrapper.appendChild(valueDisplay);

            controlsContainer.appendChild(wrapper);

            this.controls[def.key] = { input, valueDisplay, def };
            this.controlValues[def.key] = parseFloat(def.default);

            if (def.callback) {
                this.controlCallbacks[def.key] = def.callback.bind(this);
            }

            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.controlValues[def.key] = val;
                valueDisplay.textContent = val.toFixed(def.decimals || 0);
                if (this.controlCallbacks[def.key]) {
                    this.controlCallbacks[def.key](val);
                }
            });

            // Apply initial value immediately so state and controls are in sync
            if (this.controlCallbacks[def.key]) {
                this.controlCallbacks[def.key](parseFloat(def.default));
            }
        });

        // Add action buttons
        const buttonDefs = [
            { key: 'pause', label: 'Pause', action: () => this.pause() },
            { key: 'resume', label: 'Resume', action: () => this.start() },
            { key: 'reset', label: 'Reset', action: () => this.reset() },
        ];

        buttonDefs.forEach(def => {
            const btn = document.createElement('button');
            btn.id = `bunbit-btn-${def.key}`;
            btn.className = 'bunbit-editor-button';
            btn.textContent = def.label;
            btn.addEventListener('click', def.action);
            controlsContainer.appendChild(btn);
        });
    }

    /**
     * Define the controls for the current entity type.
     * Controls are generated from the entity descriptor's
     * sprite components so they work for any registered entity.
     */
    _getControlDefinitions() {
        const entityDef = getEntityDescriptor(this.entityType);
        const spriteComponents = entityDef ? entityDef.spriteComponents : [];
        const cfg = this.entityConfig;

        const controls = [
            {
                key: 'canvasScale',
                label: 'Canvas Scale',
                type: 'range',
                min: 0.1,
                max: 3,
                step: 0.1,
                default: 1,
                decimals: 1,
                callback: (val) => {
                    this.canvas.style.transform = `scale(${val})`;
                }
            },
            {
                key: 'animSpeed',
                label: 'Anim Speed',
                type: 'range',
                min: 0.1,
                max: 3,
                step: 0.1,
                default: cfg.defaultAnimationSpeed || 1,
                decimals: 1,
                callback: (val) => {
                    this.animator.setSpeed(val);
                }
            },
        ];

        for (const comp of spriteComponents) {
            const defaultOffsetX = comp.defaultOffsetX ?? 0;
            const defaultOffsetY = comp.defaultOffsetY ?? 0;
            const defaultScale = comp.defaultScale ?? 1;

            controls.push({
                key: `${comp.id}OffsetX`,
                label: `${comp.label} X`,
                type: 'range',
                min: -200,
                max: 200,
                step: 1,
                default: defaultOffsetX,
                decimals: 0,
                callback: (val) => {
                    this.state.setComponentProp(comp.id, 'offsetX', val);
                }
            });
            controls.push({
                key: `${comp.id}OffsetY`,
                label: `${comp.label} Y`,
                type: 'range',
                min: -200,
                max: 200,
                step: 1,
                default: defaultOffsetY,
                decimals: 0,
                callback: (val) => {
                    this.state.setComponentProp(comp.id, 'offsetY', val);
                }
            });
            controls.push({
                key: `${comp.id}Scale`,
                label: `${comp.label} Scale`,
                type: 'range',
                min: 0.1,
                max: 3,
                step: 0.1,
                default: defaultScale,
                decimals: 1,
                callback: (val) => {
                    this.state.setComponentProp(comp.id, 'scale', val);
                }
            });
        }

        return controls;
    }

    /**
     * Apply theme styling to the editor elements.
     */
    _applyTheme() {
        if (!this.themeManager) return;

        const theme = this.themeManager.getCurrentTheme();
        if (!theme) return;

        const container = this.container;
        if (container) {
            container.style.setProperty('--bunbit-editor-bg', theme.background || '#0a0000');
            container.style.setProperty('--bunbit-editor-fg', theme.text || '#ff0000');
            container.style.setProperty('--bunbit-editor-accent', theme.border || '#8b0000');
            container.style.setProperty('--bunbit-editor-button-bg', theme.buttonBg || '#1a0000');
        }

        // Theme the controls
        if (container) {
            const controls = container.querySelectorAll('button, input, label, span');
            controls.forEach((el) => {
                el.style.color = theme.text || '#ff0000';
            });
            const buttons = container.querySelectorAll('button');
            buttons.forEach((btn) => {
                btn.style.backgroundColor = theme.buttonBg || '#1a0000';
                btn.style.borderColor = theme.border || '#8b0000';
                btn.style.color = theme.text || '#ff0000';
            });
        }
    }

    /**
     * Bind to theme change events.
     */
    _bindThemeListener() {
        if (!this.themeManager) return;

        window.addEventListener('themeChanged', () => {
            this._applyTheme();
        });
    }

    /**
     * Start the animation loop.
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        requestAnimationFrame(this._boundUpdate);
    }

    /**
     * Pause the animation loop.
     */
    pause() {
        this.isRunning = false;
    }

    /**
     * Reset the entity to its initial state.
     */
    reset() {
        if (this.state && typeof this.state.reset === 'function') {
            this.state.reset();
        }
        if (this.animator && typeof this.animator.reset === 'function') {
            this.animator.reset();
        }

        // Reset control values to defaults
        const controlDefs = this._getControlDefinitions();
        controlDefs.forEach(def => {
            this.controlValues[def.key] = parseFloat(def.default);
            if (this.controls[def.key]) {
                this.controls[def.key].input.value = def.default;
                this.controls[def.key].valueDisplay.textContent = def.default;
            }
        });

        // Re-apply control callbacks to sync state
        controlDefs.forEach(def => {
            if (def.callback) {
                def.callback.call(this, this.controlValues[def.key]);
            }
        });
    }

    /**
     * Switch the editor to a different entity type.
     */
    switchEntity(entityType, entityConfig = null) {
        this.pause();
        this.entityType = entityType;

        // Use descriptor config if no explicit config provided
        const entityDef = getEntityDescriptor(entityType);
        this.entityConfig = entityConfig || entityDef?.config || this.entityConfig;

        // Remove old controls
        const oldControls = document.getElementById('bunbit-entity-editor-controls');
        if (oldControls) oldControls.remove();

        // Null out canvas reference so _createCanvas creates a fresh element
        this.canvas = null;

        // Remove old canvas
        const oldCanvas = document.getElementById('bunbit-entity-editor-canvas');
        if (oldCanvas) oldCanvas.remove();

        // Re-create canvas, entity, controls, and start loop
        this._createCanvas();
        this._createEntity();
        this._createControls();
        this.start();
    }

    /**
     * Main update loop.
     */
    _update(timestamp) {
        if (!this.isRunning) return;

        const deltaMs = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        const deltaSeconds = deltaMs / 1000;

        if (this.entity && typeof this.entity.update === 'function') {
            this.entity.update(deltaSeconds);
        }

        this._render();

        requestAnimationFrame(this._boundUpdate);
    }

    /**
     * Render the entity to the canvas.
     * The entity's renderer handles background fill and clearing.
     */
    _render() {
        if (!this.ctx) return;

        if (this.entity && typeof this.entity.render === 'function') {
            this.entity.render();
        }
    }

    /**
     * Clean up the editor.
     */
    destroy() {
        this.pause();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.entity = null;
        this.state = null;
        this.animator = null;
        this.renderer = null;
    }
}
