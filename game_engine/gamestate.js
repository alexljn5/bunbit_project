// gamestate.js
export let menuActive = true;
export let isPaused = false;

export function setPaused(val) {
    isPaused = val;
}

export function setMenuActive(val) {
    console.log("setMenuActive called with", val, "menuActive before:", menuActive);
    menuActive = val;
    console.log("menuActive after:", menuActive);
}