import { state, displayFunction } from './main.js';
import { multiplierState } from './inventory.js';
if (typeof state.clicks === "undefined") state.clicks = 0;

let numberOfAndreasLeftToe = 0;
let costOfAndreasLeftToe = 100;

const domElements = {
    andreasLeftToe: document.getElementById("andreasLeftToe"),
    countOfAndreasLeftToe: document.getElementById("countOfAndreasLeftToe"),
    costofAndreasLeftToe: document.getElementById("costofAndreasLeftToe")
};

domElements.andreasLeftToe.addEventListener("click", andreasLeftToe);

domElements.countOfAndreasLeftToe.value = numberOfAndreasLeftToe;
domElements.costofAndreasLeftToe.value = costOfAndreasLeftToe;

function andreasLeftToe() {
    //Simple timer to give you clicks based in MS. Can change this around to have fun.
    if (costOfAndreasLeftToe <= Math.round(state.clicks)) {
        state.clicks -= costOfAndreasLeftToe;

        setInterval(() => {
            state.clicks += 5 * multiplierState.clickMultiplier;
            displayFunction();
        }, 1000);

        displayFunction();
        numberOfAndreasLeftToe++;
        domElements.countOfAndreasLeftToe.value = numberOfAndreasLeftToe;
        costOfAndreasLeftToe += costOfAndreasLeftToe * 1.5;
        domElements.costofAndreasLeftToe.value = Math.round(costOfAndreasLeftToe);
    }
}