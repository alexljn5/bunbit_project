// ============================================================
// DIALOGUE UI STATE HANDLER
// ============================================================
// Handles the DIALOGUE engine state.
// Manages the dialogue box UI, input, and transitions.
// Communicates with DialogueManager for runtime logic.
// ============================================================

import { EngineState } from '../engine/enginestate.js';
import { engineController } from '../engine/engine.js';
import { dialogueManager } from '../dialogue/runtime/dialogue-manager.js';
import { dialogueRenderer } from '../dialogue/renderer/dialogue-renderer.js';
import { loadCharacter } from '../dialogue/loader/character-loader.js';

// Self-register this state handler with the engine controller
engineController.registerHandler(EngineState.DIALOGUE, dialogueHandler);

const DIALOGUE_CONTAINER_ID = 'bunbit-dialogue-container';
let cleanupFn = null;
let currentDialogueId = null;

/**
 * Handler for the DIALOGUE state.
 * Sets up the dialogue UI and connects it to the dialogue manager.
 * @param {object} controller - The engine controller.
 * @param {object} sharedState - Persistent shared state.
 * @param {object} payload - Optional transition payload.
 * @returns {Function} Cleanup function.
 */
export async function dialogueHandler(controller, sharedState, payload = {}) {
    console.log('[Engine] Entering DIALOGUE state');

    const { dialogueId, flags = {}, onComplete } = payload;

    if (!dialogueId) {
        console.warn('[Dialogue] No dialogueId provided in payload. Returning to DASHBOARD.');
        controller.transitionTo(EngineState.DASHBOARD);
        return () => { };
    }

    currentDialogueId = dialogueId;

    // Ensure canvas is hidden during dialogue
    const canvas = document.getElementById('mainGameRender');
    if (canvas) {
        canvas.style.display = 'none';
    }

    // Create dialogue renderer container
    dialogueRenderer.createContainer();

    // Set cinematic state for intro sequence
    if (dialogueId === 'new_game_intro') {
        dialogueRenderer.setCinematicState({
            introActive: true,
            facesVisible: false,
            playerRecognized: false,
        });
    }

    // Load character metadata for rendering
    await loadCharacterMetadataForDialogue();

    // Start the dialogue
    await dialogueManager.startDialogue(dialogueId, flags);

    // Render the first node
    renderCurrentNode();

    // Listen for state changes from the dialogue manager
    const unsubscribeState = dialogueManager.onStateChange((state) => {
        if (state.isActive) {
            renderCurrentNode();
        }
    });

    // Listen for dialogue completion
    const unsubscribeComplete = dialogueManager.onComplete((state) => {
        handleDialogueComplete(controller, onComplete, currentDialogueId);
    });

    // Listen for cinematic events (fade, sigil, face reveal, etc.)
    const cinematicHandler = (e) => {
        const { action, characters } = e.detail || {};
        if (action === 'PLAYER_RECOGNIZED') {
            dialogueRenderer.setCinematicState({ facesVisible: true, playerRecognized: true });
        }
    };
    window.addEventListener('dialogue:cinematic', cinematicHandler);

    // Set up click handler for choices and continue
    const clickHandler = (e) => {
        // Check if a choice button was clicked
        const choiceBtn = e.target.closest('button[data-choice-index]');
        if (choiceBtn) {
            const choiceIndex = parseInt(choiceBtn.dataset.choiceIndex, 10);
            handleChoice(choiceIndex);
            return;
        }

        // Check if continue prompt was clicked
        const continueEl = e.target.closest('[data-dialogue-continue]');
        if (continueEl) {
            handleContinue();
            return;
        }
    };

    document.addEventListener('click', clickHandler);

    // Cleanup function
    cleanupFn = () => {
        document.removeEventListener('click', clickHandler);
        window.removeEventListener('dialogue:cinematic', cinematicHandler);
        unsubscribeState();
        unsubscribeComplete();
        dialogueRenderer.destroyContainer();
        dialogueRenderer.setCinematicState({
            introActive: false,
            facesVisible: true,
            playerRecognized: false,
        });
        if (canvas) canvas.style.display = '';
        currentDialogueId = null;
    };

    return cleanupFn;
}

/**
 * Loads character metadata for all characters referenced in a dialogue.
 * For the initial integration, loads the known characters (patches, vesper).
 */
async function loadCharacterMetadataForDialogue() {
    const knownCharacterIds = ['patches', 'vesper'];

    for (const charId of knownCharacterIds) {
        try {
            const charDef = await loadCharacter(charId);
            dialogueManager.loadCharacter(charDef);
            await dialogueRenderer.loadCharacterMetadata(charDef);
        } catch (e) {
            console.warn(`[Dialogue] Could not load character "${charId}":`, e.message);
        }
    }
}

/**
 * Renders the current dialogue node.
 */
function renderCurrentNode() {
    const state = dialogueManager.getState();
    if (!state.currentNode) return;

    dialogueRenderer.renderNode(state.currentNode);

    // If the node has no choices, add a continue prompt
    const choices = dialogueManager.getChoices();
    if (!choices && state.isActive) {
        dialogueRenderer.renderContinuePrompt();
    }
}

/**
 * Handles a choice selection by the player.
 * @param {number} choiceIndex - The index of the selected choice.
 */
async function handleChoice(choiceIndex) {
    try {
        const state = await dialogueManager.makeChoice(choiceIndex);
        if (state && state.isActive) {
            renderCurrentNode();
        }
    } catch (e) {
        console.error('[Dialogue] Error making choice:', e);
    }
}

/**
 * Handles advancing to the next dialogue node.
 */
async function handleContinue() {
    try {
        const state = await dialogueManager.advance();
        if (state && state.isActive) {
            renderCurrentNode();
        }
    } catch (e) {
        console.error('[Dialogue] Error advancing:', e);
    }
}

/**
 * Handles dialogue completion.
 * @param {object} controller - The engine controller.
 * @param {Function} [onComplete] - Optional callback for when dialogue finishes.
 */
function handleDialogueComplete(controller, onComplete, dialogueId) {
    dialogueRenderer.hide();

    // Reset cinematic state
    dialogueRenderer.setCinematicState({
        introActive: false,
        facesVisible: true,
        playerRecognized: false,
    });

    if (typeof onComplete === 'function') {
        onComplete();
    } else if (dialogueId === 'new_game_intro' && dialogueManager.getFlags()['intro_complete']) {
        // Intro dialogue completed - transition to gameplay
        controller.transitionTo(EngineState.GAMEPLAY);
    } else {
        // Default: return to dashboard
        controller.transitionTo(EngineState.DASHBOARD);
    }
}

export default dialogueHandler;
