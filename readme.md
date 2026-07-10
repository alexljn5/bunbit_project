# Bunbit Engine

**Version:** Alpha 0.0.5  
**Type:** Experimental Raycasting Engine (Hobby / College Origin)  
**Author:** alexljn5  

---

## Overview

Bunbit Engine is a custom raycasting-based game engine originally developed as a college project and later expanded into a personal experimental engine.

It focuses on:

- Software-based raycasting rendering
- Multi-threaded worker pipelines (floor / ceiling / horizon rendering)
- WASM-accelerated performance paths
- Modular map, sprite, and AI systems
- Real-time configurable graphics scaling

The engine is still in active development and is not considered stable.

---

## Visual Identity

Bunbit is built around a stylized “industrial rabbit” aesthetic — clean systems wrapped in an unsettling, minimal visual tone.

The visual direction emphasizes:

- Deep blacks and high contrast reds
- Mechanical / synthetic presentation
- Subtle distortion and low-level visual noise
- A “cute but wrong” rabbit motif as a symbolic core identity

This is purely aesthetic and does not affect gameplay functionality.

---

## Features

### Rendering
- Custom CPU raycasting renderer
- Floor and ceiling horizon rendering via worker threads
- Texture-mapped tile system
- Dynamic resolution scaling system
- Optional WASM acceleration for performance-critical paths

### Engine Systems
- Modular map loading system
- Sprite manager with per-map registration
- AI system decoupled from rendering layer
- Event-driven input handling
- Save / load system with file-based persistence

### Graphics
- Adjustable ray count and render depth presets
- Real-time resolution scaling (low-end to high-end profiles)
- Debug scaling / positioning tools (experimental)

---

## Architecture Notes

The engine is structured around separation of concerns:

- Main thread: game state, input, orchestration
- Workers: heavy rendering (floor / ceiling / horizon)
- WASM modules: performance-critical math / rendering components
- DOM layer: menus, overlays, UI systems

This hybrid architecture is intentionally experimental and prioritizes flexibility over strict engine purity.

---

## Performance Model

The engine’s performance is primarily determined by:

- Number of cast rays
- Render resolution (internal canvas buffer size)
- Worker tiling strategy
- Texture sampling density

Higher presets significantly increase computational cost.

---

## Asset Credits

### Icon
The project icon is based on a heavily modified version of:

https://www.deviantart.com/nibroc-rock/art/Vector-Icon-Cream-version2-587334154

All rights and original artwork belong to the original creator.

Modifications were made for stylistic integration into the Bunbit Engine visual identity.

---

## Status

**Alpha Stage**

Expect:

- Experimental behavior
- Debug tooling instability
- Performance spikes under load
- Ongoing refactors of core systems

---

## Notes

Bunbit Engine is a long-term experimental project exploring:

- Real-time software rendering constraints
- Worker-based parallel rendering pipelines
- Hybrid JS/WASM engine architecture
- Retro-style raycasting techniques with modern optimization layers

It is not intended to be a production engine.

---

## “Signal”

> Something is always rendering beneath the surface.
> The rabbit never stops moving.