// gamestate.js
// Re-exports game state flags from centralized globals.js
export {
    menuActive, isPaused, setPaused, setMenuActive,
    engineState, setEngineState, playerMovementDisabled, setPlayerMovementDisabled
} from './globals.js';
