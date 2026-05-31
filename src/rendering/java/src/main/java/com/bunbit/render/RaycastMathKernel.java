package com.bunbit.render;

import org.teavm.jso.JSExport;
import org.teavm.jso.typedarrays.Float32Array;
import org.teavm.jso.typedarrays.Float64Array;
import org.teavm.jso.typedarrays.Int32Array;

public class RaycastMathKernel {

    // =========================
    // TRIG / MATH CORE
    // =========================

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
    public static int clampInt(int v, int lo, int hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    // =========================
    // RAYCASTING CORE
    // =========================

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
            double a = playerAngle + (-playerFov * 0.5 + ((double) rayIndex / rayCount) * playerFov);

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
                    side = 1;
                } else {
                    distance = distY;
                    cellY += (sinA > 0 ? 1 : -1);
                    distY += deltaY;
                    side = 0;
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

    // =========================
    // HORIZON RENDERING CORE
    // =========================

    @JSExport
    public static void renderHorizonSlice(
            int startY,
            int endY,
            int canvasWidth,
            int canvasHeight,
            double playerX,
            double playerZ,
            double playerAngle,
            double fov,
            double projectionDist,
            int tileSize,

            Float32Array clipFloor,
            Float32Array clipRoof,

            Int32Array outBuffer,

            Int32Array floorTex,
            int floorW,
            int floorH,

            Int32Array roofTex,
            int roofW,
            int roofH) {
        int halfHeight = canvasHeight / 2;

        double aL = playerAngle - fov * 0.5;
        double aR = playerAngle + fov * 0.5;

        double cosL = Math.cos(aL);
        double sinL = Math.sin(aL);
        double cosR = Math.cos(aR);
        double sinR = Math.sin(aR);

        double invW = 1.0 / canvasWidth;

        for (int y = startY; y < endY; y++) {

            int rowOffset = (y - startY) * canvasWidth;
            boolean sky = y < halfHeight;

            double yc = sky ? (halfHeight - y) : (y - halfHeight);
            if (yc <= 0)
                continue;

            double dist = (projectionDist * tileSize * 0.5) / yc;

            double xL = playerX + dist * cosL;
            double zL = playerZ + dist * sinL;

            double xR = playerX + dist * cosR;
            double zR = playerZ + dist * sinR;

            double dx = (xR - xL) * invW;
            double dz = (zR - zL) * invW;

            double tx = xL - Math.floor(xL / tileSize) * tileSize;
            double tz = zL - Math.floor(zL / tileSize) * tileSize;

            for (int x = 0; x < canvasWidth; x++) {

                float clip = sky ? clipRoof.get(x) : clipFloor.get(x);

                int col;

                if (sky) {
                    if (y < clip) {
                        int ix = ((int) tx) % roofW;
                        int iz = ((int) tz) % roofH;
                        if (ix < 0)
                            ix += roofW;
                        if (iz < 0)
                            iz += roofH;
                        col = roofTex.get(iz * roofW + ix);
                    } else {
                        col = 0xFF000000;
                    }
                } else {
                    if (y > clip) {
                        int ix = ((int) tx) % floorW;
                        int iz = ((int) tz) % floorH;
                        if (ix < 0)
                            ix += floorW;
                        if (iz < 0)
                            iz += floorH;
                        col = floorTex.get(iz * floorW + ix);
                    } else {
                        col = 0xFF000000;
                    }
                }

                outBuffer.set(rowOffset + x, col);

                tx += dx;
                tz += dz;
            }
        }
    }
}