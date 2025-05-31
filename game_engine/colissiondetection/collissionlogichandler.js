import { simpleCollissionTest } from "./collissionlogic.js";
import { wallCollision } from "./collissionlogic.js";
import { doorInteractionLogic } from "./doorinteractionlogic.js";

export function collissionGodFunction() {
    simpleCollissionTest();
    wallCollision();
    doorInteractionLogic();
}