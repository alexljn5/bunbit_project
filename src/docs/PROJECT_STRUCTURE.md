# Bunbit Engine — Project Structure

This document explains where everything belongs in the Bunbit Engine project. Every future feature should check this document before introducing new files or directories.

---

## Top-Level Directory: `src/`

All source code lives under `src/`. This directory is the root of the Bunbit Engine codebase.

---

## Subdirectories

### `src/engine/`
**Responsibility:** Core engine lifecycle, state machine, and transition management.

- `enginestate.js` — Defines all engine states and valid transitions.
- `engine.js` — Engine controller that manages the application lifecycle and state transitions.

Future game systems (save, dialogue, transitions) plug into the engine here without modifying the state machine structure.

---

### `src/game/`
**Responsibility:** Gameplay logic (when implemented).

This directory will contain all game simulation logic:
- Game rules and mechanics
- Entity management
- Game state management (separate from engine state)
- Physics and collision resolution

Currently empty — gameplay logic is not yet implemented.

---

### `src/ui/`
**Responsibility:** All UI components and screen renderers.

Each screen gets its own file:
- `intro.js` — Intro/title screen
- `dashboard.js` — Main dashboard with player and developer sections; DEBUG PLAY button shows all debug panels (memcpu, debug terminal, control panel)
- `newgameplaceholder.js` — New game placeholder screen
- `ingamemenu.js` — In-game pause/menu overlay

UI components are responsible for rendering and input handling only. They must not contain game logic. The DEBUG PLAY button in `dashboard.js` is the sole exception — it directly loads map data and starts the game loop for development purposes.

---

### `src/menus/`
**Responsibility:** Menu screens and menu-related utilities.

- `menu.js` — Canvas-based main menu with Play/Maps buttons
- `main_dashboard.js` — HTML/CSS dashboard overlay
- `menusettings.js` — Menu settings and configuration
- `menurespawn.js` — Respawn menu UI
- `menuhandler.js` — Menu handler orchestration
- `overlays.js` — Menu overlay rendering

Note: As the engine state machine matures, menu logic will migrate to `src/ui/`.

---

### `src/database/`
**Responsibility:** Data persistence layer.

- `postgres/` — PostgreSQL-specific queries and migrations
- `tasks/` — Async database jobs and background tasks

No module outside `src/database/` may directly import or use database drivers. All database access goes through the repository interface.

---

### `src/debug/`
**Responsibility:** Developer tooling, completely isolated from player-facing UI.

- `controlpanel.js` — Debug control panel with Reload, Play, Stop, Show Debug, etc.
- `debughandler.js` — Debug terminal and command handling
- `eventhandlers.js` — Debug-specific event handlers
- `fullscreenhandler.js` — Fullscreen toggle handling
- `workerdebug.js` — Debug worker for instrumentation
- `workermaindebug.js` — Main debug worker
- `panels/` — Individual debug panels (memcpu, position, bunbitdebug)

The debug panel must remain completely isolated from player-facing UI. The `DEBUG PLAY` route toggles all debug panels on/off:
- **First press**: shows the control panel, memcpu performance monitor, and debug terminal.
- **Second press**: removes all debug panels and hides them.
The control panel's Play button is used to start the game and load `map_01`.

Both `intro.html` and `main_game.html` load `debug/panels/bunbitdebug.js`, which imports `controlpanel.js`.

---

### `src/rendering/`
**Responsibility:** Rendering pipeline — raycasting, sprites, lighting, and workers.

- `renderengine.js` — Main render engine and game render loop
- `raycasting.js` — Raycasting engine
- `renderwalls.js` — Wall rendering
- `renderhorizons.js` — Horizon rendering
- `renderworkers/` — Web Workers for parallel rendering
- `sprites/` — Sprite management and rendering
- `lightengine/` — Lighting system (WebGL)

---

### `src/mapdata/`
**Responsibility:** Map definitions, loading, and texture management.

- `maps.js` — Map registry and metadata
- `map_01.js` through `map_07.js` — Individual map definitions
- `map_debug.js` — Debug map
- `map_bonus.js` — Bonus map
- `maphandler.js` — Map loading and management
- `maptexturesloader.js` — Texture loading for maps
- `maptexturesids.js` — Texture ID mappings
- `maputils.js` — Map utility functions

---

### `src/animations/`
**Responsibility:** Intro animations and screen transitions.

- `introplaceholder.js` — Creepy intro ASCII animation
- `newgamestartanimation.js` — New game start animation (future)
- `animationhandler.js` — Animation orchestration

---

### `src/audio/`
**Responsibility:** Sound and music handling.

- `audiohandler.js` — Main audio handler
- `soundhandler.js` — Sound effect management
- `music/` — Music tracks
- `sounds/` — Sound effect files

---

### `src/playerdata/`
**Responsibility:** Player state, inventory, logic, and UI.

- `playerlogic.js` — Player movement and physics
- `playerinventory.js` — Inventory management
- `playertextures.js` — Player texture management
- `playerui.js` — Player HUD and UI

---

### `src/ai/`
**Responsibility:** AI agents and behaviour trees.

- `aihandler.js` — AI orchestration
- `aimapmanager.js` — AI map awareness
- `airegistry.js` — AI agent registry
- `placeholderai.js` — Placeholder AI
- `friendlycat.js` — Friendly cat AI
- `computerai/` — Computer AI sub-system

---

### `src/events/`
**Responsibility:** Per-map and global event handlers.

- `eventhandler.js` — Global event handler
- `map_01_events.js` — Map 01 specific events
- `map_debug_events.js` — Debug map events

---

### `src/interactions/`
**Responsibility:** Player-world interaction logic.

- `interactionhandler.js` — Interaction orchestration
- `interactionlogic.js` — Interaction rules and mechanics

---

### `src/itemhandler/`
**Responsibility:** Item registry, weapons, and inventory items.

- `itemhandler.js` — Main item handler
- `itemregistry.js` — Item registry
- `guns/` — Gun items and handling
- `meleeweapons/` — Melee weapon items and handling

---

### `src/console/`
**Responsibility:** Debug terminal and command handling.

- `consolehandler.js` — Console orchestration
- `terminal/` — Terminal UI and command processing
  - `terminal.js` — Terminal renderer
  - `debugcommands.js` — Debug command definitions
  - `terminalhandler.js` — Terminal input handling

---

### `src/themes/`
**Responsibility:** Visual theme definitions and theme manager.

- Theme objects define colours, borders, and visual properties.
- `thememanager.js` — Theme switching and application.

---

### `src/utils/`
**Responsibility:** Shared utility functions used across the codebase.

---

### `src/docs/`
**Responsibility:** Architecture documentation.

- `STANDARDISATION.md` — Authoritative architectural reference
- `ENGINE_FLOW.md` — Application lifecycle and state transitions
- `PROJECT_STRUCTURE.md` — This document

These documents are considered part of the codebase and must be updated whenever architecture changes.

---

### `src/assets/`
**Responsibility:** Static assets that are not code.

- Images, audio files, and other media live under `src/img/`, `src/audio/`, etc.
- This directory is reserved for future asset organisation.

---

### `src/maps/`
**Responsibility:** Map-related files and data (when separated from `mapdata/`).

Currently, map data lives in `src/mapdata/`. This directory is reserved for future map organisation.

---

### `src/config/`
**Responsibility:** Configuration files and hierarchies.

- `package.json` — Project metadata and dependencies
- Build configuration lives at the project root.

---

## Root-Level Files

| File | Purpose |
|---|---|
| `src/globals.js` | Centralised global state, flags, and configuration |
| `src/game_loop.js` | Core 60 FPS game loop |
| `src/gamestate.js` | Re-exports of game state flags |
| `src/heavensgate.js` | Tauri entry point and crash handling |
| `src/intro.html` | Intro screen HTML entry point |
| `src/main_game.html` | Main game HTML entry point |
| `src/stylesgame.css` | Global game styles |
| `start_bunbit_engine.sh` | Development launcher script |

---

## Key Principles

1. **Every file has a clear owner.** If you're unsure where a file belongs, check this document.
2. **UI is separate from logic.** UI files go in `src/ui/` or `src/menus/`. Game logic goes in `src/game/`.
3. **Database is isolated.** All database access goes through `src/database/`.
4. **Debug is isolated.** Developer tooling lives in `src/debug/` and must not leak into player-facing code.
5. **Documentation is code.** Files in `src/docs/` are part of the codebase and must be maintained.
6. **New features check docs first.** Before introducing new architecture, consult `STANDARDISATION.md`.