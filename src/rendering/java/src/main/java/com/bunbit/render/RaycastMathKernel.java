package com.bunbit.render;

import org.teavm.jso.JSExport;

public class RaycastMathKernel {
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

    public static void main(String[] args) {
        // TeaVM needs an entry point; exported helpers below are called from JS.
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
    public static double fastCos(double x) {
        int idx = ((int) (x * ANGLE_SCALE) >>> FIXED_POINT_SHIFT) & SIN_TABLE_MASK;
        return COS_TABLE[idx];
    }

    @JSExport
    public static double fastSin(double x) {
        int idx = ((int) (x * ANGLE_SCALE) >>> FIXED_POINT_SHIFT) & SIN_TABLE_MASK;
        return SIN_TABLE[idx];
    }

    @JSExport
    public static double qRsqrt(double x) {
        return 1.0 / Math.sqrt(x);
    }

    @JSExport
    public static double rayAngle(double playerAngle, double playerFov, int rayIndex, int rayCount) {
        if (rayCount <= 0) {
            return playerAngle;
        }
        return playerAngle + (-playerFov / 2.0 + ((double) rayIndex / rayCount) * playerFov);
    }
}
