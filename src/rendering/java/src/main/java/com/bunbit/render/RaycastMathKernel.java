package com.bunbit.render;

import org.teavm.jso.JSExport;
import org.teavm.jso.typedarrays.Float64Array;
import org.teavm.jso.typedarrays.Int32Array;

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

    // ----------------------------
    // JS SAFE MATH EXPORTS
    // ----------------------------

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

    // ----------------------------
    // SAFE ALIAS (IMPORTANT)
    // prevents JS break if TeaVM wraps exports
    // ----------------------------

    @JSExport
    public static double clampInt_asDouble(double v, double lo, double hi) {
        return clampInt((int) v, (int) lo, (int) hi);
    }

    // ----------------------------
    // BATCH RAYCAST
    // ----------------------------

    @JSExport
    public static void raycastColumnsBatch(
            double posX,
            double posZ,
            double playerAngle,
            double playerFov,
            int rayStart,
            int rayEnd,
            int rayCount,
            int tileSize,
            int mapW,
            int mapH,
            Int32Array tileGrid,
            int maxRayDepth,
            Float64Array outDistance,
            Int32Array outHit,
            Int32Array outSide) {

        int n = rayEnd - rayStart;

        for (int i = 0; i < n; i++) {

            int rayIndex = rayStart + i;

            double a = playerAngle
                    + (-playerFov / 2.0 + ((double) rayIndex / rayCount) * playerFov);

            double cosA = Math.cos(a);
            double sinA = Math.sin(a);

            double rayX = posX;
            double rayY = posZ;

            int cellX = (int) Math.floor(rayX / tileSize);
            int cellY = (int) Math.floor(rayY / tileSize);

            double distX = (cosA != 0)
                    ? ((cosA > 0 ? cellX + 1 : cellX) * tileSize - rayX) / cosA
                    : Double.POSITIVE_INFINITY;

            double distY = (sinA != 0)
                    ? ((sinA > 0 ? cellY + 1 : cellY) * tileSize - rayY) / sinA
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
                    side = 1;
                } else {
                    distance = distY;
                    cellY += (sinA > 0 ? 1 : -1);
                    distY += deltaY;
                    side = 0;
                }

                if (cellX < 0 || cellY < 0 || cellX >= mapW || cellY >= mapH) {
                    break;
                }

                int tile = tileGrid.get(cellY * mapW + cellX);
                if (tile == 1)
                    hit = true;
            }

            if (hit) {
                double corrected = distance / Math.sqrt(1.0 + (a - playerAngle) * (a - playerAngle));

                outHit.set(i, 1);
                outDistance.set(i, corrected);
                outSide.set(i, side);
            } else {
                outHit.set(i, 0);
                outDistance.set(i, 0);
                outSide.set(i, 0);
            }
        }
    }
}