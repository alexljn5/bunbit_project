// Separate key system for 2D game
export const _2DKeys = Object.fromEntries([
    ["w", false], ["a", false], ["s", false], ["d", false]
]);

window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key in _2DKeys) {
        event.preventDefault();
        _2DKeys[key] = true;
    }
}, true);

window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key in _2DKeys) {
        event.preventDefault();
        _2DKeys[key] = false;
    }
});

window.addEventListener("blur", () => {
    for (let key in _2DKeys) _2DKeys[key] = false;
});
