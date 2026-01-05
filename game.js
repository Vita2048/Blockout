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
    PIT_DEPTH: 10,  // Z axis (Falling distance)

    BLOCK_SIZE: 1.0,
    HIGH_SCORE_KEY: 'blockout_highscore_v4'
};

// ... BLOCK DEFINITIONS ... (unchanged)
const BLOCK_SHAPES = {
    L_3D: [[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 0, 0]],
    T_FLAT: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]],
    STAIRS: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]],
    TRIPOD: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
};

const BLOCK_COLORS = [
    0xffffff, // White
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
    0x00ff00, // Green
    0xff0000, // Red
];

// ... COLORS ... (unchanged)
// Palette extracted from BlockOut screenshot
const LAYER_COLORS = [
    0x4CA7A9, // Cyan          (was top, now bottom layer z=0)
    0x4CA730, // Green
    0x0000A3, // Deep Blue
    0xAAAAAA, // Light Gray
    0x9F5A1E, // Brown
    0x9C1EA4, // Magenta/Purple
    0x9C1E13, // Red
    0x4CA7A9, // Cyan
    0x4CA730, // Green
    0x0000A3, // Deep Blue     (now top layer z=9)
];
// ============================================
// UTILITY FUNCTIONS
// ============================================

function rotateBlock(blockPositions, axis) {
    return blockPositions.map(([x, y, z]) => {
        switch (axis.toLowerCase()) {
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

function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Increased for better resolution
    canvas.height = 128;
    const context = canvas.getContext('2d');

    // Support both string colors ('red') and hex numbers (0xff0000)
    let fillStyle = color;
    if (typeof color === 'number') {
        fillStyle = '#' + color.toString(16).padStart(6, '0');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = fillStyle;
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const textureMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false // Ensure labels are always visible
    });

    const sprite = new THREE.Sprite(textureMaterial);
    sprite.scale.set(1.2, 1.2, 1); // Larger label
    return sprite;
}

// Helper for Resolution-Independent Thick Lines
function createThickLineSegments(edgesGeometry, color, linewidth) {
    const lineGeometry = new THREE.LineSegmentsGeometry().fromEdgesGeometry(edgesGeometry);
    const lineMaterial = new THREE.LineMaterial({
        color: color,
        linewidth: linewidth,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const line = new THREE.LineSegments2(lineGeometry, lineMaterial);

    if (window.gameInstance) {
        window.gameInstance.lineMaterials.push(lineMaterial);
    }

    return line;
}

function createRotationGuide(axis, radius, color, keyLabel) {
    const group = new THREE.Group();

    // Reduced thickness by 50%
    const arcLength = 1.5 * Math.PI;
    const torusGeom = new THREE.TorusGeometry(radius, 0.015, 8, 40, arcLength);
    const torusMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const arc = new THREE.Mesh(torusGeom, torusMat);
    group.add(arc);

    // Arrowhead (Cone)
    const coneGeom = new THREE.ConeGeometry(0.18, 0.4, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
    const arrowhead = new THREE.Mesh(coneGeom, coneMat);

    // Position arrowhead at the end of the arc
    arrowhead.position.set(
        Math.cos(arcLength) * radius,
        Math.sin(arcLength) * radius,
        0
    );

    // Rotate arrowhead to point along the tangent
    arrowhead.rotation.z = arcLength;

    group.add(arrowhead);

    // Key Label for this rotation - Staggered to prevent overlap
    const label = createTextSprite(keyLabel, color);

    // Position labels at different angles relative to the axis to prevent overlap
    let angle = 0;
    if (axis === 'x') angle = 0;
    if (axis === 'y') angle = Math.PI / 4;
    if (axis === 'z') angle = Math.PI / 2;

    const labelOffset = radius + 0.8;
    label.position.set(
        Math.cos(angle) * labelOffset,
        Math.sin(angle) * labelOffset,
        0
    );
    group.add(label);

    // Orient the group based on the axis
    if (axis === 'x') {
        group.rotation.y = Math.PI / 2;
    } else if (axis === 'y') {
        group.rotation.x = -Math.PI / 2;
    }

    return group;
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
                const colorIndex = p.z;
                const layerColor = LAYER_COLORS[colorIndex % LAYER_COLORS.length];
                this.grid[p.z][p.x][p.y] = { color: layerColor };
                block.createStaticMeshAt(p.x, p.y, p.z, this, layerColor);
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

        // Update colors based on new depths
        for (let z = 0; z < this.depth; z++) {
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    if (this.grid[z][x][y]) {
                        const layerColor = LAYER_COLORS[z % LAYER_COLORS.length];
                        this.grid[z][x][y].color = layerColor;
                    }
                }
            }
        }

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

        // FALLING COLOR: White/Bright Yellow to stand out
        this.color = 0xffff00;

        // Spawn at left-bottom corner
        this.x = 0;
        this.y = 0;

        // Spawn at the top of the pit (Z=0)
        this.z = 0;

        // Group for falling state (Wireframe)
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.updateMeshGeometry();
        this.updateGroupPosition();
    }

    updateMeshGeometry() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        const vertices = [];
        const size = 1.0;
        const half = size / 2;

        const hasCube = (x, y, z) => this.localCubes.some(c => c[0] === x && c[1] === y && c[2] === z);

        for (const [lx, ly, lz] of this.localCubes) {
            const cx = lx;
            const cy = ly;
            const cz = -lz;

            const addQuad = (v1, v2, v3, v4) => {
                vertices.push(...v1, ...v2, ...v3);
                vertices.push(...v1, ...v3, ...v4);
            };

            const p0 = [cx + half, cy + half, cz + half];
            const p1 = [cx + half, cy + half, cz - half];
            const p2 = [cx + half, cy - half, cz + half];
            const p3 = [cx + half, cy - half, cz - half];
            const p4 = [cx - half, cy + half, cz + half];
            const p5 = [cx - half, cy + half, cz - half];
            const p6 = [cx - half, cy - half, cz + half];
            const p7 = [cx - half, cy - half, cz - half];

            if (!hasCube(lx + 1, ly, lz)) addQuad(p0, p1, p3, p2);
            if (!hasCube(lx - 1, ly, lz)) addQuad(p5, p7, p6, p4);
            if (!hasCube(lx, ly + 1, lz)) addQuad(p4, p5, p1, p0);
            if (!hasCube(lx, ly - 1, lz)) addQuad(p2, p3, p7, p6);
            if (!hasCube(lx, ly, lz - 1)) addQuad(p4, p0, p2, p6);
            if (!hasCube(lx, ly, lz + 1)) addQuad(p1, p5, p7, p3);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();

        const edges = new THREE.EdgesGeometry(geometry, 1);
        const thickWireframe = createThickLineSegments(edges, 0xffffff, 4);
        this.group.add(thickWireframe);
        this.addRotationGuides();
    }

    addRotationGuides() {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const [lx, ly, lz] of this.localCubes) {
            minX = Math.min(minX, lx); maxX = Math.max(maxX, lx);
            minY = Math.min(minY, ly); maxY = Math.max(maxY, ly);
            minZ = Math.min(minZ, lz); maxZ = Math.max(maxZ, lz);
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = -(minZ + maxZ) / 2;

        const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
        const radius = maxDim * 0.7 + 0.8;

        /*const guides = new THREE.Group();
        guides.add(createRotationGuide('x', radius, 0xff0000, 'A')); // Red for X -> A
        guides.add(createRotationGuide('y', radius, 0x00ff00, 'S')); // Green for Y -> S
        guides.add(createRotationGuide('z', radius, 0x0000ff, 'D')); // Blue for Z -> D

        guides.position.set(centerX, centerY, centerZ);
        this.group.add(guides);*/
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
            if (!this.pit.isValidAndEmpty(nx, ny, nz)) return false;
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

        const kicks = [
            [0, 0, 0],
            [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0],
            [-2, 0, 0], [2, 0, 0], [0, -2, 0], [0, 2, 0],
            [-3, 0, 0], [3, 0, 0], [0, -3, 0], [0, 3, 0]
        ];

        let validPosition = null;

        for (const [dx, dy, dz] of kicks) {
            let isPass = true;
            for (const [lx, ly, lz] of this.localCubes) {
                const nx = this.x + lx + dx;
                const ny = this.y + ly + dy;
                const nz = this.z + lz + dz;
                if (!this.pit.isValidAndEmpty(nx, ny, nz)) {
                    isPass = false;
                    break;
                }
            }
            if (isPass) {
                validPosition = [dx, dy, dz];
                break;
            }
        }

        if (validPosition) {
            this.x += validPosition[0];
            this.y += validPosition[1];
            this.z += validPosition[2];
            this.updateMeshGeometry();
            this.updateGroupPosition();
        } else {
            console.log("Rotation blocked");
            this.localCubes = originalShape;
        }
    }

    drop() {
        while (this.tryMove(0, 0, 1)) { }
    }

    createStaticMeshAt(lx, ly, lz, pitInstance, color) {
        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        const edges = new THREE.EdgesGeometry(geometry);
        const thickWireframe = createThickLineSegments(edges, 0xffffff, 1);
        mesh.add(thickWireframe);
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
        this.initDepthBar();
        this.level = 1;
        this.isRunning = false;

        this.lineMaterials = [];
        this.pit = new Pit(CONFIG.PIT_WIDTH, CONFIG.PIT_HEIGHT, CONFIG.PIT_DEPTH);
        this.drawEnvironment();
        this.renderer.render(this.scene, this.camera);
    }

    start(startLevel) {
        this.level = startLevel;
        document.getElementById('startScreen').style.display = 'none';
        this.restart();

        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
        const cx = CONFIG.PIT_WIDTH / 2 - 0.5;
        const cy = CONFIG.PIT_HEIGHT / 2 - 0.5;
        this.camera.position.set(cx, cy, 5);
        this.camera.lookAt(cx, cy, -20);

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

        for (let x = 0; x <= CONFIG.PIT_WIDTH; x++) {
            for (let y = 0; y <= CONFIG.PIT_HEIGHT; y++) {
                if (x === 0 || x === CONFIG.PIT_WIDTH || y === 0 || y === CONFIG.PIT_HEIGHT) {
                    const points = [];
                    points.push(new THREE.Vector3(x - offset, y - offset, 0.5));
                    points.push(new THREE.Vector3(x - offset, y - offset, -CONFIG.PIT_DEPTH + 0.5));
                    this.envGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
                }
            }
        }

        for (let z = 0; z <= CONFIG.PIT_DEPTH; z++) {
            const zPos = -z + 0.5;
            const points = [];
            const left = -offset, right = CONFIG.PIT_WIDTH - offset;
            const bottom = -offset, top = CONFIG.PIT_HEIGHT - offset;
            points.push(new THREE.Vector3(left, bottom, zPos));
            points.push(new THREE.Vector3(right, bottom, zPos));
            points.push(new THREE.Vector3(right, top, zPos));
            points.push(new THREE.Vector3(left, top, zPos));
            points.push(new THREE.Vector3(left, bottom, zPos));
            this.envGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
        }

        const bottomZ = -CONFIG.PIT_DEPTH + 0.5;
        for (let x = 1; x < CONFIG.PIT_WIDTH; x++) {
            const points = [new THREE.Vector3(x - offset, -offset, bottomZ), new THREE.Vector3(x - offset, CONFIG.PIT_HEIGHT - offset, bottomZ)];
            this.envGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
        }
        for (let y = 1; y < CONFIG.PIT_HEIGHT; y++) {
            const points = [new THREE.Vector3(-offset, y - offset, bottomZ), new THREE.Vector3(CONFIG.PIT_WIDTH - offset, y - offset, bottomZ)];
            this.envGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
        }

    }

    initDepthBar() {
        const bar = document.getElementById('depthBar');
        bar.innerHTML = '';
        this.depthLayers = [];
        for (let i = 0; i < CONFIG.PIT_DEPTH; i++) {
            const d = document.createElement('div');
            d.className = 'depth-layer';
            bar.appendChild(d);
            this.depthLayers.push(d);
        }
    }

    updateDepthBar() {
        for (let z = 0; z < CONFIG.PIT_DEPTH; z++) {
            let hasBlock = false;
            for (let x = 0; x < CONFIG.PIT_WIDTH; x++) {
                for (let y = 0; y < CONFIG.PIT_HEIGHT; y++) {
                    if (this.pit.grid[z][x][y]) { hasBlock = true; break; }
                }
                if (hasBlock) break;
            }
            const uiIndex = (CONFIG.PIT_DEPTH - 1) - z;
            const el = this.depthLayers[uiIndex];
            if (hasBlock) {
                const colorHex = LAYER_COLORS[z % LAYER_COLORS.length];
                el.style.backgroundColor = '#' + colorHex.toString(16).padStart(6, '0');
                el.classList.add('filled');
            } else {
                el.style.backgroundColor = 'transparent'; el.classList.remove('filled');
            }
        }
    }

    restart() {
        if (this.activeBlock) this.activeBlock.destroy();
        if (this.pit) {
            this.pit.meshes.forEach(m => {
                this.scene.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) m.material.dispose();
            });
        }
        this.pit = new Pit(CONFIG.PIT_WIDTH, CONFIG.PIT_HEIGHT, CONFIG.PIT_DEPTH);
        this.score = 0; this.cubesPlayed = 0; this.gameOver = false; this.paused = false;
        document.getElementById('pauseIndicator').classList.remove('show');
        this.lastFall = performance.now();
        this.lineMaterials = [];
        this.drawEnvironment(); this.spawnBlock(); this.updateHUD(); this.updateDepthBar();
        document.getElementById('gameOverScreen').classList.remove('show');
    }

    spawnBlock() {
        this.activeBlock = new Block(this.scene, this.pit);
        const positions = this.activeBlock.getCalculatedPositions();
        for (const p of positions) {
            if (!this.pit.isValidAndEmpty(p.x, p.y, p.z)) { this.endGame(); return; }
        }
    }

    lockBlock() {
        const positions = this.activeBlock.getCalculatedPositions();
        let overflow = false;
        for (const p of positions) if (p.z < 0) { overflow = true; break; }

        this.pit.placeBlock(this.activeBlock);
        this.activeBlock.destroy();
        this.activeBlock = null;

        if (overflow) { this.endGame(); return; }

        const cleared = this.pit.clearLayers();
        if (cleared > 0) {
            this.score += Math.pow(cleared, 2) * 100 * this.level;
            this.rebuildPitMeshes();
        } else { this.score += 10 * this.level; }

        this.cubesPlayed++; this.updateHUD(); this.updateDepthBar(); this.spawnBlock();
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
                        const material = new THREE.MeshLambertMaterial({ color: cell.color });
                        const mesh = new THREE.Mesh(geometry, material);
                        // White Outline, thicker (2x)
                        const edges = new THREE.EdgesGeometry(geometry);
                        const thickWireframe = createThickLineSegments(edges, 0xffffff, 2);
                        mesh.add(thickWireframe);
                        mesh.position.set(x, y, -z);
                        this.scene.add(mesh);
                        this.pit.addMesh(mesh);
                    }
                }
            }
        }
    }

    onKeyDown(e) {
        if (e.key === 'Escape') {
            const ss = document.getElementById('startScreen');
            if (ss.style.display === 'flex') { ss.style.display = 'none'; this.isRunning = true; this.animate(); }
            else { ss.style.display = 'flex'; this.isRunning = false; }
            return;
        }
        if (this.gameOver) return;
        const k = e.key.toLowerCase();
        if (k === 'p') { this.paused = !this.paused; document.getElementById('pauseIndicator').classList.toggle('show', this.paused); }
        if (this.paused || !this.activeBlock) return;

        if (k === 'arrowleft') this.activeBlock.tryMove(-1, 0, 0);
        if (k === 'arrowright') this.activeBlock.tryMove(1, 0, 0);
        if (k === 'arrowup') this.activeBlock.tryMove(0, 1, 0);
        if (k === 'arrowdown') this.activeBlock.tryMove(0, -1, 0);

        if (k === 'a' || k === 'q') this.activeBlock.rotate('x');
        if (k === 's' || k === 'w') this.activeBlock.rotate('y');
        if (k === 'd' || k === 'e') this.activeBlock.rotate('z');

        if (k === ' ') { this.activeBlock.drop(); this.lockBlock(); }
    }

    update(time) {
        if (this.gameOver || this.paused || !this.activeBlock) return;
        const speedInterval = Math.max(0.1, 6.125 - (this.level * 1.125));
        const interval = 1000 * speedInterval;
        if (time - this.lastFall > interval) {
            if (!this.activeBlock.tryMove(0, 0, 1)) this.lockBlock();
            this.lastFall = time;
        }
    }

    animate(time) {
        if (!this.isRunning) return;
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

        const res = new THREE.Vector2(window.innerWidth, window.innerHeight);
        this.lineMaterials.forEach(m => {
            if (m.resolution) m.resolution.copy(res);
        });
    }
}

window.startGame = function (level) { if (window.gameInstance) window.gameInstance.start(level); };
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
    document.getElementById('restartButton').addEventListener('click', () => location.reload());
});