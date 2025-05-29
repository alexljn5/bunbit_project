// RenderFloorWorker.java
// Java version of your renderfloorworker.js floor rendering logic (core calculation only)
// This class processes ray data and computes floor pixel data for rendering.

import java.util.*;

public class RenderFloorWorker {
    public static class FloorColumn {
        public String texKey;
        public float[] data; // [y, texX, texY, ...]
    }

    public List<FloorColumn> computeFloorPixels(
            List<RaycastWorker.Ray> rayData,
            double playerX, double playerZ, double playerAngle, double playerFOV,
            int tileSectors, int CANVAS_WIDTH, int CANVAS_HEIGHT, int numCastRays) {
        float[] rayAngles = new float[numCastRays];
        float[] cosAngles = new float[numCastRays];
        float[] sinAngles = new float[numCastRays];
        double fovStep = playerFOV / numCastRays;
        double angle = playerAngle - playerFOV / 2.0;
        for (int x = 0; x < numCastRays; x++, angle += fovStep) {
            rayAngles[x] = (float)angle;
            cosAngles[x] = (float)Math.cos(angle);
            sinAngles[x] = (float)Math.sin(angle);
        }
        double projectionPlaneDist = (CANVAS_WIDTH * 0.5) / Math.tan(playerFOV * 0.5);
        double halfCanvasHeight = CANVAS_HEIGHT * 0.5;
        double halfTile = tileSectors * 0.5;
        List<FloorColumn> floorPixels = new ArrayList<>(numCastRays);
        for (int x = 0; x < numCastRays; x++) {
            RaycastWorker.Ray ray = rayData.get(x);
            if (ray == null || ray.floorTextureKey == null) {
                floorPixels.add(null);
                continue;
            }
            double wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            double wallBottom = (CANVAS_HEIGHT + wallHeight) * 0.5;
            float cosA = cosAngles[x];
            float sinA = sinAngles[x];
            int yStart = (int)Math.floor(wallBottom);
            int clampedYStart = Math.min(yStart, CANVAS_HEIGHT);
            int yCount = (int)Math.floor((CANVAS_HEIGHT - clampedYStart) * 0.5);
            if (yCount <= 0) {
                floorPixels.add(null);
                continue;
            }
            float[] arr = new float[yCount * 3];
            int idx = 0;
            int y = clampedYStart;
            double rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
            double floorX = playerX + rowDistance * cosA;
            double floorY = playerZ + rowDistance * sinA;
            int step = 2;
            double prevRowDistance = rowDistance;
            for (int i = 0; i < yCount; i++, y += step) {
                if (i > 0) {
                    rowDistance = halfTile / ((y - halfCanvasHeight) / projectionPlaneDist);
                    double dr = rowDistance - prevRowDistance;
                    floorX += dr * cosA;
                    floorY += dr * sinA;
                    prevRowDistance = rowDistance;
                }
                float textureX = (float)(((floorX % tileSectors + tileSectors) % tileSectors) / tileSectors);
                float textureY = (float)(((floorY % tileSectors + tileSectors) % tileSectors) / tileSectors);
                arr[idx++] = y;
                arr[idx++] = textureX;
                arr[idx++] = textureY;
            }
            FloorColumn col = new FloorColumn();
            col.texKey = ray.floorTextureKey;
            col.data = arr;
            floorPixels.add(col);
        }
        return floorPixels;
    }
}
