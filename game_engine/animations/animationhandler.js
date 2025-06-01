import { newGameStartAnimation, introActive } from "./newgamestartanimation.js";

// Cleaned up animation handler for clarity and maintainability
export function animationHandler() {
    if (introActive) {
        newGameStartAnimation();
    }
}