import { displayFunction, state } from './main.js';
if (typeof state.clicks === "undefined") state.clicks = 0;

export let investTimerState = {
    investTimer: 3600000 //One hour
};


document.getElementById("input").addEventListener("click", input, false);
document.getElementById("output").addEventListener("click", output, false);
document.getElementById("invest").addEventListener("click", investClicks, false);
document.getElementById("input").addEventListener("click", input, false);

document.getElementById("theBankKeeper").addEventListener("click", theBankKeeper, false);

const theBank = new Map(); // Move the Map outside to keep stored values. was this literally the issue...?


//Works, just use a fucking if else statement otherwise it'll break again.
//Migrate this eventually back to npc.js when less drunk.
function theBankKeeper(text) {
    if (!theBank.has("storedClicks")) {
        theBank.set("storedClicks", 0);
    } else {
        text = theBank.get("storedClicks");
        console.log("You have stored: " + text);
    }
}

function input() {
    if (!theBank.has("storedClicks")) {
        theBank.set("storedClicks", 0);
    }

    if (state.clicks > 0) {
        let storedClicks = theBank.get("storedClicks");
        theBank.set("storedClicks", storedClicks + state.clicks);
        state.clicks -= state.clicks;
        console.log(theBank);
        displayFunction();
    } else {
        alert("Not enough clicks!");
    }
}

//Simple, gives you the stored clicks.
function output() {
    if (!theBank.has("storedClicks")) {
        theBank.set("storedClicks", 0);
    }

    let stored = theBank.get("storedClicks");
    if (stored > 0) {
        state.clicks += stored; // Give all the stored clicks back
        theBank.set("storedClicks", 0); // Empty the bank
        console.log("Withdrew all clicks! Now you have: " + state.clicks);
        displayFunction();
    } else {
        alert("Not enough clicks!");
    }
}

//Invest clicks into the bank, 5% interest rate per hour at base value.
function investClicks() {
    //This is simply something Grok AI has helped me with, apparantly just a failsafe so it avoids undefined errors and instead sets it to 0.
    if (!theBank.has("storedClicks")) {
        theBank.set("storedClicks", 0);
    }

    let storedClicks = theBank.get("storedClicks");

    if (storedClicks > 0) {
        setInterval(() => {
            storedClicks = storedClicks * 1.05;
            theBank.set("storedClicks", Math.round(storedClicks));
            displayFunction();
        }, investTimerState.investTimer

        ); //1 hour, I have an idea. This will be an exported functions for upgrades. (idea worked)
    } else {
        alert("Not enough clicks in the bank to invest!");
    }

    console.log(investTimerState.investTimer);
}