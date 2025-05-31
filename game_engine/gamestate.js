// gameState.js
export let menuActive = true;

export function setMenuActive(val) {
    console.log("setMenuActive called with", val, "menuActive before:", menuActive); // DEBUG
    menuActive = val;
    console.log("menuActive after:", menuActive); // DEBUG
}