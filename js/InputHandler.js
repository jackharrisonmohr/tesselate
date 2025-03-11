export class InputHandler {
    constructor(triangleManager) {
        this.triangleManager = triangleManager;
        
        // Arrow key codes
        this.ARROW_UP = 'ArrowUp';
        this.ARROW_DOWN = 'ArrowDown';
        this.ARROW_LEFT = 'ArrowLeft';
        this.ARROW_RIGHT = 'ArrowRight';
        
        // Direction vectors for arrow keys
        this.arrowDirections = {
            [this.ARROW_UP]: { x: 0, y: 1 },     // Up vector
            [this.ARROW_RIGHT]: { x: 1, y: 0 },  // Right vector
            [this.ARROW_DOWN]: { x: 0, y: -1 },  // Down vector
            [this.ARROW_LEFT]: { x: -1, y: 0 }   // Left vector
        };
        
        // Default mapping as fallback - corrected to match triangle orientation
        this.defaultArrowKeyToSide = {
            [this.ARROW_UP]: 1,    // Up arrow creates triangle on the top-right side (side 1)
            [this.ARROW_RIGHT]: 1, // Right arrow creates triangle on the top-right side (side 1)
            [this.ARROW_DOWN]: 0,  // Down arrow creates triangle on the bottom side (side 0)
            [this.ARROW_LEFT]: 2   // Left arrow creates triangle on the top-left side (side 2)
        };
        
        // Map standalone keys for testing when meta key doesn't work - updated to match arrow mappings
        this.keyToSide = {
            'r': 1,  // Right side (side 1)
            'd': 0,  // Down/bottom side (side 0)
            'l': 2   // Left side (side 2)
        };
        
        console.log('Using dynamic arrow key mapping based on triangle orientation');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Log to help with debugging
        console.log('InputHandler initialized');
    }
    
    setupEventListeners() {
        // Add a special handler for CMD+Arrow combinations and single letter shortcuts
        document.addEventListener('keydown', (event) => {
            // Special case for Cmd+Arrow
            if (event.metaKey && this.isArrowKey(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                const side = this.getSideFromArrowKey(event.key);
                console.log('=== CMD+' + event.key + ' pressed ===');
                console.log('Creating adjacent triangle on side', side);
                if (side === 0) console.log('Side 0 = BOTTOM side');
                if (side === 1) console.log('Side 1 = RIGHT side');
                if (side === 2) console.log('Side 2 = LEFT side');
                this.createAdjacentTriangle(side);
                return;
            }
            
            // We'll keep this for backwards compatibility, but use our new geometric approach
            if (this.keyToSide[event.key] !== undefined) {
                event.preventDefault();
                event.stopPropagation();
                
                // Map letter keys to arrow directions for geometric calculation
                let arrowKey = '';
                if (event.key === 'r') arrowKey = 'ArrowRight';
                if (event.key === 'd') arrowKey = 'ArrowDown';
                if (event.key === 'l') arrowKey = 'ArrowLeft';
                
                console.log(`=== Letter key '${event.key}' mapped to ${arrowKey} ===`);
                
                // Get the focused triangle from triangleManager
                if (this.triangleManager.focusedTriangle) {
                    // Use a more geometric approach to determine the side
                    // (For now we'll use the old method until we integrate with app.js)
                    const side = this.getSideFromArrowKey(arrowKey);
                    console.log('Creating adjacent triangle on side', side);
                    this.createAdjacentTriangle(side);
                }
                return;
            }
            
            // Regular event handling for other keys
            this.handleKeyDown(event);
        });
    }
    
    handleKeyDown(event) {
        // Log key events for debugging
        console.log('Key pressed:', event.key, 'Meta?', event.metaKey, 'Alt?', event.altKey);
        
        // Handle arrow keys
        if (this.isArrowKey(event.key)) {
            // Always prevent default (scrolling)
            event.preventDefault();
            
            // Get the side corresponding to this arrow key
            const side = this.getSideFromArrowKey(event.key);
            
            // Handle command/meta key combinations for creating adjacent triangles
            // We already handle metaKey+arrow in the special case above, so only handle 'c' here
            if (event.key === 'c') { // Only use 'c' key as an alternative
                console.log('C key detected: Creating adjacent triangle on side', side);
                this.createAdjacentTriangle(side);
                return;
            }
            
            // Handle shift key for selection
            if (event.shiftKey) {
                console.log('SHIFT+Arrow detected: Selecting triangle');
                this.selectTriangle(side);
                return;
            }
            
            // Handle alt+ctrl for outer triangles
            if (event.altKey && event.ctrlKey) {
                console.log('ALT+CTRL+Arrow detected: Creating outer sub-triangle');
                this.createOuterSubTriangle(side);
                return;
            }
            
            // Handle alt for inner triangles
            if (event.altKey) {
                console.log('ALT+Arrow detected: Creating inner sub-triangle');
                this.createInnerSubTriangle(side);
                return;
            }
            
            // Default: just navigate
            console.log('Arrow key: Navigating to adjacent triangle');
            this.navigateToTriangle(side);
        }
    }
    
    isArrowKey(key) {
        return key === this.ARROW_UP || 
               key === this.ARROW_DOWN || 
               key === this.ARROW_LEFT || 
               key === this.ARROW_RIGHT;
    }
    
    getSideFromArrowKey(key) {
        // For simplicity and reliability, we'll use the static mapping
        // This provides a more predictable user experience
        return this.defaultArrowKeyToSide[key];
        
        /* 
        // Commented out dynamic approach as it's less predictable for users
        const focusedTriangle = this.triangleManager.focusedTriangle;
        if (!focusedTriangle) {
            return this.defaultArrowKeyToSide[key];
        }
        
        // Get the direction vector for this arrow key
        const dirVector = this.arrowDirections[key];
        if (!dirVector) {
            console.warn('Unknown arrow key:', key);
            return 0;
        }
        
        // Calculate normal vectors for each side of the triangle
        const sideNormals = this.calculateTriangleSideNormals(focusedTriangle);
        
        // Find the side whose normal vector most closely aligns with the arrow direction
        let bestSide = 0;
        let bestAlignment = -Infinity;
        
        for (let side = 0; side < 3; side++) {
            const normal = sideNormals[side];
            const alignment = dirVector.x * normal.x + dirVector.y * normal.y;
            
            if (alignment > bestAlignment) {
                bestAlignment = alignment;
                bestSide = side;
            }
        }
        
        console.log(`Arrow ${key} maps to triangle side ${bestSide} based on normal alignment`);
        return bestSide;
        */
    }
    
    // Kept for reference but not actively used in the simplified approach
    calculateTriangleSideNormals(triangle) {
        const normals = [];
        
        for (let side = 0; side < 3; side++) {
            const v1 = triangle.vertices[side];
            const v2 = triangle.vertices[(side + 1) % 3];
            
            // Calculate edge vector
            const edge = { 
                x: v2.x - v1.x, 
                y: v2.y - v1.y 
            };
            
            // Calculate normal (perpendicular to edge, pointing outward)
            const length = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
            const normal = { 
                x: -edge.y / length, 
                y: edge.x / length 
            };
            
            // Ensure normal points outward
            const midpoint = { 
                x: (v1.x + v2.x) / 2, 
                y: (v1.y + v2.y) / 2 
            };
            
            const centerToMid = { 
                x: midpoint.x - triangle.center.x, 
                y: midpoint.y - triangle.center.y 
            };
            
            // If dot product is negative, normal points inward, so flip it
            const dotProduct = normal.x * centerToMid.x + normal.y * centerToMid.y;
            if (dotProduct < 0) {
                normal.x = -normal.x;
                normal.y = -normal.y;
            }
            
            normals.push(normal);
        }
        
        return normals;
    }
    
    createAdjacentTriangle(side) {
        const focusedTriangle = this.triangleManager.focusedTriangle;
        if (focusedTriangle) {
            // Create the adjacent triangle
            const newTriangle = this.triangleManager.createAdjacentTriangle(focusedTriangle, side);
            
            // Explicitly set focus to the new triangle (should already happen in triangleManager, but ensure it)
            this.triangleManager.setFocusedTriangle(newTriangle);
            
            // Log current state for debugging
            console.log('After createAdjacentTriangle:');
            console.log('- New triangle:', newTriangle.toString());
            console.log('- Focused triangle:', this.triangleManager.focusedTriangle.toString());
            console.log('- New triangle center:', newTriangle.center);
            console.log('- Focused triangle center:', this.triangleManager.focusedTriangle.center);
        } else {
            console.warn('No focused triangle to create adjacent from');
        }
    }
    
    selectTriangle(side) {
        const focusedTriangle = this.triangleManager.focusedTriangle;
        if (focusedTriangle) {
            // Toggle selection on the current triangle
            this.triangleManager.toggleTriangleSelection(focusedTriangle);
            
            // Move to the adjacent triangle if it exists
            const neighbor = this.triangleManager.moveToAdjacentTriangle(side);
            if (neighbor) {
                // Focus but don't automatically select it
                this.triangleManager.setFocusedTriangle(neighbor);
            }
        }
    }
    
    createInnerSubTriangle(side) {
        const focusedTriangle = this.triangleManager.focusedTriangle;
        if (focusedTriangle) {
            const newTriangle = this.triangleManager.createInnerTriangle(focusedTriangle, side);
            if (newTriangle) {
                this.triangleManager.setFocusedTriangle(newTriangle);
            }
        }
    }
    
    createOuterSubTriangle(side) {
        const focusedTriangle = this.triangleManager.focusedTriangle;
        if (focusedTriangle) {
            const newTriangle = this.triangleManager.createOuterTriangle(focusedTriangle, side);
            if (newTriangle) {
                this.triangleManager.setFocusedTriangle(newTriangle);
            }
        }
    }
    
    navigateToTriangle(side) {
        this.triangleManager.moveToAdjacentTriangle(side);
    }
}