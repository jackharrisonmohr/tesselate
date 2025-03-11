# Tessellate

A minimalist UI experiment inspired by Apple's design language, based on triangular tessellations and fractals. Tessellate provides a clean, intuitive interface for exploring information using triangular patterns.

## Features

- Clean, minimalist triangular-based UI
- Equilateral triangle patterns with perfect tessellation
- Apple-inspired aesthetic with subtle visual cues
- Keyboard-driven interface for rapid exploration
- Extensible design to support content embedding

## Running the Demo

Due to browser security restrictions (CORS), you'll need to run a local server to use the demo:

### Option 1: Using the included Node.js server

```bash
# Navigate to the project directory
cd /path/to/tesselate

# Run the Node.js server
node server.js

# Open in browser
# Navigate to http://localhost:3000
```

### Option 2: Using Python's built-in server

```bash
# Navigate to the project directory
cd /path/to/tesselate

# Python 3
python -m http.server 8000

# Open in browser
# Navigate to http://localhost:8000
```

## Controls

- **Arrow keys**: Navigate between triangles
- **Cmd + Arrow keys**: Create adjacent triangle on the corresponding side
- **Shift + Arrow keys**: Select multiple triangles (last selected is 'current')
- **Alt + Arrow keys**: Create inner triangles (like Zelda's Triforce pattern)
- **Ctrl + Alt + Arrow keys**: Create outer triangles on the selected side

## Development

Current implementation:
- Three.js for 3D rendering
- Individual triangle meshes with separate geometries
- ES6 modules
- No build step required

## Development Roadmap

### Phase 1: WebGL Shader Migration
- Replace Three.js with direct WebGL implementation
- Implement GPU-accelerated triangle rendering with custom shaders
- Move geometric operations to the GPU
- Use instanced rendering for triangles

### Phase 2: Core Architecture
- Single WebGL canvas with vertex/fragment shader pair
- Batch triangle management via Float32Arrays
- Efficient attribute updates for transformations
- Hardware-accelerated animations and effects

### Phase 3: Feature Enhancement
- Content embedding (text, images) in triangles
- Touch and gesture support
- Data visualization capabilities
- Connection to AI systems for intelligent exploration
- Dark mode theme option
- Persistence and sharing of created tessellations

## Technical Approach

The WebGL shader implementation will:
1. Use instanced rendering for thousands of triangles in a single draw call
2. Process triangle positioning/transformations in vertex shaders
3. Handle visual styling and effects in fragment shaders
4. Maintain triangle data in typed arrays for efficient updates
5. Provide significant performance improvements over the Three.js implementation

## License

MIT