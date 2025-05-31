import { keys } from "../playerdata/playerlogic.js";
import { renderEngine } from "../renderengine.js";
import { closeSettingsMenu, isSettingsMenuOpen } from "./menuhandler.js";

export function menuSettingsGodFunction() {
    menuSettings();
}

function menuSettings() {
    if (!isSettingsMenuOpen()) return;
    if (keys["esc"]) {
        // Logic to close the settings menu
        console.log("Settings menu closed");
        keys["esc"] = false; // Reset the key state
        closeSettingsMenu();
        return;
    }
    // Logic to display the settings menu
    renderEngine.fillStyle = "rgba(0, 0, 0, 0.8)";
    renderEngine.fillRect(50, 50, 400, 300);
    renderEngine.fillStyle = "white";
    renderEngine.font = "20px Arial";
    renderEngine.fillText("Settings Menu", 60, 80);
    renderEngine.fillText("Press Escape to close", 60, 110);
}