import { mapTable } from "../mapdata/maps.js";

let track_level01 = new Audio("./audio/music/track_level01.mp3");


export function playMusicGodFunction() {
    playMusicBasedOnLevelLoads();
}

function playMusicBasedOnLevelLoads() {
    if (mapTable.get("map_01")) {
        playTrackLevel01();
    }
}

function playTrackLevel01() {
    track_level01.play();
}