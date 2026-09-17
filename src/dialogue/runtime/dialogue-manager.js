// ============================================================
// DIALOGUE MANAGER (Runtime)
// ============================================================
// Core runtime for dialogue graphs.
// Responsibilities:
//   - Load dialogue graphs
//   - Track current dialogue ID and node ID
//   - Resolve next nodes
//   - Evaluate conditions
//   - Execute events
//   - Expose current dialogue state
//
// Does NOT:
//   - Render text
//   - Create UI
//   - Manipulate screens
// ============================================================

import { loadDialogue, optimiseDialogueGraph, resolveNextNode } from '../loader/dialogue-loader.js';
import { evaluateCondition } from '../conditions/condition-manager.js';
import { dialogueEventSystem } from '../events/dialogue-events.js';

/**
 * @typedef {object} DialogueState
 * @property {string|null} dialogueId - Current dialogue graph ID.
 * @property {string|null} nodeId - Current node ID.
 * @property {object|null} currentNode - Current node data.
 * @property {boolean} isActive - Whether a dialogue is currently running.
 * @property {boolean} isComplete - Whether the dialogue has finished.
 * @property {object} flags - Current game flags.
 * @property {object|null} lastChoice - The last choice made (if any).
 */

export class DialogueManager {
    constructor() {
        /** @type {Map<string, object>} Loaded dialogue graphs, keyed by dialogue ID. */
        this._dialogues = new Map();

        /** @type {Map<string, object>} Loaded character metadata, keyed by character ID. */
        this._characters = new Map();

        /** @type {DialogueState} Current dialogue state. */
        this._state = {
            dialogueId: null,
            nodeId: null,
            currentNode: null,
            isActive: false,
            isComplete: false,
            flags: {},
            lastChoice: null,
        };

        /** @type {Function[]} Listeners for state changes. */
        this._listeners = [];

        /** @type {Function[]} Listeners for dialogue completion. */
        this._completionListeners = [];
    }

    // ─── State Access ──────────────────────────────────

    /**
     * Returns the current dialogue state (read-only copy).
     * @returns {DialogueState}
     */
    getState() {
        return { ...this._state };
    }

    /**
     * Returns whether a dialogue is currently active.
     * @returns {boolean}
     */
    get isActive() {
        return this._state.isActive;
    }

    /**
     * Returns whether the current dialogue has completed.
     * @returns {boolean}
     */
    get isComplete() {
        return this._state.isComplete;
    }

    // ─── Dialogue Loading ──────────────────────────────

    /**
     * Loads a dialogue graph by ID.
     * @param {string} dialogueId - The dialogue ID (filename without .json).
     * @returns {Promise<void>}
     */
    async loadDialogue(dialogueId) {
        const graph = await loadDialogue(dialogueId);
        const optimised = optimiseDialogueGraph(graph);
        this._dialogues.set(dialogueId, optimised);
    }

    /**
     * Pre-loads multiple dialogue graphs.
     * @param {string[]} dialogueIds - Array of dialogue IDs.
     * @returns {Promise<void>}
     */
    async loadDialogues(dialogueIds) {
        const loadPromises = dialogueIds.map((id) => this.loadDialogue(id));
        await Promise.all(loadPromises);
    }

    /**
     * Checks if a dialogue graph is loaded.
     * @param {string} dialogueId - The dialogue ID.
     * @returns {boolean}
     */
    hasDialogue(dialogueId) {
        return this._dialogues.has(dialogueId);
    }

    // ─── Character Loading ─────────────────────────────

    /**
     * Loads character metadata.
     * @param {object} characterDef - Character metadata object.
     */
    loadCharacter(characterDef) {
        this._characters.set(characterDef.id, characterDef);
    }

    /**
     * Loads multiple character metadata objects.
     * @param {object[]} characterDefs - Array of character metadata objects.
     */
    loadCharacters(characterDefs) {
        for (const def of characterDefs) {
            this._characters.set(def.id, def);
        }
    }

    /**
     * Gets character metadata by ID.
     * @param {string} characterId - The character ID.
     * @returns {object|null}
     */
    getCharacter(characterId) {
        return this._characters.get(characterId) || null;
    }

    // ─── Dialogue Execution ────────────────────────────

    /**
     * Starts a dialogue by ID, beginning at the start node.
     * @param {string} dialogueId - The dialogue graph ID.
     * @param {object} [flags={}] - Initial game flags.
     * @returns {Promise<DialogueState>}
     */
    async startDialogue(dialogueId, flags = {}) {
        if (!this._dialogues.has(dialogueId)) {
            await this.loadDialogue(dialogueId);
        }

        const graph = this._dialogues.get(dialogueId);
        const startNodeId = graph.startNode;
        const startNode = graph.getNode(startNodeId);

        if (!startNode) {
            throw new Error(`[DialogueManager] Start node "${startNodeId}" not found in dialogue "${dialogueId}".`);
        }

        this._state = {
            dialogueId,
            nodeId: startNodeId,
            currentNode: startNode,
            isActive: true,
            isComplete: false,
            flags: { ...flags },
            lastChoice: null,
        };

        this._notifyListeners();
        return this.getState();
    }

    /**
     * Advances to the next node in the current dialogue.
     * For choice nodes, use `makeChoice` instead.
     * @returns {Promise<DialogueState|null>} The new state, or null if dialogue ended.
     */
    async advance() {
        if (!this._state.isActive) {
            console.warn('[DialogueManager] No active dialogue to advance.');
            return null;
        }

        const graph = this._dialogues.get(this._state.dialogueId);
        if (!graph) {
            throw new Error(`[DialogueManager] Dialogue "${this._state.dialogueId}" not loaded.`);
        }

        // Execute events on the current node before advancing
        this._executeNodeEvents(this._state.currentNode);

        // Resolve the next node
        const { nextNodeId } = resolveNextNode(graph, this._state.nodeId, this._state.flags);

        if (!nextNodeId) {
            // No next node — dialogue ends
            this._state.isActive = false;
            this._state.isComplete = true;
            this._notifyListeners();
            this._notifyCompletionListeners();
            return this.getState();
        }

        // O(1) node lookup
        const nextNode = graph.getNode(nextNodeId);
        if (!nextNode) {
            throw new Error(`[DialogueManager] Node "${nextNodeId}" not found in dialogue "${this._state.dialogueId}".`);
        }

        this._state.nodeId = nextNodeId;
        this._state.currentNode = nextNode;
        this._state.lastChoice = null;

        this._notifyListeners();
        return this.getState();
    }

    /**
     * Makes a choice from a choice node.
     * @param {number} choiceIndex - The index of the chosen option.
     * @returns {Promise<DialogueState>} The new state.
     */
    async makeChoice(choiceIndex) {
        if (!this._state.isActive) {
            throw new Error('[DialogueManager] No active dialogue to make a choice in.');
        }

        const node = this._state.currentNode;
        if (!node.choices || !node.choices.length) {
            throw new Error(`[DialogueManager] Current node "${this._state.nodeId}" has no choices.`);
        }

        if (choiceIndex < 0 || choiceIndex >= node.choices.length) {
            throw new Error(`[DialogueManager] Invalid choice index ${choiceIndex}. Node has ${node.choices.length} choices.`);
        }

        const choice = node.choices[choiceIndex];

        // Execute events on the current node before advancing
        this._executeNodeEvents(node);

        // Execute choice-specific events
        if (choice.events) {
            this._state.flags = dialogueEventSystem.executeEvents(choice.events, this._state.flags);
        }

        // Resolve the next node from the choice
        const nextNodeId = choice.next;
        if (!nextNodeId) {
            this._state.isActive = false;
            this._state.isComplete = true;
            this._state.lastChoice = { index: choiceIndex, text: choice.text };
            this._notifyListeners();
            this._notifyCompletionListeners();
            return this.getState();
        }

        const graph = this._dialogues.get(this._state.dialogueId);
        const nextNode = graph.getNode(nextNodeId);
        if (!nextNode) {
            throw new Error(`[DialogueManager] Choice target node "${nextNodeId}" not found.`);
        }

        this._state.nodeId = nextNodeId;
        this._state.currentNode = nextNode;
        this._state.lastChoice = { index: choiceIndex, text: choice.text };

        this._notifyListeners();
        return this.getState();
    }

    /**
     * Gets the available choices for the current node.
     * @returns {object[]|null} Array of choice objects, or null if no choices.
     */
    getChoices() {
        if (!this._state.currentNode) return null;
        return this._state.currentNode.choices || null;
    }

    // ─── Flags ─────────────────────────────────────────

    /**
     * Returns the current flags object.
     * @returns {object}
     */
    getFlags() {
        return { ...this._state.flags };
    }

    /**
     * Sets a flag value.
     * @param {string} key - Flag name.
     * @param {*} value - Flag value.
     */
    setFlag(key, value) {
        this._state.flags[key] = value;
    }

    /**
     * Sets multiple flags at once.
     * @param {object} newFlags - Object of flag key-value pairs.
     */
    setFlags(newFlags) {
        Object.assign(this._state.flags, newFlags);
    }

    // ─── Event Listeners ───────────────────────────────

    /**
     * Registers a listener for state changes.
     * @param {Function} listener - Called with the current DialogueState on each change.
     * @returns {Function} Unsubscribe function.
     */
    onStateChange(listener) {
        this._listeners.push(listener);
        return () => {
            const idx = this._listeners.indexOf(listener);
            if (idx !== -1) this._listeners.splice(idx, 1);
        };
    }

    /**
     * Registers a listener for dialogue completion.
     * @param {Function} listener - Called when the dialogue ends.
     * @returns {Function} Unsubscribe function.
     */
    onComplete(listener) {
        this._completionListeners.push(listener);
        return () => {
            const idx = this._completionListeners.indexOf(listener);
            if (idx !== -1) this._completionListeners.splice(idx, 1);
        };
    }

    // ─── Cleanup ───────────────────────────────────────

    /**
     * Ends the current dialogue without advancing.
     */
    endDialogue() {
        this._state.isActive = false;
        this._state.isComplete = true;
        this._notifyListeners();
        this._notifyCompletionListeners();
    }

    /**
     * Resets the manager to a clean state.
     */
    reset() {
        this._state = {
            dialogueId: null,
            nodeId: null,
            currentNode: null,
            isActive: false,
            isComplete: false,
            flags: {},
            lastChoice: null,
        };
        this._notifyListeners();
    }

    // ─── Internal ──────────────────────────────────────

    /**
     * Executes events attached to a node.
     * @param {object} node - The dialogue node.
     * @private
     */
    _executeNodeEvents(node) {
        if (node.events && Array.isArray(node.events)) {
            this._state.flags = dialogueEventSystem.executeEvents(node.events, this._state.flags);
        }
    }

    /**
     * Notifies all state change listeners.
     * @private
     */
    _notifyListeners() {
        const state = this.getState();
        for (const listener of this._listeners) {
            try {
                listener(state);
            } catch (e) {
                console.error('[DialogueManager] Listener error:', e);
            }
        }
    }

    /**
     * Notifies all completion listeners.
     * @private
     */
    _notifyCompletionListeners() {
        const state = this.getState();
        for (const listener of this._completionListeners) {
            try {
                listener(state);
            } catch (e) {
                console.error('[DialogueManager] Completion listener error:', e);
            }
        }
    }
}

// Singleton instance for engine-wide use
export const dialogueManager = new DialogueManager();

export default DialogueManager;
