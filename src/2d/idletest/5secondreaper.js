import { state, displayFunction } from './main.js';
import { multiplierState } from './inventory.js';
if (typeof state.clicks === "undefined") state.clicks = 0;

let numberOfFiveSecondReaper = 0;
let costOfFiveSecondreaper = 15;

const domElements = {
    fiveSecondReaper: document.getElementById("fiveSecondReaper"),
    countOfFiveSecondReapers: document.getElementById("countOfFiveSecondReapers"),
    costOfFiveSecondReapers: document.getElementById("costOfFiveSecondReapers")
};

domElements.fiveSecondReaper.addEventListener("click", fiveSecondReaper);

domElements.countOfFiveSecondReapers.value = numberOfFiveSecondReaper;
domElements.costOfFiveSecondReapers.value = costOfFiveSecondreaper;

function fiveSecondReaper() {
    //Simple timer to give you clicks based in MS. Can change this around to have fun.
    if (costOfFiveSecondreaper <= Math.round(state.clicks)) {
        state.clicks -= costOfFiveSecondreaper;

        setInterval(() => {
            state.clicks += multiplierState.clickMultiplier;
            displayFunction();
        }, 5000);

        displayFunction();
        numberOfFiveSecondReaper++;
        domElements.countOfFiveSecondReapers.value = numberOfFiveSecondReaper;
        costOfFiveSecondreaper += costOfFiveSecondreaper * 0.5;
        domElements.costOfFiveSecondReapers.value = Math.round(costOfFiveSecondreaper);
    }
}