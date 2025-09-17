import { themeManager } from "../themes/thememanager.js";
import { evilGlitchSystem } from "../themes/eviltheme.js";
import { isPaused, menuActive } from "../gamestate.js";
import { mapHandler } from "../mapdata/maphandler.js";

let isInitialized = false; // Prevent multiple intervals
let flickerTimeout = null;
let errorTimeout = null;
let corruptionTimeout = null;
let typingInterval = null;

export function titleHandlerGodFunction() {
    // Only initialize once
    if (isInitialized) return;
    isInitialized = true;

    // Initialize the title with a base spooky vibe
    document.title = "Welcome.";
    // Call documentTitleSpooky periodically
    setInterval(documentTitleSpooky, 5000); // Every 5s for main updates
    // Bind to theme changes for instant updates
    window.addEventListener('themeChanged', () => {
        // Clear all timers to avoid overlap on theme change
        clearTimeout(flickerTimeout);
        clearTimeout(errorTimeout);
        clearTimeout(corruptionTimeout);
        clearInterval(typingInterval);
        flickerTimeout = null;
        errorTimeout = null;
        corruptionTimeout = null;
        typingInterval = null;
        documentTitleSpooky();
    });
}

function documentTitleSpooky() {
    let baseTitle = "Welcome.";
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

    // Array of creepier phrases
    const creepyPhrases = [
        "The Void Hungers...",
        "Blood Seeps Through Time...",
        "Reality Fractures Silently...",
        "Your Soul is Bound in Chains...",
        "Glitches Tear the Veil...",
        "The Gate Screams in Agony...",
        "Darkness Claims Its Due... ☠"
    ];

    // Apply evil theme's glitchy madness
    if (currentTheme === 'evil') {
        baseTitle = "ƨƚ͠oɿɿ͘ɒƆ̛ƨɘvo͟⅃m͡ɒɘ́ɿ҉Ɔ̢"; // Your glitchy base title
        const glitchChance = Math.min(0.4, 0.2 + evilGlitchSystem.intensity); // Up to 40% glitch chance

        // Main glitch effect (every 5s with main interval)
        let currentBaseTitle = baseTitle;
        let currentSuffix = spookySuffix;
        if (Math.random() < glitchChance) {
            currentBaseTitle = evilGlitchSystem.applyTextGlitch(baseTitle, 0.6); // Moderate glitch intensity
            currentSuffix = evilGlitchSystem.applyTextGlitch(spookySuffix, 0.6);
        }

        // Add random creepy phrase
        const randomPhrase = creepyPhrases[Math.floor(Math.random() * creepyPhrases.length)];
        currentSuffix = `${currentSuffix} | ${randomPhrase}`;

        // Typing effect with deletion (10% chance, ~3s total)
        if (Math.random() < 0.1 && !typingInterval) {
            const fullTitle = `${currentBaseTitle}${currentSuffix}`;
            let typedTitle = "";
            let index = 0;
            let isDeleting = false;
            typingInterval = setInterval(() => {
                if (!isDeleting && index < fullTitle.length) {
                    typedTitle += fullTitle[index];
                    document.title = typedTitle + "█"; // Add cursor
                    index++;
                } else if (!isDeleting && index === fullTitle.length) {
                    isDeleting = true;
                    setTimeout(() => { }, 500); // Pause before deleting
                } else if (isDeleting && index > 0) {
                    typedTitle = typedTitle.slice(0, -1);
                    document.title = typedTitle + "█";
                    index--;
                } else {
                    clearInterval(typingInterval);
                    typingInterval = null;
                    document.title = fullTitle; // Complete title
                }
            }, 100); // 100ms per character
        }

        // Flicker effect (20% chance, 800ms)
        if (Math.random() < 0.2 && !flickerTimeout) {
            const flickerTitle = evilGlitchSystem.applyTextGlitch(currentBaseTitle, 0.8);
            document.title = `${flickerTitle}${currentSuffix}`;
            flickerTimeout = setTimeout(() => {
                document.title = `${currentBaseTitle}${currentSuffix}`;
                flickerTimeout = null;
            }, 800);
        }

        // Error code effect (15% chance, 6s duration)
        if (Math.random() < 0.15 && !errorTimeout) {
            const glitchNumbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            currentSuffix = `${currentSuffix} [ERROR:${glitchNumbers}]`;
            document.title = `${currentBaseTitle}${currentSuffix}`;
            errorTimeout = setTimeout(() => {
                documentTitleSpooky(); // Refresh to remove error
                errorTimeout = null;
            }, 6000);
        }

        // Corruption effect (5% chance, 8s duration)
        if (Math.random() < 0.05 && !corruptionTimeout) {
            const corruptedTitle = currentBaseTitle.split('').reverse().join('');
            const corruptedSuffix = currentSuffix.replace(/[a-zA-Z]/g, c => String.fromCharCode(33 + Math.floor(Math.random() * 94)));
            document.title = `${corruptedTitle}${corruptedSuffix} †☣‡`;
            corruptionTimeout = setTimeout(() => {
                document.title = `${currentBaseTitle}${currentSuffix}`;
                corruptionTimeout = null;
            }, 8000);
        }

        // Set the title (base case, only if no other effects triggered)
        if (!flickerTimeout && !errorTimeout && !corruptionTimeout && !typingInterval) {
            document.title = `${currentBaseTitle}${currentSuffix}`;
        }
    } else if (currentTheme === 'highcontrast') {
        spookySuffix += ": Terrors in Harsh Light";
        document.title = `${baseTitle}${spookySuffix}`;
    } else {
        // Fallback for any other theme
        document.title = `${baseTitle}${spookySuffix}`;
    }
}