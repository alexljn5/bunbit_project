import { _2DRenderEngine } from "../2drenderengine.js";
import { keys } from "../../playerdata/playerlogic.js";

export let _2DPlayerX = 168;
export let _2DPlayerY = 336;
const _2DPlayerWidth = 32;
const _2DPlayerHeight = 64;
const _2DPlayerSpeed = 4;

export function _2DPlayerLogic() {
    _2DPlayerLogicTest();
}

export function _2DPlayerLogicTest() {
    if (keys.w) _2DPlayerY -= _2DPlayerSpeed;
    if (keys.s) _2DPlayerY += _2DPlayerSpeed;
    if (keys.a) _2DPlayerX -= _2DPlayerSpeed;
    if (keys.d) _2DPlayerX += _2DPlayerSpeed;
    drawShit();
}

function drawShit() {
    _2DRenderEngine.clearRect(0, 0, _2DRenderEngine.canvas.width, _2DRenderEngine.canvas.height);
    _2DRenderEngine.fillStyle = "rgba(255, 255, 255, 1)";
    _2DRenderEngine.fillRect(_2DPlayerX, _2DPlayerY, _2DPlayerWidth, _2DPlayerHeight);
}

