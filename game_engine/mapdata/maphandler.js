import { map_01_sectors, map_01 } from "./map_01.js";
import { tileSectors } from "./maps.js";
import { floorConcrete } from "./maptextures.js"; // Fallback tile

export class MapHandler {
    constructor() {
        this.maps = new Map([["map_01", map_01_sectors]]);
        this.fullMapCache = new Map([["map_01", map_01]]);
        this.activeMapKey = null;
        this.activeSector = null;
        this.activeSectorId = null;
        console.log("MapHandler initialized! *twirls* Available maps:", [...this.maps.keys()]);
    }

    loadMap(mapKey, playerPosition) {
        if (!this.maps.has(mapKey)) {
            console.error(`Map ${mapKey} not found! *pouts*`);
            return false;
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
                    // Notify workers of sector change
                    this.notifyWorkers();
                }
                return true;
            }
        }
        console.warn(`No sector found for player at (${playerPosition.x}, ${playerPosition.z})! *tilts head*`);
        this.activeSector = null;
        this.activeSectorId = null;
        return false;
    }

    notifyWorkers() {
        // Placeholder for worker notification (implemented in raycasting.js)
        if (typeof updateWorkersWithSector === "function") {
            updateWorkersWithSector(this.activeSector, this.getSectorBounds());
        }
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
            return null; // Stop rendering out-of-bounds
        }
        const tile = this.activeSector[localY][localX];
        return tile || floorConcrete;
    }

    getFullMap(mapKey = this.activeMapKey) {
        return this.fullMapCache.get(mapKey) || null;
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