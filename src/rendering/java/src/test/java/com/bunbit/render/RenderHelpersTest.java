package com.bunbit.render;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class RenderHelpersTest {
    @Test
    public void testClampInt() {
        assertEquals(5, RenderHelpers.clampInt(5, 0, 10));
        assertEquals(0, RenderHelpers.clampInt(-1, 0, 10));
        assertEquals(10, RenderHelpers.clampInt(20, 0, 10));
    }

    @Test
    public void testTrigStubs() {
        assertEquals(Math.cos(1.2), RenderHelpers.fastCos(1.2), 0.01);
        assertEquals(Math.sin(2.3), RenderHelpers.fastSin(2.3), 0.01);
    }

    @Test
    public void testRayAngle() {
        double fov = Math.PI / 6;
        assertEquals(1.0 - fov / 2.0, RenderHelpers.rayAngle(1.0, fov, 0, 3), 1e-9);
        assertEquals(1.0 - fov / 6.0, RenderHelpers.rayAngle(1.0, fov, 1, 3), 1e-9);
        assertEquals(1.0 + fov / 6.0, RenderHelpers.rayAngle(1.0, fov, 2, 3), 1e-9);
    }
}
