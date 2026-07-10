import { DEBUG_START_INTRO_ANIMATION, RUN_INTRO_ON_START, introActive, setIntroActive } from "../globals.js";

const DEFAULT_FRAME_MS = 350; // Slower animation: ~1.4s total for 4 frames

// --- Autorun state ---
let hasRun = false;
let introPromise = null;

// Promise-based intro animation that can be awaited
export function runIntroPlaceholderAutorun() {
    if (!RUN_INTRO_ON_START) return Promise.resolve();
    if (hasRun) return introPromise;
    hasRun = true;

    // Return a promise that resolves when the intro animation completes
    introPromise = new Promise((resolve) => {
        const tick = () => {
            try {
                if (typeof window !== 'undefined' && window.introActive === true) {
                    // Ensure canvas is properly sized before animation
                    const canvas = document.getElementById("mainGameRender");
                    if (canvas && (canvas.width === 0 || canvas.height === 0)) {
                        canvas.width = 800;
                        canvas.height = 800;
                    }
                    // Run the intro animation and resolve when done
                    maybeShowIntroPlaceholders({
                        onComplete: () => {
                            setIntroActive(false);
                            resolve();
                        }
                    });
                    return;
                }
            } catch (e) {
                // ignore and keep polling
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    return introPromise;
}

// Convenience alias
export function tryAutorunIntroPlaceholder() {
    return runIntroPlaceholderAutorun();
}

function preloadImages(imageSources) {
    const promises = imageSources.map((src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    });
    return Promise.all(promises);
}

function drawFrame({ ctx, w, h, img, centerX, centerY, scale, alpha = 1 }) {
    if (!img) return;

    const bw = w * scale;
    const bh = bw; // square-ish (fits our logo-ascii)

    const x = centerX - bw / 2;
    const y = centerY - bh / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, bw, bh);
    ctx.restore();
}

export function maybeShowIntroPlaceholders({ onComplete } = {}) {
    if (!DEBUG_START_INTRO_ANIMATION) {
        onComplete?.();
        return;
    }

    const canvas = document.getElementById("mainGameRender");
    if (!canvas || !canvas.getContext) {
        onComplete?.();
        return;
    }

    const ctx = canvas.getContext("2d");
    const w = canvas.width || 800;
    const h = canvas.height || 800;

    // ASCII animation frames: opening mouth feel by swapping frame art in-place.
    const frameSources = [
        { src: "img/logo/logo-ascii.png", scale: 0.5 },
        { src: "img/animation/jim_stage_2_ascii.png", scale: 0.5 },
        { src: "img/animation/jim_stage_3_ascii.png", scale: 0.5 },
        { src: "img/animation/jim_stage_4_ascii.png", scale: 0.5 },
    ];

    const centerX = w * 0.5;
    const centerY = h * 0.52;

    const start = performance.now();

    // Ensure the animation starts even if images are already cached (or take time to load)
    preloadImages(frameSources.map((f) => f.src)).then((imgs) => {
        const totalMs = frameSources.length * DEFAULT_FRAME_MS;

        function frameLoop(now) {
            const elapsed = now - start;

            // Background wash: keeps a cinematic fade while ensuring the mouth progression is readable.
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = "rgba(0,0,0,0.74)";
            ctx.fillRect(0, 0, w, h);

            // Which frame are we on?
            const idx = Math.max(0, Math.min(frameSources.length - 1, Math.floor(elapsed / DEFAULT_FRAME_MS)));
            const f = frameSources[idx];
            const img = imgs[idx];

            // Subtle "opening" motion: slight vertical bob + overshoot alpha ramp.
            const localT = (elapsed - idx * DEFAULT_FRAME_MS) / DEFAULT_FRAME_MS; // 0..1
            const eased = Math.min(1, Math.max(0, localT));
            const alpha = 0.25 + 0.75 * eased;
            const bob = (1 - eased) * 10; // move upward as it opens

            // Draw the active frame centered.
            drawFrame({
                ctx,
                w,
                h,
                img,
                centerX,
                centerY: centerY - bob,
                scale: f.scale,
                alpha,
            });

            if (elapsed < totalMs) {
                requestAnimationFrame(frameLoop);
            } else {
                // Final clear to ensure crisp end state.
                ctx.clearRect(0, 0, w, h);
                onComplete?.();
            }
        }

        requestAnimationFrame(frameLoop);
    });
}

