import * as THREE from 'three';

export class Triangle {
    constructor(vertices, parent = null, side = null) {
        this.vertices = vertices; // Array of Vector3 points
        this.parent = parent; // Parent triangle
        this.side = side; // Side of parent this triangle was created from
        this.children = {}; // Child triangles by side (0, 1, 2)
        this.innerTriangles = {}; // Inner fractal triangles by side (0, 1, 2)
        this.outerTriangles = {}; // Outer fractal triangles by side (0, 1, 2)
        this.neighbors = {}; // Adjacent triangles by side (0, 1, 2)
        this.selected = false;
        this.focused = false;
        
        // Ensure the triangle is equilateral by normalizing vertices
        this.vertices = this.makeEquilateral(vertices);
        
        // Calculate center point first
        this.center = new THREE.Vector3(
            (this.vertices[0].x + this.vertices[1].x + this.vertices[2].x) / 3,
            (this.vertices[0].y + this.vertices[1].y + this.vertices[2].y) / 3,
            (this.vertices[0].z + this.vertices[1].z + this.vertices[2].z) / 3
        );
        
        // Create geometry and mesh after center is calculated
        this.createMesh();
    }
    
    makeEquilateral(vertices) {
        // Get the first two vertices
        const v0 = vertices[0].clone();
        const v1 = vertices[1].clone();
        
        // Vector from v0 to v1 = first side of the triangle
        const v0v1 = new THREE.Vector3().subVectors(v1, v0);
        const sideLength = v0v1.length();
        
        // Create a vector perpendicular to v0v1 in the plane
        // For 2D, we can use (-y, x, 0) to rotate 90 degrees
        const perpendicular = new THREE.Vector3(-v0v1.y, v0v1.x, 0).normalize();
        
        // Height of equilateral triangle = side * sqrt(3)/2
        const height = sideLength * Math.sqrt(3) / 2;
        
        // Scale perpendicular by height
        perpendicular.multiplyScalar(height);
        
        // Find midpoint of first side
        const midpoint = new THREE.Vector3()
            .addVectors(v0, v1)
            .multiplyScalar(0.5);
        
        // Third vertex = midpoint + perpendicular
        const v2 = new THREE.Vector3().addVectors(midpoint, perpendicular);
        
        // Print the result for debugging
        console.log('Creating equilateral triangle:');
        console.log(`V0: (${v0.x.toFixed(2)}, ${v0.y.toFixed(2)}, ${v0.z.toFixed(2)})`);
        console.log(`V1: (${v1.x.toFixed(2)}, ${v1.y.toFixed(2)}, ${v1.z.toFixed(2)})`);
        console.log(`V2: (${v2.x.toFixed(2)}, ${v2.y.toFixed(2)}, ${v2.z.toFixed(2)})`);
        
        // Return the equilateral triangle vertices
        return [v0, v1, v2];
    }
    
    createMesh() {
        // Create triangle geometry
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setFromPoints(this.vertices);
        this.geometry.setIndex([0, 1, 2]);
        this.geometry.computeVertexNormals();
        
        // Create materials - simpler, more Apple-like aesthetic
        // Assign a slightly different color to each new triangle based on its position
        const hue = Math.abs(this.center.x + this.center.y) * 0.1;
        const baseColor = new THREE.Color().setHSL(0.6 + hue, 0.8, 0.5); // Variations of blue
        
        this.material = new THREE.MeshStandardMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            flatShading: false,
            roughness: 0.3,
            metalness: 0.2
        });
        
        this.wireMaterial = new THREE.LineBasicMaterial({
            color: 0x007aff,
            transparent: true,
            opacity: 0.5
        });
        
        // Create mesh and wireframe
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Create edges geometry for wireframe
        const edges = new THREE.EdgesGeometry(this.geometry);
        this.wireframe = new THREE.LineSegments(edges, this.wireMaterial);
        
        // Create group to hold mesh and wireframe
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.wireframe);
        
        // Add debug center point for visibility
        this.createDebugPoint();
        
        // Set initial position
        this.group.position.set(0, 0, 0);
    }
    
    createDebugPoint() {
        // Small dot at the center of the triangle for debugging
        const centerGeometry = new THREE.SphereGeometry(0.1, 8, 8); // Slightly larger
        
        // Use a different color for each triangle to make them distinguishable
        const triangleId = Math.floor(Math.random() * 6);
        const colors = [
            0xff0000, // Red
            0x00ff00, // Green
            0x0000ff, // Blue
            0xffff00, // Yellow
            0xff00ff, // Magenta
            0x00ffff  // Cyan
        ];
        
        const centerMaterial = new THREE.MeshBasicMaterial({ 
            color: colors[triangleId],
            transparent: true,
            opacity: 0.9
        });
        
        this.centerPoint = new THREE.Mesh(centerGeometry, centerMaterial);
        
        // Position at the center of the triangle but raise it slightly ABOVE the triangle
        // This ensures we can see the markers clearly without affecting triangle geometry
        const centerPosition = this.center.clone();
        centerPosition.z -= 0.1; // Move it slightly forward (in front of the triangle)
        this.centerPoint.position.copy(centerPosition);
        
        // Add to group
        this.group.add(this.centerPoint);
        
        // Also add debug points at each vertex to better visualize the triangle
        const vertexGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        for (let i = 0; i < 3; i++) {
            const vertexMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            
            const vertexPoint = new THREE.Mesh(vertexGeometry, vertexMaterial);
            
            // Position at vertex but slightly raised for visibility
            const vertexPosition = this.vertices[i].clone();
            vertexPosition.z -= 0.1; // Move it slightly forward
            vertexPoint.position.copy(vertexPosition);
            
            this.group.add(vertexPoint);
        }
    }
    
    getVertex(index) {
        return this.vertices[index].clone();
    }
    
    getSideCenter(side) {
        const v1 = this.vertices[side];
        const v2 = this.vertices[(side + 1) % 3];
        return new THREE.Vector3(
            (v1.x + v2.x) / 2,
            (v1.y + v2.y) / 2,
            (v1.z + v2.z) / 2
        );
    }
    
    getAdjacentTriangleVertices(side) {
        // The issue is in the vertex ordering! We need to ensure we're creating the
        // adjacent triangle with the shared edge vertices in the correct order
        
        // Let's completely rewrite this with a different approach
        
        // First, get the vertices of the current triangle
        const origVertex0 = this.vertices[0].clone();
        const origVertex1 = this.vertices[1].clone();
        const origVertex2 = this.vertices[2].clone();
        
        // Log original triangle
        console.log("CREATING ADJACENT - Original triangle:");
        console.log(`Side ${side}: Between vertices ${side} and ${(side + 1) % 3}`);
        console.log(`Original vertex 0: (${origVertex0.x.toFixed(2)}, ${origVertex0.y.toFixed(2)})`);
        console.log(`Original vertex 1: (${origVertex1.x.toFixed(2)}, ${origVertex1.y.toFixed(2)})`);
        console.log(`Original vertex 2: (${origVertex2.x.toFixed(2)}, ${origVertex2.y.toFixed(2)})`);
        
        // Based on the side parameter, determine which vertices form the shared edge
        // and which vertex is opposite (not part of the shared edge)
        let sharedVertex1, sharedVertex2, oppositeVertex;
        
        if (side === 0) {
            // Side 0 is between vertices 0 and 1
            sharedVertex1 = origVertex0;
            sharedVertex2 = origVertex1;
            oppositeVertex = origVertex2;
        } else if (side === 1) {
            // Side 1 is between vertices 1 and 2
            sharedVertex1 = origVertex1;
            sharedVertex2 = origVertex2;
            oppositeVertex = origVertex0;
        } else {
            // Side 2 is between vertices 2 and 0
            sharedVertex1 = origVertex2;
            sharedVertex2 = origVertex0;
            oppositeVertex = origVertex1;
        }
        
        // Calculate the midpoint of the shared edge
        const midpoint = new THREE.Vector3().addVectors(sharedVertex1, sharedVertex2).multiplyScalar(0.5);
        
        // Vector from opposite vertex to midpoint
        const toMidpoint = new THREE.Vector3().subVectors(midpoint, oppositeVertex);
        
        // Create the new vertex by reflecting the opposite vertex across the shared edge
        // Double the distance from opposite vertex to midpoint
        const newVertex = new THREE.Vector3();
        newVertex.addVectors(oppositeVertex, toMidpoint.multiplyScalar(2));
        
        // Create the new triangle with the shared edge vertices and the new vertex
        // Note: The order matters to maintain proper winding (clockwise/counterclockwise)
        const newVertices = [sharedVertex1, sharedVertex2, newVertex];
        
        // Log the new triangle details
        console.log("NEW ADJACENT TRIANGLE:");
        console.log(`Shared vertex 1: (${sharedVertex1.x.toFixed(2)}, ${sharedVertex1.y.toFixed(2)}, ${sharedVertex1.z.toFixed(2)})`);
        console.log(`Shared vertex 2: (${sharedVertex2.x.toFixed(2)}, ${sharedVertex2.y.toFixed(2)}, ${sharedVertex2.z.toFixed(2)})`);
        console.log(`New vertex: (${newVertex.x.toFixed(2)}, ${newVertex.y.toFixed(2)}, ${newVertex.z.toFixed(2)})`);
        
        // Calculate the center for debugging
        const newCenter = new THREE.Vector3(
            (newVertices[0].x + newVertices[1].x + newVertices[2].x) / 3,
            (newVertices[0].y + newVertices[1].y + newVertices[2].y) / 3,
            (newVertices[0].z + newVertices[1].z + newVertices[2].z) / 3
        );
        console.log(`New triangle center: (${newCenter.x.toFixed(2)}, ${newCenter.y.toFixed(2)}, ${newCenter.z.toFixed(2)})`);
        
        return newVertices;
    }
    
    getInnerTriangleVertices(side) {
        // For inner triangles (like Triforce pattern)
        // Use vertices from the specified side and the center point
        const v1 = this.vertices[side].clone();
        const centerPoint = this.center.clone();
        const v2 = this.vertices[(side + 1) % 3].clone();
        
        console.log("CREATING INNER TRIANGLE:");
        console.log(`Side ${side} from vertex ${side} to ${(side + 1) % 3}`);
        console.log(`V1: (${v1.x.toFixed(2)}, ${v1.y.toFixed(2)}, ${v1.z.toFixed(2)})`);
        console.log(`Center: (${centerPoint.x.toFixed(2)}, ${centerPoint.y.toFixed(2)}, ${centerPoint.z.toFixed(2)})`);
        console.log(`V2: (${v2.x.toFixed(2)}, ${v2.y.toFixed(2)}, ${v2.z.toFixed(2)})`);
        
        const newCenter = new THREE.Vector3(
            (v1.x + centerPoint.x + v2.x) / 3,
            (v1.y + centerPoint.y + v2.y) / 3,
            (v1.z + centerPoint.z + v2.z) / 3
        );
        console.log(`New inner triangle center: (${newCenter.x.toFixed(2)}, ${newCenter.y.toFixed(2)}, ${newCenter.z.toFixed(2)})`);
        
        return [v1, centerPoint, v2];
    }
    
    getOuterTriangleVertices(side) {
        // Get the two vertices of the side
        const v1 = this.vertices[side].clone();
        const v2 = this.vertices[(side + 1) % 3].clone();
        
        // Calculate midpoint of the side
        const midpoint = new THREE.Vector3()
            .addVectors(v1, v2)
            .multiplyScalar(0.5);
        
        // Calculate vector from center to midpoint
        const centerToMid = new THREE.Vector3().subVectors(midpoint, this.center);
        
        // Normalize and scale it to create the outer point
        // For equilateral triangles, we use the same length as the original side
        const sideLength = new THREE.Vector3().subVectors(v2, v1).length();
        const scaleFactor = (sideLength * Math.sqrt(3) / 2) / centerToMid.length();
        
        // Create the new outer vertex
        const newVertex = new THREE.Vector3().addVectors(
            midpoint, 
            centerToMid.clone().multiplyScalar(scaleFactor)
        );
        
        console.log("CREATING OUTER TRIANGLE:");
        console.log(`Side ${side} from vertex ${side} to ${(side + 1) % 3}`);
        console.log(`V1: (${v1.x.toFixed(2)}, ${v1.y.toFixed(2)}, ${v1.z.toFixed(2)})`);
        console.log(`V2: (${v2.x.toFixed(2)}, ${v2.y.toFixed(2)}, ${v2.z.toFixed(2)})`);
        console.log(`New vertex: (${newVertex.x.toFixed(2)}, ${newVertex.y.toFixed(2)}, ${newVertex.z.toFixed(2)})`);
        
        // Calculate center for debugging
        const newCenter = new THREE.Vector3(
            (v1.x + v2.x + newVertex.x) / 3,
            (v1.y + v2.y + newVertex.y) / 3,
            (v1.z + v2.z + newVertex.z) / 3
        );
        console.log(`New outer triangle center: (${newCenter.x.toFixed(2)}, ${newCenter.y.toFixed(2)}, ${newCenter.z.toFixed(2)})`);
        
        return [v1, v2, newVertex];
    }
    
    setFocus(focused) {
        this.focused = focused;
        
        // Keep track of the current base color of the triangle
        if (!this.baseColor) {
            this.baseColor = this.material.color.clone();
        }
        
        if (focused) {
            // Simple focus effect - change material properties
            this.material.emissive = new THREE.Color(0x444444);
            this.material.opacity = 1.0;
            this.wireMaterial.opacity = 0.9;
            
            // Pulse animation for center point
            this.centerPoint.scale.set(1.5, 1.5, 1.5);
        } else {
            // Reset to default
            this.material.emissive = new THREE.Color(0x000000);
            this.material.opacity = 0.8;
            this.wireMaterial.opacity = 0.5;
            
            // Reset center point
            this.centerPoint.scale.set(1, 1, 1);
            
            // Restore base color if not selected
            if (!this.selected) {
                this.material.color.copy(this.baseColor);
            }
        }
    }
    
    setSelected(selected) {
        this.selected = selected;
        
        // Save original color if we haven't already
        if (!this.baseColor) {
            this.baseColor = this.material.color.clone();
        }
        
        if (selected) {
            this.material.color.set(0xff9500); // Apple orange
            this.material.opacity = 0.9;
            this.wireMaterial.color.set(0xff9500);
        } else {
            // Restore original color if not focused
            if (!this.focused) {
                this.material.color.copy(this.baseColor);
            }
            this.material.opacity = 0.8;
            this.wireMaterial.color.set(0x007aff);
        }
    }
    
    update() {
        // No animations for minimalist design
    }
    
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.wireMaterial.dispose();
    }
    
    // Debug utility to help identify triangles
    toString() {
        const center = this.center;
        return `Triangle(center: {x:${center.x.toFixed(2)}, y:${center.y.toFixed(2)}, z:${center.z.toFixed(2)}})`;
    }
}