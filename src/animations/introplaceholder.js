import { DEBUG_START_INTRO_ANIMATION, RUN_INTRO_ON_START, introActive, setIntroActive } from "../globals.js";

let hasRun = false;

// Auto-start the intro animation when the module loads (only if RUN_INTRO_ON_START is true)
if (typeof window !== 'undefined' && RUN_INTRO_ON_START) {
    window.introActive = introActive; // Ensure window property is set
    requestAnimationFrame(() => {
        runIntroPlaceholderAutorun();
    });
}

export function runIntroPlaceholderAutorun() {
    if (!RUN_INTRO_ON_START) return Promise.resolve();
    if (hasRun) return;
    hasRun = true;

    return new Promise((resolve) => {
        const tick = () => {
            if (window.introActive === true) {
                maybeShowIntroPlaceholders({
                    onComplete: () => {
                        setIntroActive(false);
                        // Redirect to main game after intro
                        window.location.href = "main_game.html";
                        resolve();
                    }
                });
                return;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

export function tryAutorunIntroPlaceholder() {
    return runIntroPlaceholderAutorun();
}

function preloadImages(sources) {
    return Promise.all(sources.map(src => {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }));
}

export function maybeShowIntroPlaceholders({ onComplete } = {}) {
    if (!DEBUG_START_INTRO_ANIMATION) {
        onComplete?.();
        return;
    }

    const canvas = document.getElementById("mainGameRender");
    if (!canvas) {
        onComplete?.();
        return;
    }

    const ctx = canvas.getContext("2d");

    // Force true fullscreen + pure black
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Make sure there's no blue border from the window/body
    document.documentElement.style.background = "#000000";
    document.body.style.background = "#000000";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    const frameSources = [
        "img/logo/logo-ascii.png",
        "img/animation/jim_stage_2_ascii.png",
        "img/animation/jim_stage_3_ascii.png",
        "img/animation/jim_stage_4_ascii.png",
    ];

    const centerX = w / 2;
    const centerY = h / 2;

    preloadImages(frameSources).then((imgs) => {
        const totalDuration = 1200; // 1.2 seconds total
        const startTime = performance.now();

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);

            // Pure black background
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, w, h);

            // Which frame to show
            const frameIndex = Math.min(
                imgs.length - 1,
                Math.floor((progress * imgs.length))
            );

            const img = imgs[frameIndex];
            if (img) {
                // Start small (0.15) → grow to bigger (0.65)
                const scale = 0.15 + (progress * 0.50);
                const size = Math.min(w, h) * scale;

                const x = centerX - size / 2;
                const y = centerY - size / 2;

                // Fade in slightly as it grows
                ctx.globalAlpha = 0.4 + (progress * 0.6);

                ctx.drawImage(img, x, y, size, size);
                ctx.globalAlpha = 1;
            }

            if (elapsed < totalDuration) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, w, h);
                // At the end of the animation
                onComplete?.();
            }
        }

        requestAnimationFrame(animate);
    });
}