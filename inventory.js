import { state, displayFunction } from './main.js';
import { investTimerState } from './bank.js';
if (typeof state.clicks === "undefined") state.clicks = 0;

export let multiplierState = {
    clickMultiplier: 2
};

//I honestly barely knows how this works.
let inventory = [];
let costOfGiftFromTheGods = 5;
let costOfDoubleTrouble = 10;
let costOfDoubleClickProduction = 4200;
let costOfInvestHalfTimer = 10000;
let trackUpgradesHalfTimer = 0;

//Time to see if pushing strings works instead
const giftFromTheGodsItem = "giftFromTheGodsItem";
const doubleTroubleItem = "doubleTroubleItem";
const doubleTheClicksItem = "doubleTheClicksItem";
const halfTheInvestTimerItem = "halfTheInvestTimerItem";

//Somehow pushing functions into the Array instead of a given string value makes it so it works when adding multiple buttons to upgrade stuff, wat.
const domElements = {
    giftFromTheGods: document.getElementById("giftfromthegods"),
    doubleTrouble: document.getElementById("doubletrouble"),
    doubleClickProduction: document.getElementById("doubletheclicks"),
    halfTheInvestTimer: document.getElementById("halfTheInvestTimer"),
    costOfHalfTheInvestTimer: document.getElementById("costOfHalfTheInvestTimer")
};

domElements.giftFromTheGods.addEventListener("click", giftFromTheGods);
domElements.doubleTrouble.addEventListener("click", doubleTrouble);
domElements.doubleClickProduction.addEventListener("click", doubleClickProduction);
domElements.halfTheInvestTimer.addEventListener("click", halfTheInvestTimer);

loopArray();

function giftFromTheGods() {
    if (costOfGiftFromTheGods <= state.clicks && !inventory.includes(giftFromTheGodsItem)) {
        inventory.push(giftFromTheGodsItem);
        state.clicks = state.clicks + 100000000;
        domElements.giftFromTheGods.disabled = true;
        displayFunction();
    } else {
        alert("not enough clicks");
    }
}

function doubleTrouble() {
    if (state.clicks >= costOfDoubleTrouble && !inventory.includes(doubleTroubleItem)) {
        inventory.push(doubleTroubleItem);
        state.clicks = state.clicks * 2;
        domElements.doubleTrouble.disabled = true;
        displayFunction();
    } else {
        alert("not enough clicks");
    }
}

function doubleClickProduction() {
    if (state.clicks >= costOfDoubleClickProduction && !inventory.includes(doubleTheClicksItem)) {
        inventory.push(doubleTheClicksItem);
        multiplierState.clickMultiplier = 2;
        domElements.doubleClickProduction.disabled = true;
        displayFunction();
    } else {
        alert("not enough clicks.");
    }
}

//WORKS
function halfTheInvestTimer() {
    const maximumUpgradesOfHalfTimer = 5;
    if (state.clicks >= costOfInvestHalfTimer && !inventory.includes(halfTheInvestTimerItem)) {
        if (trackUpgradesHalfTimer >= maximumUpgradesOfHalfTimer) {
            inventory.push(halfTheInvestTimerItem);
            domElements.halfTheInvestTimer.disabled = true;
        } else {
            trackUpgradesHalfTimer++
            investTimerState.investTimer = investTimerState.investTimer / 2;
            state.clicks = state.clicks - costOfInvestHalfTimer;
            displayFunction();
            costOfInvestHalfTimer = Math.round(costOfInvestHalfTimer + (costOfInvestHalfTimer + Math.log(state.clicks * 100)));
            domElements.costOfHalfTheInvestTimer.value = costOfInvestHalfTimer;
            alert("not enough clicks.");
        }
        console.log(costOfInvestHalfTimer);
    }
}

//Works, checks if the function is already pushed to prevent repeat upgrades
function loopArray() {
    setInterval(() => {
        for (let i = 0; i < inventory.length; i++) {
            console.log(inventory);
        }
    }, 500);
}

//Same loop could be utilized for for example: slow growth of clicks, Grok assisted me with this, great idea.

/*

function loopArray() {
    setInterval(() => {
        for (let i = 0; i < inventory.length; i++) {
            if (inventory[i] === giftFromTheGods) {
                state.clicks += 10; // Passive click income
            } else if (inventory[i] === doubleClickProduction) {
                state.clicks += multiplierState.clickMultiplier; // Uses the multiplier
            } // doubleTrouble could stay a one-time boost, so no loop effect
            document.getElementById("counter").value = Math.round(state.clicks);
        }
        console.log("Inventory:", inventory);
    }, 1000); // 1 second is a good pace
}

*/