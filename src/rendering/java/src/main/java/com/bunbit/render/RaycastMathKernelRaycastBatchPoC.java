package com.bunbit.render;

import org.teavm.jso.JSExport;

/**
 * PoC PoV: only compute hit/distance/hitSide for a batch of rays.
 *
 * Later: extend outputs with texture ids.
 */
public class RaycastMathKernelRaycastBatchPoC {
    private static final int SIN_TABLE_SIZE = 1024;
    private static final int FIXED_POINT_SHIFT = 16;
    private static final int SIN_TABLE_MASK = SIN_TABLE_SIZE - 1;
    private static final int ANGLE_SCALE = (int) ((SIN_TABLE_SIZE << FIXED_POINT_SHIFT) / (2.0 * Math.PI));

    private static final float[] SIN_TABLE = new float[SIN_TABLE_SIZE];
    private static final float[] COS_TABLE = new float[SIN_TABLE_SIZE];

    static {
        for (int i = 0; i < SIN_TABLE_SIZE; i++) {
            double angle = (i * 2.0 * Math.PI) / SIN_TABLE_SIZE;
            SIN_TABLE[i] = (float) Math.sin(angle);
            COS_TABLE[i] = (float) Math.cos(angle);
        }
    }

    private static double fastSin(double x) {
        int idx = ((int) (x * ANGLE_SCALE) >>> FIXED_POINT_SHIFT) & SIN_TABLE_MASK;
        return SIN_TABLE[idx];
    }

    private static double fastCos(double x) {
        int idx = ((int) (x * ANGLE_SCALE) >>> FIXED_POINT_SHIFT) & SIN_TABLE_MASK;
        return COS_TABLE[idx];
    }

    private static double qRsqrt(double x) {
        // correctness-first PoC; we can swap to JS-like rsqrt approximation later
        return 1.0 / Math.sqrt(x);
    }

    @JSExport
    public static double rayAngle(double playerAngle, double playerFov, int rayIndex, int rayCount) {
        if (rayCount <= 0) return playerAngle;
        return playerAngle + (-playerFov / 2.0 + ((double) rayIndex / rayCount) * playerFov);
    }

    /**
     * Batch raycast PoC.
     *
     * Inputs:
     * - map tiles are numeric: tileTypeGrid[cellY*mapW + cellX] == 1 means wall, 0 means empty.
     * - outputs are written into primitive output arrays.
     *
     * Outputs:
     * - outHit[i] = 1 if hit else 0
     * - outDistance[i] = corrected distance (undefined if outHit==0)
     * - outHitSide[i] = 0 for x-side, 1 for y-side
     */
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
        int[] tileTypeGrid,
        int maxRayDepth,
        double[] outDistance,
        int[] outHit,
        int[] outHitSide
    ) {
        int n = rayEnd - rayStart;
        for (int i = 0; i < n; i++) {
            int rayIndex = rayStart + i;
            double a = rayAngle(playerAngle, playerFov, rayIndex, rayCount);

            double cosA = fastCos(a);
            double sinA = fastSin(a);

            double rayX = posX;
            double rayY = posZ;

            int cellX = (int) Math.floor(rayX / tileSize);
            int cellY = (int) Math.floor(rayY / tileSize);

            double distX = (cosA != 0.0)
                ? ((cosA > 0.0 ? cellX + 1 : cellX) * tileSize - rayX) / cosA
                : Double.POSITIVE_INFINITY;

            double distY = (sinA != 0.0)
                ? ((sinA > 0.0 ? cellY + 1 : cellY) * tileSize - rayY) / sinA
                : Double.POSITIVE_INFINITY;

            double deltaX = Math.abs(tileSize / cosA);
            double deltaY = Math.abs(tileSize / sinA);

            int steps = 0;
            boolean hit = false;
            int side = 0; // 0=x,1=y
            double distance = 0.0;

            while (steps++ < maxRayDepth * 2 && !hit) {
                if (distX < distY) {
                    distance = distX;
                    cellX += (cosA > 0.0 ? 1 : -1);
                    distX += deltaX;
                    side = 1; // y-side in your JS (side='y')
                } else {
                    distance = distY;
                    cellY += (sinA > 0.0 ? 1 : -1);
                    distY += deltaY;
                    side = 0; // x-side
                }

                if (cellX < 0 || cellY < 0 || cellX >= mapW || cellY >= mapH) break;

                int tile = tileTypeGrid[cellY * mapW + cellX];
                if (tile == 1) {
                    hit = true;
                }
            }

            if (!hit) {
                outHit[i] = 0;
                // leave outDistance/outHitSide unspecified
            } else {
                double angleDiff = a - playerAngle;
                double corrected = distance * qRsqrt(1.0 + angleDiff * angleDiff);

                outHit[i] = 1;
                outDistance[i] = corrected;
                outHitSide[i] = side;
            }
        }
    }
}

