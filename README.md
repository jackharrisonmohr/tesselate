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
- **c**: Toggle between colored mode and wireframe mode
- **d**: Debug information (see console)

## Development

Current implementation:
- Direct WebGL implementation with custom shaders (THREE.js removed)
- Efficient rendering with direct triangle approach
- Modular architecture with separation of concerns
- Interactive triangle creation and selection
- Two visualization modes: colored and wireframe
- ES6 modules
- No build step required

## Development Roadmap

### Phase 1: ✅ WebGL Implementation (Completed)
- ✅ Replaced Three.js with direct WebGL implementation
- ✅ Implemented GPU-accelerated triangle rendering with custom shaders
- ✅ Fixed triangle creation and navigation
- ✅ Added color/wireframe toggle functionality

### Phase 2: ✅ Core Architecture (Completed)
- ✅ Single WebGL canvas with vertex/fragment shader pair
- ✅ Efficient triangle management via Float32Arrays
- ✅ Optimized attribute updates
- ✅ Improved visual aesthetics

### Phase 3: Current Development
- ✓ Better selection and navigation experience
- ✓ Wireframe mode for clearer visualization
- ⬜ Performance testing with large numbers of triangles
- ⬜ Improve geometric pattern options

### Phase 4: Feature Enhancement (Planned)
- ⬜ Content embedding (text, images) in triangles
- ⬜ Touch and gesture support
- ⬜ Data visualization capabilities
- ⬜ Dark mode theme option
- ⬜ Persistence and sharing of created tessellations

## Technical Approach

Our WebGL implementation:
1. Uses direct triangle rendering with efficient buffer management
2. Processes triangle positioning/transformations in vertex shaders
3. Handles visual styling and effects in fragment shaders
4. Maintains triangle data in typed arrays for efficient updates
5. Provides significant performance improvements over the Three.js implementation
6. Supports multiple rendering modes with a single shader pair
7. Implements special techniques for effective wireframe visualization

## License

MIT