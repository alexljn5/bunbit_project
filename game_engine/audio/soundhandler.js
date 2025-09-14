import { walkingSoundHandlerGodFunction } from "./sounds/walking/walkingsoundhandler.js";

export function soundHandlerGodFunction() {
    walkingSoundHandlerGodFunction();
}

export function playGenericGunShootSound() {
    const audio = new Audio("./audio/sounds/guns/genericgun_shoot.mp3");
    audio.play().catch(error => {
        console.error(`Error playing generic gun shoot sound: ${error} *hides*`);
    });
}

export function playMetalSwingSound() {
    const audio = new Audio("./audio/sounds/melee/metal_swing.mp3");
    audio.play().catch(error => {
        console.error(`Error playing metal swing sound: ${error} *hides*`);
    });
}