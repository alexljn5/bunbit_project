import { simpleCollissionTest } from "./collissionlogic.js";
import { wallCollision } from "./collissionwalllogic.js";
import { doorInteractionLogic } from "./doorinteractionlogic.js";

// Cleaned up collision logic handler for clarity and maintainability
export function collissionGodFunction() {
    simpleCollissionTest();
    wallCollision();
    doorInteractionLogic();
}