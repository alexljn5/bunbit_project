// map_01_setup.js
import { registerEnemyAiFunctionsForMap, registerFriendlyAiFunctionsForMap } from "../ai/aihandler.js";
import { casperLesserDemon } from "../ai/casperlesserdemon.js";
import { placeholderAIGodFunction } from "../ai/placeholderai.js";
import { boyKisserNpcAIGodFunction } from "../ai/friendlycat.js";

export function setupMap01() {
    registerEnemyAiFunctionsForMap([
        casperLesserDemon,
        placeholderAIGodFunction
    ]);

    registerFriendlyAiFunctionsForMap([
        boyKisserNpcAIGodFunction
    ]);
}
