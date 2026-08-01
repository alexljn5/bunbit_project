// ============================================================
// ENGINE CONTROLLER
// ============================================================
// Manages the application lifecycle and state transitions.
// All screen changes go through this controller.
// States do not transition themselves; they emit events that
// the controller processes.
// ============================================================

import { EngineState, TransitionEvent, canTransition, getValidTargets } from './enginestate.js';

// ─── Event Target ──────────────────────────────────────────
// A lightweight event bus for state change notifications.
const eventTarget = new EventTarget();

/**
 * Dispatches a custom event on the engine event bus.
 * @param {string} type - Event type string.
 * @param {object} detail - Event payload.
 */
function dispatchEvent(type, detail = {}) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(type, { detail }));
    }
    eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
}

// ─── Engine Controller ─────────────────────────────────────
class EngineController {
    constructor() {
        /** @type {string} The current engine state. */
        this.currentState = EngineState.ENGINE_INIT;

        /** @type {boolean} Whether the engine is fully initialised. */
        this.initialised = false;

        /** @type {Map<string, Function>} Registered state handlers. */
        this.handlers = new Map();

        /** @type {Map<string, Function>} Registered transition hooks. */
        this.transitionHooks = new Map();

        /** @type {object} Persistent state shared across all states. */
        this.sharedState = {
            currentMap: 'map_01',
            debugMode: false,
            introSkipped: false,
        };
    }

    // ─── State Registration ────────────────────────────────

    /**
     * Registers a handler for a specific engine state.
     * The handler is called when the engine enters that state.
     * @param {string} state - The engine state name.
     * @param {Function} handler - Async function called on state entry.
     *   Receives (controller, sharedState) and should return a cleanup function.
     */
    registerHandler(state, handler) {
        if (!Object.values(EngineState).includes(state)) {
            console.warn(`[Engine] Unknown state "${state}" — handler not registered.`);
            return;
        }
        this.handlers.set(state, handler);
    }

    /**
     * Registers a transition hook that runs before a state change.
     * Return false to cancel the transition.
     * @param {string} fromState - Source state.
     * @param {string} toState - Target state.
     * @param {Function} hook - Async function returning boolean.
     */
    registerTransitionHook(fromState, toState, hook) {
        const key = `${fromState}→${toState}`;
        this.transitionHooks.set(key, hook);
    }

    // ─── State Transitions ─────────────────────────────────

    /**
     * Transitions the engine to a new state.
     * @param {string} newState - The target engine state.
     * @param {object} [payload={}] - Optional data passed to the new state handler.
     * @returns {Promise<boolean>} True if the transition succeeded.
     */
    async transitionTo(newState, payload = {}) {
        const fromState = this.currentState;

        // Validate transition
        if (!canTransition(fromState, newState)) {
            console.warn(
                `[Engine] Invalid transition: ${fromState} → ${newState}. ` +
                `Valid targets from ${fromState}: ${getValidTargets(fromState).join(', ')}`
            );
            return false;
        }

        // Run transition hooks
        const hookKey = `${fromState}→${newState}`;
        const hook = this.transitionHooks.get(hookKey);
        if (hook) {
            try {
                const allowed = await hook(fromState, newState, payload);
                if (allowed === false) {
                    console.log(`[Engine] Transition hook cancelled ${fromState} → ${newState}.`);
                    return false;
                }
            } catch (e) {
                console.error(`[Engine] Transition hook error (${hookKey}):`, e);
                return false;
            }
        }

        // Clean up current state handler
        const currentHandler = this.handlers.get(fromState);
        if (currentHandler && typeof currentHandler.cleanup === 'function') {
            try {
                currentHandler.cleanup();
            } catch (e) {
                console.error(`[Engine] Cleanup error for ${fromState}:`, e);
            }
        }

        // Update state
        this.currentState = newState;
        dispatchEvent('engine:stateChange', { from: fromState, to: newState, payload });

        // Run new state handler
        const newHandler = this.handlers.get(newState);
        if (newHandler) {
            try {
                const cleanup = await newHandler(this, this.sharedState, payload);
                if (typeof cleanup === 'function') {
                    this.handlers.get(newState).cleanup = cleanup;
                }
            } catch (e) {
                console.error(`[Engine] Handler error for ${newState}:`, e);
            }
        }

        return true;
    }

    // ─── Convenience Methods ───────────────────────────────

    /** Start the engine (ENGINE_INIT → INTRO). */
    start() {
        return this.transitionTo(EngineState.INTRO);
    }

    /** Go to the dashboard (INTRO → DASHBOARD). */
    showDashboard() {
        return this.transitionTo(EngineState.DASHBOARD);
    }

    /** Start a new game (DASHBOARD → NEW_GAME_PLACEHOLDER). */
    startNewGame() {
        return this.transitionTo(EngineState.NEW_GAME_PLACEHOLDER);
    }

    /** Launch debug gameplay directly (DASHBOARD → GAMEPLAY). */
    debugPlay() {
        return this.transitionTo(EngineState.GAMEPLAY);
    }

    /** Show the in-game menu (GAMEPLAY → INGAME_MENU). */
    showInGameMenu() {
        return this.transitionTo(EngineState.INGAME_MENU);
    }

    /** Resume gameplay (INGAME_MENU → GAMEPLAY). */
    resumeGameplay() {
        return this.transitionTo(EngineState.GAMEPLAY);
    }

    /** Return to dashboard (INGAME_MENU → DASHBOARD). */
    returnToDashboard() {
        return this.transitionTo(EngineState.DASHBOARD);
    }

    /** Dismiss the new game placeholder (NEW_GAME_PLACEHOLDER → INGAME_MENU). */
    dismissPlaceholder() {
        return this.transitionTo(EngineState.INGAME_MENU);
    }

    // ─── Event Listeners ───────────────────────────────────

    /**
     * Subscribe to engine events.
     * @param {string} eventType - Event name (e.g., 'engine:stateChange').
     * @param {Function} callback - Event handler.
     */
    on(eventType, callback) {
        eventTarget.addEventListener(eventType, callback);
    }

    /**
     * Unsubscribe from engine events.
     * @param {string} eventType - Event name.
     * @param {Function} callback - Event handler to remove.
     */
    off(eventType, callback) {
        eventTarget.removeEventListener(eventType, callback);
    }
}

// ─── Singleton ─────────────────────────────────────────────
export const engineController = new EngineController();

// Expose globally for HTML entry points and cross-module access
if (typeof window !== 'undefined') {
    window.engineController = engineController;
}

// Re-export for convenience
export default engineController;
export { dispatchEvent };
