# Bunbit Engine — Application Flow

This document describes the application lifecycle and state transitions in the Bunbit Engine.

---

## State Machine Overview

The engine uses a finite state machine. Every screen exists as its own isolated state. All transitions go through the state machine — no direct screen switching is allowed.

### States

| State | Description |
|---|---|
| `ENGINE_INIT` | Engine initialisation, resource loading |
| `INTRO` | Creepy intro / title screen |
| `DASHBOARD` | Main menu dashboard with player and developer sections |
| `DIALOGUE` | Data-driven dialogue graph runtime |
| `NEW_GAME_PLACEHOLDER` | Transition point to DIALOGUE for new-game flow |
| `INGAME_MENU` | Pause / in-game menu overlay |
| `GAMEPLAY` | Active gameplay (raycasting, movement, combat) |

### Valid Transitions

```
ENGINE_INIT → INTRO
INTRO → DASHBOARD
DASHBOARD → NEW_GAME_PLACEHOLDER
DASHBOARD → GAMEPLAY
NEW_GAME_PLACEHOLDER → DIALOGUE
NEW_GAME_PLACEHOLDER → DASHBOARD
DIALOGUE → DASHBOARD
DIALOGUE → INGAME_MENU
DIALOGUE → GAMEPLAY
INGAME_MENU → GAMEPLAY
INGAME_MENU → DASHBOARD
GAMEPLAY → INGAME_MENU
```

### Transition Events

| Event | Trigger | Source → Target |
|---|---|---|
| `START_ENGINE` | Engine boot | — → ENGINE_INIT |
| `INTRO_COMPLETE` | Intro animation finishes | ENGINE_INIT → INTRO |
| `NEW_GAME` | Player clicks "New Game" | DASHBOARD → NEW_GAME_PLACEHOLDER |
| `START_DIALOGUE` | Dialogue sequence begins | NEW_GAME_PLACEHOLDER → DIALOGUE |
| `DIALOGUE_FINISHED` | Dialogue graph completes | DIALOGUE → GAMEPLAY or DASHBOARD |
| `START_GAMEPLAY` | Game begins | DIALOGUE → GAMEPLAY |
| `PAUSE_GAME` | Player pauses | GAMEPLAY → INGAME_MENU |
| `RESUME_GAME` | Player resumes | INGAME_MENU → GAMEPLAY |
| `RETURN_TO_DASHBOARD` | Player returns to menu | INGAME_MENU → DASHBOARD |
| `DEBUG_PLAY` | Developer debug route | DASHBOARD → GAMEPLAY |

---

## New Game Flow (with Dialogue Integration)

```
DASHBOARD
    |
    v (New Game button)
NEW_GAME_PLACEHOLDER
    |
    |  Engine cinematic transition:
    |  1. Fade out pillars/stairs/face + dashboard chrome
    |  2. Reuse existing spinning dashboard sigil
    |  3. Zoom sigil toward camera (portal)
    |
    v (after cinematic)
DIALOGUE
    |
    v (loads new_game_intro.json)
DialogueManager starts
    |
    v (node graph execution)
new_game_intro.json nodes execute
    |
    |  faces hidden until PLAYER_RECOGNIZED
    |  → shocked faces revealed
    |  → SET_FLAG intro_complete
    |
    v (intro_complete flag set)
DialogueFinished event
    |
    v (handleDialogueComplete)
GAMEPLAY
```

### Dialogue Flow Details

1. Player clicks "New Game" on the dashboard. The button is immediately disabled to
   prevent a second click from firing an invalid transition.
2. Engine transitions to `NEW_GAME_PLACEHOLDER`.
3. The placeholder handler runs the **engine-driven cinematic** (this is engine
   visuals, not dialogue data):
   - Hides the New Game / debug buttons.
   - Fades out the dashboard pillars, stairs, face overlay, and dashboard chrome
     (border/shadow).
   - Reuses the **existing** dashboard sigil element
     (`logo-ascii-transparent-sigil-blend.png`), keeping its spinning CSS animation.
   - Zooms the sigil toward the camera (`bunbit-portal-zoom`), like entering a portal.
   - After the cinematic, transitions to `DIALOGUE` with `dialogueId: 'new_game_intro'`.
4. `DialogueManager` loads `new_game_intro.json` and starts executing the node graph.
5. The renderer displays dialogue nodes (speaker, expression, text, choices).
   - During the intro, character ASCII faces are HIDDEN (`facesVisible: false`)
     and speaker names are hidden (`namesVisible: false`) — the player does not
     know who they are yet. Patches and Vesper simply exist as voices bickering.
   - The dialogue is two characters bickering before they notice the player.
   - When the dialogue system detects the player (`PLAYER_RECOGNIZED`), the
     characters' shocked/surprised ASCII faces are revealed (`facesVisible: true`)
     while names stay hidden — the player still does not know their names.
   - After the shock reaction, `SHOW_NAMES` reveals the speaker names and the
     normal dialogue UI (names + faces) continues.
6. Player advances through nodes by clicking choices or continue prompts.
7. When the final node is reached, `intro_complete` is set and `DialogueFinished` is emitted.
8. `handleDialogueComplete` in `dialogue.js` checks the `intro_complete` flag.
9. If the flag is set, the engine transitions to `GAMEPLAY`.
10. If not, the engine returns to `DASHBOARD`.

### Cinematic vs Dialogue Separation

The new-game cinematic is an **engine state transition**, not dialogue data:

- `NEW_GAME_PLACEHOLDER` handles environment fades and the sigil portal zoom.
- `DIALOGUE` handles face reveals and player recognition via cinematic events.
- Dialogue JSON contains **only** dialogue data (speaker, text, expressions) plus
  `PLAYER_RECOGNIZED` and `SHOW_NAMES` reveal triggers.
- Character names stay hidden until `SHOW_NAMES` fires after the recognition
  shock reaction — the player does not know who they are before that point.
- No dialogue node describes cinematic effects (no "fade to black" text, no fake sigils).

---

## Dialogue System Integration

### How Dialogue Connects to the Engine

- **Dialogue is a state**: `DIALOGUE` is a first-class engine state
- **DialogueManager** handles all runtime logic (loading, state tracking, node resolution, condition evaluation, event execution)
- **DialogueRenderer** handles all UI (textbox, speaker, expression, text, choices)
- **DialogueTheme** provides all visual styling (separate from runtime logic)
- **Dialogue events** are data-driven — nodes trigger events that the event system executes

### Separation of Concerns

| Component | Responsibility |
|---|---|
| `EngineController` | State machine, transitions, lifecycle |
| `DialogueManager` | Load graphs, track state, resolve nodes, evaluate conditions, execute events |
| `DialogueRenderer` | Draw dialogue box, display speaker/expression/text/choices |
| `DialogueEventSystem` | Execute event triggers from nodes |
| `ConditionManager` | Evaluate conditions against flags |
| `DialogueLoader` | Load and validate JSON dialogue files |
| `CharacterLoader` | Load character metadata JSON files |
| `SpriteMetadataLoader` | Parse markdown sprite sheets into expression data |

### Engine Does NOT:

- Render dialogue text
- Create UI elements
- Decide next nodes
- Modify game flags directly
- Force state transitions

### Dialogue Does NOT:

- Know which character "Patches" is
- Hardcode speaker names
- Contain gameplay logic
- Force engine transitions

---

## Event System

### Built-in Events

| Event | Description |
|---|---|
| `engine:stateChange` | Engine transitions between states |
| `dialogue:stateChange` | Dialogue state changes (node advance, choice) |
| `dialogue:complete` | Dialogue graph finishes execution |
| `dialogue:choice` | Player makes a choice in a choice node |
| `dialogue:cinematic` | Cinematic event (fade, sigil, camera, etc.) |

### Custom Events

Future event types can be registered at runtime via `DialogueEventSystem.registerHandler()`.

---

## Extension Points

Future systems (save, dialogue, transitions, animated dashboard, map selection, character intros) must plug into existing states rather than replacing them.

| Extension | Target State | Status |
|---|---|---|
| Save system | `DASHBOARD` | Placeholder reserved |
| Dialogue system | `DIALOGUE` | Implemented |
| Transitions | All state transitions | Hook points defined |
| Animated dashboard | `DASHBOARD` | Placeholder reserved |
| Map selection | `INGAME_MENU` | Hook point defined |
---

## Event System

### Built-in Events

| Event | Description |
|---|---|
| `engine:stateChange` | Engine transitions between states |
| `dialogue:stateChange` | Dialogue state changes (node advance, choice) |
| `dialogue:complete` | Dialogue graph finishes execution |
| `dialogue:choice` | Player makes a choice in a choice node |
| `dialogue:cinematic` | Cinematic event (fade, sigil, camera, etc.) |

### Custom Events

Future event types can be registered at runtime via `DialogueEventSystem.registerHandler()`.

---

## Extension Points

Future systems (save, dialogue, transitions, animated dashboard, map selection, character intros) must plug into existing states rather than replacing them.

| Extension | Target State | Status |
|---|---|---|
| Save system | `DASHBOARD` | Placeholder reserved |
| Dialogue system | `DIALOGUE` | Implemented |
| Transitions | All state transitions | Hook points defined |
| Animated dashboard | `DASHBOARD` | Placeholder reserved |
| Map selection | `INGAME_MENU` | Hook point defined |
| Character intros | `DIALOGUE` | Uses dialogue system |
