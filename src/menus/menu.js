import { compiledTextStyle } from "../debugtools.js";
import { menuActive, setMenuActive } from "../gamestate.js";
import { mapTable } from "../mapdata/maps.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { gameVersionNumber, gameName } from "../globals.js";

// ---------- engine ----------
function getRenderEngine() {
    return window.__renderEngine || null;
}

function getPlayerPosition() {
    return window.__playerPosition || { x: 100, z: 100, y: 128, angle: 0 };
}

function getMainGameRender() {
    return window.__mainGameRender || (() => { });
}

function getInitializeRenderWorkers() {
    return window.__initializeRenderWorkers || (() => { });
}

// ---------- state ----------
let buttons = [];
let showMapSelect = false;
let mapButtons = [];
let selectedMapName = null;
let menuHandlersAttached = false;

// ---------- UI LAYOUT ----------
function rebuildButtons(canvas) {
    const w = 100;
    const h = 40;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    buttons = [
        { name: "Play", x: cx - w / 2, y: cy - 200, w, h, hovered: false },
        { name: "Maps", x: cx - w / 2, y: cy - 80, w, h, hovered: false },
        { name: "Exit", x: cx - w / 2, y: cy + 40, w, h, hovered: false }
    ];
}

// ---------- FULLSCREEN SAFE INPUT MAPPING ----------
function screenToCanvas(canvas, e) {
    const rect = canvas.getBoundingClientRect();

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const internalW = canvas.width;
    const internalH = canvas.height;

    const displayAspect = rect.width / rect.height;
    const internalAspect = internalW / internalH;

    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (displayAspect > internalAspect) {
        drawH = rect.height;
        drawW = drawH * internalAspect;
        offsetX = (rect.width - drawW) / 2;
    } else {
        drawW = rect.width;
        drawH = drawW / internalAspect;
        offsetY = (rect.height - drawH) / 2;
    }

    return {
        x: (cx - offsetX) * (internalW / drawW),
        y: (cy - offsetY) * (internalH / drawH)
    };
}

function hit(b, x, y) {
    return x >= b.x && x <= b.x + b.w &&
        y >= b.y && y <= b.y + b.h;
}

// ---------- render ----------
export function mainGameMenu() {
    const engine = getRenderEngine();
    if (!engine?.canvas) return;

    menuBackGround(engine);
    menuText(engine);

    if (showMapSelect) drawMapSelect(engine);
    else drawButtons(engine);
}

function menuBackGround(engine) {
    if (!menuBackGround.img) {
        menuBackGround.img = new Image();
        menuBackGround.img.src = "./img/menu/main-menu.png";
    }

    const canvas = engine.canvas;

    if (menuBackGround.img.complete) {
        engine.drawImage(menuBackGround.img, 0, 0, canvas.width, canvas.height);
    } else {
        engine.fillStyle = "#222";
        engine.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function menuText(engine) {
    const canvas = engine.canvas;

    compiledTextStyle();
    engine.fillStyle = "#fff";
    engine.fillText(gameName, canvas.width - 500, 100);
    engine.fillText(`Version ${gameVersionNumber}`, canvas.width - 490, 150);
}

function drawButtons(engine) {
    for (const b of buttons) {
        engine.fillStyle = b.hovered ? "#555" : "#222";
        engine.fillRect(b.x, b.y, b.w, b.h);

        engine.strokeStyle = "#fff";
        engine.strokeRect(b.x, b.y, b.w, b.h);

        engine.fillStyle = "#fff";
        compiledTextStyle();
        engine.font = "18px Arial";
        engine.fillText(b.name, b.x + 20, b.y + 25);
    }
}

function drawMapSelect(engine) {
    const canvas = engine.canvas;

    engine.save();
    engine.globalAlpha = 0.95;
    engine.fillStyle = "#111";
    engine.fillRect(0, 0, canvas.width, canvas.height);
    engine.globalAlpha = 1;

    engine.fillStyle = "#fff";
    compiledTextStyle();
    engine.fillText("Select a Map", canvas.width / 2 - 80, 100);

    mapButtons = Array.from(mapTable.keys()).map((name, i) => {
        const w = 180;
        const h = 40;

        const x = canvas.width / 2 - w / 2;
        const y = 180 + i * (h + 20);

        engine.fillStyle = selectedMapName === name ? "#444" : "#222";
        engine.fillRect(x, y, w, h);

        engine.strokeStyle = "#fff";
        engine.strokeRect(x, y, w, h);

        engine.fillStyle = "#fff";
        engine.fillText(name, x + 20, y + 25);

        return { name, x, y, w, h };
    });

    engine.restore();
}

// ---------- input ----------
export function setupMenuClickHandler() {
    const engine = getRenderEngine();
    const canvas = engine?.canvas;

    if (!canvas) {
        setTimeout(setupMenuClickHandler, 100);
        return;
    }

    if (menuHandlersAttached) return;
    menuHandlersAttached = true;

    rebuildButtons(canvas);

    canvas.addEventListener("mousemove", (e) => {
        if (!menuActive) return;

        const { x, y } = screenToCanvas(canvas, e);
        const list = showMapSelect ? mapButtons : buttons;

        for (const b of list) {
            b.hovered = hit(b, x, y);
        }
    });

    canvas.addEventListener("click", (e) => {
        if (!menuActive) return;

        e.preventDefault();
        e.stopPropagation();

        const { x, y } = screenToCanvas(canvas, e);

        if (showMapSelect) {
            for (const b of mapButtons) {
                if (!hit(b, x, y)) continue;

                selectedMapName = b.name;

                const p = getPlayerPosition();
                mapHandler.loadMap(selectedMapName, p);
                spriteManager.loadSpritesForMap(selectedMapName);

                setMenuActive(false);
                getMainGameRender()();
                getInitializeRenderWorkers()();

                showMapSelect = false;
                return;
            }

            showMapSelect = false;
            return;
        }

        for (const b of buttons) {
            if (!hit(b, x, y)) continue;

            if (b.name === "Play") {
                const p = getPlayerPosition();
                selectedMapName = "map_01";

                mapHandler.loadMap(selectedMapName, p);
                spriteManager.loadSpritesForMap(selectedMapName);

                setMenuActive(false);
                getMainGameRender()();
                getInitializeRenderWorkers()();
            }

            if (b.name === "Maps") {
                showMapSelect = true;
            }

            if (b.name === "Exit") {
                if (typeof window !== 'undefined') {
                    window.location.href = 'intro.html';
                }
            }

            return;
        }
    });
}

// ---------- resize safety ----------
window.addEventListener("resize", () => {
    const engine = getRenderEngine();
    if (engine?.canvas) {
        rebuildButtons(engine.canvas);
    }
});

// ---------- init ----------
window.addEventListener("DOMContentLoaded", setupMenuClickHandler);