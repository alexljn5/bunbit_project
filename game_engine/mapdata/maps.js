import { map_01, map_01_sectors, map_01_data } from "./map_01.js";
import { map_02, map_02_sectors, map_02_data } from "./map_02.js";
import { map_debug, map_debug_sectors, map_debug_data } from "./map_debug.js";

export const tileSectors = 50;

export const mapSectorsTable = new Map([
    ["map_01", map_01_sectors],
    ["map_02", map_02_sectors],
    ["map_debug", map_debug_sectors]
]);

export const mapTable = new Map([
    ["map_01", map_01_data],
    ["map_02", map_02_data],
    ["map_debug", map_debug_data]
]);