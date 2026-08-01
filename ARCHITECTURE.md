# Chroma Shift Architecture Directory

This document details the software architecture, data flows, and module structure of Chroma Shift.

## Module Tree Diagram

```
src/
├── main.ts              # App entrypoint & global configuration
├── core/
│   └── OpticsEngine.ts  # Light collision raycasting & splitting logic
├── audio/
│   └── SoundEngine.ts   # Web Audio API procedural synthesizer
├── input/
│   └── InputController.ts # Multitouch gestures & PWA Native APIs
├── save/
│   └── SaveSystem.ts    # LocalStorage, IndexedDB & Mock Cloud backup
├── shaders/
│   └── ChromaPipeline.ts # Custom GLSL PostFX WebGL pipeline
└── scenes/
    ├── BootScene.ts     # Resource builder & start screen
    ├── GameScene.ts     # Primary gameplay puzzle loop
    ├── SettingsScene.ts # Audio & accessibility control panel
    └── LevelEditorScene.ts # Level designer & url sharing
```

## Module Interactions and Data Flows

```
┌────────────────────────────────────────────────────────┐
│                      GameScene                         │
│                                                        │
│  1. Pointer Move Events                                │
│     ══════════════════> InputController                │
│                         (Translates gestures)          │
│                                                        │
│  2. Update Tick Loop                                   │
│     ══════════════════> OpticsEngine                   │
│                         (Path tracing, collisions)     │
│                                                        │
│  3. Targets Activated / Action Cues                    │
│     ══════════════════> SoundEngine                    │
│                         (Synthesizes chime sounds)     │
│                                                        │
│  4. Progress Achieved                                  │
│     ══════════════════> SaveSystem                     │
│                         (Persists to DB & Local)       │
└────────────────────────────────────────────────────────┘
```

### 1. GameScene
The central controller of Phaser. It instantiates the visual representation of mirrors, prisms, emitters, and crystal targets, listens to touch gestures using `InputController`, triggers paths calculations on `OpticsEngine` during every frame update, and updates the canvas display using custom `ChromaPipeline` post-processing.

### 2. OpticsEngine
A decoupled, 100% pure TypeScript module that acts as the physics logic engine of light. It calculates coordinates of intersections, reflects rays off mirrors, splits and bends rays using dispersion indices off prisms, and registers target hits. It does not contain references to Phaser, rendering, or audio, making it fully testable.

### 3. SoundEngine
A pure procedural synthesizer built directly on Web Audio API nodes. It contains no file loaders. It creates warm background space hums, crisp feedback ticks, crystal chimes, and arpeggiated victory chords on-demand, preventing browser lags or missing sound effects.

### 4. InputController
Binds pointer coordinates and handles single-finger dragging, two-finger rotating, and pinch zooming. It encapsulates mobile native integration with Screen Wake Locks, badges, and Web Shares.
