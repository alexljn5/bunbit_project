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

// Initialize Tauri HTTP API
async function initTauriHttp() {
    if (isTauri && !tauriHttp) {
        const http = await import('@tauri-apps/api/http');
        tauriHttp = http;
    }
}

async function loadScript(src) {
    // Check if script already loaded
    const existing = document.querySelector(`script[data-wasm-runtime="${src}"]`);
    if (existing) {
        return;
    }

    // For asset:// protocol, fetch and eval instead of using script tag
    if (src.startsWith("asset://")) {
        try {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${src}: ${response.status}`);
            }
            const scriptText = await response.text();
            // Create a script element to execute the code
            const script = document.createElement("script");
            script.textContent = scriptText;
            script.dataset.wasmRuntime = src;
            document.head.appendChild(script);
        } catch (error) {
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
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

// Load WASM using Tauri API if available
async function loadWasmBytes(url) {
    if (isTauri && url.startsWith("asset://")) {
        // Use Tauri's http plugin to fetch asset:// URLs
        const http = await import('@tauri-apps/api/http');
        const response = await http.fetch(url, { method: 'GET' });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return await response.arrayBuffer();
    }
    // Fallback to standard fetch
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return await response.arrayBuffer();
}

export async function loadRenderHelpersWasm() {
    if (helpersPromise) return helpersPromise;

    helpersPromise = (async () => {
        if (!("WebAssembly" in window)) {
            throw new Error("WebAssembly is not available in this runtime");
        }

        await loadScript(RUNTIME_URL);
        if (!window.TeaVM || !window.TeaVM.wasmGC) {
            throw new Error("TeaVM WasmGC runtime did not initialize");
        }

        const wasmBytes = await loadWasmBytes(WASM_URL);
        const teavm = await window.TeaVM.wasmGC.load(wasmBytes, {
            stackDeobfuscator: { enabled: false }
        });
        return teavm.exports;
    })();

    return helpersPromise;
}

export async function tryLoadRenderHelpersWasm() {
    try {
        return await loadRenderHelpersWasm();
    } catch (error) {
        console.warn("[WASM] RenderHelpers unavailable; using JS fallback.", error.message);
        helpersPromise = null;
        return null;
    }
}
