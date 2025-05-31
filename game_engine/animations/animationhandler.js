import { newGameStartAnimation, introActive } from "./newgamestartanimation.js";

export function animationHandler() {
    if (introActive) {
        newGameStartAnimation();
    }
}