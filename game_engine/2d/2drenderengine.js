import { gameLoop } from "../main_game.js";
import { _2DPlayerLogicTest, _2DPlayerLogic } from "./2dplayerdata/2dplayerlogic.js";
import { creepyShit } from "./creepyeffecttest.js";

const domElements = {
    _2DMainGameRender: document.getElementById("_2DMainGameRender"),
    _2DPlayGameButton: document.getElementById("_2DPlayGameButton"),
};

export const _2DRenderEngine = domElements._2DMainGameRender.getContext("2d");
export let _2DGame = null;

domElements._2DPlayGameButton.onclick = function () {
    if (!_2DGame) _2DMainGameRender();
    _2DGame.start();
};

export function _2DMainGameRender() {
    _2DGame = gameLoop(_2DGameRenderEngine);
}

function _2DGameRenderEngine() {
    _2DPlayerLogic();
    _2DPlayerLogicTest();
    creepyShit();
}

