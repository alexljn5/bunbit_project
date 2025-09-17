import { themeManager } from "../themes/thememanager.js";
import { evilGlitchSystem } from "../themes/eviltheme.js";
import { isPaused, menuActive } from "../gamestate.js";
import { mapHandler } from "../mapdata/maphandler.js";

export function titleHandlerGodFunction() {
    // Initialize the title with a base spooky vibe
    document.title = "Heaven's Gate: Screams from the Abyss...";
    // Call documentTitleSpooky periodically or based on events
    setInterval(documentTitleSpooky, 500); // Update every 0.5s for faster chaos
    // Bind to theme changes for instant updates
    window.addEventListener('themeChanged', documentTitleSpooky);
}

function documentTitleSpooky() {
    let baseTitle = "Heaven's Gate";
    const currentTheme = themeManager.currentTheme.name; // Use theme name directly

    // Spooky title variations based on game state
    let spookySuffix = "";
    if (menuActive) {
        spookySuffix = ": Whispers in the Void...";
    } else if (isPaused) {
        spookySuffix = ": Trapped in Eternal Dread...";
    } else {
        const activeMap = mapHandler.activeMapKey || "Crimson Abyss";
        spookySuffix = `: Stalking ${activeMap}...`;
    }

    // Array of creepy phrases for extra chaos
    const creepyPhrases = [
        "The Void Hungers...",
        "Blood Drips Eternal...",
        "Shadows Claw at Reality...",
        "Your Soul is MINE...",
        "Glitch in the Abyss...",
        "Cream the Rabbit will give you a carrot! Idk this seemed uber edgy...",
        "The Gate is Bleeding..."
    ];

    // Apply evil theme's glitchy madness
    if (currentTheme === 'evil') {
        baseTitle = "H3AV3N'5 G4T3"; // Glitchy base title
        const glitchChance = Math.min(0.5, 0.3 + evilGlitchSystem.intensity); // Up to 50% glitch chance
        if (Math.random() < glitchChance) {
            baseTitle = evilGlitchSystem.applyTextGlitch(baseTitle, 0.7); // Higher glitch intensity
            spookySuffix = evilGlitchSystem.applyTextGlitch(spookySuffix, 0.7);
        }
        // Add random creepy phrase and blood-red chaos
        const randomPhrase = creepyPhrases[Math.floor(Math.random() * creepyPhrases.length)];
        spookySuffix = `${spookySuffix} | ${randomPhrase}`;
        // Randomly add flickering numbers or symbols for extra creepiness
        if (Math.random() < 0.2) {
            const glitchNumbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            spookySuffix = `${spookySuffix} [ERROR:${glitchNumbers}]`;
        }
        // Occasionally invert or corrupt the title completely
        if (Math.random() < 0.1) {
            baseTitle = baseTitle.split('').reverse().join('');
            spookySuffix = spookySuffix.replace(/[a-zA-Z]/g, c => String.fromCharCode(33 + Math.floor(Math.random() * 94)));
        }
    } else if (currentTheme === 'highcontrast') {
        spookySuffix += ": Terrors in Harsh Light";
    }

    // Combine and set the title
    document.title = `${baseTitle}${spookySuffix}`;
}