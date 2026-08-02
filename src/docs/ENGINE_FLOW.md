# Bunbit Engine — Application Lifecycle

This document describes the intended engine flow from application start through all screens and back. Future contributors should immediately understand the intended lifecycle from this document.

---

## State Machine Overview

The engine operates as a finite state machine with the following states:

| State | Description |
|---|---|
| `ENGINE_INIT` | Initialises engine subsystems, loads resources |
| `INTRO` | Creepy intro / title screen with ASCII animation |
| `DASHBOARD` | Main menu with Player and Developer sections |
| `DIALOGUE` | Dialogue graph runtime (data-driven) |
| `NEW_GAME_PLACEHOLDER` | Transition point to DIALOGUE for new-game intro |
| `INGAME_MENU` | Minimal in-game menu (Play, Select Map, Return) |
| `GAMEPLAY` | Active raycasting gameplay |

---

## Application Lifecycle Diagram

```
Application Start
        │
        ▼
Engine Init (ENGINE_INIT)
        │
        ▼
Creepy Intro Screen (INTRO)
        │
        ▼
Main Dashboard (DASHBOARD)
   ├────────────┐
   ↓            ↓
 New Game     Developer Debug
   ↓            │
   ▼            ▼
 NEW_GAME_    DEBUG PLAY
 PLACEHOLDER    → shows all debug panels
   │            (memcpu, debug terminal, control panel)
   ▼            → use control panel Play/Reload to start game
 DIALOGUE     ◄───┘
   │            │
   ├─ Dialogue  ├─ Play
   │  Complete  │
   ▼            ▼
 DASHBOARD  INGAME_MENU
              │
              ├─ Play → GAMEPLAY
              │
              └─ Return → DASHBOARD
```

---

## Detailed State Transitions

### 1. ENGINE_INIT → INTRO
- Triggered automatically on application start.
- Engine subsystems are initialised (rendering, input, audio).
- Once initialisation completes, the engine transitions to `INTRO`.

### 2. INTRO → DASHBOARD
- The intro animation plays (ASCII art sequence with glitch effects).
- When the intro completes (or is skipped), the engine transitions to `DASHBOARD`.
- The intro is only shown once per application launch.

### 3. DASHBOARD → NEW_GAME_PLACEHOLDER
- Triggered when the player clicks **"New Game"** in the Player Section.
- The engine transitions to `NEW_GAME_PLACEHOLDER`.
- This is a brief transition point that immediately enters the dialogue system.

### 4. NEW_GAME_PLACEHOLDER → DIALOGUE
- Triggered automatically when `NEW_GAME_PLACEHOLDER` state is entered.
- The engine transitions to `DIALOGUE` and loads `new_game_intro.json`.
- The dialogue graph runs the intro sequence (Patches → Vesper).

### 5. DIALOGUE → DASHBOARD
- Triggered when the dialogue graph completes (no more nodes).
- The engine transitions back to `DASHBOARD`.
- The `DialogueFinished` event is emitted for the engine to handle.

### 6. DIALOGUE → INGAME_MENU
- Triggered when the player pauses during dialogue (if applicable).
- The engine transitions to `INGAME_MENU`.

### 7. DASHBOARD → GAMEPLAY (via DEBUG PLAY)
- Triggered when the developer clicks **"DEBUG PLAY"** in the Developer Section.
- DEBUG PLAY toggles all debug panels on/off:
  - **First press**: shows the control panel, memcpu performance monitor, and debug terminal; sets `defaultDebugVisible` and `showDebugTools` to `true`.
  - **Second press**: removes all debug panels and hides them.
- The control panel's **Play** button is then used to start the game and load `map_01`.
- This route exists solely for development and bypasses the intro screen.

### 8. INGAME_MENU → GAMEPLAY
- Triggered when the player clicks **"Play"** in the in-game menu.
- The engine transitions to `GAMEPLAY`.
- The current map (default: `map_01`) is loaded.

### 9. INGAME_MENU → DASHBOARD
- Triggered when the player clicks **"Return to Dashboard"**.
- The engine transitions back to `DASHBOARD`.
- Gameplay is paused and cleaned up.

### 10. GAMEPLAY → INGAME_MENU
- Triggered when the player presses **Escape** or **P** to pause.
- The engine transitions to `INGAME_MENU`.
- The game loop is paused but not stopped.

### 6. INGAME_MENU → GAMEPLAY
- Triggered when the player clicks **"Play"** in the in-game menu.
- The engine transitions to `GAMEPLAY`.
- The current map (default: `map_01`) is loaded.

### 7. INGAME_MENU → DASHBOARD
- Triggered when the player clicks **"Return to Dashboard"**.
- The engine transitions back to `DASHBOARD`.
- Gameplay is paused and cleaned up.

### 8. GAMEPLAY → INGAME_MENU
- Triggered when the player presses **Escape** or **P** to pause.
- The engine transitions to `INGAME_MENU`.
- The game loop is paused but not stopped.

---

## State Transition Rules

1. **All transitions go through the state machine.** No direct screen switching is allowed.
2. **Transitions are triggered by events**, not by direct function calls between screens.
3. **Each state is isolated.** A state handler is responsible for rendering and input handling only.
4. **The engine controller manages transitions.** States do not transition themselves; they emit events that the controller processes.

---

## Future Extension Points

The following systems will plug into existing states without modifying the state machine:

| System | Plugs Into | How |
|---|---|---|
| Save system | `DASHBOARD` | Adds save slot UI to Player Section |
| Dialogue system | `DIALOGUE` | Data-driven dialogue graphs |
| Transitions | All state transitions | Adds fade/slide effects between states |
| Animated dashboard | `DASHBOARD` | Enhances dashboard rendering |
| Map selection | `INGAME_MENU` | Adds map picker to in-game menu |
| Character introductions | `DIALOGUE` | Uses dialogue system for intros |

---

## Key Files

| File | Responsibility |
|---|---|
| `src/engine/enginestate.js` | State definitions and transition rules |
| `src/engine/engine.js` | Engine controller and lifecycle management |
| `src/ui/intro.js` | Intro screen rendering and animation |
| `src/ui/dashboard.js` | Dashboard layout with player/developer sections |
| `src/ui/newgameplaceholder.js` | New game placeholder (transitions to DIALOGUE) |
| `src/ui/dialogue.js` | Dialogue UI state handler |
| `src/ui/ingamemenu.js` | In-game menu overlay |
| `src/dialogue/runtime/dialogue-manager.js` | Dialogue graph runtime |
| `src/dialogue/renderer/dialogue-renderer.js` | Dialogue UI rendering |
| `src/dialogue/loader/dialogue-loader.js` | Dialogue JSON loading and validation |
| `src/dialogue/loader/character-loader.js` | Character metadata loading |
| `src/dialogue/loader/sprite-metadata-loader.js` | Sprite markdown parsing |
| `src/dialogue/conditions/condition-manager.js` | Condition evaluation |
| `src/dialogue/events/dialogue-events.js` | Event trigger system |
| `src/globals.js` | Centralised state flags and transition triggers |
