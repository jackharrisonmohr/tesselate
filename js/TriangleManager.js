import * as THREE from 'three';
import { Triangle } from './Triangle.js';

export class TriangleManager {
    constructor(scene) {
        this.scene = scene;
        this.triangles = [];
        this.focusedTriangle = null;
        this.selectedTriangles = [];
        
        // Create initial triangle
        this.createInitialTriangle();
    }
    
    createInitialTriangle() {
        // Define the vertices for an equilateral triangle
        const size = 1.5;
        const height = size * Math.sqrt(3) / 2;
        
        // Position the initial triangle properly
        const vertices = [
            new THREE.Vector3(-size/2, -height/3, 0),  // Bottom left
            new THREE.Vector3(size/2, -height/3, 0),   // Bottom right
            new THREE.Vector3(0, height*2/3, 0)        // Top
        ];
        
        console.log('Creating initial triangle with vertices:', vertices);
        
        const triangle = new Triangle(vertices);
        this.addTriangle(triangle);
        this.setFocusedTriangle(triangle);
        
        // Set correct initial position
        triangle.group.position.set(0, 0, 0);
    }
    
    addTriangle(triangle) {
        this.triangles.push(triangle);
        // Add the triangle group to the scene
        this.scene.add(triangle.group);
        console.log(`Added triangle to scene, now ${this.triangles.length} triangles`);
        
        // Debug: Verify the triangle is in the right position
        console.log('Triangle center:', triangle.center);
        
        return triangle;
    }
    
    createAdjacentTriangle(triangle, side) {
        console.log(`Creating adjacent triangle on side ${side}`);
        
        // Check if there's already a triangle on this side
        if (triangle.neighbors[side]) {
            console.log('Triangle already exists on this side, returning existing');
            const existingTriangle = triangle.neighbors[side];
            
            // Switch focus to the existing triangle
            this.setFocusedTriangle(existingTriangle);
            
            return existingTriangle;
        }
        
        // Get vertices for new triangle
        const vertices = triangle.getAdjacentTriangleVertices(side);
        console.log('New vertices:', vertices);
        
        // Create new triangle
        const newTriangle = new Triangle(vertices, triangle, side);
        this.addTriangle(newTriangle);
        console.log('New triangle added to scene');
        
        // Set up neighbor relationship
        triangle.neighbors[side] = newTriangle;
        
        // Find which side of the new triangle is adjacent to the original triangle
        let newSide = this.findAdjacentSide(newTriangle, triangle);
        if (newSide !== null) {
            newTriangle.neighbors[newSide] = triangle;
            console.log(`Set up reciprocal neighbor relationship on side ${newSide}`);
        }
        
        // IMPORTANT: Switch focus to the new triangle
        this.setFocusedTriangle(newTriangle);
        console.log('Focus switched to new triangle:', newTriangle.toString());
        
        // Return the new or existing triangle
        return newTriangle;
    }
    
    createInnerTriangle(triangle, side) {
        // Check if there's already an inner triangle on this side
        if (triangle.innerTriangles[side]) {
            // Switch focus to existing triangle
            const existingTriangle = triangle.innerTriangles[side];
            this.setFocusedTriangle(existingTriangle);
            return existingTriangle;
        }
        
        // Get vertices for new inner triangle
        const vertices = triangle.getInnerTriangleVertices(side);
        console.log('Creating inner triangle with vertices:', vertices);
        
        // Create new triangle
        const newTriangle = new Triangle(vertices, triangle, side);
        this.addTriangle(newTriangle);
        
        // Set relationship
        triangle.innerTriangles[side] = newTriangle;
        
        // Switch focus to the new triangle
        this.setFocusedTriangle(newTriangle);
        console.log('Focus switched to new inner triangle:', newTriangle.toString());
        
        return newTriangle;
    }
    
    createOuterTriangle(triangle, side) {
        // Check if there's already an outer triangle on this side
        if (triangle.outerTriangles[side]) {
            // Switch focus to existing triangle
            const existingTriangle = triangle.outerTriangles[side];
            this.setFocusedTriangle(existingTriangle);
            return existingTriangle;
        }
        
        // Get vertices for new outer triangle
        const vertices = triangle.getOuterTriangleVertices(side);
        console.log('Creating outer triangle with vertices:', vertices);
        
        // Create new triangle
        const newTriangle = new Triangle(vertices, triangle, side);
        this.addTriangle(newTriangle);
        
        // Set relationship
        triangle.outerTriangles[side] = newTriangle;
        
        // Switch focus to the new triangle
        this.setFocusedTriangle(newTriangle);
        console.log('Focus switched to new outer triangle:', newTriangle.toString());
        
        return newTriangle;
    }
    
    findAdjacentSide(triangle1, triangle2) {
        // Find which side of triangle1 is adjacent to triangle2
        // We need to check each side of triangle1 and see if both vertices
        // of that side are also present in triangle2
        
        for (let side = 0; side < 3; side++) {
            const v1 = triangle1.vertices[side];
            const v2 = triangle1.vertices[(side + 1) % 3];
            
            // Check if both vertices of this side are found in triangle2
            let sharedCount = 0;
            
            // Check each vertex of triangle2
            for (let j = 0; j < 3; j++) {
                const v = triangle2.vertices[j];
                
                // If current vertex of triangle2 matches either v1 or v2, increment count
                if (this.verticesEqual(v, v1) || this.verticesEqual(v, v2)) {
                    sharedCount++;
                }
            }
            
            // If both vertices of this side are found in triangle2, this side is adjacent
            if (sharedCount === 2) {
                console.log(`Found adjacent side ${side} between triangles`);
                return side;
            }
        }
        
        console.log("No adjacent side found between triangles");
        return null;
    }
    
    verticesEqual(v1, v2, epsilon = 0.0001) {
        return (
            Math.abs(v1.x - v2.x) < epsilon &&
            Math.abs(v1.y - v2.y) < epsilon &&
            Math.abs(v1.z - v2.z) < epsilon
        );
    }
    
    setFocusedTriangle(triangle) {
        // Remove focus from current triangle
        if (this.focusedTriangle) {
            this.focusedTriangle.setFocus(false);
        }
        
        // Set focus on new triangle
        this.focusedTriangle = triangle;
        if (triangle) {
            triangle.setFocus(true);
        }
    }
    
    toggleTriangleSelection(triangle) {
        const index = this.selectedTriangles.indexOf(triangle);
        if (index === -1) {
            // Add to selection
            this.selectedTriangles.push(triangle);
            triangle.setSelected(true);
        } else {
            // Remove from selection
            this.selectedTriangles.splice(index, 1);
            triangle.setSelected(false);
        }
    }
    
    clearSelection() {
        for (const triangle of this.selectedTriangles) {
            triangle.setSelected(false);
        }
        this.selectedTriangles = [];
    }
    
    moveToAdjacentTriangle(side) {
        if (!this.focusedTriangle) return null;
        
        // Check if there's a neighbor on this side
        const neighbor = this.focusedTriangle.neighbors[side];
        if (neighbor) {
            this.setFocusedTriangle(neighbor);
            return neighbor;
        }
        
        return null;
    }
    
    update() {
        // Update all triangles (for animations)
        for (const triangle of this.triangles) {
            triangle.update();
        }
        
        // Debugging: periodically log the number of triangles
        if (!this._lastDebugTime || Date.now() - this._lastDebugTime > 5000) {
            this._lastDebugTime = Date.now();
            console.log(`Current triangles: ${this.triangles.length}`);
            console.log(`Focused triangle: ${this.focusedTriangle ? this.focusedTriangle.toString() : 'none'}`);
            console.log(`Selected triangles: ${this.selectedTriangles.length}`);
        }
    }
}