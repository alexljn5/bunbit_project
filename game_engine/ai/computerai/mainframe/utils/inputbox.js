// inputbox.js
import { computerAIRenderEngine } from "../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../globals.js";
import { registerInteractiveElement, activeElement, setActiveElement } from "./inputhandler.js";

export class inputBox {
    constructor(id, xLogical, yLogical, widthLogical, heightLogical, label = "", isTextInput = false, onClick = null, onKey = null, imageSrc = null) {
        this.id = id;
        this.xLogical = xLogical;
        this.yLogical = yLogical;
        this.widthLogical = widthLogical;
        this.heightLogical = heightLogical;
        this.label = label;
        this.isTextInput = isTextInput;
        this.text = "";
        this.onClick = onClick;
        this.onKey = onKey || (this.isTextInput ? this.defaultKeyHandler.bind(this) : null);
        this.imageSrc = imageSrc;
        this.image = null;
        this.imageLoaded = false;

        if (imageSrc) this.loadImage();
        this.register();
    }

    loadImage() {
        this.image = new Image();
        this.image.onload = () => {
            console.log(`Image loaded for ${this.id}! Size: ${this.image.width}x${this.image.height}`);
            this.imageLoaded = true;
        };
        this.image.onerror = () => {
            console.warn(`Failed to load image for ${this.id}, falling back to text`);
            this.image = null;
        };
        this.image.src = this.imageSrc;
    }

    defaultKeyHandler(e) {
        if (e.key.length === 1) this.text += e.key;
        else if (e.key === "Backspace") this.text = this.text.slice(0, -1);
        else if (e.key === "Enter") console.log("Input submitted:", this.text);
    }

    draw() {
        const x = this.xLogical * SCALE_X;
        const y = this.yLogical * SCALE_Y;
        const width = this.widthLogical * SCALE_X;
        const height = this.heightLogical * SCALE_Y;

        // Draw background
        computerAIRenderEngine.fillStyle = activeElement === this.id ? "#FFD700" : "#FFF";
        computerAIRenderEngine.fillRect(x, y, width, height);

        // Border
        computerAIRenderEngine.strokeStyle = "#000";
        computerAIRenderEngine.lineWidth = 2 * SCALE_X;
        computerAIRenderEngine.strokeRect(x, y, width, height);

        // Draw image if loaded
        if (this.image && this.imageLoaded) {
            const imgAspect = this.image.width / this.image.height;
            const boxAspect = width / height;
            let imgWidth = width;
            let imgHeight = height;

            if (imgAspect > boxAspect) imgHeight = width / imgAspect;
            else imgWidth = height * imgAspect;

            const imgX = x + (width - imgWidth) / 2;
            const imgY = y + (height - imgHeight) / 2;

            computerAIRenderEngine.drawImage(this.image, imgX, imgY, imgWidth, imgHeight);
        } else {
            // fallback text
            computerAIRenderEngine.fillStyle = "#000";
            computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
            computerAIRenderEngine.textAlign = "center";
            computerAIRenderEngine.textBaseline = "middle";
            const displayText = this.isTextInput ? (this.text || this.label) : this.label;
            computerAIRenderEngine.fillText(displayText, x + width / 2, y + height / 2);
        }
    }

    register() {
        registerInteractiveElement(
            this.id,
            () => ({
                x: this.xLogical * SCALE_X,
                y: this.yLogical * SCALE_Y,
                width: this.widthLogical * SCALE_X,
                height: this.heightLogical * SCALE_Y
            }),
            () => {
                setActiveElement(this.id);
                if (this.onClick) this.onClick();
            },
            this.onKey
        );
    }
}
