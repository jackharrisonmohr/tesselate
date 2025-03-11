# CLAUDE.md - Coding Assistant Guidelines

## Development Commands
- Start server: `node server.js` (runs on port 3000)
- Alternative server: `python -m http.server 8000`
- Open in browser: http://localhost:3000
- Debug mode: Add `?debug=true` to URL query parameters
- Deployment: Host static files on any web server

## Code Style Guidelines
- **Imports**: Client-side uses ES6 modules for newer files `import * as THREE from 'three'`; older files may use script tags
- **Classes**: PascalCase for class names (Triangle, TriangleManager)
- **Methods/Variables**: camelCase (getAdjacentTriangleVertices, centerPoint)
- **Constants**: UPPER_SNAKE_CASE (MIME_TYPES) or capitalized variables
- **Formatting**: 4-space indentation, consistent spacing around operators
- **Comments**: Document class purposes, complex geometric operations, and method parameters
- **Structure**: Modular design with separate responsibility classes; each file exports a single primary class
- **Error Handling**: Use console.error/warn for client-side errors, console.log for debugging

## Testing & Debugging
- Manual testing through browser console
- Use browser dev tools for performance monitoring
- Visual debugging with toggleable wireframe mode (press 'c')
- Debug logs can be enabled with `?debug=true` URL parameter
- Use 'd' key to print debug information to console

## Project Architecture
- **Triangle.js**: Core triangle representation with geometric operations
- **TriangleManager.js**: Creates and manages triangle mesh grid
- **InputHandler.js**: User interactions and event listeners
- **Effects.js**: Visual effects and WebGL animations
- **app.js**: Application initialization and main rendering loop
- **server.js**: Simple HTTP server for static file delivery