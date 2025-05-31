import { meleeHandlerGodFunction } from "./meleehandler.js";
import { gunHandlerGodFunction } from "./gunhandler.js";

export function itemHandlerGodFunction() {
    gunHandlerGodFunction();
    meleeHandlerGodFunction();
}