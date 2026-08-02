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
    setIntroActive,
    GAME_WIDTH,
    GAME_HEIGHT
} from "../globals.js";

// ─── CSS INJECTION ─────────────────────────────────────────────
// This injects all styles directly into the document head
// so you don't need a separate CSS file for the intro.

const injectStyles = () => {
    const style = document.createElement("style");
    style.id = "bunbit-intro-styles";
    style.textContent = `
        /* ─── BASE RESET ─── */
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000000;
            font-family: 'Courier New', monospace;
        }

/* ─── CANVAS ─── */
        #mainGameRender {
            display: block;

            /* Pure black background — no glow, no scanlines, no vignette.
               The canvas runs in 800x800 LOGICAL space. The global display
               layer (rendering/display.js) sets its CSS size + transform to
               fit the viewport with uniform scale + letterboxing. Never
               stretch to 100vw/100vh — that would distort the square buffer. */
            background: #000000;
            image-rendering: pixelated;
        }

        /* ─── LOADING TEXT ─── */
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
        }

        @keyframes loadingBlink {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.1; }
        }

        /* ─── PURE BLACK OVERRIDE DURING INTRO ───────────
           The theme manager injects a background-color !important rule on
           html/body which would tint the page behind the intro (e.g. evil
           red-black). This attribute-scoped rule has higher specificity and
           forces pure black for the entire intro, defeating the theme. */
        html[data-bunbit-intro], html[data-bunbit-intro] body {
            background: #000000 !important;
        }
    `;
    document.head.appendChild(style);
};

// ─── INJECT STATIC OVERLAY ────────────────────────────────────
// (removed — intro is pure black + demon frames, no overlays)

const injectLoadingText = () => {
    const div = document.createElement("div");
    div.className = "intro-loading";
    div.textContent = "⏣ system awakening...";
    document.body.appendChild(div);
};

// ─── CONSTANTS ─────────────────────────────────────────────────
const INTRO_DURATION = 5200; // ms

// The intro runs in the SAME 800x800 logical world as the game.
// Demons keep their original size/position in this space; the
// global display layer (rendering/display.js) scales them visually.
const INTRO_W = GAME_WIDTH;   // 800
const INTRO_H = GAME_HEIGHT;  // 800

// Demon size is defined in LOGICAL units (relative to 800x800),
// not in viewport pixels. Changing the window/fullscreen never
// recalculates these from window dimensions.
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

function setupLogicalCanvas(canvas) {
    // The intro uses the SAME 800x800 logical space as the game.
    // We never read window.innerWidth/innerHeight here — the backing
    // store stays GAME_WIDTH x GAME_HEIGHT and the display layer
    // scales it visually.
    canvas.width = INTRO_W;
    canvas.height = INTRO_H;
    // Ask the global display layer to re-fit the canvas to the viewport
    // (uniform scale, centered, letterboxed). The demons are drawn in
    // logical coordinates; the display layer handles all visual scaling.
    // If the display layer is unavailable, center + scale manually so the
    // intro is never stuck in the top-left corner.
    const display = typeof window !== 'undefined' ? window.__bunbitDisplay : null;
    if (display && typeof display.applyDisplayScale === 'function') {
        display.applyDisplayScale();
    } else {
        centerCanvasManually(canvas);
    }

    return { w: INTRO_W, h: INTRO_H };
}

/**
 * Fallback: centers + uniform-scales the 800x800 intro canvas when the
 * global display layer is unavailable, so the demons appear centred in the
 * viewport (letterboxed) instead of being offset to the top-left.
 */
function centerCanvasManually(canvas) {
    const viewportW = typeof window !== 'undefined' ? (window.innerWidth || INTRO_W) : INTRO_W;
    const viewportH = typeof window !== 'undefined' ? (window.innerHeight || INTRO_H) : INTRO_H;
    const scale = Math.min(viewportW / INTRO_W, viewportH / INTRO_H);
    const dispW = Math.round(INTRO_W * scale);
    const dispH = Math.round(INTRO_H * scale);
    const offsetX = Math.round((viewportW - dispW) / 2);
    const offsetY = Math.round((viewportH - dispH) / 2);

    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    canvas.style.aspectRatio = 'auto';
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    canvas.style.transformOrigin = 'top left';
    canvas.style.zIndex = '1';
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
    // Pure black background (in 800x800 LOGICAL coordinates)
    ctx.fillStyle = "#000000ff";
    ctx.fillRect(0, 0, w, h);

    if (!img) return;

    const eased = easeInOut(progress);
    const scale = FRAME_START_SCALE + (eased * (FRAME_END_SCALE - FRAME_START_SCALE));

    // The demon is CENTERED in the 800x800 logical world. Its size and
    // position are relative to GAME_WIDTH/GAME_HEIGHT — never to the
    // viewport — so resizing/fullscreen does not move or rescale it.
    const base = Math.min(w, h); // w === h === 800 (square logical space)
    const size = base * scale;
    const x = Math.round((w - size) / 2);
    const y = Math.round((h - size) / 2);

    // Fade
    const alpha = FRAME_FADE_START + (eased * (FRAME_FADE_END - FRAME_FADE_START));
    ctx.globalAlpha = Math.min(alpha, 1);

    // Draw image — no glow, no shadow, just raw demon frame
    ctx.drawImage(img, x, y, size, size);
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
        injectLoadingText();
    }

    // Force a pure black backdrop for the entire intro — the theme manager
    // may otherwise tint the page (e.g. evil red-black) around the canvas.
    if (typeof document !== 'undefined') {
        document.documentElement.style.backgroundColor = '#000000';
        document.body.style.backgroundColor = '#000000';
        // Activate the attribute-scoped !important rule injected by injectStyles().
        // This defeats the theme manager's html/body !important background.
        document.documentElement.setAttribute('data-bunbit-intro', '');
    }

    // Re-center the intro canvas whenever the viewport changes, so it never
    // gets stuck offset in a small/resized window. The display layer already
    // listens to resize; this guards the manual fallback too.
    if (typeof window !== 'undefined') {
        const onResize = () => {
            const c = getCanvas();
            if (!c) return;
            const display = window.__bunbitDisplay;
            if (display && typeof display.applyDisplayScale === 'function') {
                display.applyDisplayScale();
            } else {
                centerCanvasManually(c);
            }
        };
        window.addEventListener('resize', onResize);
    }

    const canvas = getCanvas();
    if (!canvas) {
        onComplete?.();
        return;
    }


    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { w, h } = setupLogicalCanvas(canvas);

    // The canvas is exactly GAME_WIDTH x GAME_HEIGHT (800x800).
    // Ensure the identity transform so we draw in logical coordinates.
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
                    ctx.fillStyle = "#000000";
                    ctx.fillRect(0, 0, w, h);
                    flickerCount++;
                    if (flickerCount < 6) {
                        setTimeout(flickerOut, 80 + Math.random() * 60);
                    } else {
                        ctx.clearRect(0, 0, w, h);
                        // Remove overlays
                        document.querySelectorAll(".intro-loading").forEach(el => el.remove());
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
                // Let the engine state machine handle the transition to DASHBOARD.
                // The engine controller will manage the next screen.
                if (typeof window !== 'undefined' && window.engineController) {
                    window.engineController.transitionTo('DASHBOARD');
                } else {
                    // Fallback: redirect to main_game.html if engine controller is not available
                    window.location.href = "main_game.html";
                }
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