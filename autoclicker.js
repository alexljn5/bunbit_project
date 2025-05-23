import { state, displayFunction } from './main.js';
import { multiplierState } from './inventory.js';
if (typeof state.clicks === "undefined") state.clicks = 0;

let numberOfAutoClickers = 0;
let numberOfUpgradeAutoClickers = 0;
let costOfUpgradingAutoClickers = 15;
let upgradeAble = false;
let costOfAutoClicker = 5;
let clickMultiplier = 1;

const domElements = {
    autoClicker: document.getElementById("autoClicker"),
    upgradeForAutoClicker: document.getElementById("upgradeForAutoClicker"),
    costOfAutoClicker: document.getElementById("costOfAutoClicker"),
    costOfAutoClickerUpgrades: document.getElementById("costOfAutoClickerUpgrades"),
    countOfAutoClickers: document.getElementById("countOfAutoClickers"),
    countOfAutoClickersUpgrades: document.getElementById("countOfAutoClickersUpgrades"),
    counter: document.getElementById("counter")
};

domElements.autoClicker.addEventListener("click", autoClicker);
domElements.upgradeForAutoClicker.addEventListener("click", upgradeAutoClicker);

domElements.costOfAutoClicker.value = costOfAutoClicker;
domElements.costOfAutoClickerUpgrades.value = costOfUpgradingAutoClickers;
domElements.counter.value = Math.round(state.clicks);

function autoClicker() {
    if (costOfAutoClicker <= state.clicks) {
        upgradeAble = true;
        state.clicks -= costOfAutoClicker;
        setInterval(() => {
            state.clicks += clickMultiplier * multiplierState.clickMultiplier;
            displayFunction();
            console.log(state.clicks);
        }, 10000);

        displayFunction();

        numberOfAutoClickers++;
        domElements.countOfAutoClickers.value = numberOfAutoClickers;
        costOfAutoClicker = costOfAutoClicker + costOfAutoClicker * 0.5;

        domElements.costOfAutoClicker.value = Math.round(costOfAutoClicker);
    } else {
        upgradeAble = false;
    }
}

//Every time you upgrade +1 clicks, maybe an upgrade to double this? But works! Dayum!
function upgradeAutoClicker() {
    if (costOfUpgradingAutoClickers <= state.clicks) {
        upgradeAble = true;
        numberOfUpgradeAutoClickers++;
        clickMultiplier = numberOfUpgradeAutoClickers + 1;
        domElements.countOfAutoClickersUpgrades.value = Math.round(numberOfUpgradeAutoClickers);
        state.clicks -= Math.round(costOfUpgradingAutoClickers);
        costOfUpgradingAutoClickers += Math.log(costOfUpgradingAutoClickers + 1);
        domElements.costOfAutoClickerUpgrades.value = Math.round(costOfUpgradingAutoClickers);

        displayFunction();
    } else {
        upgradeAble = false;
    }
}