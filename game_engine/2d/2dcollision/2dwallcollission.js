import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../globals.js";

// Simple boundary collision detection
export function checkBoundaryCollision(x, y, width, height) {
    // Create boundary constraints
    const constraints = {
        x: x,
        y: y,
        hasCollision: false
    };

    // Check left boundary
    if (x < 0) {
        constraints.x = 0;
        constraints.hasCollision = true;
    }
    // Check right boundary
    else if (x + width > CANVAS_WIDTH) {
        constraints.x = CANVAS_WIDTH - width;
        constraints.hasCollision = true;
    }

    // Check top boundary
    if (y < 0) {
        constraints.y = 0;
        constraints.hasCollision = true;
    }
    // Check bottom boundary
    else if (y + height > CANVAS_HEIGHT) {
        constraints.y = CANVAS_HEIGHT - height;
        constraints.hasCollision = true;
    }

    return constraints;
}
