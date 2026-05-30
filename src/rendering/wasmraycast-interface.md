# WASM Raycast Interface Plan (v1)

## Problem
Current raycast worker uses JS objects per cell: `tile.type`, `tile.textureId`, `tile.floorTextureId`.
TeaVM batch raycast needs numeric arrays.

## Proposed v1 numeric representation
For active map grid:
- Flatten tiles into `tileTypeGrid` as Int32Array (row-major):
  - 0 = empty/non-wall
  - 1 = wall
- Flatten `wallTextureIdGrid` as Int32Array (row-major):
  - textureId for wall tiles, 0 for non-wall
- Flatten `floorTextureIdGrid` as Int32Array (row-major):
  - floorTextureId for non-wall tiles, 0 for wall tiles (or still store)

Also pass:
- mapWidthCells, mapHeightCells (grid dims)
- tileSize (s.tileSize)
- maxRayDepth
- player posX,posZ and angles and fov

## WASM export
Add to `RaycastMathKernel.java`:
- `@JSExport public static void raycastColumnsBatch(
      double posX, double posZ,
      double playerAngle, double playerFov,
      int rayStart, int rayEnd, int numRays,
      int tileSize,
      int mapWidth, int mapHeight,
      int[] tileTypeGrid,
      int[] wallTextureIdGrid,
      int[] floorTextureIdGrid,
      int maxRayDepth,
      int[] outHit, double[] outDistance, int[] outHitSide,
      int[] outWallTexId, int[] outFloorTexId,
      double[] outHitX, double[] outHitY
  )`

TeaVM array passing constraints will decide exact signatures; adjust after PoC.

## Worker integration
- main thread creates flattened arrays once when sending `map_01` into workers
- worker init stores flattened arrays
- on `frame`, call WASM batch for `[startRay,endRay)`
- worker converts numeric textureIds back to existing string keys using `textureIdMap` / `floorTextureIdMap`

## Output mapping
- outHit = 1 if hit else 0
- outHitSide: 0=x, 1=y (or similar)
- outWallTexId: numeric textureId
- outFloorTexId: numeric floor texture id

## Next
Implement PoC export that ignores textures first (distance + hitSide only) to validate DDA correctness.
Then extend to texture ids.

