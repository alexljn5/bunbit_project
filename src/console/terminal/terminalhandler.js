import { displayTheTerminal } from "./terminal.js";
import { debugCommandsGodFunction } from "./debugcommands.js";

export function terminalGodFunction(command) {
    if (command) {
        debugCommandsGodFunction(command);
    }
    displayTheTerminal();
}