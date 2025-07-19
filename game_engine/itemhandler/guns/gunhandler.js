import { shootBullet, genericGunRange } from "./gunregistry.js";
import { renderEngine } from "../../rendering/renderengine.js";
import { SCALE_X, SCALE_Y } from "../../globals.js";
import { keys } from "../../playerdata/playerlogic.js";
import { genericGunHandler } from "./genericgun.js";

let bullets = [];

export function gunHandlerGodFunction(deltaTime) {
    const bullet = genericGunHandler();
    if (bullet) {
        bullets.push(bullet);
    }
    bullets = bullets.filter(bullet => bullet.update(deltaTime, genericGunRange.value));
    bullets.forEach(bullet => bullet.render(renderEngine, SCALE_X, SCALE_Y));
}