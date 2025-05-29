// RaycastWorker.java
// Step 2: Port of your raycastworker.js DDA raycasting logic to Java (core loop, no threading yet)
// This is a direct translation of your worker's raycasting logic for use in Java.

import java.util.*;

public class RaycastWorker {
    public static class Ray {
        public int column;
        public double distance;
        public String wallType;
        public double hitX, hitY;
        public String hitSide;
        public String textureKey;
        public String floorTextureKey;
        public double floorX, floorY;
    }

    // Static data (set before calling castRays)
    public int tileSectors;
    public int[][] map01;
    public Map<Integer, String> textureIdMap = new HashMap<>();
    public Map<Integer, String> floorTextureIdMap = new HashMap<>();
    public int CANVAS_WIDTH;
    public int numCastRays;
    public int maxRayDepth;

    // Main raycasting method (single-threaded, for a segment of rays)
    public List<Ray> castRays(double posX, double posZ, double playerAngle, double playerFOV, int startRay,
            int endRay) {
        List<Ray> rayData = new ArrayList<>(endRay - startRay);
        for (int i = 0; i < endRay - startRay; i++) {
            int x = startRay + i;
            double rayAngle = playerAngle + (-playerFOV / 2 + (x / (double) numCastRays) * playerFOV);
            double cosAngle = Math.cos(rayAngle);
            double sinAngle = Math.sin(rayAngle);

            double distance = 0;
            double rayX = posX;
            double rayY = posZ;
            int cellX = (int) Math.floor(rayX / tileSectors);
            int cellY = (int) Math.floor(rayY / tileSectors);
            double distToNextX = cosAngle != 0 ? (((cosAngle > 0 ? cellX + 1 : cellX) * tileSectors - rayX) / cosAngle)
                    : Double.POSITIVE_INFINITY;
            double distToNextY = sinAngle != 0 ? (((sinAngle > 0 ? cellY + 1 : cellY) * tileSectors - rayY) / sinAngle)
                    : Double.POSITIVE_INFINITY;
            double deltaDistX = Math.abs(tileSectors / cosAngle);
            double deltaDistY = Math.abs(tileSectors / sinAngle);

            int steps = 0;
            boolean hit = false;
            String hitSide = null;
            String hitWallType = null;
            String textureKey = null;
            String floorTextureKey = "floor_concrete";
            double floorX = 0, floorY = 0;
            Map<String, Object> lastFloorTile = null; // Not used in this Java version yet

            while (steps++ < maxRayDepth * 2 && !hit && distance < maxRayDepth * tileSectors) {
                if (distToNextX < distToNextY) {
                    distance = distToNextX;
                    cellX += cosAngle > 0 ? 1 : -1;
                    distToNextX += deltaDistX;
                    hitSide = "y";
                } else {
                    distance = distToNextY;
                    cellY += sinAngle > 0 ? 1 : -1;
                    distToNextY += deltaDistY;
                    hitSide = "x";
                }
                if (cellX < 0 || cellY < 0 || cellX >= map01[0].length || cellY >= map01.length)
                    break;
                int tile = map01[cellY][cellX];
                // For demo: treat 1 as wall, 0 as empty
                if (tile == 1) {
                    hit = true;
                    hitWallType = "wall";
                    textureKey = textureIdMap.getOrDefault(tile, "wall_creamlol");
                } else if (tile == 0) {
                    // For demo: treat 0 as empty
                    floorX = rayX + distance * cosAngle;
                    floorY = rayY + distance * sinAngle;
                }
            }
            if (hit) {
                double angleDiff = rayAngle - playerAngle;
                double cosApprox = Q_rsqrt(1 + angleDiff * angleDiff);
                double correctedDistance = distance * cosApprox;
                double hitX = rayX + distance * cosAngle;
                double hitY = rayY + distance * sinAngle;
                if ("y".equals(hitSide))
                    hitX = (cosAngle > 0 ? cellX : cellX + 1) * tileSectors;
                if ("x".equals(hitSide))
                    hitY = (sinAngle > 0 ? cellY : cellY + 1) * tileSectors;
                Ray ray = new Ray();
                ray.column = x;
                ray.distance = correctedDistance;
                ray.wallType = hitWallType;
                ray.hitX = hitX;
                ray.hitY = hitY;
                ray.hitSide = hitSide;
                ray.textureKey = textureKey;
                ray.floorTextureKey = floorTextureKey;
                ray.floorX = floorX;
                ray.floorY = floorY;
                rayData.add(ray);
            } else {
                rayData.add(null);
            }
        }
        return rayData;
    }

    // Fast inverse square root (Q_rsqrt) ported to Java
    public static float Q_rsqrt(double number) {
        float x2 = (float) number * 0.5f;
        float y = (float) number;
        int i = Float.floatToIntBits(y);
        i = 0x5f3759df - (i >> 1);
        y = Float.intBitsToFloat(i);
        y = y * (1.5f - (x2 * y * y));
        return y;
    }
}
