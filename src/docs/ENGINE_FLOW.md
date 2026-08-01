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
| `NEW_GAME_PLACEHOLDER` | Placeholder for future new-game intro sequence |
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
New Game     Direct Game Launch
Placeholder    (GAMEPLAY)
   │            │
   ▼            ▼
In-Game Menu ◄───┘
(INGAME_MENU)  │
   │            │
   ├─ Play ─────┤
   │            ▼
   ├─ Select Map  GAMEPLAY
   │            │
   └─ Return ───┘
        │
        ▼
   (returns to DASHBOARD)
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
- This screen reserves the future location for intro dialogue, patches, Vesper, save slot creation, and cinematic transitions.

### 4. DASHBOARD → GAMEPLAY
- Triggered when the developer clicks **"DEBUG PLAY"** in the Developer Section.
- The engine transitions directly to `GAMEPLAY`.
- This bypasses every future player-facing screen.
- This route exists solely for development.

### 5. NEW_GAME_PLACEHOLDER → INGAME_MENU
- Triggered when the placeholder screen is dismissed or times out.
- The engine transitions to `INGAME_MENU`.
- This is a temporary transition until the full new-game intro is implemented.

### 5b. NEW_GAME_PLACEHOLDER → DASHBOARD
- Triggered when the player clicks **"Return to Dashboard"** in the placeholder screen.
- The engine transitions back to `DASHBOARD`.

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
| Dialogue system | `NEW_GAME_PLACEHOLDER` | Replaces placeholder with intro dialogue |
| Transitions | All state transitions | Adds fade/slide effects between states |
| Animated dashboard | `DASHBOARD` | Enhances dashboard rendering |
| Map selection | `INGAME_MENU` | Adds map picker to in-game menu |
| Character introductions | `NEW_GAME_PLACEHOLDER` | Adds character intro sequence |

---

## Key Files

| File | Responsibility |
|---|---|
| `src/engine/enginestate.js` | State definitions and transition rules |
| `src/engine/engine.js` | Engine controller and lifecycle management |
| `src/ui/intro.js` | Intro screen rendering and animation |
| `src/ui/dashboard.js` | Dashboard layout with player/developer sections |
| `src/ui/newgameplaceholder.js` | New game placeholder screen |
| `src/ui/ingamemenu.js` | In-game menu overlay |
| `src/globals.js` | Centralised state flags and transition triggers |
