import { Camera, Object3DEventMap, Scene } from "three";

export class Game {
    backend: Worker;
    scene: Scene;
    camera: Camera;
    
    constructor(scene: Scene<Object3DEventMap>, camera: Camera) {
        this.scene = scene;
        this.camera = camera;
        this.backend = new Worker("../dist/backend.js");
    }
    
    
}