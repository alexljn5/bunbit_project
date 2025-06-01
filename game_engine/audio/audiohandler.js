import { mapTable } from "../mapdata/maps.js";
import { renderEngine } from "../renderengine.js";

let track_level01 = new Audio("./audio/music/track_level01.mp3");
let musicVolume = 1.0; // Range: 0.0 - 1.0
let soundVolume = 1.0; // Range: 0.0 - 1.0
let sliderDragging = null; // null, 'music', or 'sound'
const sliderX = 365;
const sliderY = 190;
const sliderWidth = 200;
const sliderHeight = 16;

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

export function getMusicVolume() {
    return musicVolume;
}

export function setMusicVolume(val) {
    musicVolume = Math.max(0, Math.min(1, val));
    if (track_level01) track_level01.volume = musicVolume;
}

export function getSoundVolume() {
    return soundVolume;
}

export function setSoundVolume(val) {
    soundVolume = Math.max(0, Math.min(1, val));
    // Set global sound effect volume here if needed
}

export function volumeSlidersGodFunction() {
    musicVolumeSlider();
    soundVolumeSlider();
}

function musicVolumeSlider() {
    // Draw slider background
    renderEngine.fillStyle = 'gray';
    renderEngine.fillRect(sliderX, sliderY, sliderWidth, sliderHeight);
    // Draw filled portion
    renderEngine.fillStyle = 'red';
    renderEngine.fillRect(sliderX, sliderY, sliderWidth * musicVolume, sliderHeight);
    // Draw border
    renderEngine.strokeStyle = 'black';
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(sliderX, sliderY, sliderWidth, sliderHeight);
    // Draw label
    renderEngine.fillStyle = '#fff';
    renderEngine.font = '18px Arial';
    renderEngine.fillText('Music Volume', sliderX, sliderY - 10);
    // Draw knob
    const knobX = sliderX + sliderWidth * musicVolume;
    renderEngine.beginPath();
    renderEngine.arc(knobX, sliderY + sliderHeight / 2, 10, 0, 2 * Math.PI);
    renderEngine.fillStyle = 'black';
    renderEngine.fill();
    renderEngine.strokeStyle = '#fff';
    renderEngine.stroke();
}

function soundVolumeSlider() {
    // Draw slider background
    renderEngine.fillStyle = 'gray';
    renderEngine.fillRect(sliderX, sliderY + 40, sliderWidth, sliderHeight);
    // Draw filled portion
    renderEngine.fillStyle = 'red';
    renderEngine.fillRect(sliderX, sliderY + 40, sliderWidth * soundVolume, sliderHeight);
    // Draw border
    renderEngine.strokeStyle = 'black';
    renderEngine.lineWidth = 2;
    renderEngine.strokeRect(sliderX, sliderY + 40, sliderWidth, sliderHeight);
    // Draw label
    renderEngine.fillStyle = '#fff';
    renderEngine.font = '18px Arial';
    renderEngine.fillText('Sound Volume', sliderX, sliderY + 30);
    // Draw knob
    const knobX = sliderX + sliderWidth * soundVolume;
    renderEngine.beginPath();
    renderEngine.arc(knobX, sliderY + 40 + sliderHeight / 2, 10, 0, 2 * Math.PI);
    renderEngine.fillStyle = 'black';
    renderEngine.fill();
    renderEngine.strokeStyle = '#fff';
    renderEngine.stroke();
}

// Cleaned up audio handler for clarity and maintainability
export function setupAudioSliderHandlers() {
    if (typeof window !== 'undefined') {
        const canvas = renderEngine && renderEngine.canvas;
        if (canvas && !canvas._audioSliderHandlerAttached) {
            canvas.addEventListener('mousedown', function (e) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
                const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
                // Check which slider is clicked
                if (
                    mouseX >= sliderX && mouseX <= sliderX + sliderWidth &&
                    mouseY >= sliderY && mouseY <= sliderY + sliderHeight
                ) {
                    sliderDragging = 'music';
                    setMusicVolume((mouseX - sliderX) / sliderWidth);
                } else if (
                    mouseX >= sliderX && mouseX <= sliderX + sliderWidth &&
                    mouseY >= sliderY + 40 && mouseY <= sliderY + 40 + sliderHeight
                ) {
                    sliderDragging = 'sound';
                    setSoundVolume((mouseX - sliderX) / sliderWidth);
                }
            });
            canvas.addEventListener('mousemove', function (e) {
                if (sliderDragging) {
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
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