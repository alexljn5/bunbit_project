package com.bunbit.render;

public class RenderHelpers {
    // Very small helper functions you can experiment with in Java

    public static int clampInt(int v, int lo, int hi) {
        if (v < lo)
            return lo;
        if (v > hi)
            return hi;
        return v;
    }

    public static double fastCos(double x) {
        return Math.cos(x);
    }

    public static double fastSin(double x) {
        return Math.sin(x);
    }

    public static double qRsqrt(double x) {
        return 1.0 / Math.sqrt(x);
    }
}
