import { genericGunAmmo, genericGunDamage, genericGunRange } from "../../itemhandler/guns/gunregistry.js";

export function debugCommandsGodFunction(command) {
    console.log(`Processing command: ${command}`);
    if (!command.startsWith("/")) {
        console.log("Command must start with '/'. Type '/help' for available commands.");
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

        case "help":
            console.log("Available commands:");
            console.log("/setammo <amount> - Set generic gun ammo");
            console.log("/setdamage <amount> - Set generic gun damage");
            console.log("/setrange <amount> - Set generic gun range");
            break;

        default:
            console.log(`Unknown command: ${cmd}. Type '/help' for available commands.`);
    }
}