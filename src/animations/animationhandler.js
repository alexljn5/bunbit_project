import { newGameStartAnimation, introActive } from "./newgamestartanimation.js";

export function animationHandler() {
    // This is now handled in bunbitdebug.js which awaits the intro animation
    // before showing the control panel. This function is kept for backward compatibility.
    if (introActive) {
        newGameStartAnimation();
    }
}
