// src/main/java/com/bunbit/render/WasmEntry.java
package com.bunbit.render;

public class WasmEntry {
    public static void main(String[] args) {
        // Reference all exported methods to prevent tree-shaking.
        // These calls never actually execute at runtime — they just
        // keep the symbols alive through the TeaVM DCE pass.
        RaycastMathKernel.clampInt(0, 0, 0);
        RaycastMathKernel.fastSin(0);
        RaycastMathKernel.fastCos(0);
        RaycastMathKernel.rayAngle(0, 0, 0, 0);
        RaycastMathKernel.clampInt_asDouble(0, 0, 0);
        RaycastMathKernel.raycastColumnsBatch(
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, 0, null, null, null);
    }
}