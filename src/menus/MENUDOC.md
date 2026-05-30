Menu Input Hit-Testing: Canvas Input Transform (Design Notes)

## Problem statement


UI hit-testing and rendering were desynced because multiple systems were independently modifying the canvas presentation:

object-fit: contain (CSS visual scaling)
manual canvas.style.transform (debug movement / scaling)
internal fixed resolution space (CANVAS_WIDTH / CANVAS_HEIGHT)
raw getBoundingClientRect() input mapping per menu

This created multiple competing coordinate spaces, causing drift between:

what the user sees
where the mouse is interpreted
where UI elements are logically placed
Target architecture

We enforce a single rule:

There is exactly one canonical coordinate space: the internal canvas resolution.

Everything else is a projection into or out of that space.

Coordinate layers
1. World / Logical space (canonical)

This is always:

(0, 0) → (CANVAS_WIDTH, CANVAS_HEIGHT)

All UI elements, menus, and hitboxes exist here.

2. Screen space (browser layout space)

This is:

canvas.getBoundingClientRect()

Affected by:

CSS sizing
object-fit: contain
fullscreen
device pixel ratio indirectly
3. Input transform (the only required mapping)

We define a single function:

screen → canvas logical space
InputTransform module (core idea)
screenToCanvas(e)

This is the ONLY valid conversion function.

function screenToCanvas(canvas, e) {
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const displayAspect = rect.width / rect.height;
    const internalAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (displayAspect > internalAspect) {
        drawH = rect.height;
        drawW = drawH * internalAspect;
        offsetX = (rect.width - drawW) / 2;
    } else {
        drawW = rect.width;
        drawH = drawW / internalAspect;
        offsetY = (rect.height - drawH) / 2;
    }

    return {
        x: (x - offsetX) * (CANVAS_WIDTH / drawW),
        y: (y - offsetY) * (CANVAS_HEIGHT / drawH)
    };
}
Key property

This function assumes:

canvas is NOT moved via transform
canvas is NOT independently scaled outside object-fit behavior
object-fit containment is purely visual and symmetric
Required rules (strict)
Rule 1 — canvas must not be transformed

❌ forbidden:

canvas.style.transform = ...

Reason: breaks rect-based mapping

Rule 2 — only CSS controls visual scaling

Allowed:

object-fit: contain;
width: 100%;
height: 100%;
Rule 3 — all UI must use canonical space

All buttons:

x, y, width, height in CANVAS space

No screen-space UI logic.

Rule 4 — all menus use shared input function

Every system must use:

const p = screenToCanvas(canvas, e);

No exceptions:

main menu
settings menu
graphics menu
overlays
debug tools (future)
Menu architecture refactor (recommended)
Before

Each menu does:

its own getBoundingClientRect
its own scaling math
its own offset correction

This leads to drift and duplication.

After

Central module:

/input/inputtransform.js

Exports:

screenToCanvas
attachCanvasInput(canvas, handlers)
Example unified handler model
canvas.addEventListener("click", (e) => {
    const p = screenToCanvas(canvas, e);
    uiManager.handleClick(p.x, p.y);
});
UI system simplification

Instead of per-menu hit logic:

UI Layer
hit(button, x, y)
Input Layer
screenToCanvas()
Rendering Layer
drawButton(x, y)

No cross-dependencies.

Debug tools (future-safe design)

If you reintroduce debug movement later:

DO NOT:
move canvas
scale canvas
DO:
move wrapper only
wrapper.style.transform = "translate(...)"

And optionally:

screenToCanvas = screenToCanvas + wrapper offset compensation

But only if needed.

Mental model (important)

Think of it like this:

canvas = fixed resolution “film”
CSS = projector scaling
input transform = lens calibration

You only calibrate the lens once.

Summary
One coordinate system (canvas internal space)
One input transform function
No canvas transforms
object-fit remains safe
all menus share identical mapping logic