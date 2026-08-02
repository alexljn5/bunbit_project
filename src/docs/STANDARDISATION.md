# Bunbit Engine — Standardisation Guide

This document is the authoritative reference for all architectural decisions in the Bunbit Engine project. Every future feature must consult this document before introducing new architecture. If implementation requires changing architecture, update this document first.

---

## 1. Folder Structure

```
src/
├── docs/                  # Architecture documentation (this directory)
├── engine/                # Core engine: state machine, lifecycle, controller
├── game/                  # Gameplay logic (when implemented)
├── ui/                    # All UI components and screens
├── dialogue/              # Data-driven dialogue system
│   ├── dialogues/         # Dialogue graph JSON files
│   ├── characters/        # Character metadata JSON files
│   ├── loader/            # Data loading modules
│   ├── runtime/           # Core runtime (DialogueManager)
│   ├── renderer/          # UI rendering (DialogueRenderer)
│   ├── conditions/        # Condition evaluation
│   └── events/            # Event trigger system
├── database/              # Data persistence layer
│   ├── postgres/          # PostgreSQL-specific queries and migrations
│   └── tasks/             # Async database tasks and jobs
├── debug/                 # Developer tooling (debug panel, panels, workers)
├── rendering/             # Rendering pipeline (raycasting, sprites, lighting)
├── mapdata/               # Map definitions, loading, and texture management
├── menus/                 # Menu screens (dashboard, in-game menu, etc.)
├── animations/            # Intro animations and screen transitions
├── audio/                 # Sound and music handling
├── playerdata/            # Player state, inventory, logic, UI
├── ai/                    # AI agents and behaviour trees
├── events/                # Per-map and global event handlers
├── interactions/          # Player-world interaction logic
├── itemhandler/           # Item registry, guns, melee weapons
├── console/               # Debug terminal and command handling
├── themes/                # Visual theme definitions and manager
├── utils/                 # Shared utility functions
├── globals.js             # Centralised global state and flags
├── game_loop.js           # Core game loop (requestAnimationFrame)
├── gamestate.js           # Re-exports of game state flags
└── heavensgate.js         # Tauri entry point and crash handling
```

---

## 2. Naming Conventions

### Files
- **camelCase** for all JavaScript files: `mainDashboard.js`, `introPlaceholder.js`
- **lowercase with underscores** for map data files: `map_01.js`, `map_debug.js`
- **kebab-case** for HTML files: `main-game.html`, `intro.html`
- **lowercase** for CSS files: `stylesgame.css`

### Variables
- **camelCase** for all variables and functions: `playerPosition`, `setMenuActive`
- **UPPER_SNAKE_CASE** for constants: `CANVAS_WIDTH`, `REF_CANVAS_HEIGHT`
- **leading underscore** for private/internal module variables: `_internalState`

### State Names
- **UPPER_SNAKE_CASE** for engine states: `ENGINE_INIT`, `DASHBOARD`, `GAMEPLAY`

### DOM IDs
- **kebab-case** with `bunbit-` prefix for engine-owned elements:
  - `bunbit-main-dashboard`
  - `bunbit-debug-panel`
  - `bunbit-play-button`

---

## 3. State Machine Conventions

### State Definition
Every screen must exist as its own isolated state. States are defined in `src/engine/enginestate.js`.

### Allowed States
| State | Description |
|---|---|
| `ENGINE_INIT` | Engine initialisation, resource loading |
| `INTRO` | Creepy intro / title screen |
| `DASHBOARD` | Main menu dashboard with player and developer sections |
| `DIALOGUE` | Data-driven dialogue graph runtime |
| `NEW_GAME_PLACEHOLDER` | Transition point to DIALOGUE for new-game flow |
| `INGAME_MENU` | Pause / in-game menu overlay |
| `GAMEPLAY` | Active gameplay (raycasting, movement, combat) |

### Transition Rules
- The engine must **only** transition through defined states.
- **No direct screen switching** — all transitions go through the state machine.
- Transitions are triggered by state events (e.g., `START_NEW_GAME`, `BEGIN_DEBUG_PLAY`, `RETURN_TO_DASHBOARD`).

### Extension Points
Future systems (save, dialogue, transitions, animated dashboard, map selection, character intros) must plug into existing states rather than replacing them.

---

## 16. Dialogue Framework

### Overview
The dialogue system is fully data-driven. Dialogue content lives in JSON files under `src/dialogue/dialogues/`. No dialogue text is hardcoded in JavaScript.

### Folder Structure
```
src/dialogue/
├── dialogues/           # Dialogue graph JSON files
│   ├── example.json
│   └── new_game_intro.json
├── characters/          # Character metadata JSON files
│   ├── patches.json
│   └── vesper.json
├── loader/              # Data loading modules
│   ├── dialogue-loader.js
│   ├── character-loader.js
│   └── sprite-metadata-loader.js
├── runtime/             # Core runtime
│   └── dialogue-manager.js
├── renderer/            # UI rendering (separate from runtime)
│   └── dialogue-renderer.js
├── conditions/          # Condition evaluation
│   └── condition-manager.js
└── events/              # Event trigger system
    └── dialogue-events.js
```

### Dialogue Architecture
Dialogue uses a **node graph** architecture. Nodes are independent objects identified by unique IDs. Connections are references (strings), not nested objects.

#### Node Graph Structure
```json
{
    "id": "dialogue_id",
    "metadata": { "language": "en", "version": 1 },
    "startNode": "node_001",
    "nodes": {
        "node_001": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "Dialogue text.",
            "next": "node_002",
            "events": [
                { "type": "SET_FLAG", "flag": "intro_complete", "value": true }
            ]
        },
        "node_002": {
            "speaker": "vesper",
            "expression": "curious",
            "choices": [
                { "text": "Choice A", "next": "branch_a" },
                { "text": "Choice B", "next": "branch_b" }
            ]
        }
    }
}
```

#### Node Properties
| Property | Type | Description |
|---|---|---|
| `speaker` | string | Character ID referencing a character in `characters/` |
| `expression` | string | Expression name for sprite rendering |
| `text` | string | Dialogue text |
| `next` | string | ID of the next node (linear progression) |
| `choices` | array | Player choice options (each has `text` and `next`) |
| `events` | array | Event triggers executed when node is entered |
| `conditionalBranches` | array | Conditional next-node resolution |

#### Event Structure
```json
{
    "events": [
        { "type": "SET_FLAG", "flag": "intro_complete", "value": true },
        { "type": "EMIT_EVENT", "type": "dialogue:introComplete", "payload": {} }
    ]
}
```

Built-in event types: `SET_FLAG`, `REMOVE_FLAG`, `INCREMENT_FLAG`, `EMIT_EVENT`.
Custom event types can be registered at runtime via `DialogueEventSystem.registerHandler()`.

### Condition System
Conditions are evaluated against game flags:
| Operator | Description |
|---|---|
| `eq` | Flag equals value |
| `neq` | Flag does not equal value |
| `gt` | Flag greater than value |
| `lt` | Flag less than value |
| `gte` | Flag greater than or equal to value |
| `lte` | Flag less than or equal to value |
| `has` | Flag exists (not null/undefined) |
| `notHas` | Flag does not exist |

### Performance
- O(1) node lookup using Map keyed by node ID
- No traversal searching or array scanning
- Lazy loading supported (dialogues loaded on demand)
- Reusable nodes supported (multiple paths can reference the same node)

### Separation of Concerns
| Component | Responsibility |
|---|---|
| `DialogueManager` | Load graphs, track state, resolve nodes, evaluate conditions, execute events |
| `DialogueRenderer` | Draw dialogue box, display speaker/expression/text/choices |
| `DialogueEventSystem` | Execute event triggers from nodes |
| `ConditionManager` | Evaluate conditions against flags |
| `DialogueLoader` | Load and validate JSON dialogue files |
| `CharacterLoader` | Load character metadata JSON files |
| `SpriteMetadataLoader` | Parse markdown sprite sheets into expression data |

### Engine Integration
Dialogue is a state in the engine state machine (`DIALOGUE`). The engine transitions to `DIALOGUE` when a dialogue sequence begins. When dialogue completes, `DialogueFinished` is emitted and the engine decides what happens next. Dialogue does not force transitions.

### Localisation
Every dialogue file must include `metadata.language` and `metadata.version` fields for future translation support.

### Sprite Metadata
Characters are separate from dialogue\. Sprite ASCII art is stored in markdown files within character sprite folders\. The renderer requests by `character` \+ `expression`; the metadata loader resolves the ASCII representation\. Do not hardcode filenames or paths in renderer logic\.\r?\n\r?\n### Dialogue UI Standards\r?\n\r?\nThe dialogue renderer uses a theme layer (`src/dialogue/theme/dialogue-theme.js`) for all visual styling\. This separates visual design from runtime logic, allowing artists to update colours, borders, and animations without touching code\.\r?\n\r?\n#### Theme Object Structure\r?\n| Property | Description |\r?\n|---|---|\r?\n| `textbox` | Container styling: background, border, text colour, font, padding |\r?\n| `portrait` | Expression ASCII art frame styling |\r?\n| `speakerName` | Speaker name text styling |\r?\n| `dialogueText` | Dialogue body text styling |\r?\n| `choice` | Choice button styling (default state) |\r?\n| `choiceHover` | Choice button styling (hover state) |\r?\n| `continuePrompt` | Continue prompt styling |\r?\n| `animations` | Fade/slide animation durations |\r?\n| `typography` | Font family and size settings |\r?\n\r?\n#### Speaker Alignment\r?\nSpeaker layout is data-driven, not hardcoded\. Each character JSON may include a `uiPosition` field (`"left"`, `"right"`, or `"center"`)\. The renderer reads this field to determine which side of the textbox the character appears on\. Characters without `uiPosition` default to left alignment\.\r?\n\r?\n#### Component Structure\r?\nThe renderer builds the dialogue UI from independent components:\r?\n- `DialogueWindow` � The outer container (textbox)\r?\n- `PortraitContainer` � Expression ASCII art display\r?\n- `SpeakerName` � Character name label\r?\n- `DialogueText` � The dialogue body text\r?\n- `ChoiceContainer` � Player choice buttons\r?\n- `ContinuePrompt` � `[Continue]` prompt for linear nodes\r?\n\r?\nEach component reads styling from the theme object and receives data from the dialogue node. No component contains game logic or state decisions.

---

## 4. UI Separation Rules

- **UI code must never contain simulation or game logic.**
- UI components are responsible for rendering and input handling only.
- Game logic lives in `src/game/`, `src/playerdata/`, `src/ai/`, etc.
- UI components communicate with the engine via **events** and **state setters**, never by directly calling game logic functions.
- All DOM manipulation for UI must be isolated in `src/ui/` or `src/menus/`.

---

## 5. Database Separation Rules

- Database access is confined to `src/database/`.
- `src/database/postgres/` contains all PostgreSQL-specific queries and migrations.
- `src/database/tasks/` contains async database jobs.
- No module outside `src/database/` may directly import or use database drivers.
- All database operations must go through a defined interface (repository pattern).

---

## 6. Asset Locations

| Asset Type | Location |
|---|---|
| Images (sprites, textures, logos) | `src/img/` and subdirectories |
| Audio (music, sound effects) | `src/audio/` and subdirectories |
| Map data | `src/mapdata/` |
| HTML templates | `src/*.html` (root of src) |
| CSS styles | `src/stylesgame.css` |
| Fonts | `src/fonts/` (when added) |
| WASM binaries | `src/wasm/` |

---

## 7. Configuration Hierarchy

1. **URL query parameters** — highest priority, for runtime overrides (e.g., `?debug=true`)
2. **`src/globals.js`** — centralised default configuration and runtime flags
3. **Theme files** (`src/themes/`) — visual configuration per theme
4. **`package.json`** — project-level metadata and build configuration

### Global Flags Pattern
All runtime flags must be declared in `src/globals.js` with:
- An `export let` declaration
- A corresponding `setXxx()` setter function
- A comment explaining the flag's purpose
- If a flag is read via `window.xxx` in other modules, the setter must also update `window.xxx` to keep them in sync

---

## 8. Event Naming

Events follow the pattern `domain:action` using lowercase and colons:

| Event | Trigger |
|---|---|
| `engine:stateChange` | Engine transitions between states |
| `engine:init` | Engine initialisation complete |
| `dashboard:newGame` | Player clicks "New Game" |
| `dashboard:debugPlay` | Developer clicks "DEBUG PLAY" |
| `ingame:resume` | Player resumes gameplay |
| `ingame:returnToDashboard` | Player returns to dashboard |
| `ingame:selectMap` | Player opens map selection |
| `theme:change` | Theme is switched |
| `dialogue:stateChange` | Dialogue state changes (node advance, choice) |
| `dialogue:complete` | Dialogue graph finishes execution |
| `dialogue:choice` | Player makes a choice in a choice node |

---

## 9. Save-Game Conventions

- Save system is **not yet implemented**. Placeholder UI elements must reserve space only.
- When implemented, save data will be stored in `src/database/` via the repository pattern.
- Save slots will be rendered in the `DASHBOARD` state under the Player Section.
- Save serialization must use a versioned format to allow future migrations.
- No save data may be faked or hardcoded.

---

## 10. Developer Tooling

### Debug Panel
- The debug panel (`src/debug/controlpanel.js`) provides development controls.
- It includes: Reload, Play, Stop, Show Debug, Replay Intro, Scale, Theme Selector.
- The debug panel must remain **completely isolated** from player-facing UI.

### Debug Play Route
- The `DEBUG PLAY` button toggles all debug panels on/off.
- When pressed, it: (1) shows the control panel, memcpu performance monitor, and debug terminal, (2) sets `defaultDebugVisible` and `showDebugTools` to `true`.
- When pressed again, it removes all debug panels and hides them.
- The control panel's **Play** button is then used to start the game and load `map_01`.
- This route exists solely for development and must remain functional at all times.
- Both `intro.html` and `main_game.html` load `debug/panels/bunbitdebug.js`, which imports `controlpanel.js`.

### URL Parameters
| Parameter | Effect |
|---|---|
| `?debug=true` | Enables high-res rendering |
| `?debugTerminal=true` | Enables the debug terminal |
| `?debugWASM=1` | Enables WASM debug logging |
| `?debugFrameTiming=true` | Enables frame timing logs |

---

## 11. Save-Game Conventions

*(See Section 9 above. This section exists for emphasis.)*

- No save system implementation is required until explicitly tasked.
- UI placeholders for save slots are acceptable and encouraged.
- When the save system is implemented, it must integrate with the `DASHBOARD` state without modifying the state machine structure.

---

## 12. Developer Tooling

### Build
- `npm run dev` — starts Tauri development server
- `npm run build` — builds production Tauri app
- `./start_bunbit_engine.sh --dev` — full dev setup with WASM sync
- `./start_bunbit_engine.sh --build` — production build

### Key Scripts
| Script | Purpose |
|---|---|
| `start_bunbit_engine.sh` | Development launcher with WASM handling |
| `src/heavensgate.js` | Tauri entry point and crash handler |
| `src/game_loop.js` | Core 60 FPS game loop |

---

## 13. Future Extension Philosophy

### Core Principle
> Every future system must plug into existing states rather than replacing them.

### Guidelines
1. **Add states, don't replace them.** If a new screen is needed, add a new state to the state machine.
2. **Extend states, don't merge them.** If a state needs new behaviour, add it to that state's handler.
3. **Reserve UI space early.** If a feature will need UI space (e.g., save slots, dialogue boxes), create the placeholder now.
4. **Document before implementing.** Update `STANDARDISATION.md` before introducing new patterns.
5. **Keep UI separate from logic.** Never let UI code directly call game simulation functions.
6. **Use events for cross-module communication.** UI components emit events; the engine and game modules listen.

### Planned Extension Points
| Extension | Target State | Status |
|---|---|---|
| Save system | `DASHBOARD` | Placeholder reserved |
| Dialogue system | `DIALOGUE` | Implemented |
| Transitions | All state transitions | Hook points defined |
| Animated dashboard | `DASHBOARD` | Placeholder reserved |
| Map selection | `INGAME_MENU` | Hook point defined |
| Character introductions | `DIALOGUE` | Uses dialogue system |

---

## 14. Theme System

### Available Themes

| Theme | Description |
|---|---|
| `evil` | Default theme. Dark red/black palette with glitch effects. |
| `highcontrast` | High-contrast theme for accessibility. Bright colours on dark background. |
| `calm` | Softer colour palette for reduced eye strain. |
| `hacky` | Retro hacker aesthetic with green-on-black. |

### Evil Theme Colours

| Token | Value | Usage |
|---|---|---|
| `--theme-primary` | `#FC0000` | Primary accent (borders, headings, buttons) |
| `--theme-background` | `#0a0000` | Deep black-red background |
| `--theme-text` | `#FC0000` | Primary text colour |
| `--theme-button-bg` | `#1a0000` | Button background |
| `--theme-button-text` | `#FC0000` | Button text colour |
| `--theme-accent` | `#00FF00` | Secondary accent (DEBUG PLAY button) |
| `--theme-border` | `#FC0000` | Border colour |
| `--theme-glow` | `rgba(255,0,0,0.5)` | Text shadow / glow |

### High Contrast Theme Colours

| Token | Value | Usage |
|---|---|---|
| `--theme-primary` | `#FFFF00` | Yellow primary accent |
| `--theme-background` | `#000000` | Pure black background |
| `--theme-text` | `#FFFF00` | Yellow text |
| `--theme-button-bg` | `#1a1a00` | Dark yellow button bg |
| `--theme-button-text` | `#FFFF00` | Yellow button text |
| `--theme-accent` | `#00FFFF` | Cyan secondary accent |
| `--theme-border` | `#FFFF00` | Yellow border |
| `--theme-glow` | `rgba(255,255,0,0.5)` | Yellow glow |

### Theme Switching

Themes are switched via the `ThemeManager.setTheme(themeName)` method. All UI components should use CSS custom properties (defined in the active theme) rather than hardcoded colours, ensuring that theme changes propagate automatically across the entire interface.

### Accessibility

- All UI components must be theme-aware.
- Button colours must have sufficient contrast against the background in all themes.
- The `highcontrast` theme exists specifically for users with visual impairments.
- Future themes should follow the same CSS custom property pattern.

---

## 15. Document Maintenance

- This document is considered **part of the codebase**.
- It must be updated whenever architecture changes.
- Every future feature should check these documents before introducing new architecture.
- If implementation requires changing architecture, update the documentation first.
