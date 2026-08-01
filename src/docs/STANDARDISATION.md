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
| `NEW_GAME_PLACEHOLDER` | Placeholder for future new-game flow |
| `INGAME_MENU` | Pause / in-game menu overlay |
| `GAMEPLAY` | Active gameplay (raycasting, movement, combat) |

### Transition Rules
- The engine must **only** transition through defined states.
- **No direct screen switching** — all transitions go through the state machine.
- Transitions are triggered by state events (e.g., `START_NEW_GAME`, `BEGIN_DEBUG_PLAY`, `RETURN_TO_DASHBOARD`).

### Extension Points
Future systems (save, dialogue, transitions, animated dashboard, map selection, character intros) must plug into existing states rather than replacing them.

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
- The `DEBUG PLAY` button bypasses all player-facing screens and launches gameplay directly.
- This route exists solely for development and must remain functional at all times.

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
| Dialogue system | `NEW_GAME_PLACEHOLDER` | Placeholder reserved |
| Transitions | All state transitions | Hook points defined |
| Animated dashboard | `DASHBOARD` | Placeholder reserved |
| Map selection | `INGAME_MENU` | Hook point defined |
| Character introductions | `NEW_GAME_PLACEHOLDER` | Placeholder reserved |

---

## 14. Document Maintenance

- This document is considered **part of the codebase**.
- It must be updated whenever architecture changes.
- Every future feature should check these documents before introducing new architecture.
- If implementation requires changing architecture, update the documentation first.
