// Tauri uses asset: protocol for local files, fallback to relative path for dev
const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
// In Tauri, use the asset protocol; in dev, use relative path
const WASM_BASE = isTauri
    ? "asset:///wasm/generated/wasm-gc"
    : "/src/wasm/generated/wasm-gc";
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

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-wasm-runtime="${src}"]`);
        if (existing) {
            resolve();
            return;
        }

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
    if (isTauri) {
        await initTauriHttp();
        if (tauriHttp) {
            const response = await tauriHttp.fetch(url, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
            }
            return await response.arrayBuffer();
        }
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
