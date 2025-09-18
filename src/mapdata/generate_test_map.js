// game_engine/mapdata/generate_test_map.js
import { mapHandler } from './maphandler.js'; // Correct case and path (relative to game_engine/mapdata)

async function generateTestMap() {
    try {
        const filePath = './mapjson/test_map.json'; // Relative to game_engine/mapdata
        await mapHandler.loadMap('map_test', { x: 75.0, z: 75.0, angle: 0.0 });
        await mapHandler.saveMapJson('map_test', filePath, { x: 75.0, z: 75.0, angle: 0.0 }, 1, {
            startRay: 0,
            endRay: 10,
            playerFOV: 1.0471975511965976,
            CANVAS_WIDTH: 800,
            numCastRays: 300,
            maxRayDepth: 50
        });
        console.log(`Test map saved to ${filePath}`);
    } catch (err) {
        console.error('Error generating test map:', err);
    }
}

generateTestMap();