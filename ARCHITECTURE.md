# BLOCK OUT - Technical Architecture

## Overview

This is a complete 3D Blockout game implementation using Three.js. The game faithfully recreates the classic 1989 DOS game with true 3D polycube mechanics, collision detection, scoring, and level progression.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  BLOCK OUT GAME                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │   Game (Main Controller)                     │  │
│  │   - Game state management                    │  │
│  │   - Score tracking & level progression      │  │
│  │   - Input handling                          │  │
│  │   - Game loop (animate)                     │  │
│  └──────────────────────────────────────────────┘  │
│              ▲                           ▲          │
│              │                           │          │
│  ┌──────────┴──────────┐   ┌────────────┴────────┐ │
│  │   Block             │   │   Pit               │ │
│  │   - Current block   │   │   - 3D grid         │ │
│  │   - Rotation logic  │   │   - Collision test  │ │
│  │   - Movement logic  │   │   - Layer clearing  │ │
│  │   - Position/meshes │   │   - Block storage   │ │
│  └─────────────────────┘   └─────────────────────┘ │
│              ▼                          ▼           │
│  ┌─────────────────────────────────────────────┐   │
│  │   Renderer (Three.js)                       │   │
│  │   - Scene with lighting                     │   │
│  │   - Camera (isometric view)                 │   │
│  │   - Wireframe grid visualization            │   │
│  │   - Block meshes                            │   │
│  └─────────────────────────────────────────────┘   │
│              ▼                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │   HTML5 Canvas (WebGL Output)               │   │
│  └─────────────────────────────────────────────┘   │
│              ▼                                     │
│     Browser Display                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Core Classes

### 1. Pit Class
Manages the 3D grid of the game pit.

**Properties:**
- `width`, `depth`, `height`: Pit dimensions
- `grid[x][z][y]`: 3D array tracking occupied cells
- `meshes`: Array of rendered block meshes

**Methods:**
- `isEmpty(x, z, y)`: Check if cell is empty and in bounds
- `placeBlock(blockCubes)`: Add block cubes to grid
- `clearLayers()`: Detect and remove complete layers
- `getHighestPoint()`: Get maximum occupied height

**Data Structure:**
```javascript
grid[x][z][y] = null | { filled: true, color: 0x00ff00 }
```

### 2. Block Class
Represents a falling polycube piece.

**Properties:**
- `positions`: Array of relative cube coordinates [x, y, z]
- `color`: Block color (hex)
- `x, z, y`: Block position in pit
- `meshes`: Three.js mesh objects

**Methods:**
- `createMeshes()`: Generate Three.js geometries
- `updateMeshPositions()`: Sync meshes to logical position
- `canMove(newX, newZ, newY)`: Collision detection
- `move(dx, dz)`: Lateral movement
- `fall(amount)`: Vertical movement
- `hardDrop()`: Instant drop to bottom
- `rotate(axis)`: 3D rotation (x/y/z)
- `remove()`: Cleanup and scene removal

### 3. Game Class
Main game controller and loop.

**Properties:**
- `scene`, `camera`, `renderer`: Three.js objects
- `pit`: Pit instance
- `currentBlock`: Active falling block
- `score`, `level`, `cubesPlayed`: Game state
- `gameOver`, `paused`: State flags
- `keys`: Pressed key tracking

**Methods:**
- `initThreeJS()`: Scene, camera, lighting setup
- `createWireframeGrid()`: Wireframe visualization
- `setupInput()`: Keyboard event listeners
- `spawnBlock()`: Create new block
- `landBlock()`: Process block landing
- `clearLayers()`: Trigger layer clearing
- `endGame()`: Game over handling
- `animate()`: Main game loop
- `updateUI()`: Score display update

## Game Loop

```
┌─────────────────────────────────────┐
│   requestAnimationFrame()           │
│   (60 FPS target)                   │
└────────────────┬────────────────────┘
                 ▼
        ┌─────────────────┐
        │ Check if paused │
        │ Check if over   │
        └────────┬────────┘
                 ▼
    ┌────────────────────────┐
    │ updateBlockInput()     │
    │ - Process key presses  │
    │ - Move block           │
    │ - Rotate block         │
    └────────────┬───────────┘
                 ▼
    ┌────────────────────────┐
    │ Block fall timing      │
    │ - Check elapsed time   │
    │ - If time > interval:  │
    │   - Try fall()         │
    │   - If blocked: land() │
    │   - Spawn new block    │
    └────────────┬───────────┘
                 ▼
    ┌────────────────────────┐
    │ renderer.render()      │
    │ - Draw scene           │
    └────────────┬───────────┘
                 ▼
    ┌────────────────────────┐
    │ requestAnimationFrame()│
    │ (Next frame)           │
    └────────────────────────┘
```

## Collision Detection

The system uses a 3D grid-based collision detection algorithm:

```
For each cube in block:
  1. Calculate absolute grid position
  2. Check bounds (0 to width/depth/height)
  3. Check if pit.grid[x][z][y] is empty
  4. If any check fails, return false
  Return true if all checks pass
```

**Time Complexity:** O(n) where n = number of cubes in block (max 8)

## Block Rotation System

Blocks can rotate around three axes using mathematical transformations:

```javascript
// X-axis rotation (roll forward/back)
(x, y, z) → (x, -z, y)

// Y-axis rotation (spin left/right)  
(x, y, z) → (z, y, -x)

// Z-axis rotation (tilt left/right)
(x, y, z) → (-y, x, z)

// After each rotation: normalize to (0,0,0)
```

The `rotateBlock()` function implements these transformations. After rotation, `normalizeBlock()` shifts all coordinates so the minimum is (0,0,0).

## Layer Clearing Algorithm

```
For each height level y from 0 to height:
  1. Check if all cells at this y are filled
  2. If full:
     a. Mark layer as cleared
     b. Remove meshes for this layer
     c. Clear grid cells
     
For each cleared layer (bottom to top):
  1. Shift all layers above it down by 1
  2. Update mesh positions accordingly
  3. Add points to score
```

**Scoring Formula:**
```
points = 100 × (num_layers_cleared)² × level
```

## Scoring System

### Points Awarded

**1. Block Placement:**
```
points = 10 × (number of cubes) × level
```

**2. Layer Clear:**
```
points = 100 × (layers_cleared)² × level
```

### Level Progression

```
Level increases every 10 blocks placed
Fall speed increases: 0.5 + (level × 0.2) blocks/sec
Score multiplier increases with level
```

### High Score

```
localStorage['blockout_highscore'] = highest_score
// Persists across browser sessions
```

## 3D Coordinate System

The game uses a standard 3D coordinate system:

```
     +Y (up/height)
      ▲
      │
      │     +Z (forward/depth)
      │    /
      │   /
      └──────────► +X (right/width)
     
Pit coordinates:
  X: 0 to width (left to right)
  Z: 0 to depth (front to back)
  Y: 0 to height (bottom to top)
```

## Three.js Integration

### Scene Structure
```
Scene
├── AmbientLight (0.6 intensity)
├── DirectionalLight (0.8 intensity, position: 5,10,5)
├── GridLines (BufferGeometry, LineSegments)
├── BorderLines (BufferGeometry, LineSegments)
└── Block Meshes
    ├── BoxGeometry (0.95 unit cube)
    ├── MeshLambertMaterial (with color)
    └── Mesh instances (for each cube)
```

### Camera Setup
```
PerspectiveCamera:
  FOV: 60°
  Position: (width/2, height/1.5, depth+3)
  LookAt: (width/2, height/2, depth/2)
  
Result: Isometric-like 3D view of the pit
```

### Lighting Model
```
- AmbientLight: Uniform illumination (prevents pure black)
- DirectionalLight: Directional shading for depth perception
- MeshLambertMaterial: Realistic diffuse reflection
- No shadows: For performance and retro aesthetic
```

## Memory Management

### Block Cleanup
```
When block lands:
  1. Add meshes to pit.meshes
  2. Remove from scene (done)
  3. Create new block
  
When layers clear:
  1. Iterate pit.meshes
  2. Find meshes in cleared layers
  3. Call mesh.geometry.dispose()
  4. Call mesh.material.dispose()
  5. Remove from array
```

### Restart Cleanup
```
When game restarts:
  1. Traverse all scene objects
  2. Call dispose() on geometries
  3. Call dispose() on materials
  4. Clear all references
  5. Recreate scene from scratch
```

## Input Handling

### Event Listeners
```
keydown:
  - Record all key states in this.keys object
  - Handle special keys (space, p, r, q, w, e)
  - Rotation keys have single-press logic

keyup:
  - Update key state
  - Reset rotation flags
```

### Movement Processing
```
In updateBlockInput() (called each frame):
  - Check continuous keys (arrows, a, d, s)
  - Call block.move() if key pressed
  - Rotation handled in keydown for single-press
```

## Configuration

All game parameters are in the `CONFIG` object:

```javascript
CONFIG = {
    PIT_WIDTH: 5,              // Pit width
    PIT_DEPTH: 5,              // Pit depth
    PIT_HEIGHT: 10,            // Pit height
    BLOCK_SIZE: 1.0,           // Unit cube size
    FALL_SPEED_BASE: 0.5,      // Blocks/sec at level 1
    LEVEL_UP_BLOCKS: 10,       // Blocks per level
    HIGH_SCORE_KEY: 'blockout_highscore'
}
```

### Modifying Configuration

Edit `game.js` lines 9-17 to change:
- Pit dimensions
- Block size
- Difficulty progression
- High score storage key

## Performance Optimization

### 1. Geometry Reuse
```javascript
// Single geometry, multiple meshes
const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
// Reuse for all cubes in a block
```

### 2. Efficient Collision Detection
```javascript
// Grid-based lookup O(n) instead of O(n²)
// Only check affected cells, not all blocks
```

### 3. Memory Cleanup
```javascript
// Proper dispose() calls
// Prevent memory leaks with reference clearing
```

### 4. Frame Rate Control
```javascript
// requestAnimationFrame provides optimal timing
// Browser handles vsync automatically
```

### 5. Buffer Attributes
```javascript
// Use typed arrays (Float32Array)
// Efficient GPU memory transfer
```

## Block Definitions

14 unique 3D polycube shapes:

1. **I_VERTICAL**: 4 cubes, vertical line
2. **I_HORIZONTAL**: 4 cubes, horizontal line
3. **O_BLOCK**: 4 cubes, 2×2 square
4. **T_BLOCK**: 4 cubes, T-shape
5. **L_BLOCK**: 4 cubes, L-shape
6. **J_BLOCK**: 4 cubes, reverse L
7. **S_BLOCK**: 4 cubes, S-shape
8. **Z_BLOCK**: 4 cubes, Z-shape
9. **L_3D_V**: 5 cubes, 3D L
10. **T_3D**: 5 cubes, 3D T
11. **PLUS_3D**: 5 cubes, plus shape
12. **CUBE_2x2**: 8 cubes, 2×2×2 cube
13. **LINE_3D_V**: 4 cubes, vertical line
14. **STAIRS**: 4 cubes, staircase
15. **PYRAMID**: 5 cubes, pyramid

## Debugging

### Toggle Wireframes
To visualize the grid, the game automatically renders all grid lines.

### Console Output
The code is well-commented. Errors appear in browser console:
- Press F12 to open Developer Tools
- Check Console tab for errors

### Performance Monitoring
- Chrome DevTools: Performance tab shows FPS
- Firefox DevTools: Performance tab
- Monitor requestAnimationFrame timing

## Browser Compatibility

### Required Features
- WebGL (for Three.js)
- ES6 JavaScript
- LocalStorage API
- HTML5 Canvas

### Tested On
- Chrome 90+ ✓
- Firefox 88+ ✓
- Edge 90+ ✓
- Safari 14+ ✓

### Known Limitations
- Mobile: Touch controls not implemented
- Very old browsers: No WebGL support
- Mobile browsers: Performance may vary

## Future Enhancement Ideas

1. **Audio**: Integrate Howler.js for sound effects
2. **Touch Controls**: On-screen buttons for mobile
3. **Multiplayer**: Real-time competitive play
4. **Advanced Camera**: User-controlled camera rotation
5. **Particle Effects**: Explosion on layer clear
6. **Leaderboard**: Cloud-based high scores
7. **Different Block Sets**: ADVANCED, EXTENDED sets
8. **Customization**: Pit size selector
9. **Achievements**: In-game milestone rewards
10. **Replays**: Record and playback games

---

**Technical Stack:**
- Three.js r128 (3D Graphics)
- ES6+ JavaScript (Logic)
- HTML5 Canvas (Rendering)
- CSS3 (UI Styling)
- LocalStorage API (Persistence)

**Lines of Code:**
- game.js: ~886 lines
- index.html: ~242 lines
- Total: ~1,128 lines

**Performance Target:** 60 FPS on modern hardware
