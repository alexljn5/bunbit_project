import { tileSectors, mapSectorsTable, mapTable } from "./maps.js";
import { buildMapGrid } from "./maputils.js";
import { emptyTile, floorConcrete } from "./maptexturesloader.js";
import { floorTextureIdMap } from "./maptexturesids.js";
import { map_01 } from "./map_01.js"; // Import legacy map_01 for fallback

export class MapHandler {
    constructor() {
        this.maps = mapSectorsTable;
        this.fullMapCache = new Map();
        this.activeMapKey = null;
        this.activeSector = null;
        this.activeSectorId = null;
        this.buildAllMaps();
    }

    buildAllMaps() {
        console.log("Building all maps for fullMapCache:");
        for (const [key, mapData] of mapTable.entries()) {
            const sectors = this.maps.get(key);
            if (!sectors || !sectors.length) {
                console.warn(`No sectors for map ${key}, skipping.`);
                continue;
            }
            // Extract grid from mapData or fallback to buildMapGrid or map_01
            let grid = mapData.grid || (key === "map_01" ? map_01 : null) || buildMapGrid(sectors, { defaultTile: floorConcrete });
            if (key === "map_debug") {
                grid = buildMapGrid(sectors, { defaultTile: floorConcrete }); // Retain special handling for map_debug
            }
            if (!grid || !Array.isArray(grid) || !grid[0] || !Array.isArray(grid[0])) {
                console.error(`Invalid grid for ${key} in buildAllMaps:`, grid);
                continue;
            }
            this.fullMapCache.set(key, { grid, floorTextureId: mapData?.floorTextureId || 50 });
            console.log(`Cached ${key}: rows=${grid.length}, cols=${grid[0].length}`);
        }
    }

    async loadMap(mapKey, playerPosition) {
        if (!this.maps.has(mapKey)) {
            console.error(`Map ${mapKey} not found in mapSectorsTable! Falling back to map_01.`);
            mapKey = "map_01"; // Fallback to map_01
        }

        try {
            if (mapKey === "map_01") {
                const { setupMap01 } = await import("../ai/aimapmanager.js");
                const { setCurrentMap } = await import("../ai/aihandler.js"); // Use setCurrentMap
                setupMap01();
                setCurrentMap(mapKey); // Initialize AI for map
            }
        } catch (e) {
            console.error(`Failed to load setupMap01 for ${mapKey}:`, e);
            return false;
        }

        if (mapKey === "map_debug") {
            playerPosition.x = 75;
            playerPosition.z = 75;
            playerPosition.angle = 0;
        }

        this.activeMapKey = mapKey;
        this.updateActiveSector(playerPosition);
        if (!this.activeSector) {
            console.error(`No valid sector found for ${mapKey}!`);
            return false;
        }
        console.log(`Loaded map ${mapKey}, active sector: ${this.activeSectorId}`);
        return true;
    }

    updateActiveSector(playerPosition) {
        if (!this.activeMapKey || !this.maps.has(this.activeMapKey)) {
            console.error(`Invalid activeMapKey: ${this.activeMapKey}, falling back to map_01`);
            this.activeMapKey = "map_01";
            this.activeSector = null;
            this.activeSectorId = null;
            return false;
        }
        const sectors = this.maps.get(this.activeMapKey);
        const tileX = Math.floor(playerPosition.x / tileSectors);
        const tileY = Math.floor(playerPosition.z / tileSectors);

        for (const sector of sectors) {
            if (
                tileX >= sector.startX && tileX < sector.startX + sector.width &&
                tileY >= sector.startY && tileY < sector.startY + sector.height
            ) {
                if (this.activeSectorId !== sector.id) {
                    this.activeSector = sector.data;
                    this.activeSectorId = sector.id;
                    console.log(`Updated active sector to ${sector.id} for map ${this.activeMapKey}`);
                }
                return true;
            }
        }
        console.warn(`No sector found for position (${playerPosition.x}, ${playerPosition.z}) in map ${this.activeMapKey}`);
        this.activeSector = null;
        this.activeSectorId = null;
        return false;
    }

    getActiveSector() {
        return this.activeSector;
    }

    getSectorBounds() {
        if (!this.activeMapKey || !this.activeSectorId) return null;
        const sectors = this.maps.get(this.activeMapKey);
        const activeSectorInfo = sectors.find(s => s.id === this.activeSectorId);
        if (!activeSectorInfo) return null;
        return {
            startX: activeSectorInfo.startX,
            startY: activeSectorInfo.startY,
            width: activeSectorInfo.width,
            height: activeSectorInfo.height
        };
    }

    getTile(x, z) {
        if (!this.activeSector || !this.activeMapKey) {
            console.warn(`No active sector or map key, returning default tile`);
            return floorConcrete;
        }
        const sectors = this.maps.get(this.activeMapKey);
        const activeSectorInfo = sectors.find(s => s.id === this.activeSectorId);
        if (!activeSectorInfo) {
            console.warn(`No active sector info for ${this.activeSectorId}`);
            return floorConcrete;
        }

        const tileX = Math.floor(x / tileSectors);
        const tileY = Math.floor(z / tileSectors);
        const localX = tileX - activeSectorInfo.startX;
        const localY = tileY - activeSectorInfo.startY;

        if (
            localX < 0 || localX >= activeSectorInfo.width ||
            localY < 0 || localY >= activeSectorInfo.height
        ) {
            return null;
        }
        const tile = this.activeSector[localY][localX];
        const mapData = this.fullMapCache.get(this.activeMapKey || "map_01");
        return tile ? { ...tile, floorTextureId: mapData?.floorTextureId || 50 } : floorConcrete;
    }

    getFullMap(mapKey = this.activeMapKey) {
        if (!mapKey) {
            console.warn(`No mapKey provided, falling back to map_01`);
            mapKey = "map_01";
        }
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.grid) {
            console.error(`No valid grid for map ${mapKey} in fullMapCache, falling back to map_01`);
            return mapKey === "map_01" && map_01 && Array.isArray(map_01) && map_01[0] && Array.isArray(map_01[0]) ? map_01 : null;
        }
        return mapData.grid;
    }

    getMapFloorTexture(mapKey = this.activeMapKey) {
        if (!mapKey) mapKey = "map_01";
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.floorTextureId) {
            console.warn(`No floor texture for map ${mapKey}, defaulting to floor_concrete`);
            return "floor_concrete";
        }
        return floorTextureIdMap.get(mapData.floorTextureId) || "floor_concrete";
    }

    getMapDimensions() {
        if (!this.activeSector || !this.activeMapKey) return { width: 0, height: 0 };
        const sectors = this.maps.get(this.activeMapKey);
        const activeSectorInfo = sectors.find(s => s.id === this.activeSectorId);
        return {
            width: activeSectorInfo ? activeSectorInfo.width : 0,
            height: activeSectorInfo ? activeSectorInfo.height : 0
        };
    }

    exportMapToJson(mapKey = this.activeMapKey, playerPosition = { x: 75.0, z: 75.0, angle: 0.0 }, frameId = 1, settings = {}) {
        if (!mapKey) mapKey = "map_01";
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.grid) {
            console.error(`Map ${mapKey} not found or invalid, using map_01`);
            if (mapKey === "map_01" && map_01) return { map: map_01 }; // Simplified fallback
            throw new Error(`Map ${mapKey} not found or invalid`);
        }

        const grid = mapData.grid.map(row => row.map(tile => tile.type === "wall" ? tile.textureId : 0));

        const textureIdMap = new Map();
        const floorTextureIdMap = new Map();
        mapData.grid.forEach(row => {
            row.forEach(tile => {
                if (tile.type === "wall") {
                    textureIdMap.set(String(tile.textureId), tile.texture || "wall_creamlol");
                }
                floorTextureIdMap.set(String(tile.floorTextureId), tile.floorTexture || "floor_concrete");
            });
        });

        return {
            type: "frame",
            startRay: settings.startRay || 0,
            endRay: settings.endRay || 300,
            posX: playerPosition.x,
            posZ: playerPosition.z,
            playerAngle: playerPosition.angle,
            playerFOV: settings.playerFOV || 1.0471975511965976,
            frameId: frameId,
            tileSectors: tileSectors,
            CANVAS_WIDTH: settings.CANVAS_WIDTH || 800,
            numCastRays: settings.numCastRays || 300,
            maxRayDepth: settings.maxRayDepth || 50,
            map: grid,
            textureIdMap: Object.fromEntries(textureIdMap),
            floorTextureIdMap: Object.fromEntries(floorTextureIdMap)
        };
    }

    async saveMapJson(mapKey, filePath, playerPosition, frameId, settings) {
        const jsonData = this.exportMapToJson(mapKey, playerPosition, frameId, settings);
        const fs = await import('fs').then(module => module.promises);
        await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
        return filePath;
    }
}

export const mapHandler = new MapHandler();