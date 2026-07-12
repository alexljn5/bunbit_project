// Entire renderer with fixed WebGL lighting pipeline (no more black screen)

import { gameLoop } from "../game_loop.js";
import { playerLogic, playerPosition, showDebugTools, gameOver, onRespawn, keys } from "../playerdata/playerlogic.js";
import { drawRespawnMenu } from "../menus/menurespawn.js";
import { playerInventoryGodFunction } from "../playerdata/playerinventory.js";
import { compiledDevTools } from "../debugtools.js";
import { tileSectors } from "../mapdata/maps.js";
import { castRays, numCastRays, playerFOV, maxRayDepth } from "./raycasting.js";
import { drawSprites } from "./sprites/rendersprites.js";
import { mainGameMenu, setupMenuClickHandler } from "../menus/menu.js";
import { texturesLoaded, textureTransparencyMap } from "../mapdata/maptexturesloader.js";
import { textureIdMap, floorTextureIdMap } from "../mapdata/maptexturesids.js";
import { playerUI } from "../playerdata/playerui.js";
import { collissionGodFunction } from "../collissiondetection/collissionlogichandler.js";
import { enemyAiGodFunction, friendlyAiGodFunction } from "../ai/aihandler.js";
import { menuActive, setMenuActive, isPaused, setPaused } from "../gamestate.js";
import { playMusicGodFunction } from "../audio/audiohandler.js";
import { menuHandler } from "../menus/menuhandler.js";
import { itemHandlerGodFunction } from "../itemhandler/itemhandler.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCALE_X, SCALE_Y, REF_CANVAS_WIDTH, REF_CANVAS_HEIGHT, useWasmRayMath } from "../globals.js";
import { eventHandler } from "../events/eventhandler.js";
import { decorationHandlerGodFunction } from "../decorationhandler/decorationhandler.js";
import { mapHandler } from "../mapdata/maphandler.js";
import { consoleHandler } from "../console/consolehandler.js";
import { renderRaycastWalls } from "./renderwalls.js";
import { interactionHandlerGodFunction } from "../interactions/interactionhandler.js";
import { renderRaycastHorizons } from "./renderhorizons.js";
import { soundHandlerGodFunction } from "../audio/soundhandler.js";
import { showTerminal } from "../console/terminal/terminal.js";
import { debugHandlerGodFunction, drawDebugTerminal } from "../debug/debughandler.js";
import { titleHandlerGodFunction } from "../ui/titlehandler.js";
import { initLightingEngine, updateLights, applyLighting, cleanupLightingEngine } from "./lightengine/renderlight.js";
import { tryLoadRenderHelpersWasm } from "../wasm/renderhelpers.js";
import { wdMainEvent, wdMainError } from "../debug/workermaindebug.js";

const DEBUG_FRAME_TIMING = (typeof window !== 'undefined' && window.location)
    ? new URLSearchParams(window.location.search).get("debugFrameTiming") === "true"
    : false;

// Preload textures early so the first map-load has fewer missing assets.
import "../mapdata/maptexturesloader.js";

debugHandlerGodFunction();

// --- DOM Elements ---
const domElements = {
    mainGameRender: document.getElementById("mainGameRender"),
};

export const renderEngine = domElements.mainGameRender.getContext("2d");
renderEngine.imageSmoothingEnabled = false;

// Expose globally to avoid circular dependency issues
window.__renderEngine = renderEngine;
window.__mainGameRender = null; // Will be set after mainGameRender is defined

const offscreenCanvas = document.createElement("canvas");
offscreenCanvas.width = CANVAS_WIDTH;
offscreenCanvas.height = CANVAS_HEIGHT;
const offscreenCtx = offscreenCanvas.getContext("2d");
offscreenCtx.imageSmoothingEnabled = false;

// Separate canvas for WebGL lighting (we attach this only when needed for debugging)
const glCanvas = document.createElement("canvas");
glCanvas.width = CANVAS_WIDTH;
glCanvas.height = CANVAS_HEIGHT;

export let game = null;
let isRenderingFrame = false;
let renderWorkersInitialized = false;
let renderHelpersWasm = null;
let renderHelpersWasmPromise = null;
let renderHelpersWasmStatus = "idle";
let defaultMapLoadWarned = false;

// Debug state for rayData spam prevention
let rayDataInvalidCount = 0;
let lastRayDataValid = true;
const DEBUG_PREFIX = '[DEBUG]';

function debugLog(...args) {
    if (window.DEBUG_TAURI) {
        console.log(DEBUG_PREFIX, ...args);
    }
}

// Tauri-only worker URL
const renderWorkerURL = new URL("./renderworkers/renderengineworker.js", import.meta.url);

debugLog('Creating render workers', { renderWorkerURL: renderWorkerURL.toString() });

const renderWorker1 = new Worker(renderWorkerURL, { type: "module" });
const renderWorker2 = new Worker(renderWorkerURL, { type: "module" });
wdMainEvent('renderengine-worker', 'created 2 workers (module)');
renderWorker1.onerror = (e) => { console.error('[RENDER WORKER 1] error:', e); wdMainError('renderengine-worker-0', e); };
renderWorker2.onerror = (e) => { console.error('[RENDER WORKER 2] error:', e); wdMainError('renderengine-worker-1', e); };


// --- Game Loop Setup ---
export function mainGameRender() {
    game = gameLoop(gameRenderEngine);
}

// Expose globally to avoid circular dependency issues
window.__mainGameRender = mainGameRender;

function renderPauseMenu() {
    renderEngine.save();
    renderEngine.fillStyle = "rgba(0, 0, 0, 0.7)";
    renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderEngine.fillStyle = "#fff";
    renderEngine.font = `${32 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.textAlign = "center";
    renderEngine.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);
    renderEngine.font = `${20 * Math.min(SCALE_X, SCALE_Y)}px Arial`;
    renderEngine.fillText("Press ESC or P to resume", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    renderEngine.fillText("Press M to return to main menu", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    renderEngine.restore();
}

async function initializeRenderHelpersWasm() {
    if (renderHelpersWasmStatus === "ready") {
        return renderHelpersWasm;
    }
    if (renderHelpersWasmStatus === "loading" && renderHelpersWasmPromise) {
        return renderHelpersWasmPromise;
    }

    renderHelpersWasmStatus = "loading";
    window.__renderHelpersWasmStatus = renderHelpersWasmStatus;

    renderHelpersWasmPromise = tryLoadRenderHelpersWasm();
    renderHelpersWasm = await renderHelpersWasmPromise;
    if (renderHelpersWasm) {
        renderHelpersWasmStatus = "ready";
        window.__renderHelpersWasm = renderHelpersWasm;
        // Note: rayAngle is not exported by the WASM module, use JS fallback
        const rayAngleExport = (renderHelpersWasm && typeof renderHelpersWasm.rayAngle === 'function')
            ? renderHelpersWasm.rayAngle(0, playerFOV, Math.floor(numCastRays / 2), numCastRays)
            : undefined;
        console.info("[WASM] RenderHelpers ready", {
            source: "wasm",
            status: renderHelpersWasmStatus,
            clampInt: typeof renderHelpersWasm.clampInt === 'function'
                ? renderHelpersWasm.clampInt(15, 0, 10)
                : undefined,
            rayAngle: rayAngleExport,
            availableExports: renderHelpersWasm ? Object.keys(renderHelpersWasm) : []
        });
    } else {
        renderHelpersWasmStatus = "fallback";
        window.__renderHelpersWasm = null;
        console.info("[WASM] RenderHelpers fallback to JS (WASM unavailable or failed to load)");
    }

    window.__renderHelpersWasmStatus = renderHelpersWasmStatus;
    renderHelpersWasmPromise = null;
    return renderHelpersWasm;
}

export function getRenderHelpersWasm() {
    return renderHelpersWasm;
}

export function getRenderHelpersWasmStatus() {
    return renderHelpersWasmStatus;
}

// --- Render Workers initialization (keeps your behavior) ---
function initializeRenderWorkers() {
    if (renderWorkersInitialized) return;
    // Get the current map for worker initialization
    const currentMap = mapHandler.getFullMap() || [];
    const staticData = {
        type: "init",
        tileSectors,
        CANVAS_HEIGHT,
        CANVAS_WIDTH,
        map_01: currentMap,
        textureIdMap: Object.fromEntries(textureIdMap),
        floorTextureIdMap: Object.fromEntries(floorTextureIdMap),
        numCastRays,
        maxRayDepth,
        useWasmRayMath,
        textureTransparencyMap: textureTransparencyMap
    };
    renderWorker1.postMessage({ ...staticData, workerId: 0 });
    renderWorker2.postMessage({ ...staticData, workerId: 1 });
    renderWorkersInitialized = true;
    // Init lighting here too (ensure GL program exists)
    initLightingEngine();
    initializeRenderHelpersWasm();
}
export function cleanupRenderWorkers() {
    renderWorker1.terminate();
    renderWorker2.terminate();
    renderWorkersInitialized = false;
    cleanupLightingEngine();
}
export { initializeRenderWorkers };

// Expose globally to avoid circular dependency issues
window.__initializeRenderWorkers = initializeRenderWorkers;
window.__initializeRenderHelpersWasm = initializeRenderHelpersWasm;


// --- Main game render loop (mostly unchanged) ---
export async function gameRenderEngine(deltaTime) {
    debugLog('gameRenderEngine START', { deltaTime: deltaTime.toFixed(4) });
    titleHandlerGodFunction();
    drawDebugTerminal();
    if (isRenderingFrame) return;
    isRenderingFrame = true;
    if (DEBUG_FRAME_TIMING) console.time('fullRender');
    try {
        const minScale = Math.min(SCALE_X, SCALE_Y);
        if (menuActive) {
            debugLog('Rendering menu (menuActive=true)');
            mainGameMenu();
            return;
        }
        if (!showTerminal && (keys["Escape"] || keys["p"])) {
            setPaused(!isPaused);
            keys["Escape"] = false;
            keys["p"] = false;
        }
        if (isPaused && keys["m"]) {
            setPaused(false);
            setMenuActive(true);
            keys["m"] = false;
        }
        menuHandler();
        // Gate raycasting until a map is actually active/ready to avoid all-null frames.
        if (!mapHandler.activeMapKey) {
            if (!defaultMapLoadWarned) {
                defaultMapLoadWarned = true;
                console.warn("[Map] No active map, loading map_01");
            }
            await mapHandler.loadMap("map_01", playerPosition);
        }
        if (!mapHandler.activeMapKey) {
            // Map still not ready; render a placeholder and skip raycasting.
            renderEngine.fillStyle = "#333";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            return;
        }

        debugLog('castRays() called');
        const rayData = await castRays();
        debugLog('castRays() returned', {
            rayCount: rayData?.length,
            validCount: rayData?.filter(r => r !== null).length,
            firstRay: rayData?.[0]
        });

        window.__raycastBackendStats = {
            wasm: 0,
            js: 0,
            unknown: 0,
            total: rayData?.length ?? 0
        };

        if (rayData && rayData.length) {
            for (let i = 0; i < rayData.length; i++) {
                const r = rayData[i];

                if (!r) continue;

                if (r.backend === "wasm") window.__raycastBackendStats.wasm++;
                else if (r.backend === "js") window.__raycastBackendStats.js++;
                else window.__raycastBackendStats.unknown++;
            }
            // Raycast backend check spam prevention: log only occasionally
            if (!window.__raycastBackendStatsLastLogFrame) window.__raycastBackendStatsLastLogFrame = -1;
            const f = window.__raycastBackendStatsLastLogFrame;
            const shouldLog = (f < 0) || ((performance.now() % 2000) < 16);
            if (shouldLog) {
                window.__raycastBackendStatsLastLogFrame = performance.now();
                console.log("[Raycast backend check]", window.__raycastBackendStats);
            }
        }

        // Check for invalid rayData - only log once per state change
        const isRayDataValid = rayData && rayData.some(ray => ray !== null);
        if (!isRayDataValid) {
            if (lastRayDataValid) {
                // State changed from valid to invalid
                rayDataInvalidCount = 0;
            }
            rayDataInvalidCount++;
            if (rayDataInvalidCount <= 5 || rayDataInvalidCount % 100 === 0) {
                console.warn(`[RayData] Invalid (all null) frame #${rayDataInvalidCount}`);
            }
            lastRayDataValid = false;

            // Fallback: render a simple colored screen to avoid gray screen
            renderEngine.fillStyle = "#222";
            renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            return;
        }
        lastRayDataValid = true;
        // CPU rendering into offscreen 2D canvas
        offscreenCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        await renderRaycastHorizons(rayData, offscreenCtx);
        renderRaycastWalls(rayData, mapHandler.activeMapKey, offscreenCtx);
        decorationHandlerGodFunction();

        // Lighting pass: update lights and apply
        updateLights();
        applyLighting(rayData, offscreenCanvas, offscreenCtx);
        drawSprites(rayData, offscreenCtx);

        // Draw final offscreen canvas to the visible canvas
        renderEngine.drawImage(offscreenCanvas, 0, 0);

        eventHandler();
        if (showDebugTools) compiledDevTools();
        if (!isPaused) {
            playerLogic();
            playerInventoryGodFunction();
            itemHandlerGodFunction();
            collissionGodFunction();
            friendlyAiGodFunction();
            enemyAiGodFunction();
            interactionHandlerGodFunction();
        }
        playerUI();
        playMusicGodFunction();
        soundHandlerGodFunction();
        consoleHandler();
        if (gameOver) {
            drawRespawnMenu(renderEngine.canvas, onRespawn);
        }
        if (isPaused) {
            renderPauseMenu();
        }
    } catch (error) {
        console.error("gameRenderEngine error:", error);
        renderEngine.fillStyle = "gray";
        renderEngine.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } finally {
        isRenderingFrame = false;
        if (DEBUG_FRAME_TIMING) console.timeEnd('fullRender');
        debugLog('gameRenderEngine END');
    }
}

// --- JS-Only Fallback Raycast (for debugging) ---
// This generates minimal ray data when WASM/workers are broken
export function jsFallbackRaycast() {
    debugLog('jsFallbackRaycast called');
    const rayData = new Array(numCastRays);

    for (let i = 0; i < numCastRays; i++) {
        // Generate a simple wall at a fixed distance
        const distance = 100;
        const angle = (i / numCastRays) * playerFOV - playerFOV / 2;

        rayData[i] = {
            column: i,
            distance: distance,
            hitSide: 'x',
            textureKey: 'wall_creamlol',
            textureX: 0,
            floorTextureKey: 'floor_concrete_01',
            backend: 'js-fallback'
        };
    }

    debugLog('jsFallbackRaycast returning', { rayCount: rayData.length });
    return rayData;
}

// --- Draw Quad helper ---
export function drawQuad({ topX, topY, leftX, leftY, rightX, rightY, color, texture, textureX, alpha = 1.0, ctx }) {
    ctx = ctx || renderEngine;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (texture && textureX !== undefined && texturesLoaded) {
        const destWidth = rightX - leftX;
        const destHeight = rightY - topY;

        ctx.drawImage(
            texture,
            Math.floor(textureX * texture.width), 0, 1, texture.height, // source rect (1px wide strip)
            leftX, topY, destWidth, destHeight              // destination from top-left, no flip!
        );
    } else {
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    ctx.restore();
}
