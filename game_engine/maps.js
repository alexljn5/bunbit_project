import { map_01 } from "./mapdata/map_01.js";
import { map_02 } from "./mapdata/map_02.js";

export const tileSectors = 50;

export const mapTable = new Map();
mapTable.set("map_01", map_01);
mapTable.set("map_02", map_02);