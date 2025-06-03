import { state, displayFunction } from './main.js';

const domElements = {
    prestigeButton: document.getElementById("prestigeButton"),
    prestigeSystem: document.getElementById("prestigeSystem")
};

domElements.prestigeButton.addEventListener("click", prestigeButton);


function prestigeButton() {
    if (state.clicks >= 10000000) {
        state.clicks = state.clicks - 10000000;
        displayFunction();
        window.location.href = "./game_engine/main_game.html"
    } else {
        alert("Not enough clicks!");
    }
}