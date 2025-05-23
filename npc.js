import { state, displayFunction } from './main.js';
import { multiplierState } from './inventory.js';
if (typeof state.clicks === "undefined") state.clicks = 0;

let initialText = "Hello Traveler, ";
let theBankKeeperText = "";
let hasClicked = false;

const domElements = {
    theBankKeeperBox: document.getElementById("theBankKeeper"),
    theBankKeeperText: document.getElementById("theBankKeeperText"),
    theBankKeeperWhoAreYou: document.getElementById("whoAreYou"),
    theBankKeeperUhmWat: document.getElementById("uhmWat"),
    theBankKeeperOkay: document.getElementById("okay")
};

domElements.theBankKeeperBox.addEventListener("click", theBankKeeper);
domElements.theBankKeeperWhoAreYou.addEventListener("click", whoAreYou);
domElements.theBankKeeperUhmWat.addEventListener("click", uhmWat);
domElements.theBankKeeperUhmWat.addEventListener("click", iWillJustShowYou);
domElements.theBankKeeperOkay.addEventListener("click", okay);


domElements.theBankKeeperText.textContent = initialText;
domElements.theBankKeeperUhmWat.style.display = "none";
domElements.theBankKeeperOkay.style.display = "none";



function theBankKeeper(storedClicks) {
    let hasClicked = false;
    if (hasClicked == false) {
        theBankKeeperText = "I have been awaiting you."
        initialText = initialText + theBankKeeperText;
        updateTextBoxDisplay();
        hasClicked = true;
    }
}

function whoAreYou() {
    let whoAreYouButton = document.getElementById("whoAreYou");
    if (hasClicked == false) {
        theBankKeeperText = "I am the Bank keeper.";
        initialText = theBankKeeperText;
        updateTextBoxDisplay();
        hasClicked = true;
        whoAreYouButton.style.display = "none";
        uhmWat();
    }
}

function uhmWat() {
    let uhmWatButton = document.getElementById("uhmWat");
    uhmWatButton.style.display = "grid";
    theBankKeeperText = "I manage the bank silly, input clicks and get a 5% interest rates on your clicks. Per hour.";
    initialText = theBankKeeperText;
    updateTextBoxDisplay();
    hasClicked = true;
}

function iWillJustShowYou() {
    let uhmWatButton = document.getElementById("uhmWat");
    uhmWatButton.style.display = "none";
    theBankKeeperText = "Look, I will just show you. Press the arrow to see the guide (implement later?)";
    initialText = theBankKeeperText;
    updateTextBoxDisplay();
    okayShow();
}

function okayShow() {
    let theBankKeeperOkayButton = document.getElementById("okay");
    theBankKeeperOkayButton.style.display = "grid";
    initialText = theBankKeeperText;
    updateTextBoxDisplay();
}

function okay() {
    let theBankKeeperOkayButton = document.getElementById("okay");
    theBankKeeperOkayButton.style.display = "none";
    theBankKeeperText = "";
    initialText = theBankKeeperText;
    updateTextBoxDisplay();
}


function updateTextBoxDisplay() {
    domElements.theBankKeeperText.textContent = initialText;
}