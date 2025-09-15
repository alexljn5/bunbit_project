let flickerTime = 0;
const FLICKER_SPEED = 5;
const FLICKER_INTENSITY = 10.4; // Increased for more noticeable flicker

export function updateFlicker(deltaTime) {
    console.debug("updateFlicker called", { deltaTime, flickerTime });
    flickerTime += deltaTime * FLICKER_SPEED;
    const flicker = Math.sin(flickerTime) * Math.cos(flickerTime * 1.5) * FLICKER_INTENSITY;
    const result = 1 - FLICKER_INTENSITY + flicker;
    console.debug("Flicker value", { flicker, result });
    return result;
}

export function getFlickerValue() {
    const flicker = Math.sin(flickerTime) * Math.cos(flickerTime * 1.5) * FLICKER_INTENSITY;
    const result = 1 - FLICKER_INTENSITY + flicker;
    console.debug("getFlickerValue", { flickerTime, flicker, result });
    return result;
}