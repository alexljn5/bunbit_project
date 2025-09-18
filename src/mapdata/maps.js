import { map_01_sectors, map_01_data } from "./map_01.js";
import { map_02_sectors, map_02_data } from "./map_02.js";
import { map_03_data, map_03_sectors } from "./map_03.js";
import { map_04_data, map_04_sectors } from "./map_04.js";
import { map_05_data, map_05_sectors } from "./map_05.js";
import { map_06_data, map_06_sectors } from "./map_06.js";
import { map_07_data, map_07_sectors } from "./map_07.js";
import { map_debug_sectors, map_debug_data } from "./map_debug.js";
import { map_test_sectors, map_test_data } from "./map_test.js";


export const tileSectors = 50;

export const mapSectorsTable = new Map([
    ["map_01", map_01_sectors],
    ["map_02", map_02_sectors],
    ["map_03", map_03_sectors],
    ["map_04", map_04_sectors],
    ["map_05", map_05_sectors],
    ["map_06", map_06_sectors],
    ["map_07", map_07_sectors],
    ["map_debug", map_debug_sectors],
    ["map_test", map_test_sectors]
]);

export const mapTable = new Map([
    ["map_01", map_01_data],
    ["map_02", map_02_data],
    ["map_03", map_03_data],
    ["map_04", map_04_data],
    ["map_05", map_05_data],
    ["map_06", map_06_data],
    ["map_07", map_07_data],
    ["map_debug", map_debug_data],
    ["map_test", map_test_data]
]);
