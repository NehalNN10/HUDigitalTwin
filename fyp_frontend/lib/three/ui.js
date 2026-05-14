import * as THREE from "three";
import { camera, controls, heatmapPlane, heatmapLive, scene } from "./scene.js";
import { FPS } from "./variables.js";
import { playback, renderFrame } from "./simulation.js";

export const params = {
    darkMode: true
};

// --- CAMERA CONTROLS ---
export function resetCameraView() {
    camera.position.set(-10, 15, 0);
    camera.lookAt(0, 0, 0); 
    controls.target.set(0, 0, 0);
    controls.update();
}

export function resetCameraViewLive() {
    camera.position.set(3.75, 6, 6);
    camera.lookAt(3.75, 0, 0);
    controls.target.set(3.75, 0, 0);
    controls.update();
}

export function toggleHeatmap() {
    playback.showHeatmap = !playback.showHeatmap;
    heatmapPlane.material.opacity = playback.showHeatmap ? 1 : 0;
    return playback.showHeatmap;
}

export function toggleTheme() {
    params.darkMode = !params.darkMode;
    scene.background = new THREE.Color(params.darkMode ? 0x131314 : 0xffffff);
    return params.darkMode;
}

// --- SIMULATION CONTROLS ---
export function togglePlayPause() {
    playback.playing = !playback.playing;
    return playback.playing;
}

export function rewindSim() {
    playback.frame -= 5 * FPS; 
    if (playback.frame < 0) playback.frame = 0; 
    renderFrame(Math.floor(playback.frame));
}

export function fastForwardSim() {
    playback.frame += 5 * FPS; 
    if (playback.frame > playback.maxFrames) playback.frame = playback.maxFrames; 
    renderFrame(Math.floor(playback.frame));
}

export function resetSim() {
    scrubFrame(0); 
    changeSpeed(1);
    renderFrame(0);
}

export function changeSpeed(value) {
    playback.speed = parseFloat(value);
}

export function scrubFrame(value) {
    playback.frame = parseFloat(value) * FPS;
    renderFrame(Math.floor(playback.frame));
}