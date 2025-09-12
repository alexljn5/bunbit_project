import { computerAIRenderEngine } from "../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../../../../globals.js";
import { registerInteractiveElement, activeElement, setActiveElement } from "./inputhandler.js";

export class inputBox {
    constructor(id, xLogical, yLogical, widthLogical, heightLogical, label = "", isTextInput = false, onClick = null, onKey = null) {
        this.id = id;
        this.xLogical = xLogical; // Logical coords (e.g., 400 for center)
        this.yLogical = yLogical;
        this.widthLogical = widthLogical;
        this.heightLogical = heightLogical;
        this.label = label; // Button text or placeholder
        this.isTextInput = isTextInput; // True for text fields, false for buttons
        this.text = ""; // Current input text (if text field)
        this.onClick = onClick; // Callback for button click
        this.onKey = onKey || (this.isTextInput ? this.defaultKeyHandler.bind(this) : null); // Default typing for inputs
        this.register(); // Auto-register for inputs
    }

    // Default key handler for text inputs
    defaultKeyHandler(e) {
        if (e.key.length === 1) {
            this.text += e.key;
        } else if (e.key === "Backspace") {
            this.text = this.text.slice(0, -1);
        } else if (e.key === "Enter") {
            console.log("Input submitted:", this.text);
            // Trigger login or action (customize)
            if (this.id === "usernameBox") {
                // Example: Check login
                const success = checkLogin(); // From inputhandler.js
                if (window.onLoginAttempt) window.onLoginAttempt(success);
            }
        }
    }

    // Draw the box
    draw() {
        // Scale to canvas coords
        const x = this.xLogical * SCALE_X;
        const y = this.yLogical * SCALE_Y;
        const width = this.widthLogical * SCALE_X;
        const height = this.heightLogical * SCALE_Y;

        // Fill (gold if active)
        computerAIRenderEngine.fillStyle = activeElement === this.id ? "#FFD700" : "#FFF";
        computerAIRenderEngine.fillRect(x, y, width, height);

        // Border
        computerAIRenderEngine.strokeStyle = "#000";
        computerAIRenderEngine.lineWidth = 2 * SCALE_X;
        computerAIRenderEngine.strokeRect(x, y, width, height);

        // Text (input or label)
        computerAIRenderEngine.fillStyle = "#000";
        computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
        computerAIRenderEngine.textAlign = "center";
        computerAIRenderEngine.textBaseline = "middle";
        const displayText = this.isTextInput ? (this.text || this.label) : this.label;
        computerAIRenderEngine.fillText(displayText, x + width / 2, y + height / 2);
    }

    // Register with input handler
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
                console.log(`${this.id} clicked!`);
                if (this.onClick) this.onClick();
            },
            this.onKey
        );
    }

    // Get current text (for text inputs)
    getText() {
        return this.text;
    }
}