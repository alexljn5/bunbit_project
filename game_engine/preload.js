import { contextBridge } from "electron";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

contextBridge.exposeInMainWorld("gameInfo", {
    name: pkg.name,
    version: pkg.version
});
