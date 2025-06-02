// gamestate.js
export let menuActive = true;

export function setMenuActive(val) {
    console.log("setMenuActive called with", val, "menuActive before:", menuActive);
    menuActive = val;
    console.log("menuActive after:", menuActive);
}