/**
 * Tessellate - WebGL Implementation
 * A minimalist UI experiment with triangular tessellations
 */

// WebGL context and program variables
let gl;
let program;
let canvas;

// App state
let showColors = true; // Toggle for showing/hiding colors

// Shader attributes and uniforms
let positionAttributeLocation;
let instanceOffsetLocation;
let instanceColorLocation;
let instanceScaleLocation;
let selectedUniformLocation;
let timeUniformLocation;
let resolutionUniformLocation;
let showColorsUniformLocation;
let projectionMatrixLocation;
let modelViewMatrixLocation;

// Matrix and transformation utilities
const mat4 = {
    create: function() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    perspective: function(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = (far + near) / (near - far);
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[14] = (2 * far * near) / (near - far);
        out[15] = 0;
        return out;
    },
    ortho: function(out, left, right, bottom, top, near, far) {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        
        out[0] = -2 * lr;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = -2 * bt;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 2 * nf;
        out[11] = 0;
        out[12] = (left + right) * lr;
        out[13] = (top + bottom) * bt;
        out[14] = (far + near) * nf;
        out[15] = 1;
        return out;
    },
    identity: function(out) {
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = 1;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 1;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        return out;
    }
};

// Shader sources
const vertexShaderSource = `
    attribute vec2 position;
    attribute vec3 instanceColor;
    attribute float instanceSelected;

    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    
    varying vec3 vColor;
    varying float vSelected;
    varying vec2 vPosition; // Renamed to reflect actual content
    
    void main() {
        vColor = instanceColor;
        vSelected = instanceSelected;
        vPosition = position;
        
        // Just pass through the position for fragment shader to use
        // WebGL 1.0 doesn't support gl_VertexID, so we need a simpler approach
        
        // No instancing transformations - using actual vertices
        // Project directly to clip space
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    uniform float time;
    uniform vec2 resolution;
    uniform float showColors;
    
    varying vec3 vColor;
    varying float vSelected;
    varying vec2 vPosition;
    
    void main() {
        // Super simplified shader for transparency handling
        vec3 color = vColor;  // Default to the provided color
        float alpha = 1.0;    // Default to fully opaque
        
        if (showColors > 0.5) {
            // COLORED MODE - Solid triangles with the provided color
            alpha = 0.95;  // Slightly transparent
            
            // Selection causes a blue tint
            if (vSelected > 0.5) {
                vec3 highlightColor = vec3(0.3, 0.7, 1.0);
                float pulse = 0.7 + 0.3 * sin(time * 2.0);
                color = mix(color, highlightColor, 0.3 * pulse);
            }
        } else {
            // WIREFRAME MODE - Triangles are completely transparent
            // The outlines are drawn by separate function, not in the shader
            
            // Make all triangles fully transparent in wireframe mode
            // (This allows our outline drawing technique to work)
            alpha = 0.0;
            
            // Only selected triangles get a slight fill
            if (vSelected > 0.5) {
                alpha = 0.1;  // Barely visible fill
                color = vec3(0.3, 0.7, 1.0);  // Blue highlight
            }
        }
        
        gl_FragColor = vec4(color, alpha);
    }
`;

// Triangle data structures
const MAX_TRIANGLES = 10000;

// We won't use base vertices anymore - instead we'll render each triangle's actual vertices
const triangleBaseVertices = [
    0, 0,  // Just placeholders, not used in this approach
    0, 0,
    0, 0
];

// Size multiplier for triangles (make them smaller to see more of them)
const TRIANGLE_SIZE = 0.3;

// Arrays for instance data
const instanceOffsets = new Float32Array(MAX_TRIANGLES * 2);
const instanceColors = new Float32Array(MAX_TRIANGLES * 3);
const instanceScales = new Float32Array(MAX_TRIANGLES);
const instanceSelected = new Float32Array(MAX_TRIANGLES);

// Debug: Create a visualization of the base triangle shape
console.log('Base triangle vertices:', triangleBaseVertices);

// Triangle management
let triangles = [];
let selectedTriangleIndex = -1;
let focusedTriangleIndex = -1;
let triangleCount = 0;
let nextTriangleId = 0;

// Class to represent triangle properties
class Triangle {
    constructor(id, vertices, parent = null, parentSide = -1) {
        this.id = id;
        this.vertices = vertices; // Array of 6 values [x1,y1, x2,y2, x3,y3]
        this.parent = parent;
        this.parentSide = parentSide;
        this.children = [null, null, null]; // Children by side
        this.neighbors = [null, null, null]; // Adjacent triangles by side
        this.innerTriangles = [null, null, null]; // Inner triangles by side
        this.outerTriangles = [null, null, null]; // Outer triangles by side
        
        // Calculate center
        this.center = [
            (vertices[0] + vertices[2] + vertices[4]) / 3,
            (vertices[1] + vertices[3] + vertices[5]) / 3
        ];
        
        // Visual properties
        this.selected = false;
        this.focused = false;
        
        // Generate unique color based on position
        const h = (this.center[0] + this.center[1]) * 0.1 % 1.0;
        this.color = hslToRgb(h, 0.7, 0.5);
    }
    
    // Add triangle relationship methods
    setNeighbor(side, triangle) {
        this.neighbors[side] = triangle;
    }
    
    setChild(side, triangle) {
        this.children[side] = triangle;
    }
    
    setInnerTriangle(side, triangle) {
        this.innerTriangles[side] = triangle;
    }
    
    setOuterTriangle(side, triangle) {
        this.outerTriangles[side] = triangle;
    }
    
    // Get vertices for each side (pairs of points)
    getSide(index) {
        console.log('Getting side', index, 'of triangle', this.id);
        console.log('Triangle vertices:', this.vertices);
        
        let i1, i2;
        if (index === 0) {
            i1 = 0; // First vertex (x1,y1)
            i2 = 2; // Second vertex (x2,y2)
        } else if (index === 1) {
            i1 = 2; // Second vertex (x2,y2)
            i2 = 4; // Third vertex (x3,y3)
        } else { // index === 2
            i1 = 4; // Third vertex (x3,y3)
            i2 = 0; // First vertex (x1,y1)
        }
        
        const result = [
            this.vertices[i1], this.vertices[i1+1],
            this.vertices[i2], this.vertices[i2+1]
        ];
        
        console.log('Side vertices result:', result);
        return result;
    }
}

// Initialize WebGL
function initWebGL() {
    canvas = document.getElementById('tessellate-canvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }
    
    console.log('Initializing WebGL...');
    
    // Create shader program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vertexShader, fragmentShader);
    
    if (!program) {
        console.error('Failed to create WebGL program');
        return;
    }
    
    // Get attribute and uniform locations
    positionAttributeLocation = gl.getAttribLocation(program, 'position');
    instanceColorLocation = gl.getAttribLocation(program, 'instanceColor');
    selectedUniformLocation = gl.getAttribLocation(program, 'instanceSelected');
    
    timeUniformLocation = gl.getUniformLocation(program, 'time');
    resolutionUniformLocation = gl.getUniformLocation(program, 'resolution');
    showColorsUniformLocation = gl.getUniformLocation(program, 'showColors');
    modelViewMatrixLocation = gl.getUniformLocation(program, 'modelViewMatrix');
    projectionMatrixLocation = gl.getUniformLocation(program, 'projectionMatrix');
    
    // Initialize buffers
    initBuffers();
    
    // Set up viewport and clear color
    resize();
    gl.clearColor(0.98, 0.98, 0.98, 1.0); // Slightly lighter background
    gl.enable(gl.BLEND);
    
    // Simple alpha blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Add instructions to the UI
    addInstructions();
    
    // Create initial triangle
    createInitialTriangle();
    
    // Set up input handlers
    setupInputHandlers();
    
    // Start animation loop
    requestAnimationFrame(render);
    
    console.log('WebGL initialization complete.');
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
        console.error('Shader source:', source);
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    // Check if shaders were successfully compiled
    if (!vertexShader || !fragmentShader) {
        console.error('Cannot create program without valid shaders');
        return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function createInitialTriangle() {
    // Create an equilateral triangle in the center of the screen
    const size = 0.5 * TRIANGLE_SIZE; // Size relative to screen
    const vertices = [
        -size, -size * 0.577,  // Bottom left
         size, -size * 0.577,  // Bottom right
         0.0,  size * 1.155    // Top
    ];
    
    addTriangle(vertices);
}

function addTriangle(vertices, parent = null, parentSide = -1) {
    if (triangleCount >= MAX_TRIANGLES) {
        console.warn('Maximum triangle count reached');
        return null;
    }
    
    // Create new triangle object
    const triangle = new Triangle(nextTriangleId++, vertices, parent, parentSide);
    triangles.push(triangle);
    const index = triangleCount;
    
    console.log(`Adding triangle ${index} at center ${triangle.center[0]}, ${triangle.center[1]}`);
    
    // Update instance data for rendering
    instanceOffsets[index * 2] = triangle.center[0];
    instanceOffsets[index * 2 + 1] = triangle.center[1];
    
    instanceColors[index * 3] = triangle.color[0];
    instanceColors[index * 3 + 1] = triangle.color[1];
    instanceColors[index * 3 + 2] = triangle.color[2];
    
    instanceScales[index] = 1.0;
    instanceSelected[index] = 0.0;
    
    // Update triangle relationships
    if (parent !== null && parentSide >= 0) {
        parent.setChild(parentSide, triangle);
    }
    
    // Auto-focus first triangle
    if (triangleCount === 0) {
        focusTriangle(0);
    }
    
    console.log(`Triangle count is now ${triangleCount+1}`);
    triangleCount++;
    
    // Mark data as changed so it will be updated in the render loop
    dataChanged = true;
    
    return triangle;
}

function createAdjacentTriangle(triangleIndex, side) {
    const triangle = triangles[triangleIndex];
    if (!triangle) return null;
    
    // Get vertices of the side to share
    const sideVertices = triangle.getSide(side);
    
    // Use the side vertices directly (these are the two shared vertices)
    const x1 = sideVertices[0];
    const y1 = sideVertices[1];
    const x2 = sideVertices[2];
    const y2 = sideVertices[3];
    
    // Log for debugging
    console.log('Creating adjacent triangle on side', side);
    console.log('Side vertices:', x1, y1, x2, y2);
    
    // Calculate direction vector of edge
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Calculate the center of the original triangle
    const centerX = triangle.center[0];
    const centerY = triangle.center[1];
    
    // Calculate the midpoint of the edge
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    // Calculate vector from midpoint to center
    const toCenterX = centerX - midX;
    const toCenterY = centerY - midY;
    
    // Calculate perpendicular vector pointing AWAY from the center
    // This ensures it always points outward
    const length = Math.sqrt(dx * dx + dy * dy);
    let perpX = dy / length;
    let perpY = -dx / length;
    
    // Check if perpendicular vector points toward center (dot product > 0)
    // If so, flip it to point outward
    const dotProduct = perpX * toCenterX + perpY * toCenterY;
    if (dotProduct > 0) {
        perpX = -perpX;
        perpY = -perpY;
    }
    
    // Calculate the position of the third vertex
    // Height of equilateral triangle = side length * sqrt(3)/2
    const height = length * Math.sqrt(3) / 2;
    const x3 = (x1 + x2) / 2 + perpX * height;
    const y3 = (y1 + y2) / 2 + perpY * height;
    
    console.log('Original triangle center:', centerX, centerY);
    console.log('Edge midpoint:', midX, midY);
    console.log('Perpendicular vector:', perpX, perpY);
    console.log('New third vertex:', x3, y3);
    
    // Create the new triangle vertices
    // Use the shared edge vertices (from the original triangle) plus the new third vertex
    const newVertices = [x1, y1, x2, y2, x3, y3];
    
    // Log the new triangle
    console.log('New triangle vertices:', newVertices);
    
    // Add the new triangle
    const newTriangle = addTriangle(newVertices, triangle, side);
    
    if (newTriangle) {
        // Set up neighbor relationships
        triangle.setNeighbor(side, newTriangle);
        
        // Find which side of the new triangle faces the original triangle
        // This is more reliable than assuming (side + 2) % 3
        for (let newSide = 0; newSide < 3; newSide++) {
            // Get the two vertices of this side of the new triangle
            const newSideVerts = newTriangle.getSide(newSide);
            const newV1 = [newSideVerts[0], newSideVerts[1]];
            const newV2 = [newSideVerts[2], newSideVerts[3]];
            
            // Check if these match the original shared edge (in either order)
            const originalSideVerts = triangle.getSide(side);
            const origV1 = [originalSideVerts[0], originalSideVerts[1]];
            const origV2 = [originalSideVerts[2], originalSideVerts[3]];
            
            // Check if the vertices match (considering both orderings)
            const matchForward = (
                Math.abs(newV1[0] - origV1[0]) < 0.001 && Math.abs(newV1[1] - origV1[1]) < 0.001 &&
                Math.abs(newV2[0] - origV2[0]) < 0.001 && Math.abs(newV2[1] - origV2[1]) < 0.001
            );
            
            const matchReverse = (
                Math.abs(newV1[0] - origV2[0]) < 0.001 && Math.abs(newV1[1] - origV2[1]) < 0.001 &&
                Math.abs(newV2[0] - origV1[0]) < 0.001 && Math.abs(newV2[1] - origV1[1]) < 0.001
            );
            
            if (matchForward || matchReverse) {
                console.log(`Found matching side: New triangle side ${newSide} matches original triangle side ${side}`);
                newTriangle.setNeighbor(newSide, triangle);
                break;
            }
        }
        
        // Explicitly focus and select the new triangle after creation
        const newIndex = triangles.indexOf(newTriangle);
        console.log(`Moving focus to new triangle index ${newIndex}`);
        focusTriangle(newIndex);
        selectTriangle(newIndex);
    }
    
    return newTriangle;
}

function createInnerTriangle(triangleIndex, side) {
    const triangle = triangles[triangleIndex];
    if (!triangle) return null;
    
    // Get two vertices of the side
    const sideVertices = triangle.getSide(side);
    
    // Get center point of the triangle
    const center = triangle.center;
    
    // Create vertices for inner triangle (side to center)
    const newVertices = [
        sideVertices[0], sideVertices[1],
        sideVertices[2], sideVertices[3],
        center[0], center[1]
    ];
    
    // Add the new triangle
    const newTriangle = addTriangle(newVertices, triangle, side);
    
    if (newTriangle) {
        triangle.setInnerTriangle(side, newTriangle);
        
        // Explicitly focus and select the new triangle
        const newIndex = triangles.indexOf(newTriangle);
        console.log(`Moving focus to new inner triangle index ${newIndex}`);
        focusTriangle(newIndex);
        selectTriangle(newIndex);
    }
    
    return newTriangle;
}

function createOuterTriangle(triangleIndex, side) {
    const triangle = triangles[triangleIndex];
    if (!triangle) return null;
    
    // Get vertices of the side
    const sideVertices = triangle.getSide(side);
    
    // Calculate midpoint of the side
    const midpoint = [
        (sideVertices[0] + sideVertices[2]) / 2,
        (sideVertices[1] + sideVertices[3]) / 2
    ];
    
    // Project outward from the side
    const outwardVector = [
        -(sideVertices[3] - sideVertices[1]),
        sideVertices[2] - sideVertices[0]
    ];
    
    // Normalize the outward vector
    const length = Math.sqrt(outwardVector[0]**2 + outwardVector[1]**2);
    outwardVector[0] /= length;
    outwardVector[1] /= length;
    
    // Calculate height of an equilateral triangle
    const sideLength = Math.sqrt(
        (sideVertices[2] - sideVertices[0])**2 +
        (sideVertices[3] - sideVertices[1])**2
    );
    const height = sideLength * Math.sqrt(3) / 2;
    
    // Calculate new vertex position
    const newVertex = [
        midpoint[0] + outwardVector[0] * height,
        midpoint[1] + outwardVector[1] * height
    ];
    
    // Create the new triangle vertices
    const newVertices = [
        sideVertices[0], sideVertices[1],
        sideVertices[2], sideVertices[3],
        newVertex[0], newVertex[1]
    ];
    
    // Add the new triangle
    const newTriangle = addTriangle(newVertices, triangle, side);
    
    if (newTriangle) {
        triangle.setOuterTriangle(side, newTriangle);
        
        // Explicitly focus and select the new triangle
        const newIndex = triangles.indexOf(newTriangle);
        console.log(`Moving focus to new outer triangle index ${newIndex}`);
        focusTriangle(newIndex);
        selectTriangle(newIndex);
    }
    
    return newTriangle;
}

function makeEquilateralTriangle(edgeVertices, flipped = false) {
    // Extract edge vertex coordinates
    const [x1, y1, x2, y2] = edgeVertices;
    
    // Calculate direction vector of edge
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Calculate length of edge
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate unit direction vector
    const ux = dx / length;
    const uy = dy / length;
    
    // Calculate perpendicular vector (90 degrees counterclockwise)
    let perpX = -uy;
    let perpY = ux;
    
    // Flip if needed for adjacent triangles
    if (flipped) {
        perpX = -perpX;
        perpY = -perpY;
    }
    
    // Calculate the position of the third vertex
    // Height of equilateral triangle = side length * sqrt(3)/2
    const height = length * Math.sqrt(3) / 2;
    const x3 = (x1 + x2) / 2 + perpX * height;
    const y3 = (y1 + y2) / 2 + perpY * height;
    
    // Return all three vertices
    return [x1, y1, x2, y2, x3, y3];
}

function focusTriangle(index) {
    // Clear previous focus
    if (focusedTriangleIndex >= 0 && focusedTriangleIndex < triangleCount) {
        triangles[focusedTriangleIndex].focused = false;
    }
    
    // Set new focus
    focusedTriangleIndex = index;
    
    if (index >= 0 && index < triangleCount) {
        triangles[index].focused = true;
        // Update visual properties
        instanceScales[index] = 1.1; // Slightly larger
        
        // Mark data as changed so it will be updated in the render loop
        dataChanged = true;
    }
}

function selectTriangle(index, clearExisting = true) {
    if (clearExisting) {
        // Clear existing selections
        for (let i = 0; i < triangleCount; i++) {
            if (triangles[i].selected) {
                triangles[i].selected = false;
                instanceSelected[i] = 0.0;
            }
        }
    }
    
    // Select the new triangle
    if (index >= 0 && index < triangleCount) {
        triangles[index].selected = true;
        instanceSelected[index] = 1.0;
        selectedTriangleIndex = index;
        
        // Mark data as changed so it will be updated in the render loop
        dataChanged = true;
    }
}

function toggleSelectTriangle(index) {
    if (index >= 0 && index < triangleCount) {
        const triangle = triangles[index];
        triangle.selected = !triangle.selected;
        instanceSelected[index] = triangle.selected ? 1.0 : 0.0;
        
        if (triangle.selected) {
            selectedTriangleIndex = index;
        } else if (selectedTriangleIndex === index) {
            // Find another selected triangle if this was the current selected
            selectedTriangleIndex = -1;
            for (let i = 0; i < triangleCount; i++) {
                if (triangles[i].selected) {
                    selectedTriangleIndex = i;
                    break;
                }
            }
        }
        
        // Mark data as changed so it will be updated in the render loop
        dataChanged = true;
    }
}

function setupInputHandlers() {
    document.addEventListener('keydown', (event) => {
        const index = focusedTriangleIndex >= 0 ? focusedTriangleIndex : 0;
        const triangle = triangles[index];
        
        if (!triangle) return;
        
        // Debug key
        if (event.key === 'd') {
            // Dump triangle information for debugging
            console.log('== DEBUG TRIANGLES INFO ==');
            console.log(`Total triangles: ${triangleCount}`);
            triangles.forEach((t, i) => {
                console.log(`Triangle ${i}: id=${t.id}, center=(${t.center[0]}, ${t.center[1]}), selected=${t.selected}`);
                console.log(`  Vertices: [${t.vertices.join(', ')}]`);
            });
            return;
        }
        
        // Test key
        if (event.key === 't') {
            // Force create test triangle
            console.log('Creating test triangle');
            const testVertices = [
                -0.7, -0.4,  // Bottom left
                0.0, -0.4,   // Bottom right
                -0.35, 0.3   // Top
            ];
            addTriangle(testVertices);
            return;
        }
        
        // Toggle colors with 'c' key
        if (event.key === 'c' && !event.metaKey) { // Ensure we don't conflict with cmd+c
            showColors = !showColors;
            console.log(`%c Colors toggled ${showColors ? 'ON' : 'OFF'}`, 'color: blue; font-weight: bold');
            return;
        }
        
        // Handle arrow keys for navigation
        if (event.key.startsWith('Arrow')) {
            event.preventDefault();
            
            // Determine which side to use based on arrow direction
            // Use a geometric approach rather than fixed mapping
            let side = getSideByArrowDirection(triangle, event.key);
            
            console.log(`Selected side ${side} for ${event.key} using geometric approach`);
            
            console.log('Arrow key pressed:', event.key, 'Selected side:', side);
            
            if (side < 0) return;
            
            // Modifier keys change behavior
            const withCmd = event.metaKey || event.ctrlKey;
            const withShift = event.shiftKey;
            const withAlt = event.altKey;
            
            if (withCmd && withAlt) {
                console.log('Creating outer triangle on side', side);
                // Ctrl+Alt+Arrow: Create outer triangle
                createOuterTriangle(index, side);
            } else if (withAlt) {
                console.log('Creating inner triangle on side', side);
                // Alt+Arrow: Create inner triangle
                createInnerTriangle(index, side);
            } else if (withCmd) {
                console.log('Creating adjacent triangle on side', side);
                // Cmd+Arrow: Create adjacent triangle
                createAdjacentTriangle(index, side);
            } else if (withShift) {
                // Shift+Arrow: Add triangle to selection
                toggleSelectTriangle(index);
            } else {
                // Just Arrow: Navigate to neighbor
                // We're using the same geometric side selection as for creation
                console.log(`%c Navigating from triangle ${triangle.id} using side ${side}`, 'color: blue; font-weight: bold');
                
                // Log all existing neighbors for debugging
                console.log(`Triangle ${triangle.id} neighbors:`, 
                    triangle.neighbors.map((n, i) => n ? `Side ${i}: Triangle ${n.id}` : `Side ${i}: None`).join(', '));
                
                if (triangle.neighbors[side]) {
                    const neighborIndex = triangles.indexOf(triangle.neighbors[side]);
                    const neighbor = triangle.neighbors[side];
                    console.log(`%c Found neighbor (triangle ${neighbor.id}) on side ${side}, index ${neighborIndex}`, 'color: green; font-weight: bold');
                    
                    // Log centers for debugging spatial relationships
                    console.log(`Current triangle center: (${triangle.center[0].toFixed(2)}, ${triangle.center[1].toFixed(2)})`);
                    console.log(`Target triangle center: (${neighbor.center[0].toFixed(2)}, ${neighbor.center[1].toFixed(2)})`);
                    
                    focusTriangle(neighborIndex);
                    selectTriangle(neighborIndex);
                } else {
                    console.log(`%c No neighbor found on side ${side}`, 'color: red');
                }
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', resize);
}

function addInstructions() {
    // Performance info (minimalist style)
    const perfBox = document.createElement('div');
    perfBox.style.position = 'absolute';
    perfBox.style.bottom = '10px';
    perfBox.style.right = '10px';
    perfBox.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    perfBox.style.color = '#666';
    perfBox.style.padding = '8px 12px';
    perfBox.style.borderRadius = '8px';
    perfBox.style.fontSize = '12px';
    perfBox.style.fontFamily = 'SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    perfBox.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    perfBox.style.zIndex = '1000';
    perfBox.style.backdropFilter = 'blur(5px)';
    perfBox.id = 'performance-info';
    document.body.appendChild(perfBox);
    
    // Use existing info box in HTML (styled via CSS)
    // The instructions are already in the HTML, so we don't need to create them here
}

// Create a completely different approach - we'll use a single buffer for all triangles
// with a direct triangle list approach instead of instancing

// Buffer for all triangle vertices
let vertexBuffer;
// Buffer for all triangle colors
let colorBuffer;
// Buffer for all triangle selections
let selectedBuffer;
// Special buffer for wireframe rendering
let wireframeBuffer;

// Move to a direct rendering approach instead of instancing
function initBuffers() {
    // Create new buffers
    vertexBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    selectedBuffer = gl.createBuffer();
    wireframeBuffer = gl.createBuffer(); // Initialize wireframe buffer
    
    // We'll update these in updateTriangleBuffers()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(0), gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(0), gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, selectedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(0), gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, wireframeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(0), gl.DYNAMIC_DRAW);
}

// Flag to track when data needs updating
let dataChanged = true;

// New function to update buffers using the direct approach
function updateTriangleBuffers() {
    // Only update if data has changed or it's the first time
    if (!dataChanged) return;
    
    console.log('Updating triangle buffers, triangle count:', triangleCount);
    
    // No need to update wireframe buffers - we're using the main vertex buffer
    
    if (triangleCount <= 0) return;
    
    // Create new arrays to hold all triangle data
    const vertexData = new Float32Array(triangleCount * 6); // 3 vertices * 2 components (x,y)
    const colorData = new Float32Array(triangleCount * 9);  // 3 vertices * 3 components (r,g,b)
    const selectedData = new Float32Array(triangleCount * 3); // 3 vertices, 1 float per vertex
    
    // Fill the arrays with data from each triangle
    for (let i = 0; i < triangleCount; i++) {
        const triangle = triangles[i];
        
        // Copy actual vertices directly to buffer
        for (let j = 0; j < 6; j++) {
            vertexData[i * 6 + j] = triangle.vertices[j];
        }
        
        // Set the same color for all vertices of this triangle
        for (let j = 0; j < 3; j++) {
            colorData[i * 9 + j * 3] = triangle.color[0];
            colorData[i * 9 + j * 3 + 1] = triangle.color[1];
            colorData[i * 9 + j * 3 + 2] = triangle.color[2];
            
            // Set selection status (1.0 for selected, 0.0 for not)
            selectedData[i * 3 + j] = triangle.selected ? 1.0 : 0.0;
        }
    }
    
    // Update the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    
    // Update the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.DYNAMIC_DRAW);
    
    // Update the selected buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, selectedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, selectedData, gl.DYNAMIC_DRAW);
    
    // Reset the flag
    dataChanged = false;
}

// Create very visible outlines for triangles (wireframe mode)
function createTriangleOutlines() {
    if (triangleCount <= 0) return;
    
    // This approach draws each triangle twice:
    // 1. First slightly larger and in black (or blue for selected)
    // 2. Then slightly smaller in white (transparent in this case)
    // The result is visible outlines without depending on WebGL LINE drawing
    
    console.log('Creating triangle outlines for wireframe mode');
    
    // Save current settings
    const currentProgram = program;
    
    // Bind the correct shader
    gl.useProgram(program);
    
    // For each triangle, draw its outline using the expanded triangle trick
    for (let i = 0; i < triangleCount; i++) {
        const t = triangles[i];
        
        // Scale factor for the expanded triangle (make it larger for thicker outlines)
        const scaleFactor = 1.10; // 10% larger for very visible outlines
        
        // Original triangle center
        const cx = (t.vertices[0] + t.vertices[2] + t.vertices[4]) / 3;
        const cy = (t.vertices[1] + t.vertices[3] + t.vertices[5]) / 3;
        
        // Create expanded vertices (scaled from center)
        const expandedVertices = new Float32Array(6);
        for (let j = 0; j < 6; j += 2) {
            // Scale vertex from center
            expandedVertices[j] = cx + (t.vertices[j] - cx) * scaleFactor;
            expandedVertices[j+1] = cy + (t.vertices[j+1] - cy) * scaleFactor;
        }
        
        // 1. First draw the expanded triangle in black (or blue if selected)
        // Create a buffer for the expanded triangle
        const expandedBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, expandedBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, expandedVertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Set color based on selection state
        gl.disableVertexAttribArray(instanceColorLocation);
        
        if (t.selected || t.focused) {
            // Blue for selected triangles
            const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.002);
            gl.vertexAttrib3f(instanceColorLocation, 0.3 * pulse, 0.7 * pulse, 1.0 * pulse);
        } else {
            // Black for regular triangles
            gl.vertexAttrib3f(instanceColorLocation, 0.0, 0.0, 0.0);
        }
        
        // Draw the expanded triangle as solid
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        
        // 2. Now draw the original triangle in the background color to create the outline effect
        // Bind original triangle vertices
        const originalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, originalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(t.vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Set background color (transparent in this case)
        gl.vertexAttrib3f(instanceColorLocation, 1.0, 1.0, 1.0); // White
        
        // Make sure the shader knows this isn't selected
        gl.disableVertexAttribArray(selectedUniformLocation);
        gl.vertexAttrib1f(selectedUniformLocation, 0.0);
        
        // Draw the original triangle
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        
        // Clean up buffers
        gl.deleteBuffer(expandedBuffer);
        gl.deleteBuffer(originalBuffer);
    }
    
    // Reset state
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(instanceColorLocation);
    gl.enableVertexAttribArray(selectedUniformLocation);
}

// Completely simplified wireframe rendering approach
function drawWireframesEnhanced() {
    if (triangleCount <= 0) return;
    
    // Special shader would be better but let's use a simple approach:
    // We'll draw each triangle's edges one by one
    
    // Draw thick black lines for each triangle
    for (let i = 0; i < triangleCount; i++) {
        const t = triangles[i];
        
        // Create index buffer for line segments
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        
        // Define three line segments (0-1, 1-2, 2-0)
        const indices = new Uint16Array([
            0, 1,  // First line
            1, 2,  // Second line
            2, 0   // Third line (closing)
        ]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        // Create vertex buffer for this triangle
        const vertBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
        
        // Use the actual triangle vertices
        const vertices = new Float32Array([
            t.vertices[0], t.vertices[1],  // v0
            t.vertices[2], t.vertices[3],  // v1
            t.vertices[4], t.vertices[5]   // v2
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Set up attribute
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Set color based on selection
        gl.disableVertexAttribArray(instanceColorLocation);
        if (t.selected || t.focused) {
            // Blue pulsing for selected/focused
            const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.002);
            gl.vertexAttrib3f(instanceColorLocation, 0.3 * pulse, 0.7 * pulse, 1.0 * pulse);
        } else {
            // Black for regular triangles
            gl.vertexAttrib3f(instanceColorLocation, 0.0, 0.0, 0.0);
        }
        
        // Draw the three line segments using indices
        gl.drawElements(gl.LINES, 6, gl.UNSIGNED_SHORT, 0);
        
        // Clean up buffers
        gl.deleteBuffer(indexBuffer);
        gl.deleteBuffer(vertBuffer);
    }
    
    // Restore state
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(instanceColorLocation);
}

// Keep this function for backward compatibility, but delegate to our new function
function updateInstanceData() {
    updateTriangleBuffers();
}

// Frame timing variables
let lastTime = 0;
let frameTimes = [];

let frameCount = 0;
function render(time) {
    // Calculate frame time
    const dt = time - lastTime;
    lastTime = time;
    
    // Track frame times for performance measurement
    frameTimes.push(dt);
    if (frameTimes.length > 60) {
        frameTimes.shift();
    }
    
    // Calculate average FPS
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const fps = 1000 / avgFrameTime;
    
    // Only update performance info every 30 frames
    frameCount++;
    if (frameCount % 30 === 0) {
        const perfInfo = document.getElementById('performance-info');
        if (perfInfo) {
            perfInfo.textContent = `${triangleCount} triangles • ${fps.toFixed(0)} fps`;
        }
    }
    
    // Convert time to seconds
    const timeSeconds = time * 0.001;
    
    // Set clear color - clean white background
    gl.clearColor(0.98, 0.98, 0.98, 1.0);
    
    // Simple blending setup - same for both modes
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Depth testing disabled to ensure proper transparent rendering
    gl.disable(gl.DEPTH_TEST);
    
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Skip rendering if no triangles
    if (triangleCount <= 0) {
        requestAnimationFrame(render);
        return;
    }
    
    // Update triangle buffers only when needed
    updateTriangleBuffers();
    
    // Use our shader program
    gl.useProgram(program);
    
    // Set attribute pointers for this frame
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(instanceColorLocation);
    gl.vertexAttribPointer(instanceColorLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, selectedBuffer);
    gl.enableVertexAttribArray(selectedUniformLocation);
    gl.vertexAttribPointer(selectedUniformLocation, 1, gl.FLOAT, false, 0, 0);
    
    // Update uniforms
    gl.uniform1f(timeUniformLocation, timeSeconds);
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1f(showColorsUniformLocation, showColors ? 1.0 : 0.0);
    
    // Set up camera/projection matrices with a nicely zoomed view
    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -aspect*1.5, aspect*1.5, -1.5, 1.5, -1, 1);
    
    const modelViewMatrix = mat4.create();
    mat4.identity(modelViewMatrix);
    
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    
    // We're not using anti-aliasing features as they can cause artifacts
    
    // Draw triangles directly (no instancing)
    try {
        // Only log once every 300 frames to keep console clean
        if (frameCount % 300 === 0) {
            console.log(`Drawing ${triangleCount} triangles directly`);
        }
        
        // Draw each triangle directly - 3 vertices per triangle
        gl.drawArrays(gl.TRIANGLES, 0, triangleCount * 3);
        
        // In wireframe mode, also draw explicit lines
        if (!showColors) {
            // Completely different approach - draw triangles with stencil buffer
            // for visible outlines
            createTriangleOutlines();
        }
    } catch (e) {
        console.error('Error in drawArrays:', e);
    }
    
    // Continue animation loop
    requestAnimationFrame(render);
}

// Geometric function to determine which side to use based on arrow direction
function getSideByArrowDirection(triangle, arrowKey) {
    if (!triangle) return -1;
    
    // Define direction vectors for arrow keys
    const directions = {
        'ArrowUp': [0, 1],     // Up vector
        'ArrowRight': [1, 0],  // Right vector
        'ArrowDown': [0, -1],  // Down vector
        'ArrowLeft': [-1, 0]   // Left vector
    };
    
    // Get the direction vector for this arrow
    const direction = directions[arrowKey];
    if (!direction) return -1;
    
    // Calculate edge directions and normals for each side
    const sideNormals = [];
    const midpoints = [];
    
    for (let side = 0; side < 3; side++) {
        // Get the side vertices
        const sideVerts = triangle.getSide(side);
        const v1x = sideVerts[0];
        const v1y = sideVerts[1];
        const v2x = sideVerts[2];
        const v2y = sideVerts[3];
        
        // Calculate edge vector
        const edgeX = v2x - v1x;
        const edgeY = v2y - v1y;
        
        // Normalize the edge vector
        const edgeLength = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
        
        // Calculate the outward-facing normal (perpendicular to edge)
        // For 2D, the normal is (-y, x) normalized
        let normalX = -edgeY / edgeLength;
        let normalY = edgeX / edgeLength;
        
        // Calculate the midpoint of the edge
        const midX = (v1x + v2x) / 2;
        const midY = (v1y + v2y) / 2;
        
        // Vector from triangle center to midpoint
        const toCenterX = midX - triangle.center[0];
        const toCenterY = midY - triangle.center[1];
        
        // Ensure normal points outward by comparing with center-to-mid vector
        const dotProduct = normalX * toCenterX + normalY * toCenterY;
        if (dotProduct < 0) {
            // If dotProduct is negative, normal points inward, so flip it
            normalX = -normalX;
            normalY = -normalY;
        }
        
        sideNormals.push([normalX, normalY]);
        midpoints.push([midX, midY]);
    }
    
    // Find the side whose normal best aligns with the arrow direction
    let bestSide = -1;
    let bestAlignment = -Infinity;
    
    for (let side = 0; side < 3; side++) {
        const normal = sideNormals[side];
        
        // Calculate dot product between normal and arrow direction
        // Higher dot product means better alignment
        const alignment = direction[0] * normal[0] + direction[1] * normal[1];
        
        if (alignment > bestAlignment) {
            bestAlignment = alignment;
            bestSide = side;
        }
    }
    
    // Debug output
    console.log(`Arrow ${arrowKey} best aligns with side ${bestSide} (alignment: ${bestAlignment.toFixed(2)})`);
    console.log(`Side normals for triangle ${triangle.id}:`, sideNormals.map(n => `[${n[0].toFixed(2)}, ${n[1].toFixed(2)}]`));
    
    // Enhanced visual debugging
    if (bestSide !== -1) {
        console.log(`%c Selected side ${bestSide} for triangle ${triangle.id} using ${arrowKey}`, 'color: green; font-weight: bold');
    }
    
    return bestSide;
}

// Utility function to convert HSL to RGB
function hslToRgb(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return [r, g, b];
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initWebGL);