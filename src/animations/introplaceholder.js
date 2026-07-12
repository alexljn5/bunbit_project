// ============================================================
// INTRO.JS — Scary, Organized, Full of Fluff & Terror
// ============================================================

// ─── Bun Bun ───
//   (\_/)
//   (•_•)
//   (")_(")
//   *shoulder bunny*

import {
    DEBUG_START_INTRO_ANIMATION,
    RUN_INTRO_ON_START,
    introActive,
    setIntroActive
} from "../globals.js";

// ─── CSS INJECTION ─────────────────────────────────────────────
// This injects all styles directly into the document head
// so you don't need a separate CSS file for the intro.

const injectStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
        /* ─── BASE RESET ─── */
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #0a0a0a;
            font-family: 'Courier New', monospace;
        }

        /* ─── CANVAS ─── */
        #mainGameRender {
            display: block;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            aspect-ratio: auto !important;

            background: #0a0a0a;
            image-rendering: pixelated;

            /* subtle CRT glow */
            box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.05);
        }

        /* ─── SCARY OVERLAY (CRT SCANLINES) ─── */
        #mainGameRender::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            background: repeating-linear-gradient(
                0deg,
                rgba(0, 0, 0, 0.15) 0px,
                rgba(0, 0, 0, 0.15) 2px,
                transparent 2px,
                transparent 4px
            );
            animation: scanline 0.1s infinite linear;
        }

        @keyframes scanline {
            0% { transform: translateY(0); }
            100% { transform: translateY(4px); }
        }

        /* ─── FLICKER VIGNETTE ─── */
        #mainGameRender::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 11;
            background: radial-gradient(
                ellipse at center,
                transparent 60%,
                rgba(0, 0, 0, 0.8) 100%
            );
            animation: vignetteFlicker 2s infinite ease-in-out;
        }

        @keyframes vignetteFlicker {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 0.9; }
            25% { opacity: 0.6; }
            75% { opacity: 0.85; }
        }

        /* ─── STATIC NOISE OVERLAY ─── */
        .intro-static {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 12;
            opacity: 0.03;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23n)" opacity="1"/></svg>');
            background-size: 200px 200px;
            animation: staticMove 0.5s infinite steps(4);
        }

        @keyframes staticMove {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-5px, 3px); }
            50% { transform: translate(7px, -2px); }
            75% { transform: translate(-3px, 5px); }
            100% { transform: translate(2px, -4px); }
        }

        /* ─── LOADING TEXT (for extra spook) ─── */
        .intro-loading {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 20;
            color: #660000;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            letter-spacing: 4px;
            text-transform: uppercase;
            opacity: 0.6;
            animation: loadingBlink 1.2s infinite step-start;
            pointer-events: none;
            text-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
        }

        @keyframes loadingBlink {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.1; }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 600px) {
            .intro-loading { font-size: 10px; bottom: 20px; }
        }
    `;
    document.head.appendChild(style);
};

// ─── INJECT STATIC OVERLAY ────────────────────────────────────
const injectStaticOverlay = () => {
    const div = document.createElement("div");
    div.className = "intro-static";
    document.body.appendChild(div);
};

const injectLoadingText = () => {
    const div = document.createElement("div");
    div.className = "intro-loading";
    div.textContent = "⏣ system awakening...";
    document.body.appendChild(div);
};

// ─── CONSTANTS ─────────────────────────────────────────────────
const INTRO_DURATION = 5200; // ms
const FRAME_START_SCALE = 0.15;
const FRAME_END_SCALE = 0.65;
const FRAME_FADE_START = 0.4;
const FRAME_FADE_END = 1.0;

const FRAME_SOURCES = [
    "img/logo/logo-ascii.png",
    "img/animation/jim_stage_2_ascii.png",
    "img/animation/jim_stage_3_ascii.png",
    "img/animation/jim_stage_4_ascii.png",
];

let hasRun = false;

// ─── EASE IN-OUT ──────────────────────────────────────────────
function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ─── PRELOAD IMAGES ────────────────────────────────────────────
function preloadImages(sources) {
    return Promise.all(sources.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn(`[Intro] Failed to load: ${src}`);
                resolve(null);
            };
            img.src = src;
        });
    }));
}

// ─── CANVAS HELPERS ────────────────────────────────────────────
function getCanvas() {
    const canvas = document.getElementById("mainGameRender");
    if (!canvas) {
        console.warn("[Intro] Canvas #mainGameRender not found.");
        return null;
    }
    return canvas;
}

function setupFullscreenCanvas(canvas) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Keep drawing coordinates in CSS pixels.
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Scale the internal buffer for crisp rendering.
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    return { w, h, dpr };
}

// ─── GLITCH / SCARY EFFECTS ──────────────────────────────────
function applyGlitch(ctx, w, h, intensity = 0.3) {
    if (Math.random() > intensity) return;

    const channels = [
        { r: 1.2, g: 0.8, b: 0.8, dx: 2, dy: 0 },
        { r: 0.8, g: 1.2, b: 0.8, dx: -3, dy: 1 },
        { r: 0.8, g: 0.8, b: 1.2, dx: 1, dy: -2 },
    ];

    const channel = channels[Math.floor(Math.random() * channels.length)];
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] *= channel.r;
        data[i + 1] *= channel.g;
        data[i + 2] *= channel.b;
    }

    ctx.putImageData(imageData, channel.dx, channel.dy);
}

function applyRedFilter(ctx, w, h, intensity) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * (1 + intensity * 0.5));
        data[i + 1] *= (1 - intensity * 0.3);
        data[i + 2] *= (1 - intensity * 0.4);
    }

    ctx.putImageData(imageData, 0, 0);
}

// ─── DRAW FRAME ────────────────────────────────────────────────
function drawFrame(ctx, img, w, h, progress) {
    // Pure black background
    ctx.fillStyle = "#000000ff";
    ctx.fillRect(0, 0, w, h);

    if (!img) return;

    const eased = easeInOut(progress);
    const scale = FRAME_START_SCALE + (eased * (FRAME_END_SCALE - FRAME_START_SCALE));
    const size = Math.min(w, h) * scale;
    const x = Math.round((w - size) / 2);
    const y = Math.round((h - size) / 2);

    // Fade
    const alpha = FRAME_FADE_START + (eased * (FRAME_FADE_END - FRAME_FADE_START));
    ctx.globalAlpha = Math.min(alpha, 1);

    // Draw image with subtle red glow
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 40;
    ctx.drawImage(img, x, y, size, size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Apply scary effects towards the end
    if (progress > 0.5) {
        const horrorIntensity = (progress - 0.5) * 1.5;
        // Glitch
        if (Math.random() < 0.15 + horrorIntensity * 0.15) {
            applyGlitch(ctx, w, h, 0.4);
        }
        // Red filter
        if (progress > 0.7) {
            applyRedFilter(ctx, w, h, (progress - 0.7) * 0.6);
        }
    }
}

// ─── MAIN ENTRY ─────────────────────────────────────────────────
export function maybeShowIntroPlaceholders({ onComplete } = {}) {
    if (!DEBUG_START_INTRO_ANIMATION) {
        onComplete?.();
        return;
    }

    // Inject styles and overlays ONCE
    if (!document.querySelector("#intro-styles-injected")) {
        const marker = document.createElement("meta");
        marker.id = "intro-styles-injected";
        document.head.appendChild(marker);
        injectStyles();
        injectStaticOverlay();
        injectLoadingText();
    }

    const canvas = getCanvas();
    if (!canvas) {
        onComplete?.();
        return;
    }


    const ctx = canvas.getContext("2d");
    const { w, h } = setupFullscreenCanvas(canvas);

    // Ensure drawing uses CSS-pixel coordinates even though the backing store is DPR-scaled.
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    preloadImages(FRAME_SOURCES).then((imgs) => {
        const startTime = performance.now();

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / INTRO_DURATION, 1);

            const frameIndex = Math.min(
                FRAME_SOURCES.length - 1,
                Math.floor(progress * FRAME_SOURCES.length)
            );

            const img = imgs[frameIndex];
            drawFrame(ctx, img, w, h, progress);

            if (elapsed < INTRO_DURATION) {
                requestAnimationFrame(animate);
            } else {
                // Flicker out
                let flickerCount = 0;
                const flickerOut = () => {
                    ctx.fillStyle = "#0a0a0a";
                    ctx.fillRect(0, 0, w, h);
                    flickerCount++;
                    if (flickerCount < 6) {
                        setTimeout(flickerOut, 80 + Math.random() * 60);
                    } else {
                        ctx.clearRect(0, 0, w, h);
                        // Remove overlays
                        document.querySelectorAll(".intro-static, .intro-loading").forEach(el => el.remove());
                        onComplete?.();
                    }
                };
                flickerOut();
            }
        }

        requestAnimationFrame(animate);
    });
}

// ─── AUTO-RUN ───────────────────────────────────────────────────
export function runIntroPlaceholderAutorun() {
    if (!RUN_INTRO_ON_START || hasRun) return Promise.resolve();
    if (!introActive) return Promise.resolve();

    hasRun = true;
    return new Promise((resolve) => {
        maybeShowIntroPlaceholders({
            onComplete: () => {
                setIntroActive(false);
                // Redirect to main_game.html (main game) - in Tauri, use relative path
                window.location.href = "main_game.html";
                resolve();
            }
        });
    });
}

export function tryAutorunIntroPlaceholder() {
    return runIntroPlaceholderAutorun();
}

// ─── AUTO-START ────────────────────────────────────────────────
if (RUN_INTRO_ON_START && typeof window !== 'undefined') {
    requestAnimationFrame(() => {
        runIntroPlaceholderAutorun();
    });
}

// ─── BUNNY FAREWELL ────────────────────────────────────────────
/*
   (\_/)
   (♥_♥)
   (")_(")
   *scary bunny out*
*/