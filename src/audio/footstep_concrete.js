import { mapHandler } from "../mapdata/maphandler.js";

const STEP_COOLDOWN_MS = 280; // adjust for your movement speed

// Your 4 concrete clips (edit if the filenames differ)
const concreteFootsteps = [
    new Audio("./audio/sounds/footsteps/concrete/footstep_concrete_01.mp3"),
    new Audio("./audio/sounds/footsteps/concrete/footstep_concrete_02.mp3"),
    new Audio("./audio/sounds/footsteps/concrete/footstep_concrete_03.mp3"),
    new Audio("./audio/sounds/footsteps/concrete/footstep_concrete_04.mp3"),
];

let lastStepAt = 0;
let lastPlayedIndex = -1;

function pickConcreteClip() {
    if (concreteFootsteps.length <= 1) return 0;
    let idx = Math.floor(Math.random() * concreteFootsteps.length);
    if (idx === lastPlayedIndex) idx = (idx + 1) % concreteFootsteps.length;
    lastPlayedIndex = idx;
    return idx;
}

export function maybePlayConcreteFootstep({ isMoving } = {}) {
    if (!isMoving) return;

    const now = performance.now();
    if (now - lastStepAt < STEP_COOLDOWN_MS) return;

    // Determine floor under player by tile->floorTextureId (from MapHandler)
    const tile = mapHandler.getTile?.(mapHandler?.playerPosition?.x ?? 0, mapHandler?.playerPosition?.z ?? 0);
    // Fallback: if getTile isn't usable here, use the map-level floor id.
    // (This still blocks sounds if map isn't concrete.)
    let floorTextureName = null;
    try {
        // Prefer tile floor texture id when available
        const tx = mapHandler.getMapFloorTexture?.(mapHandler.activeMapKey);
        floorTextureName = tx;
    } catch {
        // ignore
    }

    // Concrete rules in your repo: floorTextureId 50 maps to floor_concrete_01
    const isConcrete = floorTextureName === "floor_concrete_01" || floorTextureName === "floor_concrete";
    if (!isConcrete) return;

    lastStepAt = now;

    const idx = pickConcreteClip();
    const audio = concreteFootsteps[idx];
    audio.volume = 1;
    audio.currentTime = 0;
    audio.play().catch(() => { });
}

