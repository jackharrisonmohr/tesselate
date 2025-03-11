import * as THREE from 'three';

export class Effects {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        
        // Set a simple background color
        this.renderer.setClearColor(0xffffff, 1); // Clean white background
    }
    
    update() {
        // No animations needed for minimalist design
    }
}