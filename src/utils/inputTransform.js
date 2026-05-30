import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals.js";

/**
 * Maps browser mouse coords to the game's internal canvas coordinate system,
 * preserving `object-fit: contain` letterboxing.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {MouseEvent|PointerEvent} e
 * @returns {{x:number, y:number}}
 */
export function getMouseCanvasPos(canvas, e) {
    const rect = canvas.getBoundingClientRect();

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const displayAspect = rect.width / rect.height;
    const internalAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    // Determine the actual drawn region inside the CSS box
    if (displayAspect > internalAspect) {
        // letterboxing on left/right
        drawH = rect.height;
        drawW = drawH * internalAspect;
        offsetX = (rect.width - drawW) / 2;
    } else {
        // letterboxing on top/bottom
        drawW = rect.width;
        drawH = drawW / internalAspect;
        offsetY = (rect.height - drawH) / 2;
    }

    const x = (cx - offsetX) * (CANVAS_WIDTH / drawW);
    const y = (cy - offsetY) * (CANVAS_HEIGHT / drawH);

    return { x, y };
}

