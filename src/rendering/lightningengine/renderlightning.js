import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";
import { playerPosition } from "../../playerdata/playerlogic.js";
import { mapHandler } from "../../mapdata/maphandler.js";

// Lightning engine for rendering lights and shadows
export class LightningEngine {
    constructor() {
        this.lightningObjects = [];
        this.lightBuffer = null;
        this.shadowBuffer = null;
        this.initializeBuffers();
    }

    initializeBuffers() {
        // Create offscreen canvases for light and shadow rendering
        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = CANVAS_WIDTH;
        this.lightCanvas.height = CANVAS_HEIGHT;
        this.lightCtx = this.lightCanvas.getContext('2d');

        this.shadowCanvas = document.createElement('canvas');
        this.shadowCanvas.width = CANVAS_WIDTH;
        this.shadowCanvas.height = CANVAS_HEIGHT;
        this.shadowCtx = this.shadowCanvas.getContext('2d');
    }

    addLightningObject(lightningObject) {
        this.lightningObjects.push(lightningObject);
    }

    removeLightningObject(lightningObject) {
        const index = this.lightningObjects.indexOf(lightningObject);
        if (index > -1) {
            this.lightningObjects.splice(index, 1);
        }
    }

    clearLightningObjects() {
        this.lightningObjects = [];
    }

    render(mainCtx) {
        // Clear the light and shadow canvases
        this.lightCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.shadowCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Render each lightning object
        this.lightningObjects.forEach(lightning => {
            if (!lightning.active) return;

            const dx = lightning.position.x - playerPosition.x;
            const dz = lightning.position.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > lightning.range) return;

            // Calculate screen position
            const scale = 10; // Pixels per world unit
            const screenX = CANVAS_WIDTH / 2 + dx * scale;
            const screenY = CANVAS_HEIGHT / 2 - dz * scale;

            // Create gradient
            const gradient = this.lightCtx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, lightning.range * scale
            );

            if (lightning.type === 'light') {
                gradient.addColorStop(0, `rgba(${lightning.color.r}, ${lightning.color.g}, ${lightning.color.b}, ${lightning.intensity})`);
                gradient.addColorStop(1, `rgba(${lightning.color.r}, ${lightning.color.g}, ${lightning.color.b}, 0)`);

                this.lightCtx.save();
                this.lightCtx.globalCompositeOperation = 'lighter';
                this.lightCtx.fillStyle = gradient;
                this.lightCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                this.lightCtx.restore();
            } else if (lightning.type === 'shadow') {
                gradient.addColorStop(0, `rgba(0, 0, 0, ${lightning.intensity})`);
                gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

                this.shadowCtx.save();
                this.shadowCtx.globalCompositeOperation = 'multiply';
                this.shadowCtx.fillStyle = gradient;
                this.shadowCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                this.shadowCtx.restore();
            }
        });

        // Composite lights and shadows onto main canvas
        mainCtx.save();
        mainCtx.globalCompositeOperation = 'lighter';
        mainCtx.drawImage(this.lightCanvas, 0, 0);
        mainCtx.globalCompositeOperation = 'multiply';
        mainCtx.drawImage(this.shadowCanvas, 0, 0);
        mainCtx.restore();
    }

    update(deltaTime) {
        this.lightningObjects.forEach(lightning => {
            lightning.update(deltaTime);
        });
    }
}

// Global lightning engine instance
export const lightningEngine = new LightningEngine();

// Function to render lightning in the main render loop
export function renderLightning(mainCtx) {
    lightningEngine.clearLightningObjects();

    // Get lightning objects from the current map
    const mapLightningObjects = mapHandler.getLightningObjects();
    mapLightningObjects.forEach(lightning => {
        lightningEngine.addLightningObject(lightning);
    });

    lightningEngine.render(mainCtx);
}

// Function to update lightning
export function updateLightning(deltaTime) {
    lightningEngine.update(deltaTime);
}
