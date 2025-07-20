import { genericGunAmmo, genericGunDamage, genericGunRange } from "../../itemhandler/guns/gunregistry.js";
import { playerInventory, inventoryState } from "../../playerdata/playerinventory.js";

const AVAILABLE_ITEMS = {
    "metal_pipe": "Metal Pipe",
    "generic_gun": "Generic Gun"
};

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

        case "help":
            console.log("Available commands (use / or . prefix):");
            console.log("setammo <amount> - Set generic gun ammo");
            console.log("setdamage <amount> - Set generic gun damage");
            console.log("setrange <amount> - Set generic gun range");
            console.log("giveitem <item_id> - Add item to inventory");
            console.log("clearinv - Clear inventory");
            console.log("\nAvailable items:", Object.entries(AVAILABLE_ITEMS).map(([id, name]) => `${id} (${name})`).join(", "));
            console.log("\nExamples:");
            console.log("/setammo 100 or .setammo 100");
            console.log("/giveitem metal_pipe or .giveitem generic_gun");
            break;

        default:
            console.log(`Unknown command: ${cmd}. Type '/help' for available commands.`);
    }
}