# Bunbit Game Engine - Source Code Documentation

<p align="center">
  <img src="src/img/logo/alexljn5_logo_merge_transparent.png" alt="Bunbit Engine Logo" width="320"/>
</p>

## Overview

The `src` directory contains the core game engine code for Bunbit, a raycasting-based first-person game. This document provides a comprehensive overview of the project structure and how all components work together.

## How the Game Works

### Application Lifecycle

The game follows a finite state machine lifecycle managed by the engine controller (`src/engine/engine.js`). Every screen is an isolated state defined in `src/engine/enginestate.js`. States transition only through the state machine — no direct screen switching is allowed.

```
Application Start
    │
    ▼
ENGINE_INIT → INTRO → DASHBOARD
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      NEW_GAME_    DEBUG_PLAY    (return later)
      PLACEHOLDER                    │
            │                        │
            ▼                        ▼
        DIALOGUE              INGAME_MENU
            │                  ┌─────┴─────┐
            ▼                  ▼           ▼
        DASHBOARD         GAMEPLAY    DASHBOARD
                                  (via Pause)
```

### Engine Controller (`src/engine/engine.js`)

The `EngineController` is the central orchestrator. It:
1. Maintains the current state and shared state (current map, debug mode, etc.)
2. Validates transitions using `canTransition()` from `enginestate.js`
3. Runs transition hooks before state changes
4. Calls cleanup functions when leaving states
5. Dispatches `engine:stateChange` events on the window event bus
6. Provides convenience methods like `startNewGame()`, `startDialogue()`, `resumeGameplay()`

### State Handlers

Each state has a registered handler function that:
1. Renders the appropriate UI (HTML overlay or canvas)
2. Sets up input event listeners
3. Returns a cleanup function that removes the UI and resets state

State handlers are self-registering — they call `engineController.registerHandler()` at module load time.

### Dialogue System Architecture

The dialogue system is fully data-driven and follows a strict separation of concerns:

```
Engine (lifecycle)
  │
  ├── DIALOGUE state handler (src/ui/dialogue.js)
  │     │
  │     ├── DialogueManager (runtime)
  │     │     ├── Loads dialogue graphs (O(1) node lookup via Map)
  │     │     ├── Tracks current node ID
  │     │     ├── Resolves next nodes (linear, choices, conditional)
  │     │     ├── Evaluates conditions against game flags
  │     │     └── Executes events (SET_FLAG, EMIT_EVENT, etc.)
  │     │
  │     ├── DialogueRenderer (UI)
  │     │     ├── Draws dialogue box
  │     │     ├── Displays ASCII expression art (from sprite metadata)
  │     │     ├── Shows speaker name and dialogue text
  │     │     └── Renders choice buttons
  │     │
  │     ├── CharacterLoader (data)
  │     │     └── Loads character metadata JSON files
  │     │
  │     ├── DialogueLoader (data)
  │     │     └── Loads and validates dialogue graph JSON files
  │     │
  │     ├── SpriteMetadataLoader (data)
  │     │     └── Parses markdown sprite sheets into expression data
  │     │
  │     ├── ConditionManager (logic)
  │     │     └── Evaluates conditions (eq, neq, gt, lt, has, etc.)
  │     │
  │     └── DialogueEventSystem (events)
  │           └── Executes event triggers from dialogue nodes
```

**Key principle**: Dialogue is DATA, not code. The engine never knows "Patches says this." It only knows "a dialogue object is active." The dialogue data decides speaker, expression, text, next node, and events.

### Game Loop (`src/game_loop.js`)

The game loop runs at 60 FPS via `requestAnimationFrame`. It:
1. Computes delta time in seconds
2. Calls the render callback with delta time
3. Handles start/stop control

### Global State (`src/globals.js`)

All runtime flags and configuration live in `globals.js` with:
- `export let` declarations for reactive state
- `setXxx()` setter functions that also update `window.xxx` for cross-module access
- Centralized configuration (canvas size, graphics presets, debug flags, theme, etc.)

### Tauri Backend (`src-tauri/`)

The Rust backend handles:
- Crash log writing to `crash_logs/` directory
- Player log management in `scary_logs/` directory
- Window reload command
- Plugin initialization (filesystem, shell, process, dialog, HTTP)
- CSP configuration for security

### Component Interaction Patterns

| Pattern | Example |
|---|---|
| UI → Engine | Dashboard button clicks call `engineController.transitionTo()` |
| Engine → UI | Engine calls registered state handler functions |
| UI → Runtime | Dialogue UI calls `dialogueManager.advance()` or `makeChoice()` |
| Runtime → UI | DialogueManager emits state change events; UI re-renders |
| Runtime → Engine | DialogueManager emits `DialogueFinished`; engine transitions state |
| Data → Runtime | Loaders fetch JSON/Markdown files; runtime processes them |
| Events → Cross-module | `window.dispatchEvent(new CustomEvent(...))` for decoupled communication |

## Project Structure

### `src/` — Frontend (JavaScript/HTML/CSS)

```
src/
├── ai/                    # Artificial Intelligence systems
│   ├── aihandler.js
│   ├── aimapmanager.js
│   ├── airegistry.js
│   ├── casperlesserdemon.js
│   ├── enemyai.js
│   ├── friendlycat.js
│   ├── placeholderai.js
│   └── computerai/         # Computer AI sub-system
│       ├── computerai.js
│       ├── computeraiglobals.js
│       ├── mainframe/
│       │   ├── canvashandler.js
│       │   └── components/
│       │       ├── button.js
│       │       └── input.js
│       └── ui/
│           ├── loadascii.js
│           ├── login.js
│           ├── asciiart/
│           │   └── bunbitos.txt
│           └── desktop/
│               ├── desktop.js
│               ├── desktopbuttons.js
│               └── desktopenvironment.js
│           └── utils/
│               ├── inputbox.js
│               └── inputhandler.js
│               └── keyboard.js
├── animations/            # Game animations and intro sequences
│   ├── animationhandler.js
│   ├── fuckthescreenup.js
│   ├── introplaceholder.js
│   └── newgamestartanimation.js
├── atmosphere/            # Atmospheric effects (fog, lighting, etc.)
│   ├── ambiencehandler.js
│   ├── flickerlogic.js
│   ├── foghandler.js
│   ├── lightninghandler.js
│   ├── lightsources.js
│   └── shadersim.js
├── audio/                 # Audio handling and sound effects
│   ├── audiohandler.js
│   ├── soundhandler.js
│   ├── music/             # Music tracks
│   └── sounds/            # Sound effect files
│       ├── demonrumble.mp3
│       └── footsteps/
│           └── concrete/
│               ├── footstep_concrete_01.mp3
│               ├── footstep_concrete_02.mp3
│               ├── footstep_concrete_03.mp3
│               └── footstep_concrete_04.mp3
│       └── guns/
│           └── genericgun_shoot.mp3
│       └── melee/
│           └── metal_swing.mp3
├── collissiondetection/   # Collision detection logic
│   ├── collissionlogic.js
│   ├── collissionlogichandler.js
│   ├── collissionwalllogic.js
│   └── doorinteractionlogic.js
├── console/               # In-game console system
│   ├── consolehandler.js
│   └── terminal/
│       ├── terminal.js
│       ├── debugcommands.js
│       └── terminalhandler.js
├── debug/                 # Debug tools and panels
│   ├── controlpanel.js
│   ├── debughandler.js
│   ├── eventhandlers.js
│   ├── fullscreenhandler.js
│   ├── workerdebug.js
│   ├── workermaindebug.js
│   └── panels/
│       ├── bunbitdebug.js
│       ├── memcpu.js
│       └── positionpanel.js
├── debugtools.js          # Developer tools overlay (FPS, minimap, sprites)
├── decorationhandler/     # Map decorations
│   ├── decorationhandler.js
│   └── stairbuilder.js
├── dialogue/              # Data-driven dialogue system
│   ├── dialogues/         # Dialogue graph JSON files
│   │   ├── example.json
│   │   └── new_game_intro.json
│   ├── characters/        # Character metadata JSON files
│   │   ├── patches.json
│   │   └── vesper.json
│   ├── loader/            # Data loading modules
│   │   ├── dialogue-loader.js
│   │   ├── character-loader.js
│   │   └── sprite-metadata-loader.js
│   ├── runtime/           # Core runtime (DialogueManager)
│   │   └── dialogue-manager.js
│   ├── renderer/          # UI rendering (DialogueRenderer)
│   │   └── dialogue-renderer.js
│   ├── conditions/        # Condition evaluation
│   │   └── condition-manager.js
│   └── events/            # Event trigger system
│       └── dialogue-events.js
├── docs/                  # Architecture documentation
│   ├── DOCUMENTATION.md
│   ├── ENGINE_FLOW.md
│   ├── PROJECT_STRUCTURE.md
│   └── STANDARDISATION.md
├── engine/                # Core engine: state machine, lifecycle, controller
│   ├── engine.js
│   └── enginestate.js
├── events/                # Game event system
│   ├── eventhandler.js
│   ├── map_01_events.js
│   └── map_debug_events.js
├── gamestate.js           # Game state re-exports from globals.js
├── game_loop.js           # Main game loop (requestAnimationFrame)
├── globals.js             # Global configuration and state
├── heavensgate.js         # Tauri entry point and crash handling
├── img/                   # Image assets
│   ├── characterhead/
│   ├── gameoverlol.png
│   ├── logo/
│   ├── menu/
│   ├── png/
│   ├── sprites/
│   │   ├── friendly/
│   │   │   ├── patches/
│   │   │   │   ├── patches-ascii-sheet.md
│   │   │   │   └── (sprite files)
│   │   │   ├── vesper/
│   │   │   │   ├── vesper-ascii-sheet.md
│   │   │   │   └── (sprite files)
│   │   │   └── patches-vesper-shared/
│   │   │       └── patches-vesper-expressions.md
│   │   ├── computerai/
│   │   └── (other sprite files)
│   └── animation/
├── interactions/          # Player-world interaction logic
├── intro.html             # Intro page (ASCII animation)
├── itemhandler/           # Item registry, guns, melee weapons
├── main_game.html         # Main game page
├── mapdata/               # Map data and textures
│   ├── maps.js
│   ├── map_01.js through map_07.js
│   ├── map_debug.js
│   ├── map_bonus.js
│   ├── maphandler.js
│   ├── maptexturesloader.js
│   ├── maptexturesids.js
│   └── maputils.js
├── math/                  # Math utilities
├── menus/                 # UI menus
├── noisemap/              # Noise generation
├── playerdata/            # Player state and logic
│   ├── playerlogic.js
│   ├── playerinventory.js
│   ├── playertextures.js
│   └── playerui.js
├── rendering/             # Rendering engine
│   ├── renderengine.js
│   ├── raycasting.js
│   ├── renderwalls.js
│   ├── renderhorizons.js
│   └── renderworkers/
│       └── horizonrenderworker.js
├── savedata/              # Save/load system
├── scripts/               # Utility scripts
├── stylesgame.css         # Main game styles
├── themes/                # Visual theme definitions and manager
│   └── thememanager.js
├── ui/                    # User interface components
│   ├── intro.js
│   ├── dashboard.js
│   ├── newgameplaceholder.js
│   ├── ingamemenu.js
│   └── dialogue.js        # Dialogue UI state handler
├── utils/                 # General utilities
└── wasm/                  # WebAssembly modules
```

### `src-tauri/` — Backend (Rust/Tauri)

```
src-tauri/
├── build.rs               # Tauri build script
├── Cargo.toml             # Rust package manifest
├── Cargo.lock             # Dependency lock file
├── tauri.conf.json        # Tauri application configuration
├── capabilities/          # Tauri capabilities
├── gen/                   # Generated files
├── src/
│   └── main.rs            # Tauri backend entry point
│       - Crash log writing
│       - Player log management
│       - Window reload command
│       - Plugin initialization (fs, shell, process, dialog, http)
└── target/                # Build output
```

## Core Files

### `game_loop.js`
The main game loop that handles the 60 FPS update cycle. It manages:
- Frame timing and delta time calculation
- Render callback execution
- Game state management

### `globals.js`
Centralized configuration and state management. Contains:
- **Canvas Configuration**: `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `SCALE_X`, `SCALE_Y`
- **Debug Flags**: `defaultDebugVisible`, `isDebugVisible`, `showDebugTools`
- **Game State**: `menuActive`, `isPaused`, `gameOver`, `introActive`
- **Player State**: Position, health, stamina, inventory
- **Graphics Settings**: `numCastRays`, `maxRayDepth`, `playerFOV`
- **Setter Functions**: For updating state without ES module live binding issues

### `debugtools.js`
Developer tools overlay that provides:
- **Debug Overlay**: Shows FPS, player coordinates, and version info
- **Minimap**: Top-right corner map showing walls, floors, and sprites
- **Sprite Rendering**: Handles sprite visibility on minimap

## Entry Points

### `intro.html`
The intro page that displays the ASCII animation sequence. It:
- Loads only `animations/introplaceholder.js`
- Shows a fullscreen canvas with CRT-style effects
- Automatically transitions to `main_game.html` after the intro

### `main_game.html`
The main game page that loads:
- `game_loop.js` - Core game loop
- `playerdata/playerlogic.js` - Player movement and state
- `rendering/renderengine.js` - Rendering engine
- `menus/main_dashboard.js` - Background dashboard visuals
- `debug/panels/bunbitdebug.js` - Debug panel system

## Dialogue System

The dialogue system is fully data-driven. All dialogue content lives in JSON files under `src/dialogue/dialogues/`. No dialogue text is hardcoded in JavaScript.

### Architecture
- **Node Graph**: Nodes are independent objects identified by unique IDs. Connections are string references.
- **Separation of Concerns**: Runtime (`DialogueManager`) is separate from rendering (`DialogueRenderer`).
- **Data-Driven**: Dialogue, characters, expressions, and events are all defined in JSON/Markdown files.

### Key Files
| File | Responsibility |
|---|---|
| `src/dialogue/runtime/dialogue-manager.js` | Core runtime: load graphs, track state, resolve nodes, execute events |
| `src/dialogue/renderer/dialogue-renderer.js` | UI rendering: dialogue box, speaker, expression, text, choices |
| `src/dialogue/loader/dialogue-loader.js` | Loads and validates dialogue JSON files |
| `src/dialogue/loader/character-loader.js` | Loads character metadata JSON files |
| `src/dialogue/loader/sprite-metadata-loader.js` | Parses markdown sprite sheets into expression data |
| `src/dialogue/conditions/condition-manager.js` | Evaluates conditions against game flags |
| `src/dialogue/events/dialogue-events.js` | Executes event triggers from dialogue nodes |
| `src/ui/dialogue.js` | Dialogue UI state handler (connects renderer to runtime) |

### Dialogue State
The engine has a `DIALOGUE` state. When a dialogue completes, `DialogueFinished` is emitted and the engine decides what happens next.

### Key Systems

### Game Loop (`game_loop.js`)
```javascript
export function gameLoop(renderCallback) {
    // Returns { start(), stop() } control object
    // Calls renderCallback with delta time in seconds
}
```

### Rendering Engine (`rendering/renderengine.js`)
The main rendering system that:
- Handles raycasting and sprite rendering
- Manages WebGL lighting pipeline
- Integrates with the game loop
- Draws the debug terminal overlay

### Debug System (`debug/`)
- **`debughandler.js`**: Debug terminal with glitch effects
- **`controlpanel.js`**: Floating control panel with Play/Stop/Reload buttons
- **`eventhandlers.js`**: Mouse and keyboard input for debug terminal
- **`panels/bunbitdebug.js`**: Debug panel initialization
- **`panels/memcpu.js`**: Performance monitoring

### Player System (`playerdata/`)
- **`playerlogic.js`**: Movement, input handling, and player state
- **`playerui.js`**: User interface elements
- **`playerinventory.js`**: Inventory management

### Map System (`mapdata/`)
- **`maps.js`**: Map data structures
- **`maptexturesloader.js`**: Texture loading
- **`maphandler.js`**: Map loading and management

## Debug Panel System

The debug panel system consists of two main components:

### Control Panel (`controlpanel.js`)
- **Position**: Fixed at top-left (20px from edges)
- **Size**: 220x300px compact box
- **Z-index**: 2147483648 (above game canvas)
- **Features**:
  - Reload button
  - Play/Stop game buttons
  - Show/Hide Debug toggle
  - Replay Intro button
  - Scale/Position panel toggle
  - Theme selector dropdown

### Debug Terminal (`debughandler.js`)
- **Position**: Fixed at bottom-left
- **Z-index**: 2147483649 (above control panel)
- **Features**:
  - Log output with timestamps
  - Filter buttons (log, error, warn, info, debug)
  - Clear and Theme buttons
  - Resize handle
  - Evil theme glitch effects (flicker, shake, corruption)

## Z-Index Layering

```
1           - main_dashboard, canvas#mainGameRender
2147483648  - bunbit-debug-panel (control panel)
2147483649  - debugTerminalContainer (debug terminal)
```

## Theme System

The game uses a theme system with the "evil" theme as default:
- **Background**: `#0a0000` (dark red-black)
- **Text**: `#ff0000` (bright red)
- **Border**: `#8b0000` (dark blood red)
- **Glitch Effects**: Flicker, shake, corruption, scanlines

## Graphics Configuration

- **Reference Resolution**: 800x800
- **High-Res Mode**: 800x800 canvas
- **Low-Res Mode**: 400x400 canvas
- **Raycasting**: 300 rays by default (240 on low-end devices)
- **Field of View**: 60 degrees (π/6 radians)

## Debug Flags

| Flag | Default | Description |
|------|---------|-------------|
| `DEBUG_START_INTRO_ANIMATION` | `true` | Show intro on startup |
| `RUN_INTRO_ON_START` | `true` | Auto-run intro animation |
| `defaultDebugVisible` | `false` | Debug tools hidden by default |
| `ENABLE_DEBUG_TERMINAL` | `true` | Debug terminal enabled |

## URL Parameters

- `?debug=true` - Enable high-res mode
- `?debugTerminal=false` - Disable debug terminal

## File Loading Order

1. `intro.html` → `animations/introplaceholder.js`
2. After intro → `main_game.html`
3. `main_game.html` → `game_loop.js` → `playerdata/playerlogic.js` → `rendering/renderengine.js`
4. `renderengine.js` auto-loads `debug/panels/bunbitdebug.js`
5. `bunbitdebug.js` → `controlpanel.js` and `debughandler.js`

## Notes

- The intro page is now isolated and doesn't load debug tools
- Debug tools are only loaded on `main_game.html`
- The control panel and debug terminal use `position: fixed` for proper layering
- All z-index values are set to ensure proper stacking order
