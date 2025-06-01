import { simpleCollissionTest } from "./collissionlogic.js";
import { wallCollision } from "./collissionwalllogic.js";
import { doorInteractionLogic } from "./doorinteractionlogic.js";

export function collissionGodFunction() {
    simpleCollissionTest();
    wallCollision();
    doorInteractionLogic();
}