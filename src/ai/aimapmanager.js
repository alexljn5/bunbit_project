// map_01_setup.js
import { registerEnemyAiFunctionsForMap, registerFriendlyAiFunctionsForMap } from "./aihandler.js";
import { casperLesserDemon } from "./casperlesserdemon.js";
import { placeholderAIGodFunction } from "./placeholderai.js";
import { boyKisserNpcAIGodFunction } from "./friendlycat.js";

export function setupMap01() {
    registerEnemyAiFunctionsForMap([
        casperLesserDemon,
        placeholderAIGodFunction
    ]);

    registerFriendlyAiFunctionsForMap([
        boyKisserNpcAIGodFunction
    ]);
}
