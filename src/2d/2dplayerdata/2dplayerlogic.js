import { _2DRenderEngine } from "../2drenderengine.js";
import { _2DKeys } from "./2dkeys.js";
import { checkBoundaryCollision } from "../2dcollision/2dwallcollission.js";

export let _2DPlayerX = 168;
export let _2DPlayerY = 336;
const _2DPlayerWidth = 32;
const _2DPlayerHeight = 64;
const _2DPlayerSpeed = 4;

export function _2DPlayerLogic() {
    _2DPlayerLogicTest();
}

export function _2DPlayerLogicTest() {
    // Calculate new position based on input
    let newX = _2DPlayerX;
    let newY = _2DPlayerY;

    if (_2DKeys.w) newY -= _2DPlayerSpeed;
    if (_2DKeys.s) newY += _2DPlayerSpeed;
    if (_2DKeys.a) newX -= _2DPlayerSpeed;
    if (_2DKeys.d) newX += _2DPlayerSpeed;

    // Check for collisions and get adjusted position
    const collision = checkBoundaryCollision(newX, newY, _2DPlayerWidth, _2DPlayerHeight);

    // Update position with collision-checked coordinates
    _2DPlayerX = collision.x;
    _2DPlayerY = collision.y;

    drawShit();
}

function drawShit() {
    _2DRenderEngine.fillStyle = "rgba(255, 255, 255, 1)";
    _2DRenderEngine.fillRect(_2DPlayerX, _2DPlayerY, _2DPlayerWidth, _2DPlayerHeight);
}

