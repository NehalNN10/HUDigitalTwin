import { initRoomInfo, roomInfo, FPS, LOOP_DURATION } from './variables.js';
import { initScene, scene, camera, renderer, controls } from './scene.js';
import { loadAssets, buildStaticWorld } from './world.js';
import { SandboxSimulation } from "./sandbox_simulation.js";

export class SandboxEngine {
    constructor(container, onDataUpdate = null, onRoomsLoaded = null) {
        this.container = container;
        this.animationFrameId = null;
        this.lastTime = 0;
        this.lastRenderedFrame = -1;
        
        this.onRoomsLoaded = onRoomsLoaded;

        this.simulation = new SandboxSimulation(this, onDataUpdate);
        this.animate = this.animate.bind(this);
    }

    async init() {
        initScene(this.container);
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        
        if (this.renderer) {
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
            this.renderer.domElement.style.display = 'block';
        }

        await initRoomInfo();

        if (this.onRoomsLoaded && roomInfo) {
            const roomsArray = Object.keys(roomInfo).map(key => ({
                id: key, 
                room_id: roomInfo[key].room_id,
                name: roomInfo[key].name,
                max_occupancy: roomInfo[key].max_occupancy
            }));
            this.onRoomsLoaded(roomsArray);
        }

        try {
            await loadAssets();
            console.log("Sandbox Assets ready. Building world...");
            buildStaticWorld(); 
            this.animate();
        } catch (err) {
            console.error("Critical Error loading Sandbox assets:", err);
        }
    }

    getLiveFrame() {
        const now = Date.now() / 1000;
        const currentLoopSeconds = now % LOOP_DURATION;
        return currentLoopSeconds * FPS;
    }

    animate(t = 0) {
        this.animationFrameId = requestAnimationFrame(this.animate);
        
        // --- Resize Logic ---
        if (this.container && this.renderer && this.camera) {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            const canvas = this.renderer.domElement;
            const targetWidth = Math.floor(width * (window.devicePixelRatio || 1));
            const targetHeight = Math.floor(height * (window.devicePixelRatio || 1));

            if (width > 0 && height > 0 && (canvas.width !== targetWidth || canvas.height !== targetHeight)) {
                this.renderer.setSize(width, height, false); 
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }
        }
            
        this.simulation.renderFrame();
        
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            const dom = this.renderer.domElement;
            if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
        }
        console.log("Sandbox Engine Destroyed.");
    }
}