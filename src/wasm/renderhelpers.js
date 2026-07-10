const WASM_BASE = "/src/wasm/generated/wasm-gc";
const RUNTIME_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm-runtime.js`;
const WASM_URL = `${WASM_BASE}/bunbit-renderhelpers.wasm`;

let helpersPromise = null;

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

        const response = await fetch(WASM_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${WASM_URL}: ${response.status}`);
        }

        const wasmBytes = await response.arrayBuffer();
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
