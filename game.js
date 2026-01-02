/**
 * BLOCK OUT - Retro 3D Tetris Game
 * Fixed Spawn Logic & Solid Rendering
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    PIT_WIDTH: 5,   // X axis
    PIT_HEIGHT: 5,  // Y axis
    PIT_DEPTH: 12,  // Z axis (Falling distance)
    
    BLOCK_SIZE: 1.0,
    FALL_SPEED_BASE: 0.8, 
    LEVEL_UP_BLOCKS: 10,
    HIGH_SCORE_KEY: 'blockout_highscore_v4'
};

// ============================================
// BLOCK DEFINITIONS
// ============================================
const BLOCK_SHAPES = {
    L_3D: [[0,0,0], [0,1,0], [0,2,0], [1,0,0]], 
    T_FLAT: [[0,0,0], [1,0,0], [2,0,0], [1,1,0]],
    I_LONG: [[0,0,0], [0,0,1], [0,0,2], [0,0,3]], // Deep piece
    CUBE:   [[0,0,0], [1,0,0], [0,1,0], [1,1,0], [0,0,1], [1,0,1], [0,1,1], [1,1,1]],
    STAIRS: [[0,0,0], [1,0,0], [1,1,0], [2,1,0]],
    TRIPOD: [[0,0,0], [1,0,0], [0,1,0], [0,0,1]], 
    I_VER:  [[0,0,0], [0,1,0], [0,2,0], [0,3,0]],
    I_HOR:  [[0,0,0], [1,0,0], [2,0,0], [3,0,0]],
};

const BLOCK_COLORS = [
    0xffffff, // White
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0x00ff00, // Green
    0xff0000, // Red
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function rotateBlock(blockPositions, axis) {
    return blockPositions.map(([x, y, z]) => {
        switch(axis.toLowerCase()) {
            case 'x': return [x, -z, y];
            case 'y': return [z, y, -x];
            case 'z': return [-y, x, z];
            default: return [x, y, z];
        }
    });
}

function normalizeBlock(blockPositions) {
    let minX = Math.min(...blockPositions.map(p => p[0]));
    let minY = Math.min(...blockPositions.map(p => p[1]));
    let minZ = Math.min(...blockPositions.map(p => p[2]));
    
    return blockPositions.map(([x, y, z]) => [
        x - minX, y - minY, z - minZ
    ]);
}

// ============================================
// PIT CLASS
// ============================================
class Pit {
    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;

        // grid[z][x][y]
        this.grid = Array(depth).fill(null).map(() =>
            Array(width).fill(null).map(() =>
                Array(height).fill(null)
            )
        );

        this.meshes = [];
    }

    // Check if a coordinate is valid for movement
    isValidAndEmpty(x, y, z) {
        if (x < 0 || x >= this.width) return false;
        if (y < 0 || y >= this.height) return false;
        if (z >= this.depth) return false; // Hit bottom
        if (z < 0) return true; // Allowed in "air" above pit
        return this.grid[z][x][y] === null;
    }

    placeBlock(block) {
        const positions = block.getCalculatedPositions();
        
        for (const p of positions) {
            // Only place parts that are inside the pit
            if (p.z >= 0 && p.z < this.depth) {
                this.grid[p.z][p.x][p.y] = { color: block.color };
                block.createStaticMeshAt(p.x, p.y, p.z, this);
            }
        }
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
    }

    clearLayers() {
        const clearedIndices = [];

        for (let z = 0; z < this.depth; z++) {
            let full = true;
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    if (this.grid[z][x][y] === null) {
                        full = false;
                        break;
                    }
                }
                if (!full) break;
            }
            if (full) clearedIndices.push(z);
        }

        if (clearedIndices.length === 0) return 0;

        // Create new grid logic
        const newGrid = Array(this.depth).fill(null).map(() =>
            Array(this.width).fill(null).map(() => Array(this.height).fill(null))
        );

        let targetZ = this.depth - 1;
        
        // Shift blocks down
        for (let z = this.depth - 1; z >= 0; z--) {
            if (!clearedIndices.includes(z)) {
                for (let x = 0; x < this.width; x++) {
                    for (let y = 0; y < this.height; y++) {
                        newGrid[targetZ][x][y] = this.grid[z][x][y];
                    }
                }
                targetZ--;
            }
        }

        this.grid = newGrid;
        return clearedIndices.length;
    }
}

// ============================================
// BLOCK CLASS
// ============================================
class Block {
    constructor(scene, pit) {
        this.scene = scene;
        this.pit = pit;

        const keys = Object.keys(BLOCK_SHAPES);
        this.shapeName = keys[Math.floor(Math.random() * keys.length)];
        this.localCubes = BLOCK_SHAPES[this.shapeName].map(p => [...p]);
        this.color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];

        // Center the block based on its dimensions
        const xs = this.localCubes.map(p => p[0]);
        const ys = this.localCubes.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        this.x = Math.floor((pit.width - (maxX - minX + 1)) / 2) - minX;
        this.y = Math.floor((pit.height - (maxY - minY + 1)) / 2) - minY;

        // FIX: Calculate Z so the block spawns just entering the pit
        // e.g. If block is 3 units deep, spawn at Z = -3 so tip is at 0
        const maxShapeZ = Math.max(...this.localCubes.map(p => p[2]));
        this.z = -maxShapeZ; 

        // Group for falling state (Wireframe)
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.updateMeshGeometry();
        this.updateGroupPosition();
    }

    updateMeshGeometry() {
        while(this.group.children.length > 0){ 
            this.group.remove(this.group.children[0]); 
        }

        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: this.color, linewidth: 2 });

        this.localCubes.forEach(([lx, ly, lz]) => {
            const cube = new THREE.LineSegments(edges, material);
            cube.position.set(lx, ly, -lz); 
            this.group.add(cube);
        });
    }

    updateGroupPosition() {
        this.group.position.set(this.x, this.y, -this.z);
    }

    getCalculatedPositions() {
        return this.localCubes.map(([lx, ly, lz]) => ({
            x: this.x + lx,
            y: this.y + ly,
            z: this.z + lz
        }));
    }

    tryMove(dx, dy, dz) {
        const positions = this.getCalculatedPositions();
        for (const p of positions) {
            const nx = p.x + dx;
            const ny = p.y + dy;
            const nz = p.z + dz;
            
            if (!this.pit.isValidAndEmpty(nx, ny, nz)) {
                return false;
            }
        }
        
        this.x += dx;
        this.y += dy;
        this.z += dz;
        this.updateGroupPosition();
        return true;
    }

    rotate(axis) {
        const originalShape = this.localCubes;
        const newShape = rotateBlock(this.localCubes, axis);
        const normalized = normalizeBlock(newShape); 
        
        this.localCubes = normalized;
        
        const positions = this.getCalculatedPositions();
        let valid = true;
        for (const p of positions) {
            if (!this.pit.isValidAndEmpty(p.x, p.y, p.z)) {
                valid = false;
                break;
            }
        }

        if (valid) {
            this.updateMeshGeometry();
        } else {
            this.localCubes = originalShape;
        }
    }

    drop() {
        while(this.tryMove(0, 0, 1)) {}
    }

    // Creates the SOLID block when locked
    createStaticMeshAt(lx, ly, lz, pitInstance) {
        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
        
        // Solid Color
        const material = new THREE.MeshLambertMaterial({ color: this.color });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Black Outline
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        mesh.add(wireframe);

        mesh.position.set(lx, ly, -lz);
        
        this.scene.add(mesh);
        pitInstance.addMesh(mesh);
    }
    
    destroy() {
        this.scene.remove(this.group);
    }
}

// ============================================
// GAME CLASS
// ============================================
class Game {
    constructor() {
        this.initThreeJS();
        this.restart();
        this.animate();
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
        const cx = CONFIG.PIT_WIDTH / 2 - 0.5;
        const cy = CONFIG.PIT_HEIGHT / 2 - 0.5;
        this.camera.position.set(cx, cy, 5); 
        this.camera.lookAt(cx, cy, -20); 

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(cx, cy, 10); 
        this.scene.add(dirLight);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.keys = {};
        window.addEventListener('keydown', e => this.onKeyDown(e));
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('resize', () => this.onResize());
    }

    drawEnvironment() {
        if (this.envGroup) this.scene.remove(this.envGroup);
        this.envGroup = new THREE.Group();
        this.scene.add(this.envGroup);

        const material = new THREE.LineBasicMaterial({ color: 0x00aa00 }); 
        const offset = 0.5;
        
        // Longitudinal
        for (let x = 0; x <= CONFIG.PIT_WIDTH; x++) {
            for (let y = 0; y <= CONFIG.PIT_HEIGHT; y++) {
                const points = [];
                points.push(new THREE.Vector3(x - offset, y - offset, 0.5));
                points.push(new THREE.Vector3(x - offset, y - offset, -CONFIG.PIT_DEPTH + 0.5));
                
                const geom = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geom, material);
                this.envGroup.add(line);
            }
        }

        // Latitudinal
        for (let z = 0; z <= CONFIG.PIT_DEPTH; z++) {
            const zPos = -z + 0.5;
            const points = [];
            const left = -offset;
            const right = CONFIG.PIT_WIDTH - offset;
            const bottom = -offset;
            const top = CONFIG.PIT_HEIGHT - offset;

            points.push(new THREE.Vector3(left, bottom, zPos));
            points.push(new THREE.Vector3(right, bottom, zPos));
            points.push(new THREE.Vector3(right, top, zPos));
            points.push(new THREE.Vector3(left, top, zPos));
            points.push(new THREE.Vector3(left, bottom, zPos));

            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const zMat = new THREE.LineBasicMaterial({ 
                color: 0x00aa00, 
                opacity: 0.3 + (0.7 * (1 - z/CONFIG.PIT_DEPTH)), 
                transparent: true 
            });
            const line = new THREE.Line(geom, zMat);
            this.envGroup.add(line);
        }
    }

    restart() {
        if(this.activeBlock) this.activeBlock.destroy();
        
        if(this.pit) {
            this.pit.meshes.forEach(m => {
                this.scene.remove(m);
                if(m.geometry) m.geometry.dispose();
                if(m.material) m.material.dispose();
            });
        }

        this.pit = new Pit(CONFIG.PIT_WIDTH, CONFIG.PIT_HEIGHT, CONFIG.PIT_DEPTH);
        this.score = 0;
        this.level = 1;
        this.cubesPlayed = 0;
        this.gameOver = false;
        this.paused = false;
        this.lastFall = 0;

        this.drawEnvironment();
        this.spawnBlock();
        this.updateHUD();
        
        document.getElementById('gameOverScreen').classList.remove('show');
    }

    spawnBlock() {
        this.activeBlock = new Block(this.scene, this.pit);
        
        // Immediate collision check logic updated:
        // We only fail if the block physically overlaps the grid.
        // Since we spawn at negative Z, this usually passes unless the entrance is totally blocked.
        const positions = this.activeBlock.getCalculatedPositions();
        for (const p of positions) {
            if (!this.pit.isValidAndEmpty(p.x, p.y, p.z)) {
                this.endGame();
                return;
            }
        }
    }

    lockBlock() {
        // FIX: Check for overflow before clearing lines
        // If any part of the block is still outside (Z < 0), it's Game Over
        const positions = this.activeBlock.getCalculatedPositions();
        let overflow = false;
        for (const p of positions) {
            if (p.z < 0) {
                overflow = true;
                break;
            }
        }

        this.pit.placeBlock(this.activeBlock);
        this.activeBlock.destroy();
        this.activeBlock = null;

        if (overflow) {
            this.endGame();
            return;
        }

        const cleared = this.pit.clearLayers();
        if (cleared > 0) {
            this.score += Math.pow(cleared, 2) * 100 * this.level;
            this.rebuildPitMeshes();
        } else {
            this.score += 10 * this.level;
        }
        
        this.cubesPlayed++;
        if (this.cubesPlayed % CONFIG.LEVEL_UP_BLOCKS === 0) {
            this.level++;
        }

        this.updateHUD();
        this.spawnBlock();
    }

    rebuildPitMeshes() {
        this.pit.meshes.forEach(m => this.scene.remove(m));
        this.pit.meshes = [];

        for (let z = 0; z < this.pit.depth; z++) {
            for (let x = 0; x < this.pit.width; x++) {
                for (let y = 0; y < this.pit.height; y++) {
                    const cell = this.pit.grid[z][x][y];
                    if (cell) {
                        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
                        
                        // Solid
                        const material = new THREE.MeshLambertMaterial({ color: cell.color });
                        const mesh = new THREE.Mesh(geometry, material);
                        
                        // Outline
                        const edges = new THREE.EdgesGeometry(geometry);
                        const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
                        const wireframe = new THREE.LineSegments(edges, lineMat);
                        mesh.add(wireframe);

                        mesh.position.set(x, y, -z);
                        
                        this.scene.add(mesh);
                        this.pit.addMesh(mesh);
                    }
                }
            }
        }
    }

    onKeyDown(e) {
        if (this.gameOver) return;
        const k = e.key.toLowerCase();
        
        if (k === 'r') this.restart();
        if (k === 'p') {
            this.paused = !this.paused;
            document.getElementById('pauseIndicator').classList.toggle('show', this.paused);
        }
        if (this.paused) return;

        if (!this.activeBlock) return;

        if (k === 'arrowleft') this.activeBlock.tryMove(-1, 0, 0);
        if (k === 'arrowright') this.activeBlock.tryMove(1, 0, 0);
        if (k === 'arrowup') this.activeBlock.tryMove(0, 1, 0);
        if (k === 'arrowdown') this.activeBlock.tryMove(0, -1, 0);

        if (k === 'q') this.activeBlock.rotate('x');
        if (k === 'w') this.activeBlock.rotate('y');
        if (k === 'e') this.activeBlock.rotate('z');

        if (k === ' ') {
            this.activeBlock.drop();
            this.lockBlock();
        }
    }

    update(time) {
        if (this.gameOver || this.paused || !this.activeBlock) return;

        const speed = Math.max(0.1, CONFIG.FALL_SPEED_BASE - (this.level * 0.05));
        const interval = 1000 * speed;

        if (time - this.lastFall > interval) {
            if (!this.activeBlock.tryMove(0, 0, 1)) {
                this.lockBlock();
            }
            this.lastFall = time;
        }
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
        this.update(time);
        this.renderer.render(this.scene, this.camera);
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('finalScoreValue').textContent = this.score;
        document.getElementById('gameOverScreen').classList.add('show');
    }

    updateHUD() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('levelValue').textContent = this.level;
        document.getElementById('cubesValue').textContent = this.cubesPlayed;
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
    document.getElementById('restartButton').addEventListener('click', () => {
        location.reload(); 
    });
});