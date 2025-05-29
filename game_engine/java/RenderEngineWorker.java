// RenderEngineWorker.java
// Java version of your renderengineworker.js wall rendering logic (core calculation only)
// This class processes a segment of rays and computes wall slice data for rendering.

import java.util.*;

public class RenderEngineWorker {
    public static class WallData {
        public int column;
        public double wallTop;
        public double wallBottom;
        public double textureX;
        public String textureKey;
    }

    // Main method to process a segment of rays and compute wall data
    public List<WallData> computeWallData(List<RaycastWorker.Ray> rayData, int startRay, int endRay, int tileSectors, int CANVAS_HEIGHT, int CANVAS_WIDTH) {
        List<WallData> wallDataList = new ArrayList<>();
        for (int i = startRay; i < endRay; i++) {
            RaycastWorker.Ray ray = rayData.get(i);
            if (ray == null) continue;
            double wallHeight = (CANVAS_HEIGHT / ray.distance) * tileSectors;
            double wallTop = (CANVAS_HEIGHT - wallHeight) / 2.0;
            double wallBottom = wallTop + wallHeight;
            double textureX;
            if ("x".equals(ray.hitSide)) {
                textureX = (ray.hitX % tileSectors) / (double)tileSectors;
            } else {
                textureX = (ray.hitY % tileSectors) / (double)tileSectors;
            }
            textureX = Math.max(0, Math.min(1, textureX));
            WallData wall = new WallData();
            wall.column = ray.column;
            wall.wallTop = wallTop;
            wall.wallBottom = wallBottom;
            wall.textureX = textureX;
            wall.textureKey = ray.textureKey;
            wallDataList.add(wall);
        }
        return wallDataList;
    }
}
