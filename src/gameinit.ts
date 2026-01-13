import { registerScene } from "./scene";
import {
    AmbientLight,
    Color,
    DirectionalLight,
    Object3DEventMap,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from "three";

registerScene("game", "inbuilt", (old_data, dataset) => {
    let scene: Scene<Object3DEventMap>,
        camera: PerspectiveCamera,
        renderer: WebGLRenderer;
    let yaw = 0,
        pitch = 0;
    const keys = {};
    const speed = 5;
    const sensitivity = 0.002;

    init();
    animate();

    function init() {
        scene = new Scene();
        scene.background = new Color(0x87ceeb);
        camera = new PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );
        camera.position.set(0, 1.6, 5);

        renderer = new WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("game").appendChild(renderer.domElement);

        // Light
        const light = new DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 5);
        scene.add(light);
        scene.add(new AmbientLight(0xffffff, 0.4));

        // Controls
        document.addEventListener("keydown", (e) => (keys[e.code] = true));
        document.addEventListener("keyup", (e) => (keys[e.code] = false));

        document.body.addEventListener("click", () => {
            document.body.requestPointerLock();
        });

        document.addEventListener("mousemove", onMouseMove);
        window.addEventListener("resize", onResize);
    }

    function onMouseMove(e) {
        if (document.pointerLockElement !== document.body) return;

        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;

        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    function animate() {
        requestAnimationFrame(animate);
        updateMovement();
        renderer.render(scene, camera);
    }

    function updateMovement() {
        const dir = new Vector3();

        if (keys["KeyW"]) dir.z -= 1;
        if (keys["KeyS"]) dir.z += 1;
        if (keys["KeyA"]) dir.x -= 1;
        if (keys["KeyD"]) dir.x += 1;

        dir.normalize();

        // Move relative to camera yaw (FPS-style)
        const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        camera.position.addScaledVector(forward, dir.z * speed * 0.016);
        camera.position.addScaledVector(right, dir.x * speed * 0.016);
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
