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

// Debug helper
const DEBUG_PREFIX = '[DEBUG]';
function debugLog(...args) {
    if (window.DEBUG_TAURI) {
        console.log(DEBUG_PREFIX, ...args);
    }
}

debugLog('renderhelpers.js loaded', { isTauri, WASM_BASE, RUNTIME_URL, WASM_URL });

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
            debugLog('loadScript failed', { error: error.message, stack: error.stack });
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
            debugLog('Script load failed', { src, error: e });
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
        debugLog('WASM loading started');

        if (!("WebAssembly" in window)) {
            debugLog('WebAssembly not available in this runtime');
            throw new Error("WebAssembly is not available in this runtime");
        }

        debugLog('Loading WASM runtime script', { url: RUNTIME_URL });
        await loadScript(RUNTIME_URL);

        if (!window.TeaVM || !window.TeaVM.wasmGC) {
            debugLog('TeaVM WasmGC runtime not initialized', {
                hasTeaVM: !!window.TeaVM,
                hasWasmGC: !!(window.TeaVM?.wasmGC)
            });
            throw new Error("TeaVM WasmGC runtime did not initialize");
        }

        debugLog('TeaVM WasmGC runtime initialized, loading WASM binary', { url: WASM_URL });
        const wasmBytes = await loadWasmBytes(WASM_URL);

        debugLog('Loading WASM module with TeaVM');
        const teavm = await window.TeaVM.wasmGC.load(wasmBytes, {
            stackDeobfuscator: { enabled: false }
        });

        const exports = teavm.exports;
        debugLog('WASM module loaded successfully', {
            exports: Object.keys(exports || {}),
            hasRayAngle: typeof exports?.rayAngle === 'function',
            hasClampInt: typeof exports?.clampInt === 'function'
        });

        return exports;
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
