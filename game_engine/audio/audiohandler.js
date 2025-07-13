import { mapTable } from "../mapdata/maps.js";
import { renderEngine } from "../renderengine.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT } from "../globals.js";
import { mapHandler } from "../mapdata/maphandler.js";

// Audio tracks per map
const mapTracks = new Map([
    ["map_01", new Audio("./audio/music/track_level01_new.mp3")],
    ["map_02", new Audio("./audio/music/track_level01_wtf.mp3")],
    ["map_debug", new Audio("./audio/music/placeholder.mp3")]
]);

let demon_rumble01 = new Audio("./audio/sounds/demonrumble.mp3");
let musicVolume = 1.0;
let soundVolume = 1.0;
let sliderDragging = null;
let currentTrack = null;

export function playMusicGodFunction() {
    playMusicBasedOnLevelLoads();
}

function playMusicBasedOnLevelLoads() {
    const activeMapKey = mapHandler.activeMapKey;
    if (!activeMapKey || !mapTable.get(activeMapKey)) {
        console.warn(`No active map or invalid map key: ${activeMapKey} *pouts*`);
        return;
    }

    const newTrack = mapTracks.get(activeMapKey);
    if (!newTrack) {
        console.warn(`No track defined for map ${activeMapKey}, skipping music *tilts head*`);
        return;
    }

    // Stop current track if different
    if (currentTrack && currentTrack !== newTrack) {
        currentTrack.pause();
        currentTrack.currentTime = 0;
        console.log(`Stopped previous track for map change *giggles*`);
    }

    // Play new track if not already playing
    if (newTrack !== currentTrack) {
        newTrack.volume = musicVolume;
        newTrack.loop = true; // Optional: loop the track
        newTrack.play().catch(error => {
            console.error(`Error playing track for ${activeMapKey}: ${error} *hides*`);
        });
        currentTrack = newTrack;
        console.log(`Playing track for map ${activeMapKey} *claps*`);
    }
}

export function getMusicVolume() {
    return musicVolume;
}

export function setMusicVolume(val) {
    musicVolume = Math.max(0, Math.min(1, val));
    if (currentTrack) {
        currentTrack.volume = musicVolume;
    }
    // Update all tracks to maintain consistent volume
    for (const track of mapTracks.values()) {
        track.volume = musicVolume;
    }
}

export function playWtf() {
    const nextDelay = Math.random() * 200000 + 5000; // 5 to 25 sec
    setTimeout(() => {
        const wtfTrack = mapTracks.get("map_01") || mapTracks.get("map_debug");
        if (wtfTrack) {
            wtfTrack.volume = musicVolume;
            wtfTrack.play().catch(error => {
                console.error(`Error playing WTF track: ${error} *pouts*`);
            });
        }
        playWtf(); // Schedule next one!
    }, nextDelay);
}

// Sounds
export function playDemonRumble() {
    demon_rumble01.volume = soundVolume;
    demon_rumble01.play().catch(error => {
        console.error(`Error playing demon rumble: ${error} *hides*`);
    });
}

export function getSoundVolume() {
    return soundVolume;
}

export function setSoundVolume(val) {
    soundVolume = Math.max(0, Math.min(1, val));
    demon_rumble01.volume = soundVolume;
}

export function volumeSlidersGodFunction() {
    musicVolumeSlider();
    soundVolumeSlider();
}

function musicVolumeSlider() {
    const sliderX = 365 * SCALE_X;
    const sliderY = 190 * SCALE_Y;
    const sliderWidth = 200 * SCALE_X;
    const sliderHeight = 16 * SCALE_Y;
    renderEngine.fillStyle = 'gray';
    renderEngine.fillRect(sliderX, sliderY, sliderWidth, sliderHeight);
    renderEngine.fillStyle = 'red';
    renderEngine.fillRect(sliderX, sliderY, sliderWidth * musicVolume, sliderHeight);
    renderEngine.strokeStyle = 'black';
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(sliderX, sliderY, sliderWidth, sliderHeight);
    renderEngine.fillStyle = '#fff';
    renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText('Music Volume', sliderX, sliderY - 10 * SCALE_Y);
    const knobX = sliderX + sliderWidth * musicVolume;
    renderEngine.beginPath();
    renderEngine.arc(knobX, sliderY + sliderHeight / 2, 10 * Math.min(SCALE_X, SCALE_Y), 0, 2 * Math.PI);
    renderEngine.fillStyle = 'black';
    renderEngine.fill();
    renderEngine.strokeStyle = '#fff';
    renderEngine.stroke();
}

function soundVolumeSlider() {
    const sliderX = 365 * SCALE_X;
    const sliderY = 190 * SCALE_Y;
    const sliderWidth = 200 * SCALE_X;
    const sliderHeight = 16 * SCALE_Y;
    const soundSliderY = sliderY + 40 * SCALE_Y;
    renderEngine.fillStyle = 'gray';
    renderEngine.fillRect(sliderX, soundSliderY, sliderWidth, sliderHeight);
    renderEngine.fillStyle = 'red';
    renderEngine.fillRect(sliderX, soundSliderY, sliderWidth * soundVolume, sliderHeight);
    renderEngine.strokeStyle = 'black';
    renderEngine.lineWidth = 2 * Math.min(SCALE_X, SCALE_Y);
    renderEngine.strokeRect(sliderX, soundSliderY, sliderWidth, sliderHeight);
    renderEngine.fillStyle = '#fff';
    renderEngine.font = `${18 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText('Sound Volume', sliderX, soundSliderY - 10 * SCALE_Y);
    const knobX = sliderX + sliderWidth * soundVolume;
    renderEngine.beginPath();
    renderEngine.arc(knobX, soundSliderY + sliderHeight / 2, 10 * Math.min(SCALE_X, SCALE_Y), 0, 2 * Math.PI);
    renderEngine.fillStyle = 'black';
    renderEngine.fill();
    renderEngine.strokeStyle = '#fff';
    renderEngine.stroke();
}

export function setupAudioSliderHandlers() {
    if (typeof window !== 'undefined') {
        const canvas = renderEngine.canvas;
        if (canvas && !canvas._audioSliderHandlerAttached) {
            canvas.addEventListener('mousedown', function (e) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
                const mouseY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
                const sliderX = 365 * SCALE_X;
                const sliderY = 190 * SCALE_Y;
                const sliderWidth = 200 * SCALE_X;
                const sliderHeight = 16 * SCALE_Y;
                const soundSliderY = sliderY + 40 * SCALE_Y;
                if (
                    mouseX >= sliderX && mouseX <= sliderX + sliderWidth &&
                    mouseY >= sliderY && mouseY <= sliderY + sliderHeight
                ) {
                    sliderDragging = 'music';
                    setMusicVolume((mouseX - sliderX) / sliderWidth);
                } else if (
                    mouseX >= sliderX && mouseX <= sliderX + sliderWidth &&
                    mouseY >= soundSliderY && mouseY <= soundSliderY + sliderHeight
                ) {
                    sliderDragging = 'sound';
                    setSoundVolume((mouseX - sliderX) / sliderWidth);
                }
            });
            canvas.addEventListener('mousemove', function (e) {
                if (sliderDragging) {
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
                    const sliderX = 365 * SCALE_X;
                    const sliderWidth = 200 * SCALE_X;
                    if (sliderDragging === 'music') {
                        setMusicVolume((mouseX - sliderX) / sliderWidth);
                    } else if (sliderDragging === 'sound') {
                        setSoundVolume((mouseX - sliderX) / sliderWidth);
                    }
                }
            });
            window.addEventListener('mouseup', function () {
                sliderDragging = null;
            });
            canvas._audioSliderHandlerAttached = true;
        }
    }
}