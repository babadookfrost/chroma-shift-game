# Chroma Shift Module API Specification

This document catalogues the interfaces, classes, public methods, parameters, and return types of the core game systems.

---

## 1. OpticsEngine Module

### Interfaces

#### `GameElement`
Represents any component resting on the playing board:
* `id` (`string`): Unique element key.
* `type` (`'emitter' | 'mirror' | 'prism' | 'target'`): Type identifier.
* `x` (`number`): Horizontal board position.
* `y` (`number`): Vertical board position.
* `angle` (`number`): Direct rotation in degrees (0 is pointing right).
* `color` (`RGBColor`): Optional color configurations.
* `width` (`number`): Optional bounding collision width.

#### `BeamSegment`
Represents a straight traced segment of a glowing laser ray:
* `id` (`string`): Unique segment key.
* `startX` (`number`): Initial horizontal coordinate.
* `startY` (`number`): Initial vertical coordinate.
* `endX` (`number`): Ending horizontal coordinate.
* `endY` (`number`): Ending vertical coordinate.
* `color` (`RGBColor`): RGB vector.
* `sourceId` (`string`): Element ID that generated or bounced this ray.

---

### OpticsEngine Class

#### `constructor(width?: number, height?: number)`
Instantiates the collision tracking field dimensions.

#### `setElement(element: GameElement): void`
Adds or updates a Game Element on the board.

#### `removeElement(id: string): void`
Deletes an element from the simulation tracking.

#### `traceBeams(): TraceResult`
Runs path-tracing simulations from emitters. Returns list of active `BeamSegment`s and a `Set<string>` of successfully activated crystal targets.

---

## 2. SoundEngine Module

#### `static init(): void`
Initializes the browser `AudioContext` and starts the low-pass ambient drone.

#### `static resume(): Promise<void>`
Unlocks the `AudioContext` (handles iOS silent-switch and user touch policies).

#### `static playTap(screenX?: number): void`
Synthesizes a short neon clicks/placement sound. Spatial panning is calculated based on screen coordinate `screenX`.

#### `static playCrystalActivation(screenX?: number): void`
Plays a major arpeggiated chiming chord when a crystal is activated.

#### `static playLevelComplete(): void`
Plays a pentatonic completion sweep overlay on success.

#### `static setVolume(val: number): void`
Sets master volume level (0.0 to 1.0). Stores preference in localStorage.

---

## 3. SaveSystem Module

#### `static loadProgress(): Promise<PlayerProgress>`
Loads data from LocalStorage and synchronizes with IndexedDB backup copies.

#### `static saveProgress(progress?: PlayerProgress): Promise<boolean>`
Saves progress to localStorage and triggers background cloud-syncing.

#### `static completeLevel(levelId: string, stars: number, timeSpent: number, moves: number): boolean`
Marks level as cleared, updates stars/statistics, and checks if a record was improved. Returns boolean.
