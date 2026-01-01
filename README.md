# BLOCK OUT - Web-Based 3D Tetris Game

A complete recreation of the classic 1989 DOS game "Blockout" using Three.js for 3D rendering in the browser.

## Features

- **True 3D Gameplay**: Play Blockout in a customizable 3D pit (default 5x5x10)
- **14+ Polycube Shapes**: Various 3D tetromino-like blocks with unique mechanics
- **3D Rotation**: Rotate blocks around X, Y, and Z axes
- **Retro Aesthetic**: Green wireframe grid, classic DOS color palette, authentic UI
- **Scoring System**: Points based on blocks placed, layers cleared, and level
- **Level Progression**: Difficulty increases with each level, affecting fall speed
- **High Score Tracking**: Persistent high score using localStorage
- **Keyboard Controls**: Intuitive controls for movement, rotation, and special actions

## How to Play

1. Open `index.html` in a web browser
2. Blocks fall from the top of the pit
3. Move and rotate them to fill layers
4. Complete solid layers to clear them and earn points
5. The game ends when blocks reach the top

## Controls

| Key(s) | Action |
|--------|--------|
| Arrow Left / A | Move block left |
| Arrow Right / D | Move block right |
| Arrow Up | Move block forward |
| Arrow Down / S | Move block backward |
| Q | Rotate around X axis |
| W | Rotate around Y axis |
| E | Rotate around Z axis |
| Space | Hard drop block to bottom |
| P | Pause/Resume game |
| R | Restart game |

## Scoring

- **Block Placement**: 10 × number of cubes × level
- **Layer Clear**: 100 × (number of layers)² × level
- **Level Up**: After placing 10 blocks

## Game Mechanics

- Blocks spawn at the top center of the pit
- Fall speed increases with level
- Collision detection prevents moves/rotations that intersect walls or blocks
- Filled layers (complete width × depth slices) are automatically cleared
- Blocks above cleared layers shift down
- Game ends when a new block can't spawn due to blocks at the top

## Technologies Used

- **Three.js r128**: 3D graphics library
- **JavaScript ES6+**: Game logic and mechanics
- **HTML5 Canvas**: Rendering surface
- **CSS3**: UI and layout

## File Structure

- `index.html` - Main HTML file with UI layout and styling
- `game.js` - Complete game implementation including:
  - Block definitions (14+ unique 3D shapes)
  - Pit grid management with 3D collision detection
  - Game state and scoring system
  - Three.js scene setup and rendering
  - Input handling

## Game Physics

- **Gravity**: Blocks fall continuously, accelerating with level
- **Rotation**: 3D rotation with collision avoidance
- **Collision**: Full 3D collision detection for walls and blocks
- **Layer Detection**: Scans for complete horizontal slices to clear

## Performance

- 60 FPS target using requestAnimationFrame
- Optimized geometry reuse
- Efficient 3D grid collision checking
- Proper resource cleanup on layer clear

## Browser Compatibility

Works in all modern browsers that support:
- WebGL
- ES6 JavaScript
- LocalStorage API

Tested on:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Future Enhancements

- Audio effects (Howler.js integration)
- Additional block sets
- Touch/mobile controls
- Multiplayer support
- Particle effects for cleared layers
- Advanced camera modes

## Credits

Inspired by the original 1989 Blockout game by California Dreams.
Modern web recreation with Three.js.
