import { buildMapGrid } from "./maputils.js";
import { emptyTile, floorConcrete, floorTextureIdMap } from "./maptextures.js"; // game_engine/mapdata/maps.js
import { map_01_sectors, map_01_data } from "./map_01.js";
import { map_02, map_02_sectors, map_02_data } from "./map_02.js";
import { map_debug, map_debug_sectors, map_debug_data } from "./map_debug.js";
import { map_test, map_test_sectors, map_test_data } from "./map_test.js";

export const tileSectors = 50;

export const mapSectorsTable = new Map([
    ["map_01", map_01_sectors],
    ["map_02", map_02_sectors],
    ["map_debug", map_debug_sectors],
    ["map_test", map_test_sectors]
]);

export const mapTable = new Map([
    ["map_01", map_01_data],
    ["map_02", map_02_data],
    ["map_debug", map_debug_data],
    ["map_test", map_test_data]
]);
