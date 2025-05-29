// RaycastAPI.java
// Exposes a static method for CheerpJ to call Java raycasting logic
// Returns a flat float[] for easy interop with JavaScript

import java.util.*;

public class RaycastAPI {
    // Expose a static method for CheerpJ/JavaScript
    public static float[] castRays(
            double posX, double posZ, double playerAngle, double playerFOV,
            int tileSectors, int[][] map01, int numCastRays, int maxRayDepth) {
        RaycastWorker worker = new RaycastWorker();
        worker.tileSectors = tileSectors;
        worker.map01 = map01;
        worker.numCastRays = numCastRays;
        worker.maxRayDepth = maxRayDepth;
        // Optionally set textureIdMap/floorTextureIdMap if needed

        List<RaycastWorker.Ray> rays = worker.castRays(posX, posZ, playerAngle, playerFOV, 0, numCastRays);

        // For each ray, flatten: [col, dist, hitX, hitY, hitSide, textureKey]
        // We'll encode hitSide as 0 (x) or 1 (y), and textureKey as an int hash (for
        // demo)
        float[] result = new float[rays.size() * 6];
        for (int i = 0; i < rays.size(); i++) {
            RaycastWorker.Ray ray = rays.get(i);
            int base = i * 6;
            if (ray != null) {
                result[base] = ray.column;
                result[base + 1] = (float) ray.distance;
                result[base + 2] = (float) ray.hitX;
                result[base + 3] = (float) ray.hitY;
                result[base + 4] = "x".equals(ray.hitSide) ? 0 : 1;
                result[base + 5] = ray.textureKey != null ? ray.textureKey.hashCode() : 0;
            } else {
                result[base] = -1; // invalid
                result[base + 1] = -1;
                result[base + 2] = -1;
                result[base + 3] = -1;
                result[base + 4] = -1;
                result[base + 5] = 0;
            }
        }
        return result;
    }
}
