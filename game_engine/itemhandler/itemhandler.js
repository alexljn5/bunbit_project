import { meleeHandlerGodFunction } from "./meleehandler.js";
import { gunHandlerGodFunction } from "./guns/gunhandler.js";

// Cleaned up item handler for clarity and maintainability
export function itemHandlerGodFunction() {
    gunHandlerGodFunction();
    meleeHandlerGodFunction();
}