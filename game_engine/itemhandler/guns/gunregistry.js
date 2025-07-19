import { playerPosition } from "../../playerdata/playerlogic.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";

export let genericGunDamage = { value: 10 };
export let genericGunRange = { value: 200 };
export let genericGunAmmo = { current: 10 };

export function setGenericGunAmmo(value) {
    if (typeof value !== "number" || value < 0) {
        console.error("setGenericGunAmmo: Value must be a non-negative number");
        return;
    }
    genericGunAmmo.current = value;
    console.log(`genericGunAmmo set to ${value}`);
}

export class Bullet {
    constructor(x, z, angle, damage, speed = 300) {
        this.x = x;
        this.z = z;
        this.angle = angle;
        this.damage = damage;
        this.speed = speed;
        this.distanceTraveled = 0;
    }

    update(deltaTime, maxRange) {
        const dx = Math.cos(this.angle) * this.speed * deltaTime;
        const dz = Math.sin(this.angle) * this.speed * deltaTime;
        this.x += dx;
        this.z += dz;
        this.distanceTraveled += Math.sqrt(dx * dx + dz * dz);
        return this.distanceTraveled <= maxRange;
    }

    render(renderEngine, SCALE_X, SCALE_Y) {
        renderEngine.save();
        renderEngine.fillStyle = "white";
        renderEngine.translate(this.x * SCALE_X, this.z * SCALE_Y);
        renderEngine.rotate(this.angle);
        renderEngine.fillRect(-2 * SCALE_X, -1 * SCALE_Y, 4 * SCALE_X, 2 * SCALE_Y);
        renderEngine.restore();
    }
}

export function shootBullet() {
    if (playerInventory[inventoryState.selectedInventoryIndex] !== "generic_gun") {
        console.log("Generic gun not selected");
        return null;
    }
    if (genericGunAmmo.current <= 0) {
        console.log("No ammo for generic gun");
        return null;
    }
    genericGunAmmo.current--;
    console.log(`Shot fired, ammo remaining: ${genericGunAmmo.current}`);
    return new Bullet(
        playerPosition.x,
        playerPosition.z,
        playerPosition.angle,
        genericGunDamage.value
    );
}