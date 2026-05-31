package com.bunbit.render;

import org.teavm.jso.JSExport;
import org.teavm.jso.typedarrays.Float64Array;
import org.teavm.jso.typedarrays.Int32Array;

// No @Export annotation — that's for the Wasm-C backend, not wasmGC.
// For wasmGC: this class IS the mainClass in build.gradle.
// TeaVM exports all @JSExport static methods from the mainClass automatically.
public class RaycastMathKernel {

    private static final int SIN_TABLE_SIZE = 1024;
    private static final int FIXED_POINT_SHIFT = 16;
    private static final int SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
    private static final int ANGLE_SCALE = (int) ((SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (2.0 * Math.PI));

    private static final float[] SIN_TABLE = new float[SIN_TABLE_SIZE];
    private static final float[] COS_TABLE = new float[SIN_TABLE_SIZE];

    static {
        for (int i = 0; i < SIN_TABLE_SIZE; i++) {
            double a = (i * 2.0 * Math.PI) / SIN_TABLE_SIZE;
            SIN_TABLE[i] = (float) Math.sin(a);
            COS_TABLE[i] = (float) Math.cos(a);
        }
    }

    @JSExport
    public static int clampInt(int v, int lo, int hi) {
        if (v < lo)
            return lo;
        if (v > hi)
            return hi;
        return v;
    }

    @JSExport
    public static double fastSin(double x) {
        int idx = ((int) (x * ANGLE_SCALE) >>> FIXED_POINT_SHIFT) & SIN_TABLE_MASK;
        return SIN_TABLE[idx];
    }

    @JSExport
    public static double fastCos(double x) {
        int idx = ((int) (x * ANGLE_SCALE) >>> FIXED_POINT_SHIFT) & SIN_TABLE_MASK;
        return COS_TABLE[idx];
    }

    @JSExport
    public static double rayAngle(double playerAngle, double playerFov, int rayIndex, int rayCount) {
        if (rayCount <= 0)
            return playerAngle;
        return playerAngle + (-playerFov / 2.0 + ((double) rayIndex / rayCount) * playerFov);
    }

    @JSExport
    public static double clampInt_asDouble(double v, double lo, double hi) {
        return clampInt((int) v, (int) lo, (int) hi);
    }

    @JSExport
    public static void raycastColumnsBatch(
            double posX, double posZ, double playerAngle, double playerFov,
            int rayStart, int rayEnd, int rayCount,
            int tileSize,
            int mapW, int mapH,
            Int32Array tileGrid,
            int maxRayDepth,
            Float64Array outDistance,
            Int32Array outHit,
            Int32Array outSide,
            Int32Array outMapX,
            Int32Array outMapY) {
        int n = rayEnd - rayStart;
        for (int i = 0; i < n; i++) {
            int rayIndex = rayStart + i;
            double a = playerAngle + (-playerFov / 2.0 + ((double) rayIndex / rayCount) * playerFov);

            double cosA = Math.cos(a);
            double sinA = Math.sin(a);

            int cellX = (int) Math.floor(posX / tileSize);
            int cellY = (int) Math.floor(posZ / tileSize);

            double distX = (cosA != 0)
                    ? ((cosA > 0 ? cellX + 1 : cellX) * tileSize - posX) / cosA
                    : Double.POSITIVE_INFINITY;

            double distY = (sinA != 0)
                    ? ((sinA > 0 ? cellY + 1 : cellY) * tileSize - posZ) / sinA
                    : Double.POSITIVE_INFINITY;

            double deltaX = Math.abs(tileSize / cosA);
            double deltaY = Math.abs(tileSize / sinA);

            int steps = 0;
            boolean hit = false;
            int side = 0;
            double distance = 0;

            while (steps++ < maxRayDepth * 2 && !hit) {
                if (distX < distY) {
                    distance = distX;
                    cellX += (cosA > 0 ? 1 : -1);
                    distX += deltaX;
                    side = 1; // y-side
                } else {
                    distance = distY;
                    cellY += (sinA > 0 ? 1 : -1);
                    distY += deltaY;
                    side = 0; // x-side
                }

                if (cellX < 0 || cellY < 0 || cellX >= mapW || cellY >= mapH)
                    break;

                if (tileGrid.get(cellY * mapW + cellX) == 1)
                    hit = true;
            }

            if (hit) {
                double angleDiff = a - playerAngle;
                double corrected = distance / Math.sqrt(1.0 + angleDiff * angleDiff);
                outHit.set(i, 1);
                outDistance.set(i, corrected);
                outSide.set(i, side);
                outMapX.set(i, cellX);
                outMapY.set(i, cellY);
            } else {
                outHit.set(i, 0);
                outDistance.set(i, 0.0);
                outSide.set(i, 0);
                outMapX.set(i, -1);
                outMapY.set(i, -1);
            }
        }
    }
}