import { tileSectors } from "../../mapdata/maps.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";

// Animation state for creamSpin
export let defaultFrameSpeed = 10;
export let creamSpinFrameIndex = 0;
export let creamSpinFrameTimer = 0;
export const creamSpinFrameDelay = defaultFrameSpeed;
export const creamSpinFrameCount = 7;
export let creamSpinLoaded = false;
export const creamSpinWorldPos = { x: 3.0 * tileSectors, z: 650 / 50 * tileSectors };

// Sprite image declarations
export const playerHandSprite = new Image(100, 100);
export let handLoaded = false;
export const pillar01Sprite = new Image();
export let pillar01Loaded = false;
export const creamSpinFrames = [];
export const corpse1Sprite = new Image();
export let corpse1Loaded = false;
export const metalPipeSprite = new Image();
export let metalPipeLoaded = false;
export const spriteState = {
    isMetalPipeCollected: false,
    isNineMmAmmoCollected: false
};
export const metalPipePlayerHandSprite = new Image();
export let metalPipePlayerHandLoaded = false;
export const genericGunSprite = new Image();
export let genericGunSpriteLoaded = false;
export const genericGunPlayerHandSprite = new Image();
export let genericGunPlayerHandLoaded = false;
export const nineMMAmmoSprite = new Image();
export let nineMMAmmoSpriteLoaded = false;
export const boyKisserEnemySprite = new Image();
export let boyKisserEnemySpriteLoaded = false;
export let boyKisserEnemyHealth = 5;
export const casperLesserDemonSprite = new Image();
export let casperLesserDemonSpriteLoaded = false;
export const placeholderAiSprite = new Image();
export let placeholderAiSpriteLoaded = false;

// Set up image loading
playerHandSprite.src = "./img/sprites/playerhand/playerhand_default.png";
playerHandSprite.onload = () => {
    handLoaded = true;
};
playerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_default.png");
};

pillar01Sprite.src = "./img/sprites/decoration/pillar_01.png";
pillar01Sprite.onload = () => {
    pillar01Loaded = true;
};
pillar01Sprite.onerror = () => {
    console.error("Failed to load pillar_01.png");
};

for (let i = 0; i < creamSpinFrameCount; i++) {
    const img = new Image(150, 250);
    img.src = `./img/sprites/creamspin/creamspin${i}.png`;
    img.onload = () => {
        creamSpinFrames[i] = img;
        if (creamSpinFrames.filter(f => f).length === creamSpinFrameCount) {
            creamSpinLoaded = true;
        }
    };
    img.onerror = () => {
        console.error(`Failed to load creamspin${i}.png`);
    };
}

corpse1Sprite.src = "./img/sprites/decoration/corpse_1.png";
corpse1Sprite.onload = () => {
    corpse1Loaded = true;
};
corpse1Sprite.onerror = () => {
    console.error("Failed to load corpse_1.png");
};

metalPipeSprite.src = "./img/sprites/items/metal_pipe.png";
metalPipeSprite.onload = () => {
    metalPipeLoaded = true;
};
metalPipeSprite.onerror = () => {
    console.error("Failed to load metal_pipe.png");
};

metalPipePlayerHandSprite.src = "./img/sprites/playerhand/playerhand_metal_pipe.png";
metalPipePlayerHandSprite.onload = () => {
    metalPipePlayerHandLoaded = true;
};
metalPipePlayerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_metal_pipe.png");
};

genericGunSprite.src = "./img/sprites/items/generic_gun.png";
genericGunSprite.onload = () => {
    genericGunSpriteLoaded = true;
};
genericGunSprite.onerror = () => {
    console.error("Failed to load generic_gun.png");
};

genericGunPlayerHandSprite.src = "./img/sprites/playerhand/playerhand_generic_gun.png";
genericGunPlayerHandSprite.onload = () => {
    genericGunPlayerHandLoaded = true;
};
genericGunPlayerHandSprite.onerror = () => {
    console.error("Failed to load playerhand_generic_gun.png");
};

nineMMAmmoSprite.src = "./img/sprites/items/9mm_ammo_box.png";
nineMMAmmoSprite.onload = () => {
    nineMMAmmoSpriteLoaded = true;
};
nineMMAmmoSprite.onerror = () => {
    console.error("Failed to load 9mm_ammo_box.png");
};

boyKisserEnemySprite.src = "./img/sprites/friendly/friendlycat_1.png";
boyKisserEnemySprite.onload = () => {
    boyKisserEnemySpriteLoaded = true;
};
boyKisserEnemySprite.onerror = () => {
    console.error("Failed to load boykisser.png");
};

casperLesserDemonSprite.src = "./img/sprites/enemy/casperdemon.png";
casperLesserDemonSprite.onload = () => {
    casperLesserDemonSpriteLoaded = true;
};
casperLesserDemonSprite.onerror = () => {
    console.error("Failed to load casperdemon.png");
};

placeholderAiSprite.src = "./img/sprites/enemy/carenemytest.png";
placeholderAiSprite.onload = () => {
    placeholderAiSpriteLoaded = true;
};
placeholderAiSprite.onerror = () => {
    console.error("Failed to load carenemytest.png");
};

if (typeof window !== 'undefined') window.boyKisserEnemyHealth = boyKisserEnemyHealth;
else if (typeof globalThis !== 'undefined') globalThis.boyKisserEnemyHealth = boyKisserEnemyHealth;

export function getCreamSpinCurrentFrame() {
    if (!creamSpinLoaded) return null;
    creamSpinFrameTimer++;
    if (creamSpinFrameTimer >= creamSpinFrameDelay) {
        creamSpinFrameIndex = (creamSpinFrameIndex + 1) % creamSpinFrameCount;
        creamSpinFrameTimer = 0;
    }
    return creamSpinFrames[creamSpinFrameIndex];
}