import { fastSin } from "../math/mathtables.js";
import { tryLoadRenderHelpersWasm } from "./renderhelpers.js";

export async function smokeTestRenderHelpersWasm() {
    const helpers = await tryLoadRenderHelpersWasm();
    if (!helpers) return false;

    const angle = 1.2;
    const jsSin = fastSin(angle);
    const wasmSin = helpers.fastSin(angle);
    console.log("[WASM] RenderHelpers loaded", {
        clampInt: helpers.clampInt(15, 0, 10),
        jsSin,
        wasmSin,
        difference: Math.abs(jsSin - wasmSin),
        rayAngle: helpers.rayAngle(0, Math.PI / 6, 150, 300)
    });

    return true;
}

window.smokeTestRenderHelpersWasm = smokeTestRenderHelpersWasm;
