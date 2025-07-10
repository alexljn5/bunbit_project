// maphandler.js (ENTIRE FILE with AI setup loading added)
import { tileSectors, mapSectorsTable, mapTable } from "./maps.js";
import { floorConcrete, floorTextureIdMap } from "./maptextures.js";

export class MapHandler {
    constructor() {
        this.maps = mapSectorsTable;
        this.fullMapCache = new Map();
        for (const [key, map] of mapTable.entries()) {
            this.fullMapCache.set(key, map);
        }
        this.activeMapKey = null;
        this.activeSector = null;
        this.activeSectorId = null;
        console.log("MapHandler initialized! *twirls* Available maps:", [...this.maps.keys()]);
    }

    async loadMap(mapKey, playerPosition) {
        if (!this.maps.has(mapKey)) {
            console.error(`Map ${mapKey} not found! *pouts*`);
            return false;
        }

        // 🎯 Setup per-map logic such as AI
        try {
            if (mapKey === "map_01") {
                const { setupMap01 } = await import("../ai/map_01_setup.js");
                setupMap01();
            }
            // Add more setup imports as needed per map
        } catch (e) {
            console.warn(`Couldn't load map setup for ${mapKey} *hides behind Cheese*`, e);
        }

        if (mapKey === "map_debug") {
            playerPosition.x = 75;
            playerPosition.z = 75;
            playerPosition.angle = 0;
        }

        this.activeMapKey = mapKey;
        this.updateActiveSector(playerPosition);
        if (!this.activeSector) {
            console.error(`No valid sector for player at (${playerPosition.x}, ${playerPosition.z})! *hides*`);
            return false;
        }
        console.log(`Loaded map ${mapKey}, active sector: ${this.activeSectorId} *claps*`);
        return true;
    }

    updateActiveSector(playerPosition) {
        if (!this.activeMapKey || !this.maps.has(this.activeMapKey)) {
            console.error("No active map! *pouts*");
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
                    console.log(`Switched to sector ${sector.id} at (${playerPosition.x}, ${playerPosition.z})`);
                }
                return true;
            }
        }
        console.warn(`No sector found for player at (${playerPosition.x}, ${playerPosition.z})! *tilts head*`);
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
            console.warn("No active sector! Using fallback tile *pouts*");
            return floorConcrete;
        }
        const sectors = this.maps.get(this.activeMapKey);
        const activeSectorInfo = sectors.find(s => s.id === this.activeSectorId);
        if (!activeSectorInfo) {
            console.warn("Invalid sector info! *hides*");
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
            console.warn(`No grid for map ${mapKey}! *pouts*`);
            return null;
        }
        return mapData.grid;
    }

    getMapFloorTexture(mapKey = this.activeMapKey) {
        const mapData = this.fullMapCache.get(mapKey);
        if (!mapData || !mapData.floorTextureId) {
            console.warn(`No floorTextureId for map ${mapKey}, defaulting to floor_concrete *pouts*`);
            return "floor_concrete";
        }
        const textureKey = floorTextureIdMap.get(mapData.floorTextureId) || "floor_concrete";
        console.log(`Map ${mapKey} using floor texture: ${textureKey} *giggles*`);
        return textureKey;
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
}

export const mapHandler = new MapHandler();