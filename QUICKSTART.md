# BLOCK OUT - Quick Start Guide

## Installation

No installation required! Simply open `index.html` in a modern web browser.

### System Requirements
- Modern web browser with WebGL support
- 2MB free disk space
- Internet connection (to load Three.js from CDN)

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Running the Game

1. **Open the Game**
   - Double-click `index.html` OR
   - Right-click `index.html` → "Open with" → Choose your browser

2. **See the Game**
   - A 3D green wireframe pit will appear
   - Colorful blocks will start falling from the top
   - The score display shows on the right panel

3. **Play**
   - Use arrow keys or WASD to move blocks
   - Press Q/W/E to rotate
   - Press Space to drop quickly
   - Try to complete layers!

## Game Objective

- **Clear Layers**: Complete horizontal slices across the entire pit
- **Earn Points**: More blocks placed, more layers cleared = more points
- **Level Up**: Difficulty increases, blocks fall faster
- **Reach High Score**: Try to beat your previous best!

## Keyboard Controls

### Movement
```
↑ Arrow Up    = Move block forward
↓ Arrow Down  = Move block backward  
← Arrow Left  = Move block left
→ Arrow Right = Move block right
```

### Rotation
```
Q = Rotate around X axis (tilt forward/back)
W = Rotate around Y axis (spin left/right)
E = Rotate around Z axis (roll)
```

### Special
```
Space = Hard drop (instantly fall to bottom)
P     = Pause/Resume
R     = Restart game
```

## Gameplay Tips

### Strategy
1. **Plan Ahead**: Think about where blocks will land
2. **Build Layers**: Try to fill entire horizontal slices
3. **Rotation**: Use 3D rotation to fit blocks into tight spaces
4. **Speed**: Don't rush - blocks fall faster at higher levels

### Techniques
- Use rotations creatively to fit odd-shaped blocks
- Try to clear multiple layers at once for bonus points
- The harder drop (space) can help when falling is too slow
- Higher levels give much bigger scores

### Difficulty Progression
- **Level 1**: Blocks fall slowly, 0.5 per second
- **Level 2**: 0.7 per second
- **Level 3**: 0.9 per second
- **Level 10+**: Very challenging!

## Scoring System

### Points Awarded
1. **Block Placement**: 10 × (number of cubes in block) × level
2. **Layer Clear**: 100 × (layers cleared)² × level

### Example Scores
- Placing a 4-cube block at level 1 = 40 points
- Clearing 1 layer at level 1 = 100 points
- Clearing 2 layers at level 1 = 400 points (100 × 2²)
- Clearing 2 layers at level 5 = 2000 points (100 × 4 × 5)

### Leveling
- You gain a new level every 10 blocks placed
- Higher levels increase fall speed and point multipliers

## High Score

- Your high score is **automatically saved** in the browser
- It persists even after closing the browser
- Restart button resets the game but keeps high score
- Clear browser data to reset high score

## Understanding the UI

```
                    BLOCK OUT                      ← Game Title
                                      
LEVEL      ┌─────────────────────────┐  SCORE
  1        │                         │    0
           │   3D GAME PIT           │  CUBES PLAYED
           │                         │    0
           │   (wireframe grid)      │  HIGH SCORE
           │                         │    0
           │                         │  PIT SIZE
│ │ │ │ │  │                         │    5x5x10
│█│█│ │ │  │                         │  BLOCK SET
│ │ │ │ │  └─────────────────────────┘    BASIC
```

- **LEVEL**: Current difficulty level
- **SCORE**: Points earned in current game
- **CUBES PLAYED**: Total unit cubes placed
- **HIGH SCORE**: Best score ever (persistent)
- **PIT SIZE**: Dimensions of the playing field
- **BLOCK SET**: Type of blocks used (always "BASIC")

## 3D Camera

The camera is positioned at a 3D isometric-like angle, giving you a good view of:
- The falling blocks
- The pit structure
- Completed layers forming

## Block Types (14 Total)

Your game uses 14 different 3D polycube shapes:
1. **I-pieces**: Straight lines (4 cubes)
2. **O-pieces**: 2×2 squares (4 cubes)
3. **T-pieces**: T-shaped blocks
4. **L-pieces**: L-shaped and reversed L
5. **S/Z-pieces**: Zigzag shapes
6. **3D shapes**: Special blocks with depth
7. **Pyramids**: 5-cube pyramid shapes
8. **2×2×2 Cubes**: Compact 8-cube blocks

## Game Over

The game ends when:
- A new block can't spawn because blocks reach the top
- A white "GAME OVER" screen appears
- Your final score is displayed
- Click "PLAY AGAIN" to restart

## Troubleshooting

### Game doesn't load
- Check internet connection (needs Three.js from CDN)
- Try a different browser
- Clear browser cache and reload

### Game is too slow
- Close other browser tabs
- Check GPU/CPU usage
- Try a different browser (Chrome is usually fastest)

### Can't move/rotate blocks
- Make sure the game window is focused (click in the game area)
- Check that CAPS LOCK isn't on
- Try different movement keys

### High score disappeared
- Browser data may have been cleared
- High score is stored locally, not in cloud
- Different browsers have separate high scores

## Performance Info

- **Target FPS**: 60 frames per second
- **Resolution**: Scales to fit your window
- **Optimal Window Size**: 1920×1080 or larger
- **Mobile**: Works on some tablets (limited controls)

## Advanced Settings

### Debug Information
The code includes comments for developers. To modify:
1. Open `game.js` in a text editor
2. Adjust `CONFIG` values at the top:
   - `PIT_WIDTH`: Width of pit (default: 5)
   - `PIT_DEPTH`: Depth of pit (default: 5)
   - `PIT_HEIGHT`: Height of pit (default: 10)
   - `FALL_SPEED_BASE`: Base fall speed (default: 0.5)
   - `LEVEL_UP_BLOCKS`: Blocks per level (default: 10)

3. Refresh the browser to see changes

## File Structure

```
Blockout/
├── index.html          ← Main game file (open this!)
├── game.js             ← Game logic and mechanics
└── README.md           ← Full documentation
```

## Credits

- **Original Game**: Blockout (1989) by California Dreams
- **Engine**: Three.js (WebGL 3D graphics)
- **Recreation**: Modern web implementation with original mechanics

## License

This is a fan recreation of the classic 1989 Blockout game.
Feel free to modify and share!

---

**Enjoy the game! 🎮**

For detailed technical documentation, see `README.md`
