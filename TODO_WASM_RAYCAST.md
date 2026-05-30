# WASM raycast acceleration TODO

## Goal
Reduce CPU by moving the DDA ray-marching loop out of JS into TeaVM/WASM.

## Step 1 — Define a WASM batch API
- Update `src/rendering/java/src/main/java/com/bunbit/render/RaycastMathKernel.java`
  - Add a new `@JSExport` batch method, e.g. `raycastColumnsBatch(...)`
  - It should compute multiple rays (startRay..endRay) in one call.

## Step 2 — Map + texture representation for WASM
- Decide what data is passed to WASM:
  - flatten map grid to int[] tiles
  - flatten floor/wall texture id maps
  - pass transparency as bitset/int lookup

## Step 3 — Update `src/rendering/renderworkers/raycastworker.js`
- In `self.onmessage` for `type:"frame"`:
  - Remove JS inner loop calling `castRayColumn`
  - Call WASM batch export instead
  - Convert returned results into the existing `{ column, distance, hitSide, textureKey, floorTextureKey, hitX, hitY }` objects.

## Step 4 — WASM readiness + fallback
- Treat WASM as a real state: disabled/loading/ready/fallback/error
- If WASM not ready, use existing JS fallback.

## Step 5 — Measure
- Add a per-worker timing split (DDA vs packaging)
- Compare before/after CPU.

