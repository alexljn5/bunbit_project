export let state = {
    clicks: 0
};

let backgroundMusic = new Audio("audio/music/backgroundmusic.mp3");

const mainDOMElements = {
    counter: document.getElementById("counter"),
    mainClick: document.getElementById("mainClick"),
    toggleMusic: document.getElementById("toggleMusic"),
    muteMusic: document.getElementById("muteMusic"),
    volumeSlider: document.getElementById("volumeSlider"),
    theBankKeeperBox: document.getElementById("theBankKeeper"),
};

mainDOMElements.mainClick.addEventListener("click", onClick);
mainDOMElements.toggleMusic.addEventListener("click", toggleMusic);
mainDOMElements.muteMusic.addEventListener("click", muteMusic);
mainDOMElements.volumeSlider.addEventListener("input", volumeSlider);
mainDOMElements.theBankKeeperBox.addEventListener("click", theBankKeeperBoxInput);

export function displayFunction() {
    mainDOMElements.counter.value = Math.round(state.clicks);
}

function onClick() {
    document.getElementById("counter").value;
    state.clicks++;
    document.getElementById("counter").value = Math.round(state.clicks);
    console.log(state.clicks);
}

function toggleMusic() {
    backgroundMusic.play();
}

function muteMusic() {
    backgroundMusic.pause();
}

function volumeSlider() {
    backgroundMusic.volume = mainDOMElements.volumeSlider.value / 100;
}

function theBankKeeperBoxInput() {
    let showAndHideBankStuff = document.getElementById("bank");
    if (showAndHideBankStuff.style.display === "grid") {
        showAndHideBankStuff.style.display = "none";
    } else {
        showAndHideBankStuff.style.display = "grid";
    }

}