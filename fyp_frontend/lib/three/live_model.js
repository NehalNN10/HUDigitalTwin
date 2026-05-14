import * as THREE from 'three';
import { initLiveVariables, sendFacilitiesAlert, liveRoomInfo, getRoomInfo } from './variables.js';
import { initScene, scene, camera, renderer, controls, setupHeatmapLive, heatmapLivePlane, composer } from './scene.js';
import { loadAssets, buildLiveWorld, createMarker} from './world.js';
import { renderLiveFrame, liveSettings, updateHeatmapLive } from './live_simulation.js';

let animationFrameId;
let currentContainer = null;
let trackMarkers = new Map();

let liveIoTData = { temperature: null, ac_state: null, lights_state: null, device_id: 'Live_Room' };
let liveOccupancy = 0;
let lastSecond = -1;
let lastAlertTime = 0;
let heatmapThrottle = 0;

const ALERT_THRESHOLD = 10; // 120 seconds
const trackers = { acWasted: 0, lightsWasted: 0, tempWarm: 0, tempCold: 0 };

function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

function evaluateLiveAlerts() {
    const nowSec = Math.floor(Date.now() / 1000);
    
    if (nowSec !== lastSecond) {
        lastSecond = nowSec;
        if (liveIoTData.temperature === null && liveIoTData.ac_state === null) return;

        if (liveOccupancy === 0 && liveIoTData.ac_state === 'ON') trackers.acWasted++; 
        else trackers.acWasted = 0;

        if (liveOccupancy === 0 && liveIoTData.lights_state === 'ON') trackers.lightsWasted++; 
        else trackers.lightsWasted = 0;

        if (liveIoTData.temperature > 28) trackers.tempWarm++; 
        else trackers.tempWarm = 0;

        if (liveIoTData.temperature !== null && liveIoTData.temperature < 22) trackers.tempCold++; 
        else trackers.tempCold = 0;

        const roomId = "C-067";
        const roomInf = liveRoomInfo[roomId];
        let occuAlert = null;
        if (roomInf && liveOccupancy > roomInf.max_occupancy) {
            occuAlert = `Over capacity: ${liveOccupancy}/${roomInf.max_occupancy}`;
        }

        if (nowSec - lastAlertTime >= ALERT_THRESHOLD) {
            const activeAlerts = [];
            const descriptions = [];

            if (trackers.acWasted >= ALERT_THRESHOLD) {
                activeAlerts.push("AC Being Wasted");
                descriptions.push(`AC being wasted with zero occupancy for ${formatTime(trackers.acWasted)}.`);
            }
            if (trackers.lightsWasted >= ALERT_THRESHOLD) {
                activeAlerts.push("Lights Being Wasted");
                descriptions.push(`Lights being wasted with zero occupancy for ${formatTime(trackers.lightsWasted)}.`);
            }
            if (trackers.tempWarm >= ALERT_THRESHOLD) {
                activeAlerts.push("Temperature Too Warm");
                descriptions.push(`Temperature over 28°C (${liveIoTData.temperature.toFixed(1)}°C) for ${formatTime(trackers.tempWarm)}.`);
            }
            if (trackers.tempCold >= ALERT_THRESHOLD) {
                activeAlerts.push("Temperature Too Cold");
                descriptions.push(`Temperature under 22°C (${liveIoTData.temperature.toFixed(1)}°C) for ${formatTime(trackers.tempCold)}.`);
            }
            if (occuAlert) {
                activeAlerts.push("Capacity Breach");
                descriptions.push(occuAlert);
            }

            if (activeAlerts.length > 0) {
                const combinedTitle = activeAlerts.join(" & ");
                const combinedDesc = descriptions.join("\n \n");
                const currentTime = new Date().toLocaleTimeString();
                
                if (typeof sendFacilitiesAlert === 'function') {
                    sendFacilitiesAlert(roomId, combinedTitle, currentTime, combinedDesc);
                }
                lastAlertTime = nowSec;
            }
        }
    }
}

// ==========================================
// 🌟 AVATAR & OCCLUSION LOGIC
// ==========================================
function createOccludedLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(255, 0, 0, 0.9)'; 
    ctx.roundRect ? ctx.roundRect(0, 0, 256, 64, 16) : ctx.fillRect(0, 0, 256, 64);
    ctx.fill();
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OCCLUDED', 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    
    sprite.scale.set(1.5, 0.375, 1); 
    sprite.position.set(0, 1.5, 0); 
    sprite.name = "occlusionLabel"; 
    
    return sprite;
}

function applyOcclusionStyle(mesh, isOccluded) {
    let label = mesh.getObjectByName("occlusionLabel");

    if (isOccluded) {
        if (!label) {
            label = createOccludedLabel();
            mesh.add(label);
        }
    } else {
        if (label) {
            mesh.remove(label);
            label.material.map.dispose();
            label.material.dispose();
        }
    }
}

function updateTrackMarker(trackId, position, region, isOccluded) {
    if (trackMarkers.has(trackId)) {
        const markerData = trackMarkers.get(trackId);
        markerData.mesh.position.set(position.x, 0, position.z);
        markerData.position = position;
        markerData.region = region; 
        
        applyOcclusionStyle(markerData.mesh, isOccluded);
    } else {
        createTrackMarker(trackId, position, region, isOccluded);
    }
}

function createTrackMarker(trackId, position, region, isOccluded) {
    let hash = 0;
    for (let i = 0; i < trackId.length; i++) hash = trackId.charCodeAt(i) + ((hash << 5) - hash);
    const colorHex = new THREE.Color(`hsl(${Math.abs(hash) % 360}, 70%, 50%)`).getHex();

    const marker = createMarker(position.x, position.z, colorHex, 0.2, trackId); 
    scene.add(marker);
    
    trackMarkers.set(trackId, {
        mesh: marker,
        trackId: trackId,
        position: position,
        region: region
    });
    
    applyOcclusionStyle(marker, isOccluded);
    return marker;
}

// ==========================================
// 🌟 RENDER LOOP
// ==========================================
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    
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
    
    renderLiveFrame(); 
    evaluateLiveAlerts(); // Evaluate IoT alerts every frame
    
    if (controls) controls.update();
    if (renderer && scene && camera) composer.render();
}

export async function initLiveEngine(container) {
    currentContainer = container; 
    
    trackMarkers.forEach(data => scene.remove(data.mesh));
    trackMarkers.clear();

    initScene(container);

    setupHeatmapLive(liveSettings.showHeatmap);

    camera.position.set(3.75, 6, 6);
    camera.lookAt(3.75, 0, 0);
    controls.target.set(3.75, 0, 0);
    
    if (renderer) {
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
    }

    await initLiveVariables();

    // 🌟 BRIDGE 1: YOLO Data (Handles Heatmap & Avatars)
    window.updateLiveAvatars = (detectionsArray, currentCount) => {
        if (!scene) return;
        if (currentCount !== undefined) liveOccupancy = currentCount;

        // --- FIXED HEATMAP LOGIC ---
        if (!liveSettings.showHeatmap) {
            if (heatmapLivePlane) heatmapLivePlane.material.opacity = 0; // Hide heatmap
            
            const currentFrameIds = new Set();

            detectionsArray.forEach(trackData => {
                const compositeId = `${trackData.region}_${trackData.id}`;
                currentFrameIds.add(compositeId);
                const position = { x: trackData.x, z: trackData.z };
                
                updateTrackMarker(compositeId, position, trackData.region, trackData.is_occluded);
                
                if(trackMarkers.has(compositeId)) {
                    trackMarkers.get(compositeId).mesh.visible = true;
                }
            });

            // Cleanup stale avatars
            trackMarkers.forEach((markerData, trackId) => {
                if (!currentFrameIds.has(trackId)) {
                    scene.remove(markerData.mesh);
                    trackMarkers.delete(trackId);
                }
            });
            
        } else {
            // HEATMAP RENDER
            if (heatmapLivePlane) heatmapLivePlane.material.opacity = 1; // Show heatmap
    
            // 1. Hide all avatars
            trackMarkers.forEach(markerData => markerData.mesh.visible = false);
            
            // 2. Throttle heatmap heavy math (run every 5 frames)
            heatmapThrottle++;
            if (heatmapThrottle >= 5) {
                updateHeatmapLive(detectionsArray);
                heatmapThrottle = 0;
            }
        }
    };

    // 🌟 BRIDGE 2: ESP32 IoT Data
    window.updateLiveSensorData = (iotData) => {
        if (iotData) liveIoTData = iotData;
    };

    try {
        await loadAssets();
        buildLiveWorld(); 
        animate();
    } catch (err) {
        console.error("Critical Error loading assets:", err);
    }
}

export function destroyLiveEngine() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    window.updateLiveAvatars = null;
    window.updateLiveSensorData = null; 
    currentContainer = null;
    
    if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        const dom = renderer.domElement;
        if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
    }
}

// ==========================================
// 🌟 REACT UI TRIGGERS
// ==========================================
export function toggleHeatmap(forceState) {
    liveSettings.showHeatmap = forceState;
    
    if (heatmapLivePlane) {
        heatmapLivePlane.material.opacity = forceState ? 1 : 0;
        
        if (forceState) {
            updateHeatmapLive([]); 
        }
    }

    if (!forceState) {
        trackMarkers.forEach(markerData => {
            markerData.mesh.visible = true;
        });
    }
}