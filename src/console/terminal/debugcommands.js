import { genericGunAmmo, genericGunDamage, genericGunRange } from "../../itemhandler/guns/gunregistry.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { playerHealth, playerStamina } from "../../playerdata/playerlogic.js";
import { ITEM_REGISTRY, AVAILABLE_ITEMS } from "../../itemhandler/itemregistry.js";
import { skyboxEnabled, skyColorTop, skyColorHorizon, floorTextureOverride, setFloorTextureOverride } from "../../globals.js";
import { transparentWallTextureKeys, tileTexturesMap } from "../../mapdata/maptexturesloader.js";
import { spriteManager, Sprite, LAYERS } from "../../rendering/sprites/rendersprites.js";
import { initPlaceholderAIHealth } from "../../ai/airegistry.js";
import { mapHandler } from "../../mapdata/maphandler.js";
import { tileSectors } from "../../mapdata/maps.js";
import { placeholderAiSprite, placeholderAiSpriteLoaded, casperLesserDemonSprite, casperLesserDemonSpriteLoaded, boyKisserEnemySprite, boyKisserEnemySpriteLoaded } from "../../rendering/sprites/spritetextures.js";

let godMode = false;
const originalHealth = 100;
const originalStamina = 100;
const spawnedEnemies = new Set();

function getValidSpawnPosition(mapGrid, count) {
    const positions = [];
    const rows = mapGrid.length;
    const cols = mapGrid[0]?.length || 0;
    const maxAttempts = count * 50;
    let attempts = 0;
    while (positions.length < count && attempts < maxAttempts) {
        const x = 2 + Math.floor(Math.random() * (cols - 4));
        const z = 2 + Math.floor(Math.random() * (rows - 4));
        const tile = mapGrid[z]?.[x];
        if (tile && tile.type !== "wall") {
            const worldPos = { x: x * tileSectors, z: z * tileSectors };
            if (!positions.some(p => Math.abs(p.x - worldPos.x) < tileSectors && Math.abs(p.z - worldPos.z) < tileSectors)) {
                positions.push(worldPos);
            }
        }
        attempts++;
    }
    return positions;
}

function createEnemySprite(id, image, isLoaded, worldPos) {
    return new Sprite({
        id,
        image,
        worldPos,
        isLoaded,
        layer: LAYERS.MIDGROUND,
        baseWidthRatio: 128 / 800,
        baseHeightRatio: 80 / 800,
        aspectRatio: 128 / 80,
        baseYRatio: 400 / 800,
        scaleFactor: 0.5,
    });
}

export function debugCommandsGodFunction(command) {
    console.log(`Processing command: ${command}`);
    if (!command.startsWith("/") && !command.startsWith(".")) {
        console.log("Command must start with '/' or '.'. Type '/help' or '.help' for available commands.");
        return;
    }

    const [cmd, ...args] = command.slice(1).split(" ");
    switch (cmd.toLowerCase()) {
        case "setammo":
            if (args.length !== 1 || isNaN(args[0])) {
                console.log("Usage: /setammo <amount>");
                return;
            }
            const ammoAmount = parseInt(args[0]);
            if (ammoAmount < 0) {
                console.log("Ammo amount must be non-negative");
                return;
            }
            genericGunAmmo.current = ammoAmount;
            console.log(`Set genericGunAmmo to ${ammoAmount}`);
            break;

        case "setdamage":
            if (args.length !== 1 || isNaN(args[0])) {
                console.log("Usage: /setdamage <amount>");
                return;
            }
            const damageAmount = parseInt(args[0]);
            if (damageAmount < 0) {
                console.log("Damage amount must be non-negative");
                return;
            }
            genericGunDamage.value = damageAmount;
            console.log(`Set genericGunDamage to ${damageAmount}`);
            break;

        case "setrange":
            if (args.length !== 1 || isNaN(args[0])) {
                console.log("Usage: /setrange <amount>");
                return;
            }
            const rangeAmount = parseInt(args[0]);
            if (rangeAmount < 0) {
                console.log("Range amount must be non-negative");
                return;
            }
            genericGunRange.value = rangeAmount;
            console.log(`Set genericGunRange to ${rangeAmount}`);
            break;

        case "giveitem":
            if (args.length !== 1) {
                console.log("Usage: /giveitem <item_id>");
                console.log("Available items:", Object.entries(AVAILABLE_ITEMS).map(([id, name]) => `${id} (${name})`).join(", "));
                return;
            }
            const itemId = args[0].toLowerCase();
            if (!AVAILABLE_ITEMS[itemId]) {
                console.log("Unknown item. Available items:", Object.entries(AVAILABLE_ITEMS).map(([id, name]) => `${id} (${name})`).join(", "));
                return;
            }
            if (playerInventory.length >= 9) {
                console.log("Inventory is full! (Max 9 slots)");
                return;
            }
            playerInventory.push(itemId);
            console.log(`Added ${AVAILABLE_ITEMS[itemId]} to inventory`);
            break;

        case "clearinv":
            playerInventory.length = 0;
            console.log("Inventory cleared");
            break;

        case "godmode":
            godMode = !godMode;
            if (godMode) {
                console.log("God Mode activated - Infinite health and stamina enabled");
                playerHealth.playerHealth = 999999;
                playerStamina.stamina = 999999;
            } else {
                console.log("God Mode deactivated - Normal health and stamina restored");
                playerHealth.playerHealth = originalHealth;
                playerStamina.stamina = originalStamina;
            }
            break;

        case "skybox":
            skyboxEnabled = !skyboxEnabled;
            console.log(`Skybox ${skyboxEnabled ? 'enabled' : 'disabled'}`);
            if (skyboxEnabled) {
                console.log(`  Top color: ${skyColorTop}`);
                console.log(`  Horizon color: ${skyColorHorizon}`);
                console.log("  Use /skyboxcolor <top> <horizon> to change colors");
            }
            break;

        case "skyboxcolor":
            if (args.length >= 2) {
                skyColorTop = args[0];
                skyColorHorizon = args[1];
                console.log(`Skybox colors updated: top=${skyColorTop}, horizon=${skyColorHorizon}`);
            } else {
                console.log("Usage: /skyboxcolor <top_color> <horizon_color>");
                console.log("Example: /skyboxcolor #1a0a2e #ff6b35");
            }
            break;

        case "transparentwall":
            if (args.length >= 1) {
                const textureKey = args[0];
                if (transparentWallTextureKeys.has(textureKey)) {
                    transparentWallTextureKeys.delete(textureKey);
                    console.log(`Removed ${textureKey} from transparent walls`);
                } else {
                    transparentWallTextureKeys.add(textureKey);
                    console.log(`Added ${textureKey} to transparent walls (invisible but blocks rays)`);
                }
            } else {
                console.log("Current transparent wall textures:", Array.from(transparentWallTextureKeys).join(", ") || "none");
                console.log("Usage: /transparentwall <texture_key>");
                console.log("Example: /transparentwall wall_creamlol");
            }
            break;

        case "spawnenemy":
            if (args.length < 1) {
                console.log("Usage: /spawnenemy <type> [count]");
                console.log("Types: placeholderai, lesserdemon, boykisser");
                return;
            }
            const enemyType = args[0].toLowerCase();
            const count = args[1] ? parseInt(args[1]) : 1;
            if (isNaN(count) || count < 1) {
                console.log("Count must be a positive number");
                return;
            }
            const currentMap = mapHandler.getFullMap();
            if (!currentMap || !Array.isArray(currentMap) || !currentMap[0]) {
                console.log("No valid map loaded!");
                return;
            }
            const positions = getValidSpawnPosition(currentMap, count);
            if (positions.length === 0) {
                console.log("No valid spawn positions found on current map!");
                return;
            }
            const activeMapKey = mapHandler.activeMapKey || "map_01";
            let spawned = 0;
            for (let i = 0; i < Math.min(count, positions.length); i++) {
                const pos = positions[i];
                let spriteId, image, isLoaded;
                if (enemyType === "placeholderai") {
                    let idx = 0;
                    while (spriteManager.getSprite(`placeholderAI_${idx}`)) idx++;
                    spriteId = `placeholderAI_${idx}`;
                    image = placeholderAiSprite;
                    isLoaded = placeholderAiSpriteLoaded;
                    initPlaceholderAIHealth(spriteId);
                } else if (enemyType === "lesserdemon") {
                    let idx = 1;
                    while (spriteManager.getSprite(`casperLesserDemon_${idx}`)) idx++;
                    spriteId = `casperLesserDemon_${idx}`;
                    image = casperLesserDemonSprite;
                    isLoaded = casperLesserDemonSpriteLoaded;
                } else if (enemyType === "boykisser") {
                    let idx = 1;
                    while (spriteManager.getSprite(`boyKisser_${idx}`)) idx++;
                    spriteId = `boyKisser_${idx}`;
                    image = boyKisserEnemySprite;
                    isLoaded = boyKisserEnemySpriteLoaded;
                } else {
                    console.log(`Unknown enemy type: ${enemyType}. Types: placeholderai, lesserdemon, boykisser`);
                    break;
                }
                const sprite = createEnemySprite(spriteId, image, isLoaded, pos);
                spriteManager.addSprite(sprite, activeMapKey);
                spriteManager.sprites.set(spriteId, sprite);
                spriteManager.layers[LAYERS.MIDGROUND].push(sprite);
                spawnedEnemies.add(spriteId);
                spawned++;
                console.log(`Spawned ${enemyType} at (${pos.x}, ${pos.z}) as ${spriteId}`);
            }
            console.log(`Spawned ${spawned} ${enemyType} enemy(ies) on ${activeMapKey}`);
            break;

        case "setfloortexture":
            if (args.length < 1) {
                console.log("Usage: /setfloortexture <texture_key>");
                console.log("Available: floor_concrete_01, floor_test, wall_creamlol, wall_brick, wall_aldi, wall_satanic, wall_schizoeye, door_rusty_01, wall_brick_graffiti_01, wall_laughing_demon, wall_brick_door01_open, wall_brick_door01_closed, wall_fence_test, wall_brick_cream, wall_brick_eye, wall_casper_01");
                if (floorTextureOverride) {
                    console.log(`Current override: ${floorTextureOverride}`);
                }
                return;
            }
            const textureKey = args[0];
            if (!tileTexturesMap.has(textureKey)) {
                console.log(`Unknown texture key: ${textureKey}`);
                console.log("Use /setfloortexture without args to see available textures");
                return;
            }
            setFloorTextureOverride(textureKey);
            console.log(`Floor texture override set to: ${textureKey}`);
            console.log("Use /resetfloortexture to restore the original floor texture");
            break;

        case "resetfloortexture":
            setFloorTextureOverride(null);
            console.log("Floor texture override cleared - using original map floor texture");
            break;

        case "clearenemies":
            let cleared = 0;
            const enemyIds = [...spawnedEnemies];
            for (const spriteId of enemyIds) {
                spriteManager.removeSprite(spriteId);
                spawnedEnemies.delete(spriteId);
                cleared++;
            }
            console.log(`Cleared ${cleared} spawned enemy(ies)`);
            break;

        case "help":
            console.log("Available commands (use / or . prefix):");
            console.log("godmode - Toggle infinite health and stamina");
            console.log("setammo <amount> - Set generic gun ammo");
            console.log("setdamage <amount> - Set generic gun damage");
            console.log("setrange <amount> - Set generic gun range");
            console.log("giveitem <item_id> - Add item to inventory");
            console.log("clearinv - Clear inventory");
            console.log("skybox - Toggle skybox rendering (replaces roof with gradient)");
            console.log("skyboxcolor <top> <horizon> - Set skybox gradient colors");
            console.log("transparentwall <texture_key> - Toggle wall transparency");
            console.log("spawnenemy <type> [count] - Spawn enemies (placeholderai, lesserdemon, boykisser)");
            console.log("setfloortexture <key> - Override floor texture for screenshots");
            console.log("resetfloortexture - Restore original floor texture");
            console.log("clearenemies - Remove all spawned enemies");
            console.log("\nAvailable items:", Object.entries(AVAILABLE_ITEMS).map(([id, name]) => `${id} (${name})`).join(", "));
            console.log("\nExamples:");
            console.log("/godmode - Toggle god mode");
            console.log("/skybox - Enable skybox");
            console.log("/skyboxcolor #1a0a2e #ff6b35 - Set skybox colors");
            console.log("/transparentwall wall_creamlol - Make creamlol walls invisible");
            console.log("/spawnenemy placeholderai 10 - Spawn 10 placeholder enemies");
            console.log("/setfloortexture wall_brick - Change floor to brick texture");
            break;

        default:
            console.log(`Unknown command: ${cmd}. Type '/help' for available commands.`);
    }
}