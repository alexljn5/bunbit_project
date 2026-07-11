// Tauri uses asset: protocol for local files, fallback to relative path for dev
// In Tauri v2, check for __TAURI__ or use a more robust check
const isTauri = typeof window !== 'undefined' && (window.__TAURI__ !== undefined || window.location.protocol === 'tauri:');
// In Tauri, use the asset protocol; in dev, use relative path
// renderhelpers.js is in src/wasm/, WASM files are in src/wasm/generated/wasm-gc/
// Use absolute path for dev mode to work correctly with the dev server
// Dev server URL base is not guaranteed to serve the project from /src/*.
// Resolve relative to this module file so it works regardless of the dev-server root.
const wasmBaseUrl = new URL("./generated/wasm-gc/", import.meta.url);
const WASM_BASE_DEV = wasmBaseUrl.toString();

const WASM_BASE = isTauri
    ? "asset:///wasm/generated/wasm-gc"
    : WASM_BASE_DEV;

const RUNTIME_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm-runtime.js`;
const WASM_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm`;

let helpersPromise = null;
let tauriHttp = null;

// Debug state tracking
let wasmLoadState = 'uninitialized';
let wasmExportsAvailable = false;
let lastError = null;

// Consolidated debug log helper - only logs on state changes
function debugLog(...args) {
    if (typeof window !== 'undefined' && window.DEBUG_WASM) {
        console.log('[WASM]', ...args);
    }
}

// Log WASM loading state changes
function logWasmState(newState, details = {}) {
    if (typeof window !== 'undefined' && window.DEBUG_WASM) {
        console.groupCollapsed(`[WASM] State: ${wasmLoadState} → ${newState}`);
        console.log('Details:', details);
        console.log('WASM URLs:', { RUNTIME_URL, WASM_URL });
        console.log('Environment:', { isTauri, protocol: window.location?.protocol });
        console.groupEnd();
    }
    wasmLoadState = newState;
}

// Log errors (only once per error type)
function logWasmError(error) {
    if (typeof window !== 'undefined' && window.DEBUG_WASM) {
        const errorKey = error?.message || 'unknown';
        if (lastError !== errorKey) {
            console.groupCollapsed(`[WASM] Error: ${errorKey}`);
            console.error(error);
            console.groupEnd();
            lastError = errorKey;
        }
    }
}

// Initialize Tauri HTTP API
async function initTauriHttp() {
    if (isTauri && !tauriHttp) {
        const http = await import('@tauri-apps/api/http');
        tauriHttp = http;
    }
}

async function loadScript(src) {
    debugLog('loadScript called', { src });

    // Check if script already loaded
    const existing = document.querySelector(`script[data-wasm-runtime="${src}"]`);
    if (existing) {
        debugLog('Script already loaded, skipping');
        return;
    }

    // For asset:// protocol, fetch and eval instead of using script tag
    if (src.startsWith("asset://")) {
        try {
            debugLog('Fetching script via asset:// protocol');
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${src}: ${response.status}`);
            }
            const scriptText = await response.text();
            debugLog('Script fetched, length:', scriptText.length);
            // Create a script element to execute the code
            const script = document.createElement("script");
            script.textContent = scriptText;
            script.dataset.wasmRuntime = src;
            document.head.appendChild(script);
            debugLog('Script executed');
        } catch (error) {
            logWasmError(error);
            throw new Error(`Failed to load ${src}: ${error.message}`);
        }
        return;
    }

    // Standard script loading for non-asset URLs
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.wasmRuntime = src;
        script.onload = () => {
            debugLog('Script loaded successfully', { src });
            resolve();
        };
        script.onerror = (e) => {
            logWasmError(new Error(`Failed to load ${src}`));
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
    });
}

// Load WASM using Tauri API if available
async function loadWasmBytes(url) {
    debugLog('loadWasmBytes called', { url });

    if (isTauri && url.startsWith("asset://")) {
        // Use Tauri's http plugin to fetch asset:// URLs
        debugLog('Using Tauri HTTP plugin for asset:// URL');
        const http = await import('@tauri-apps/api/http');
        const response = await http.fetch(url, { method: 'GET' });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        debugLog('WASM bytes fetched via Tauri HTTP', { byteLength: response.data?.byteLength });
        return await response.arrayBuffer();
    }
    // Fallback to standard fetch
    debugLog('Using standard fetch for WASM');
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    debugLog('WASM bytes fetched', { byteLength: buffer.byteLength });
    return buffer;
}

export async function loadRenderHelpersWasm() {
    debugLog('loadRenderHelpersWasm called');

    if (helpersPromise) {
        debugLog('Returning existing helpers promise');
        return helpersPromise;
    }

    helpersPromise = (async () => {

        logWasmState('loading', { step: 'start' });

        if (!("WebAssembly" in window)) {
            logWasmState('failed', { reason: 'WebAssembly not available' });
            return null;
        }

        try {
            debugLog('Loading WASM runtime script', { url: RUNTIME_URL });
            await loadScript(RUNTIME_URL);

            if (!window.TeaVM || !window.TeaVM.wasmGC) {
                logWasmState('failed', {
                    reason: 'TeaVM WasmGC runtime not initialized',
                    hasTeaVM: !!window.TeaVM,
                    hasWasmGC: !!(window.TeaVM?.wasmGC)
                });
                return null;
            }

            logWasmState('loading', { step: 'wasm_binary' });
            debugLog('TeaVM WasmGC runtime initialized, loading WASM binary', { url: WASM_URL });
            const wasmBytes = await loadWasmBytes(WASM_URL);

            debugLog('Loading WASM module with TeaVM');
            const teavm = await window.TeaVM.wasmGC.load(wasmBytes, {
                stackDeobfuscator: { enabled: false }
            });

            const exportsObj = teavm.exports;
            const instanceExports = teavm?.instance?.exports;

            const resolved = instanceExports || exportsObj;

            // Diagnostics: TeaVM sometimes exposes exports via getters; verify actual runtime types.
            if (typeof resolved !== 'undefined' && typeof window !== 'undefined' && window.DEBUG_WASM) {
                try {
                    const fs = instanceExports?.fastSin;
                    const fc = instanceExports?.fastCos;
                    console.log('[WASM] export type probe:', {
                        fromResolved_fastSin: typeof resolved?.fastSin,
                        fromResolved_fastCos: typeof resolved?.fastCos,
                        fromInstance_fastSin: typeof fs,
                        fromInstance_fastCos: typeof fc,
                        instance_fastSin_isFunction: fs instanceof Function,
                        instance_fastCos_isFunction: fc instanceof Function,
                        instance_fastSin_toString: Object.prototype.toString.call(fs),
                        instance_fastCos_toString: Object.prototype.toString.call(fc),
                        instanceExportsKeys: instanceExports ? Object.keys(instanceExports) : [],
                    });
                } catch { }
            }

            // TeaVM may expose some exports as non-`function` objects (wrappers).
            // For gating, only require presence; workers will decide whether they can call them.
            const hasRaycastColumnsBatch = resolved?.raycastColumnsBatch != null;
            const hasRenderHorizonSlice = resolved?.renderHorizonSlice != null;
            const hasFastSin = resolved?.fastSin != null;
            const hasFastCos = resolved?.fastCos != null;



            debugLog('WASM module loaded successfully', {
                teavmExports: Object.keys(exportsObj || {}),
                instanceExports: instanceExports ? Object.keys(instanceExports || {}) : [],
                hasRaycastColumnsBatch,
                hasRenderHorizonSlice,
                hasFastSin,
                hasFastCos
            });

            // TeaVM instance exports are sometimes populated slightly after load() returns.
            // Do a single post-load recheck to avoid returning null too early.
            if (!hasFastSin || !hasFastCos) {
                await new Promise(r => setTimeout(r, 0));
                const reResolved = (teavm?.instance?.exports) || exportsObj;
                const reHasFastSin = typeof reResolved?.fastSin === 'function';
                const reHasFastCos = typeof reResolved?.fastCos === 'function';
                if (reHasFastSin && reHasFastCos) {
                    resolved.fastSin = reResolved.fastSin;
                    resolved.fastCos = reResolved.fastCos;
                    // also refresh other function checks
                    hasRaycastColumnsBatch = typeof reResolved?.raycastColumnsBatch === 'function';
                    hasRenderHorizonSlice = typeof reResolved?.renderHorizonSlice === 'function';
                    // update local flags
                }
            }

            wasmExportsAvailable = resolved?.fastSin != null && resolved?.fastCos != null;
            const ok = wasmExportsAvailable;
            logWasmState(ok ? 'ready' : 'failed', {

                hasRaycastColumnsBatch,
                hasRenderHorizonSlice,
                hasFastSin,
                hasFastCos,
                hasRequiredExports: ok
            });

            const result = ok ? resolved : null;
            // If TeaVM/exports validation failed, allow later calls to retry.
            if (!result) {
                helpersPromise = null;
            }
            return result;
        } catch (error) {
            logWasmError(error);
            logWasmState('failed', { error: error?.message || String(error) });
            helpersPromise = null;
            return null;
        }
    })();

    return helpersPromise;
}


export async function tryLoadRenderHelpersWasm() {
    try {
        debugLog('tryLoadRenderHelpersWasm called');
        const result = await loadRenderHelpersWasm();
        debugLog('tryLoadRenderHelpersWasm succeeded', { hasExports: !!result });
        return result;
    } catch (error) {
        debugLog('tryLoadRenderHelpersWasm failed', { error: error.message, stack: error.stack });
        console.warn("[WASM] RenderHelpers unavailable; using JS fallback.", error.message);
        helpersPromise = null;
        return null;
    }
}

// Export debug state for inspection
export function getWasmDebugState() {
    return {
        wasmLoadState,
        wasmExportsAvailable,
        lastError,
        isTauri,
        WASM_BASE,
        RUNTIME_URL,
        WASM_URL
    };
}
