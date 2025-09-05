import { _2DRenderEngine } from "../2drenderengine.js";
import { _2DKeys } from "./2dkeys.js";

export let _2DPlayerX = 168;
export let _2DPlayerY = 336;
const _2DPlayerWidth = 32;
const _2DPlayerHeight = 64;
const _2DPlayerSpeed = 4;

export function _2DPlayerLogic() {
    _2DPlayerLogicTest();
}

export function _2DPlayerLogicTest() {
    if (_2DKeys.w) _2DPlayerY -= _2DPlayerSpeed;
    if (_2DKeys.s) _2DPlayerY += _2DPlayerSpeed;
    if (_2DKeys.a) _2DPlayerX -= _2DPlayerSpeed;
    if (_2DKeys.d) _2DPlayerX += _2DPlayerSpeed;
    drawShit();
}

function drawShit() {
    _2DRenderEngine.fillStyle = "rgba(255, 255, 255, 1)";
    _2DRenderEngine.fillRect(_2DPlayerX, _2DPlayerY, _2DPlayerWidth, _2DPlayerHeight);
}

