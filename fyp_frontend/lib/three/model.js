import { initVariables } from './variables.js';
import { initScene, scene, camera, renderer, controls, setupHeatmap, composer } from './scene.js';
import { loadAssets, buildStaticWorld} from './world.js';
import { loadSimulationData, renderFrame, playback } from './simulation.js';
import { FPS, LOOP_DURATION } from './variables.js';

let animationFrameId;
let lastTime = 0;
let lastRenderedFrame = -1;
let currentContainer = null; 

function getLiveFrame() {
    const now = Date.now() / 1000;
    const currentLoopSeconds = now % LOOP_DURATION;
    return currentLoopSeconds * FPS;
}

function animate(t = 0) {
    animationFrameId = requestAnimationFrame(animate);
    
    // --- FLICKER-FREE RESIZE LOGIC ---
    if (currentContainer && renderer && camera) {
        const width = currentContainer.clientWidth;
        const height = currentContainer.clientHeight;
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio || 1;
        const targetWidth = Math.floor(width * pixelRatio);
        const targetHeight = Math.floor(height * pixelRatio);

        if (width > 0 && height > 0 && (canvas.width !== targetWidth || canvas.height !== targetHeight)) {
            renderer.setSize(width, height, false); 
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    }
    // ---------------------------------

    const dt = (t - lastTime) / 1000;
    lastTime = t;

    const liveEl = document.getElementById('live');
    const LIVE_MODE = liveEl ? liveEl.textContent.trim() === 'true' : false;

    if (playback.maxFrames > 0) {
        if (LIVE_MODE) {
            const targetFrame = getLiveFrame();
            if (targetFrame > playback.maxFrames) playback.frame = playback.maxFrames;
            else playback.frame = targetFrame;
            playback.playing = true;
        } else if (playback.playing) {
            playback.frame += dt * FPS * playback.speed;
            if (playback.frame > playback.maxFrames) playback.frame = 0;
        }
        
        const currentFrameIdx = Math.floor(playback.frame);
        
        // 🌟 THE FIX: ALWAYS render the frame!
        // This guarantees the UI populates on window load, AND guarantees the 
        // crosshair updates the UI when you move the camera (even if paused!)
        renderFrame(currentFrameIdx);
        
        // We keep the sliders inside the IF block to save performance. 
        // Only update the HTML sliders if the timeline actually ticked forward.
        // We keep the sliders inside the IF block to save performance. 
        if (currentFrameIdx !== lastRenderedFrame) {
            lastRenderedFrame = currentFrameIdx;
            
            const currentSecond = (currentFrameIdx / FPS).toFixed(2);
            
            const scrubber = document.getElementById('frame-scrubber');
            if (scrubber && !scrubber.matches(':active')) { 
                scrubber.value = currentSecond;
            }
            
            const scrubText = document.getElementById('frame-scrubber-text');
            if (scrubText && document.activeElement !== scrubText) { 
                scrubText.value = currentSecond;
            }
        }
    }
    
    if (controls) controls.update();
    if (renderer && scene && camera) composer.render(scene, camera);
}

export async function initThreeEngine(container) {
    currentContainer = container; 

    playback.maxFrames = FPS * LOOP_DURATION;
    playback.playing = true;
    playback.speed = 1;
    lastRenderedFrame = -1;
    
    initScene(container);
    
    if (renderer) {
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
    }

    await initVariables();

    // --- 1. REPLAY URL LOGIC ---
    const liveEl = document.getElementById('live');
    const LIVE_MODE = liveEl ? liveEl.textContent.trim() === 'true' : false;

    if (!LIVE_MODE) {
        const urlParams = new URLSearchParams(window.location.search);
        const startFrame = urlParams.get('frame');
        
        if (startFrame) {
            const limitFrame = parseInt(startFrame, 10);
            
            // THE FIX: Cap the absolute max frames of the simulation to the URL parameter!
            playback.maxFrames = limitFrame; 
            playback.frame = limitFrame;     // Set the playhead to this exact moment
            playback.playing = false;        // Start paused
        }
    }

    // --- 2. DATA LOAD & UI SYNC ---
    loadSimulationData(() => {
        const scrubber = document.getElementById('frame-scrubber');
        
        if (scrubber) {
            // Set the slider max to total SECONDS instead of total frames
            scrubber.max = (playback.maxFrames / FPS).toFixed(2); 
            scrubber.value = (playback.frame / FPS).toFixed(2);
        }
        
        const scrubText = document.getElementById('frame-scrubber-text');
        if (scrubText) {
            scrubText.value = (playback.frame / FPS).toFixed(2);
        }
    });

    try {
        await loadAssets();
        console.log("Assets ready. Building world...");
        buildStaticWorld(); 
        setupHeatmap(playback.showHeatmap);
        animate();
    } catch (err) {
        console.error("Critical Error loading assets:", err);
    }
}

export function destroyThreeEngine() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    currentContainer = null;
    
    if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        const dom = renderer.domElement;
        if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
    }
}