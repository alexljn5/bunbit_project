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
        assertEquals(Math.cos(1.2), RenderHelpers.fastCos(1.2), 1e-9);
        assertEquals(Math.sin(2.3), RenderHelpers.fastSin(2.3), 1e-9);
    }
}
