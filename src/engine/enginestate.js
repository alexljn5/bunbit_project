// ============================================================
// ENGINE STATE MACHINE
// ============================================================
// Defines all engine states and valid transitions.
// Every screen exists as its own isolated state.
// The engine transitions ONLY through these states.
// No direct screen switching is allowed.
// ============================================================

/**
 * Engine states. Each state represents a distinct screen
 * or mode in the application lifecycle.
 */
export const EngineState = Object.freeze({
    ENGINE_INIT: 'ENGINE_INIT',
    INTRO: 'INTRO',
    DASHBOARD: 'DASHBOARD',
    NEW_GAME_PLACEHOLDER: 'NEW_GAME_PLACEHOLDER',
    INGAME_MENU: 'INGAME_MENU',
    GAMEPLAY: 'GAMEPLAY',
});

/**
 * Valid transitions between states.
 * Each key is a source state; its value is an array of
 * target states that can be reached from it.
 */
export const ValidTransitions = Object.freeze({
    [EngineState.ENGINE_INIT]: [EngineState.INTRO],
    [EngineState.INTRO]: [EngineState.DASHBOARD],
    [EngineState.DASHBOARD]: [
        EngineState.NEW_GAME_PLACEHOLDER,
        EngineState.GAMEPLAY,
    ],
    [EngineState.NEW_GAME_PLACEHOLDER]: [EngineState.INGAME_MENU],
    [EngineState.INGAME_MENU]: [
        EngineState.GAMEPLAY,
        EngineState.DASHBOARD,
    ],
    [EngineState.GAMEPLAY]: [EngineState.INGAME_MENU],
});

/**
 * Transition event names that trigger state changes.
 * These are emitted by UI components and consumed by the engine controller.
 */
export const TransitionEvent = Object.freeze({
    START_ENGINE: 'START_ENGINE',
    INTRO_COMPLETE: 'INTRO_COMPLETE',
    NEW_GAME: 'NEW_GAME',
    DEBUG_PLAY: 'DEBUG_PLAY',
    DISMISS_PLACEHOLDER: 'DISMISS_PLACEHOLDER',
    START_GAMEPLAY: 'START_GAMEPLAY',
    PAUSE_GAME: 'PAUSE_GAME',
    RESUME_GAME: 'RESUME_GAME',
    RETURN_TO_DASHBOARD: 'RETURN_TO_DASHBOARD',
    SELECT_MAP: 'SELECT_MAP',
});

/**
 * Returns whether a transition from `fromState` to `toState` is valid.
 * @param {string} fromState - The current engine state.
 * @param {string} toState - The target engine state.
 * @returns {boolean} True if the transition is allowed.
 */
export function canTransition(fromState, toState) {
    const allowed = ValidTransitions[fromState];
    if (!allowed) return false;
    return allowed.includes(toState);
}

/**
 * Returns the list of valid target states from a given state.
 * @param {string} fromState - The current engine state.
 * @returns {string[]} Array of valid target state names.
 */
export function getValidTargets(fromState) {
    return ValidTransitions[fromState] || [];
}

// Re-export for convenience
export default { EngineState, ValidTransitions, TransitionEvent, canTransition, getValidTargets };
