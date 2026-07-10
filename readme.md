# Bunbit Engine

<p align="center">
  <img src="src/img/logo/alexljn5_logo_merge_transparent.png" alt="Bunbit Engine Logo" width="320"/>
</p>

**Version:** Alpha 0.0.5  
**Type:** Experimental Raycasting Engine  
**Author:** alexljn5

---

## Overview

**Bunbit Engine** is a custom software raycasting engine originally created as a college project and later expanded into a personal experimental platform.

It explores retro rendering techniques with modern optimizations, focusing on:

- Pure CPU raycasting with multi-threaded worker pipelines
- Floor, ceiling, and horizon rendering
- WASM-accelerated performance paths
- Modular systems for maps, sprites, and AI
- Real-time configurable graphics scaling

The engine remains in active development and is **not stable**.

---

## Visual Identity

Bunbit follows an **industrial rabbit** aesthetic — clean technical systems wrapped in a cold, slightly unsettling tone.

Core visual themes:
- Deep blacks with high-contrast reds
- Mechanical and synthetic presentation
- Subtle distortion and low-level visual noise
- A “cute but wrong” rabbit motif as its symbolic core

This aesthetic is purely visual and does not impact functionality.

---

## Features

### Rendering
- Custom CPU-based raycasting renderer
- Multi-threaded floor, ceiling, and horizon rendering
- Texture-mapped environments
- Dynamic internal resolution scaling
- Optional WASM acceleration for performance-critical sections

### Systems
- Modular map loading
- Sprite management with per-map registration
- Decoupled AI system
- Event-driven input
- File-based save/load system

### Graphics & Debugging
- Adjustable ray count and render depth
- Multiple performance presets (low to high-end)
- Debug tools for scaling and positioning (experimental)

---

## Architecture

The engine uses a hybrid architecture:

- **Main thread**: Game state, input, and orchestration
- **Worker threads**: Heavy rendering work (floor/ceiling/horizon)
- **WASM modules**: Performance-critical math and rendering
- **DOM layer**: UI, menus, and overlays

This structure prioritizes flexibility and experimentation over traditional engine purity.

---

## Performance

Performance is mainly affected by:
- Number of rays cast
- Internal render resolution
- Worker thread strategy
- Texture sampling density

Higher quality settings significantly increase CPU load.

---

## Status

**Alpha** — Expect:
- Experimental and unstable behavior
- Debug tooling that may break
- Performance spikes
- Frequent core refactors

Bunbit Engine is a long-term hobby project exploring the limits of software rendering, parallel pipelines, and hybrid JS/WASM architecture. It is **not** intended as a production engine.

---

## Signal

> Something is always rendering beneath the surface.  
> The rabbit never stops moving.