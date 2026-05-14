import * as THREE from 'three';
import { camera } from "./scene.js"; 
import { getLiveRoom, getTime, getDate, liveRoomInfo } from './variables.js';
import { heatmapLiveCtx, heatmapLiveWidth, heatmapLiveHeight, heatmapLiveTexture } from './scene.js';

export const liveSettings = {
    showHeatmap: false // Toggle this from your React UI!
};

export const liveHeatmapConfig = {
    floorWidth: 7.5,    
    floorDepth: 4.25,       
    bounds: { xMin: 0, xMax: 7.5, zMin: -4.25, zMax: 4.25 },
    floorVertices: [
        [0, -4.25], [7.5, -4.25], [7.5, 4.25], [0, 4.25], [0, -4.25]
    ],
    heatmap: { gridSize: 80, densityCap: 120, coolingFactor: 0.98, smoothSigma: 4.0, opacity: 0.6 }
};

export const raycaster = new THREE.Raycaster();
export const screenCenter = new THREE.Vector2(0, 0); 
export const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export const intersectionPoint = new THREE.Vector3();

// The Live Engine Render Loop
export function renderLiveFrame() {

    raycaster.setFromCamera(screenCenter, camera);
    const hit = raycaster.ray.intersectPlane(floorPlane, intersectionPoint);

    const room = hit ? getLiveRoom(intersectionPoint.x, intersectionPoint.z) : null;
    const roomInf = (room && liveRoomInfo && liveRoomInfo[room]) ? liveRoomInfo[room] : null;

    // 1. Fetch UI Elements directly from the DOM
    const uiName = document.getElementById('ui-room-name');
    const uiID = document.getElementById('ui-room-id');
    const uiFloor = document.getElementById('ui-room-floor');
    const uiDate = document.getElementById('ui-iot-date');
    const uiTime = document.getElementById('ui-iot-time');

    // 2. Update Date & Time
    if (uiDate) uiDate.innerText = getDate();
    if (uiTime) uiTime.innerText = getTime();

    // 3. Raycast for Room Name/ID
    if (roomInf) {
        // Safe Check: Only update if React hasn't deleted the element yet!
        if (uiName) {
            uiName.innerText = roomInf.name;
        }
        if (uiID) {
            uiID.innerText = roomInf.room_id;
        }
        if (uiFloor) {
            uiFloor.innerText = roomInf.room_floor;
        }
    } else {
        if (uiName) {
            uiName.innerText = "--";
        }
        if (uiID) {
            uiID.innerText = "--";
        }
        if (uiFloor) {
            uiFloor.innerText = "--";
        }
    }
}

let density = null;
let weightCache = null;
let radius = 0;

// --- HARDCODED MATH SETTINGS ---
const GRID_SIZE = 80;
const DENSITY_CAP = 120;
const COOLING_FACTOR = 0.98;
const BOUNDS = { xMin: -4.25/2, xMax: 4.25/2, zMin: 0, zMax: 7.5 };
// -------------------------------

export function initHeatmapMath() {
    density = new Float32Array(GRID_SIZE * GRID_SIZE);
    const smoothSigma = 4.0;
    radius = Math.ceil(3 * smoothSigma);
    weightCache = new Float32Array((radius * 2 + 1) * (radius * 2 + 1));
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const w = Math.exp(-(dx*dx + dy*dy) / (2 * smoothSigma * smoothSigma));
            weightCache[(dy + radius) * (radius * 2 + 1) + (dx + radius)] = w;
        }
    }
}

export function updateHeatmapLive(markers) {
    if (!density) initHeatmapMath(); 

    for (let i = 0; i < density.length; i++) {
        density[i] *= COOLING_FACTOR; 
    }

    markers.forEach(marker => {
        const gx = Math.floor(((marker.x - BOUNDS.xMin) / (BOUNDS.xMax - BOUNDS.xMin)) * GRID_SIZE);
        const gy = Math.floor(((marker.z - BOUNDS.zMin) / (BOUNDS.zMax - BOUNDS.zMin)) * GRID_SIZE);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
            density[gy * GRID_SIZE + gx] += 1;
        }
    });

    const smoothed = new Float32Array(GRID_SIZE * GRID_SIZE);

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let sum = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                        const w = weightCache[(dy + radius) * (radius * 2 + 1) + (dx + radius)];
                        sum += density[ny * GRID_SIZE + nx] * w;
                    }
                }
            }
            smoothed[y * GRID_SIZE + x] = sum;
        }
    }

    const normalized = smoothed.map(d => Math.min(d / DENSITY_CAP, 1.0));
    
    if (!heatmapLiveCtx) return; 
    const imageData = heatmapLiveCtx.createImageData(heatmapLiveWidth, heatmapLiveHeight);
    const data = imageData.data;

    const colorStops = [
        { t: 0.00, r: 0,   g: 0,   b: 150, a: 80  }, 
        { t: 0.15, r: 0,   g: 0,   b: 255, a: 120 }, 
        { t: 0.35, r: 0,   g: 255, b: 255, a: 160 }, 
        { t: 0.55, r: 0,   g: 255, b: 0,   a: 200 }, 
        { t: 0.80, r: 255, g: 255, b: 0,   a: 220 }, 
        { t: 1.00, r: 255, g: 0,   b: 0,   a: 245 }, 
    ];

    function sampleColor(t) {
        let lo = colorStops[0];
        let hi = colorStops[colorStops.length - 1];
        for (let i = 0; i < colorStops.length - 1; i++) {
            if (t >= colorStops[i].t && t <= colorStops[i + 1].t) {
                lo = colorStops[i];
                hi = colorStops[i + 1];
                break;
            }
        }
        const f = (hi.t === lo.t) ? 0 : (t - lo.t) / (hi.t - lo.t);
        return {
            r: Math.round(lo.r + f * (hi.r - lo.r)),
            g: Math.round(lo.g + f * (hi.g - lo.g)),
            b: Math.round(lo.b + f * (hi.b - lo.b)),
            a: Math.round(lo.a + f * (hi.a - lo.a)),
        };
    }

    for (let py = 0; py < heatmapLiveHeight; py++) {
        for (let px = 0; px < heatmapLiveWidth; px++) {
            const gx = (px / heatmapLiveWidth) * GRID_SIZE;
            const gy = (py / heatmapLiveHeight) * GRID_SIZE;

            const x0 = Math.floor(gx), x1 = Math.min(x0 + 1, GRID_SIZE - 1);
            const y0 = Math.floor(gy), y1 = Math.min(y0 + 1, GRID_SIZE - 1);
            const fx = gx - x0, fy = gy - y0;

            const d00 = normalized[y0 * GRID_SIZE + x0];
            const d10 = normalized[y0 * GRID_SIZE + x1];
            const d01 = normalized[y1 * GRID_SIZE + x0];
            const d11 = normalized[y1 * GRID_SIZE + x1];
            const densityValue = (d00*(1-fx) + d10*fx)*(1-fy) + (d01*(1-fx) + d11*fx)*fy;

            const { r, g, b, a } = sampleColor(densityValue);
            
            const idx = (py * heatmapLiveWidth + px) * 4;
            data[idx]   = r;
            data[idx+1] = g;
            data[idx+2] = b;
            data[idx+3] = a;
        }
    }

    heatmapLiveCtx.putImageData(imageData, 0, 0);
    heatmapLiveTexture.needsUpdate = true;
}