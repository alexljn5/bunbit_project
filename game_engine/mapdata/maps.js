import { map_01 } from "./map_01.js";
import { map_02 } from "./map_02.js";

// Cleaned up maps data for clarity and maintainability
export const tileSectors = 50;

export const mapTable = new Map();
mapTable.set("map_01", map_01);
mapTable.set("map_02", map_02);