import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Raycaster {
    public static void main(String[] args) {
        int frameId = -1;
        long startTime = System.currentTimeMillis();
        try {
            // Read JSON input from stdin
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            StringBuilder input = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                input.append(line);
            }
            String inputJson = input.toString().trim();

            // Parse JSON
            Map<String, Object> inputData = parseJson(inputJson);
            frameId = ((Number) inputData.get("frameId")).intValue();
            int startRay = ((Number) inputData.get("startRay")).intValue();
            int endRay = ((Number) inputData.get("endRay")).intValue();
            double posX = ((Number) inputData.get("posX")).doubleValue();
            double posZ = ((Number) inputData.get("posZ")).doubleValue();
            double playerAngle = ((Number) inputData.get("playerAngle")).doubleValue();
            double playerFOV = ((Number) inputData.get("playerFOV")).doubleValue();
            int tileSectors = ((Number) inputData.get("tileSectors")).intValue();
            int canvasWidth = ((Number) inputData.get("CANVAS_WIDTH")).intValue();
            int numCastRays = ((Number) inputData.get("numCastRays")).intValue();
            int maxRayDepth = ((Number) inputData.get("maxRayDepth")).intValue();
            int[][] map = (int[][]) inputData.get("map");
            Map<String, String> textureIdMap = (Map<String, String>) inputData.get("textureIdMap");
            Map<String, String> floorTextureIdMap = (Map<String, String>) inputData.get("floorTextureIdMap");

            List<Map<String, Object>> rayData = new ArrayList<>();
            int rayCount = endRay - startRay;

            for (int i = 0; i < rayCount; i++) {
                int x = startRay + i;
                double rayAngle = playerAngle + (-playerFOV / 2 + (x / (double) numCastRays) * playerFOV);
                double cosAngle = fastCos(rayAngle);
                double sinAngle = fastSin(rayAngle);

                // Convert world coordinates to map coordinates
                double rayX = posX / tileSectors;
                double rayY = posZ / tileSectors;
                int cellX = (int) rayX;
                int cellY = (int) rayY;

                // DDA setup
                double deltaDistX = Math.abs(1 / (cosAngle != 0 ? cosAngle : 1e-10));
                double deltaDistY = Math.abs(1 / (sinAngle != 0 ? sinAngle : 1e-10));

                int stepX = cosAngle >= 0 ? 1 : -1;
                int stepY = sinAngle >= 0 ? 1 : -1;

                double distToNextX = cosAngle != 0 ? ((cosAngle >= 0 ? cellX + 1 : cellX) - rayX) / cosAngle : Double.POSITIVE_INFINITY;
                double distToNextY = sinAngle != 0 ? ((sinAngle >= 0 ? cellY + 1 : cellY) - rayY) / sinAngle : Double.POSITIVE_INFINITY;

                double distance = 0;
                int steps = 0;
                boolean hit = false;
                String hitSide = null;
                String hitWallType = null;
                String textureKey = null;
                String floorTextureKey = "floor_concrete";
                double floorX = 0, floorY = 0;
                int lastFloorTileId = -1;

                while (steps++ < maxRayDepth && !hit && distance < maxRayDepth) {
                    if (distToNextX < distToNextY) {
                        distance = distToNextX;
                        cellX += stepX;
                        distToNextX += deltaDistX;
                        hitSide = "y";
                    } else {
                        distance = distToNextY;
                        cellY += stepY;
                        distToNextY += deltaDistY;
                        hitSide = "x";
                    }

                    if (cellX < 0 || cellY < 0 || cellY >= map.length || cellX >= map[0].length) break;

                    int tile = map[cellY][cellX];
                    if (tile < 0) break;

                    if (tile > 0) {
                        hit = true;
                        hitWallType = "wall";
                        textureKey = textureIdMap.getOrDefault(String.valueOf(tile), "wall_creamlol");
                        if (lastFloorTileId >= 0) {
                            floorTextureKey = floorTextureIdMap.getOrDefault(String.valueOf(lastFloorTileId), "floor_concrete");
                        }
                    } else {
                        lastFloorTileId = tile;
                        floorTextureKey = floorTextureIdMap.getOrDefault(String.valueOf(tile), "floor_concrete");
                        floorX = rayX + distance * cosAngle;
                        floorY = rayY + distance * sinAngle;
                    }
                }

                Map<String, Object> ray = null;
                if (hit) {
                    double angleDiff = rayAngle - playerAngle;
                    double cosApprox = q_rsqrt(1 + angleDiff * angleDiff);
                    double correctedDistance = distance * cosApprox;
                    double hitX = (rayX + distance * cosAngle) * tileSectors;
                    double hitY = (rayY + distance * sinAngle) * tileSectors;
                    if ("y".equals(hitSide)) hitX = (cellX + (cosAngle >= 0 ? 0 : 1)) * tileSectors;
                    if ("x".equals(hitSide)) hitY = (cellY + (sinAngle >= 0 ? 0 : 1)) * tileSectors;

                    ray = new HashMap<>();
                    ray.put("column", x);
                    ray.put("distance", correctedDistance * tileSectors); // Scale distance back to world coordinates
                    ray.put("wallType", hitWallType);
                    ray.put("hitX", hitX);
                    ray.put("hitY", hitY);
                    ray.put("hitSide", hitSide);
                    ray.put("textureKey", textureKey);
                    ray.put("floorTextureKey", floorTextureKey);
                    ray.put("floorX", floorX * tileSectors);
                    ray.put("floorY", floorY * tileSectors);
                }
                rayData.add(ray);
            }

            // Construct JSON output manually
            StringBuilder output = new StringBuilder();
            output.append("{\"type\":\"frame\",\"startRay\":").append(startRay)
                  .append(",\"frameId\":").append(frameId)
                  .append(",\"rayData\":[");
            for (int i = 0; i < rayData.size(); i++) {
                Map<String, Object> ray = rayData.get(i);
                if (ray == null) {
                    output.append("null");
                } else {
                    output.append("{")
                          .append("\"column\":").append(ray.get("column")).append(",")
                          .append("\"distance\":").append(String.format("%.6f", ray.get("distance"))).append(",")
                          .append("\"wallType\":\"").append(ray.get("wallType")).append("\",")
                          .append("\"hitX\":").append(String.format("%.6f", ray.get("hitX"))).append(",")
                          .append("\"hitY\":").append(String.format("%.6f", ray.get("hitY"))).append(",")
                          .append("\"hitSide\":\"").append(ray.get("hitSide")).append("\",")
                          .append("\"textureKey\":\"").append(ray.get("textureKey")).append("\",")
                          .append("\"floorTextureKey\":\"").append(ray.get("floorTextureKey")).append("\",")
                          .append("\"floorX\":").append(String.format("%.6f", ray.get("floorX"))).append(",")
                          .append("\"floorY\":").append(String.format("%.6f", ray.get("floorY")))
                          .append("}");
                }
                if (i < rayData.size() - 1) output.append(",");
            }
            output.append("],\"workerTime\":").append(System.currentTimeMillis() - startTime).append("}");
            System.out.println(output.toString());
        } catch (Exception e) {
            // Construct error JSON
            String errorOutput = String.format(
                "{\"type\":\"error\",\"frameId\":%d,\"error\":\"%s\",\"workerTime\":%d}",
                frameId, e.getMessage().replace("\"", "\\\""), System.currentTimeMillis() - startTime
            );
            System.out.println(errorOutput);
        }
    }

    // Manual JSON parser (unchanged from your working version)
    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseJson(String json) {
        Map<String, Object> result = new HashMap<>();
        json = json.replaceAll("\\s+", "");
        if (!json.startsWith("{") || !json.endsWith("}")) {
            throw new IllegalArgumentException("Invalid JSON object");
        }
        json = json.substring(1, json.length() - 1);

        List<String> pairs = new ArrayList<>();
        int braceCount = 0, bracketCount = 0;
        StringBuilder currentPair = new StringBuilder();
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '{') braceCount++;
            else if (c == '}') braceCount--;
            else if (c == '[') bracketCount++;
            else if (c == ']') bracketCount--;
            else if (c == ',' && braceCount == 0 && bracketCount == 0) {
                pairs.add(currentPair.toString());
                currentPair = new StringBuilder();
                continue;
            }
            currentPair.append(c);
        }
        if (currentPair.length() > 0) pairs.add(currentPair.toString());

        for (String pair : pairs) {
            String[] kv = pair.split(":", 2);
            if (kv.length < 2) throw new IllegalArgumentException("Invalid key-value pair: " + pair);
            String key = kv[0].trim().replace("\"", "");
            String value = kv[1].trim();

            if (key.equals("map")) {
                if (!value.startsWith("[") || !value.endsWith("]")) {
                    throw new IllegalArgumentException("Invalid map array");
                }
                value = value.substring(1, value.length() - 1);
                List<String> rows = splitJsonArray(value);
                int[][] map = new int[rows.size()][];
                for (int i = 0; i < rows.size(); i++) {
                    String row = rows.get(i).replace("[", "").replace("]", "").trim();
                    String[] cols = row.split(",");
                    map[i] = new int[cols.length];
                    for (int j = 0; j < cols.length; j++) {
                        map[i][j] = Integer.parseInt(cols[j].trim());
                    }
                }
                result.put(key, map);
            } else if (key.equals("textureIdMap") || key.equals("floorTextureIdMap")) {
                if (!value.startsWith("{") || !value.endsWith("}")) {
                    throw new IllegalArgumentException("Invalid map object: " + key);
                }
                value = value.substring(1, value.length() - 1);
                Map<String, String> map = new HashMap<>();
                List<String> entries = splitJsonArray(value);
                for (String entry : entries) {
                    String[] kv2 = entry.split(":", 2);
                    if (kv2.length < 2) throw new IllegalArgumentException("Invalid map entry: " + entry);
                    map.put(kv2[0].replace("\"", "").trim(), kv2[1].replace("\"", "").trim());
                }
                result.put(key, map);
            } else if (key.equals("startRay") || key.equals("endRay") || key.equals("frameId") ||
                       key.equals("tileSectors") || key.equals("CANVAS_WIDTH") || key.equals("numCastRays") ||
                       key.equals("maxRayDepth")) {
                result.put(key, Integer.parseInt(value));
            } else if (value.startsWith("\"") && value.endsWith("\"")) {
                result.put(key, value.substring(1, value.length() - 1));
            } else {
                try {
                    result.put(key, Double.parseDouble(value));
                } catch (NumberFormatException e) {
                    result.put(key, value);
                }
            }
        }
        return result;
    }

    private static List<String> splitJsonArray(String input) {
        List<String> result = new ArrayList<>();
        int braceCount = 0, bracketCount = 0;
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c == '{') braceCount++;
            else if (c == '}') braceCount--;
            else if (c == '[') bracketCount++;
            else if (c == ']') bracketCount--;
            else if (c == ',' && braceCount == 0 && bracketCount == 0) {
                result.add(current.toString());
                current = new StringBuilder();
                continue;
            }
            current.append(c);
        }
        if (current.length() > 0) result.add(current.toString());
        return result;
    }

    static double fastCos(double angle) {
        return Math.cos(angle);
    }

    static double fastSin(double angle) {
        return Math.sin(angle);
    }

    static double q_rsqrt(double number) {
        double y = Double.longBitsToDouble(0x5fe6eb50c7b537a9L - (Double.doubleToLongBits(number) >> 1));
        y = y * (1.5 - (number * 0.5 * y * y));
        return y;
    }
}