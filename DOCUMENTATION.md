# Bunbit Game Engine - Source Code Documentation

<p align="center">
  <img src="src/img/logo/alexljn5_logo_merge_transparent.png" alt="Bunbit Engine Logo" width="320"/>
</p>

## Overview

The `src` directory contains the core game engine code for Bunbit, a raycasting-based first-person game. This document provides an overview of the project structure and how the main components work together.

## Project Structure

```
src/
├── ai/                    # Artificial Intelligence systems
├── animations/            # Game animations and intro sequences
├── atmosphere/            # Atmospheric effects (fog, lighting, etc.)
├── audio/                 # Audio handling and sound effects
├── collissiondetection/   # Collision detection logic
├── console/               # In-game console system
├── debug/                 # Debug tools and panels
├── debugtools.js          # Developer tools overlay
├── decorationhandler/     # Map decorations
├── events/                # Game event system
├── game_loop.js           # Main game loop
├── gamestate.js           # Game state re-exports
├── globals.js             # Global configuration and state
├── img/                   # Image assets
├── interactions/          # Player interactions
├── itemhandler/           # Item system
├── mapdata/               # Map data and textures
├── math/                  # Math utilities
├── menus/                 # UI menus
├── noisemap/              # Noise generation
├── playerdata/            # Player state and logic
├── rendering/             # Rendering engine
├── savedata/              # Save/load system
├── scripts/               # Utility scripts
├── stylesgame.css         # Main game styles
├── themes/                # Visual themes
├── ui/                    # User interface components
├── utils/                 # General utilities
└── wasm/                  # WebAssembly modules
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

## Key Systems

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
