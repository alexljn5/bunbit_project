import { playerPosition, playerHealth, playerStamina } from "../playerdata/playerlogic.js";
import { playerInventory, inventoryState } from "../playerdata/playerinventory.js";
import {
    casperLesserDemonPreviousPos, lastKnownPlayerPos as casperLastKnownPlayerPos,
    canSeePlayer as casperCanSeePlayer, isPeeking, peekStartTime,
    setCanSeePlayer as setCasperCanSeePlayer, setIsPeeking, setPeekStartTime
} from "../ai/casperlesserdemon.js";
import {
    npcLastTriggered, dialogueActive, dialogueLines,
    currentDialogueIndex, lastInteractionState, playerMovementDisabled,
    justReceivedGun, showGunPickupBox, gunPickupTimer, lastKnownPlayerPos as boyKisserLastKnownPlayerPos,
    canSeePlayer as boyKisserCanSeePlayer, boyKisserPreviousPos, boyKisserEnemyHealth,
    setCanSeePlayer as setBoyKisserCanSeePlayer, setNpcLastTriggered, setDialogueActive,
    setDialogueLines, setCurrentDialogueIndex, setLastInteractionState,
    setPlayerMovementDisabled, setJustReceivedGun, setShowGunPickupBox,
    setGunPickupTimer, setBoyKisserEnemyHealth
} from "../ai/friendlycat.js";
import { spriteManager } from "../rendering/sprites/rendersprites.js";
import { genericGunAmmo, setGenericGunAmmo } from "../itemhandler/guns/gunregistry.js";

export function saveGame() {
    const gameState = {
        player: {
            position: { ...playerPosition }, // Copy x, z, angle
            health: playerHealth.playerHealth,
            stamina: playerStamina.playerStaminaBar,
            inventory: [...playerInventory], // Copy inventory array
            selectedInventoryIndex: inventoryState.selectedInventoryIndex
        },
        casperLesserDemon: {
            position: spriteManager.getSprite("casperLesserDemon")?.worldPos ?
                { ...spriteManager.getSprite("casperLesserDemon").worldPos } : null,
            previousPosition: { ...casperLesserDemonPreviousPos },
            lastKnownPlayerPos: casperLastKnownPlayerPos ? { ...casperLastKnownPlayerPos } : null,
            canSeePlayer: casperCanSeePlayer,
            isPeeking: isPeeking,
            peekStartTime: peekStartTime
        },
        boyKisser: {
            position: spriteManager.getSprite("boyKisser")?.worldPos ?
                { ...spriteManager.getSprite("boyKisser").worldPos } : null,
            previousPosition: { ...boyKisserPreviousPos },
            lastKnownPlayerPos: boyKisserLastKnownPlayerPos ? { ...boyKisserLastKnownPlayerPos } : null,
            canSeePlayer: boyKisserCanSeePlayer,
            npcLastTriggered: npcLastTriggered,
            dialogueActive: dialogueActive,
            dialogueLines: [...dialogueLines],
            currentDialogueIndex: currentDialogueIndex,
            lastInteractionState: lastInteractionState,
            playerMovementDisabled: playerMovementDisabled,
            justReceivedGun: justReceivedGun,
            showGunPickupBox: showGunPickupBox,
            gunPickupTimer: gunPickupTimer,
            health: boyKisserEnemyHealth
        },
        weapons: {
            genericGunAmmo: genericGunAmmo.current
        },
        timestamp: new Date().toISOString() // Track when saved
    };

    try {
        const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
        saveAs(blob, 'save.json'); // FileSaver.js triggers download
        console.log("Game saved as save.json! Yay! 🐰");
        return true;
    } catch (error) {
        console.error("Oh no! Couldn’t save the game:", error);
        return false;
    }
}

export function loadGame(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            console.log("No save file selected! Let’s start fresh!");
            resolve(false);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const gameState = JSON.parse(event.target.result);

                // Restore player data
                playerPosition.x = gameState.player.position.x;
                playerPosition.z = gameState.player.position.z;
                playerPosition.angle = gameState.player.position.angle;
                playerHealth.playerHealth = gameState.player.health;
                playerStamina.playerStaminaBar = gameState.player.stamina;
                playerInventory.length = 0; // Clear current inventory
                playerInventory.push(...gameState.player.inventory);
                inventoryState.selectedInventoryIndex = gameState.player.selectedInventoryIndex;

                // Restore Casper Lesser Demon
                const casperSprite = spriteManager.getSprite("casperLesserDemon");
                if (casperSprite && gameState.casperLesserDemon.position) {
                    casperSprite.worldPos = { ...gameState.casperLesserDemon.position };
                }
                casperLesserDemonPreviousPos.x = gameState.casperLesserDemon.previousPosition.x;
                casperLesserDemonPreviousPos.z = gameState.casperLesserDemon.previousPosition.z;
                if (gameState.casperLesserDemon.lastKnownPlayerPos) {
                    if (!casperLastKnownPlayerPos) casperLastKnownPlayerPos = {};
                    casperLastKnownPlayerPos.x = gameState.casperLesserDemon.lastKnownPlayerPos.x;
                    casperLastKnownPlayerPos.z = gameState.casperLesserDemon.lastKnownPlayerPos.z;
                } else {
                    casperLastKnownPlayerPos = null;
                }
                setCasperCanSeePlayer(gameState.casperLesserDemon.canSeePlayer);
                setIsPeeking(gameState.casperLesserDemon.isPeeking);
                setPeekStartTime(gameState.casperLesserDemon.peekStartTime);

                // Restore BoyKisser NPC
                const boyKisserSprite = spriteManager.getSprite("boyKisser");
                if (boyKisserSprite && gameState.boyKisser.position) {
                    boyKisserSprite.worldPos = { ...gameState.boyKisser.position };
                }
                boyKisserPreviousPos.x = gameState.boyKisser.previousPosition.x;
                boyKisserPreviousPos.z = gameState.boyKisser.previousPosition.z;
                if (gameState.boyKisser.lastKnownPlayerPos) {
                    if (!boyKisserLastKnownPlayerPos) boyKisserLastKnownPlayerPos = {};
                    boyKisserLastKnownPlayerPos.x = gameState.boyKisser.lastKnownPlayerPos.x;
                    boyKisserLastKnownPlayerPos.z = gameState.boyKisser.lastKnownPlayerPos.z;
                } else {
                    boyKisserLastKnownPlayerPos = null;
                }
                setBoyKisserCanSeePlayer(gameState.boyKisser.canSeePlayer);
                setNpcLastTriggered(gameState.boyKisser.npcLastTriggered);
                setDialogueActive(gameState.boyKisser.dialogueActive);
                setDialogueLines([...gameState.boyKisser.dialogueLines]);
                setCurrentDialogueIndex(gameState.boyKisser.currentDialogueIndex);
                setLastInteractionState(gameState.boyKisser.lastInteractionState);
                setPlayerMovementDisabled(gameState.boyKisser.playerMovementDisabled);
                setJustReceivedGun(gameState.boyKisser.justReceivedGun);
                setShowGunPickupBox(gameState.boyKisser.showGunPickupBox);
                setGunPickupTimer(gameState.boyKisser.gunPickupTimer);
                setBoyKisserEnemyHealth(gameState.boyKisser.health);

                // Restore weapons
                setGenericGunAmmo(gameState.weapons.genericGunAmmo);

                console.log("Game loaded from save.json! Ready to play! *giggles*");
                resolve(true);
            } catch (error) {
                console.error("Oh no! Couldn’t load the game:", error);
                reject(error);
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading save file:", error);
            reject(error);
        };
        reader.readAsText(file);
    });
}