// ============================================================
// DISPLAY SCALING LAYER
// ============================================================
// The single global system that separates LOGICAL coordinates
// from DISPLAY coordinates.
//
//   LOGICAL SPACE  →  always 800x800 (GAME_WIDTH x GAME_HEIGHT)
//   DISPLAY SPACE  →  browser viewport / fullscreen size
//
// The canvas backing store is always GAME_WIDTH x GAME_HEIGHT.
// On resize/fullscreen, this module:
//   1. Computes a uniform scale fit that maintains aspect ratio.
//   2. Centres the canvas (letterboxing / pillarboxing).
//   3. Applies the sizing as CSS width/height and a CSS transform.
//
// No game entities, menu items, animations, or dashboard elements
// are allowed to read window.innerWidth/innerHeight/vw/vh. They all
// live in the 800x800 logical world. Only this module writes the
// display coordinates.
// ============================================================

import { GAME_WIDTH, GAME_HEIGHT, AUTO_FULLSCREEN } from '../globals.js';

// ─── Module state ────────────────────────────────────────────
let rafId = null;
let lastViewportW = 0;
let lastViewportH = 0;

/** @type {HTMLElement|null} The game canvas being scaled. */
export const display = {
    /** @type {number} Current uniform display scale (viewport fits 800x800). */
    scale: 1,

    /** @type {number} Letterbox horizontal offset in px. */
    offsetX: 0,

    /** @type {number} Letterbox vertical offset in px. */
    offsetY: 0,

    /** @type {number} Last viewport width used for scaling. */
    viewportW: 0,

    /** @type {number} Last viewport height used for scaling. */
    viewportH: 0,

    /** @type {boolean} Whether we are currently in fullscreen. */
    isFullscreen: false,

    /** @type {HTMLElement|null} Cached canvas element. */
    canvas: null,

    // ─── Public API ──────────────────────────────────

    /**
     * Recomputes the display scale for the current viewport and applies it.
     * Safe to call on every 'resize' / 'fullscreenchange' event; it debounces
     * the actual DOM write via requestAnimationFrame.
     */
    applyDisplayScale() {
        if (typeof document === 'undefined') return;
        const canvas = this.getCanvas();
        if (!canvas) return;

        const viewportW = typeof window !== 'undefined'
            ? window.innerWidth || document.documentElement.clientWidth || 800
            : 800;
        const viewportH = typeof window !== 'undefined'
            ? window.innerHeight || document.documentElement.clientHeight || 800
            : 800;

        // Skip redundant re-layouts (e.g. sub-pixel resize noise).
        if (viewportW === lastViewportW && viewportH === lastViewportH && viewportW !== 0) {
            return;
        }
        lastViewportW = viewportW;
        lastViewportH = viewportH;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            rafId = null;
            this._apply(canvas, viewportW, viewportH);
        });
    },

    /**
     * Returns a fresh reference to the scaled canvas (cached).
     * @returns {HTMLElement|null}
     */
    getCanvas() {
        if (typeof document === 'undefined') return null;
        if (this.canvas && this.canvas.isConnected) return this.canvas;
        this.canvas = document.getElementById('mainGameRender');
        return this.canvas;
    },

    /**
     * Maps a screen coordinate (clientX/clientY) into the 800x800 logical
     * game coordinate space, accounting for uniform scale + centering.
     * @param {number} clientX - Viewport X.
     * @param {number} clientY - Viewport Y.
     * @returns {{x: number, y: number}} Logical game coordinates.
     */
    toLogical(clientX, clientY) {
        const canvas = this.getCanvas();
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        return {
            x: (localX / (rect.width || 1)) * GAME_WIDTH,
            y: (localY / (rect.height || 1)) * GAME_HEIGHT,
        };
    },

    // ─── Internal ─────────────────────────────────────

    /**
     * Applies the computed scale/offset to the canvas. Never changes the
     * canvas backing store (which stays GAME_WIDTH x GAME_HEIGHT).
     * @param {HTMLElement} canvas - The canvas element.
     * @param {number} viewportW - Available viewport width.
     * @param {number} viewportH - Available viewport height.
     * @private
     */
    _apply(canvas, viewportW, viewportH) {
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.min(viewportW / GAME_WIDTH, viewportH / GAME_HEIGHT);

        // Use devicePixelRatio for sharp rendering on high-DPI displays.
        // The backing store is larger, but all game code still draws in
        // the 800x800 logical coordinate space via the context scale.
        const backingW = Math.round(GAME_WIDTH * dpr);
        const backingH = Math.round(GAME_HEIGHT * dpr);
        if (canvas.width !== backingW) canvas.width = backingW;
        if (canvas.height !== backingH) canvas.height = backingH;

        const displayW = Math.round(GAME_WIDTH * scale);
        const displayH = Math.round(GAME_HEIGHT * scale);

        const offsetX = Math.round((viewportW - displayW) / 2);
        const offsetY = Math.round((viewportH - displayH) / 2);

        // Scale the context so all existing 800x800 drawing code works unchanged.
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;
        }

        // Store for other systems (intro / dashboard overlay alignment).
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.viewportW = viewportW;
        this.viewportH = viewportH;
        this.isFullscreen = typeof document !== 'undefined' && !!document.fullscreenElement;

        // Use CSS size + transform so the canvas draws its buffer
        // crisply scaled (image-rendering: pixelated) and centred.
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.right = 'auto';
        canvas.style.bottom = 'auto';
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
        canvas.style.maxWidth = 'none';
        canvas.style.maxHeight = 'none';
        canvas.style.aspectRatio = 'auto';
        canvas.style.objectFit = 'contain';
        canvas.style.padding = '0';
        canvas.style.margin = '0';
        canvas.style.border = 'none';
        canvas.style.boxShadow = 'none';
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        canvas.style.transformOrigin = 'top left';
        canvas.style.zIndex = '1';
        // Ensure crisp pixelated scaling when the canvas is visually resized
        canvas.style.imageRendering = 'pixelated';
        canvas.style.imageRendering = '-moz-crisp-edges';
        canvas.style.imageRendering = 'crisp-edges';

        // Broadcast so UI overlays (dashboard, intro, etc.) can read scale.
        if (typeof window !== 'undefined') {
            window.__bunbitDisplay = this;
            try {
                window.dispatchEvent(new CustomEvent('bunbit:displayScale', {
                    detail: { scale, offsetX, offsetY, viewportW, viewportH, isFullscreen: this.isFullscreen },
                }));
            } catch (_) { /* event bus failure is non-fatal */ }
        }
    },

    /**
     * Requests browser fullscreen for the whole page. The canvas still keeps
     * its 800x800 logical resolution; only the display scaling re-fits.
     */
    requestFullscreen() {
        if (typeof document === 'undefined') return;
        if (document.fullscreenElement) return;

        const el = document.documentElement;
        const req = (el && el.requestFullscreen) ? el.requestFullscreen.bind(el)
            : (el && el.webkitRequestFullscreen) ? el.webkitRequestFullscreen.bind(el)
                : null;
        if (req) {
            try { req(); } catch (_) { /* user gesture may be required */ }
        }
    },

    /**
     * Exits fullscreen.
     */
    exitFullscreen() {
        if (typeof document !== 'undefined' && document.exitFullscreen) {
            try { document.exitFullscreen(); } catch (_) { }
        }
    }
};

// ─── Auto-request fullscreen (guarded by AUTO_FULLSCREEN) ────
function maybeAutoFullscreen() {
    if (!AUTO_FULLSCREEN) return;
    display.requestFullscreen();
}

// ─── Wire up resize + fullscreen listeners ───────────────────
if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => display.applyDisplayScale());
    document.addEventListener('fullscreenchange', () => {
        display.applyDisplayScale();
        // Small delay so the layout settles in fullscreen.
        setTimeout(() => display.applyDisplayScale(), 50);
    });
    document.addEventListener('webkitfullscreenchange', () => display.applyDisplayScale());

    // Expose for cross-module access (globals.js calls applyDisplayScale via __bunbitDisplay).
    window.__bunbitDisplay = display;

    // Apply the initial scale once the DOM is ready.
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            display.applyDisplayScale();
            maybeAutoFullscreen();
        });
    } else {
        display.applyDisplayScale();
        maybeAutoFullscreen();
    }
}

export default display;

