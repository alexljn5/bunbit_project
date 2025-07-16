import { tileSectors, mapSectorsTable, mapTable } from "./maps.js";
import { buildMapGrid } from "./maputils.js";
import { emptyTile, floorConcrete } from "./maptexturesloader.js";
import { floorTextureIdMap } from "./maptexturesids.js";

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
        for (const [key, mapData] of mapTable.entries()) {
            const sectors = this.maps.get(key);
            if (!sectors || !sectors.length) {
                continue;
            }
            // Use pre-built grid from mapTable for map_01 and map_02, build map_debug with buildMapGrid
            const grid = key === "map_debug" ? buildMapGrid(sectors) : mapData.grid;
            this.fullMapCache.set(key, { ...mapData, grid });
        }
    }

    async loadMap(mapKey, playerPosition) {
        if (!this.maps.has(mapKey)) {
            return false;
        }

        try {
            if (mapKey === "map_01") {
                const { setupMap01 } = await import("../ai/aimapmanager.js");
                setupMap01();
            }
        } catch (e) {
        }

        if (mapKey === "map_debug") {
            playerPosition.x = 75;
            playerPosition.z = 75;
            playerPosition.angle = 0;
        }

        this.activeMapKey = mapKey;
        this.updateActiveSector(playerPosition);
        if (!this.activeSector) {
            return false;
        }
        return true;
    }

    updateActiveSector(playerPosition) {
        if (!this.activeMapKey || !this.maps.has(this.activeMapKey)) {
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
                }
                return true;
            }
        }
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
            return floorConcrete;
        }
        const sectors = this.maps.get(this.activeMapKey);
        const activeSectorInfo = sectors.find(s => s.id === this.activeSectorId);
        if (!activeSectorInfo) {
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
        const mapData = this.fullMapCache.get(this.activeMapKey);
        return tile ? { ...tile, floorTextureId: mapData?.floorTextureId || 50 } : floorConcrete;
    }

    getFullMap(mapKey = this.activeMapKey) {
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.grid) {
            return null;
        }
        return mapData.grid;
    }

    getMapFloorTexture(mapKey = this.activeMapKey) {
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.floorTextureId) {
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
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.grid) {
            throw new Error(`Map ${mapKey} not found or invalid`);
        }

        // Convert grid to numeric IDs (textureId for walls, 0 for empty)
        const grid = mapData.grid.map(row => row.map(tile => tile.type === "wall" ? tile.textureId : 0));

        // Build texture maps
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
            playerFOV: settings.playerFOV || 1.0471975511965976, // ~60 degrees
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