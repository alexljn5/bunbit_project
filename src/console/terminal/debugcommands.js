import { genericGunAmmo, genericGunDamage, genericGunRange } from "../../itemhandler/guns/gunregistry.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";
import { playerHealth, playerStamina } from "../../playerdata/playerlogic.js";
import { ITEM_REGISTRY, AVAILABLE_ITEMS } from "../../itemhandler/itemregistry.js";
import { skyboxEnabled, skyColorTop, skyColorHorizon } from "../../globals.js";
import { transparentWallTextureKeys } from "../../mapdata/maptexturesloader.js";

let godMode = false;
const originalHealth = 100;
const originalStamina = 100;

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
            console.log("\nAvailable items:", Object.entries(AVAILABLE_ITEMS).map(([id, name]) => `${id} (${name})`).join(", "));
            console.log("\nExamples:");
            console.log("/godmode - Toggle god mode");
            console.log("/skybox - Enable skybox");
            console.log("/skyboxcolor #1a0a2e #ff6b35 - Set skybox colors");
            console.log("/transparentwall wall_creamlol - Make creamlol walls invisible");
            break;

        default:
            console.log(`Unknown command: ${cmd}. Type '/help' for available commands.`);
    }
}