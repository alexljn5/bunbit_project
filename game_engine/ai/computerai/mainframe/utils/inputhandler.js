import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y } from "../../../../globals.js";
import { computerAIRenderEngine } from "../../computerai.js";

// Global state
let activeElement = null;
let mouseX = 0;
let mouseY = 0;
export let username = "";
export let password = "";
const interactiveElements = [];
let listenersAttached = false;

// Register an interactive element
export function registerInteractiveElement(elementId, getBoundsCallback, onClickCallback, onKeyCallback) {
    interactiveElements.push({
        id: elementId,
        getBounds: getBoundsCallback,
        onClick: onClickCallback,
        onKey: onKeyCallback
    });
}

// Get mouse position
function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
}

// Click handler
function handleClick(e, canvas) {
    getMousePos(canvas, e);
    activeElement = null;
    for (let element of interactiveElements) {
        const bounds = element.getBounds();
        if (
            mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
            mouseY >= bounds.y && mouseY <= bounds.y + bounds.height
        ) {
            activeElement = element.id;
            if (element.onClick) element.onClick();
            break;
        }
    }
    import("../ui/login.js").then(module => {
        module.computerAiLoginEnvironmentGodFunction();
    });
}

// Key handler
function handleKey(e, canvas) {
    if (!activeElement) return;
    const element = interactiveElements.find(el => el.id === activeElement);
    if (element && element.onKey) element.onKey(e);
    import("../ui/login.js").then(module => {
        module.computerAiLoginEnvironmentGodFunction();
    });
}

// Initialize handlers
export function initInputHandler(canvas) {
    if (listenersAttached || !canvas) return;
    if (typeof window !== 'undefined') {
        canvas.addEventListener("click", (e) => handleClick(e, canvas));
        window.addEventListener("keydown", (e) => handleKey(e, canvas));
        listenersAttached = true;
        console.log("Input handlers attached!");
    }
}

// Re-register boxes on res change
function handleResolutionChange() {
    interactiveElements.length = 0; // Clear old bounds
    registerUsernameBox();
    registerPasswordBox();
    console.log("Re-registered input boxes for new resolution");
}

// Username box registration
export function registerUsernameBox() {
    registerInteractiveElement("usernameBox", () => {
        const width = 100;
        const height = 20;
        const x = (CANVAS_WIDTH - width) / 2;
        const y = (CANVAS_HEIGHT - height) / 2 - 20;
        return { x, y, width, height };
    }, () => {
        activeElement = "usernameBox";
        console.log("Username box clicked!");
    }, (e) => {
        if (e.key.length === 1) {
            username += e.key;
        } else if (e.key === "Backspace") {
            username = username.slice(0, -1);
        } else if (e.key === "Enter" && username && password) {
            openNewEnvironment();
        }
    });
}

// Password box registration
export function registerPasswordBox() {
    registerInteractiveElement("passwordBox", () => {
        const width = 100;
        const height = 20;
        const x = (CANVAS_WIDTH - width) / 2;
        const y = (CANVAS_HEIGHT - height) / 2 + 20;
        return { x, y, width, height };
    }, () => {
        activeElement = "passwordBox";
        console.log("Password box clicked!");
    }, (e) => {
        if (e.key.length === 1) {
            password += e.key;
        } else if (e.key === "Backspace") {
            password = password.slice(0, -1);
        } else if (e.key === "Enter" && username && password) {
            openNewEnvironment();
        }
    });
}

// Placeholder for new environment
function openNewEnvironment() {
    import("../ui/login.js").then(module => {
        const { computerAIRenderEngine } = module;
        computerAIRenderEngine.fillStyle = "#000";
        computerAIRenderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        computerAIRenderEngine.fillStyle = "#0f0";
        computerAIRenderEngine.font = `${20 * SCALE_X}px Arial`; // FIX: Match your scaling
        computerAIRenderEngine.textAlign = "center";
        computerAIRenderEngine.textBaseline = "middle";
        computerAIRenderEngine.fillText(`Welcome, ${username}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    });
}

// Export state
export { activeElement };

// Listen for res change
if (typeof window !== 'undefined') {
    window.addEventListener('resolutionChanged', handleResolutionChange);
}