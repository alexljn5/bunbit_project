// gamestate.js
export let menuActive = true;
export let isPaused = false;

export function setPaused(val) {
    isPaused = val;
}

export function setMenuActive(val) {
    menuActive = val;
}
