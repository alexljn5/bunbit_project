const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
}

export const CANVAS_WIDTH = domElements.mainGameRender.width;
export const CANVAS_HEIGHT = domElements.mainGameRender.height;
export const REF_CANVAS_WIDTH = 800; // Reference width for scaling
export const REF_CANVAS_HEIGHT = 800; // Reference height for scaling
export const SCALE_X = CANVAS_WIDTH / REF_CANVAS_WIDTH; // Scaling factor for X
export const SCALE_Y = CANVAS_HEIGHT / REF_CANVAS_HEIGHT; // Scaling factor for Y