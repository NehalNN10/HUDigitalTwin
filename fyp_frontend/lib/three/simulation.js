import * as THREE from "three";
import { createMarker } from "./world.js";
import { FPS, LOOP_DURATION, iot, getRoom, roomInfo, sendFacilitiesAlert } from "./variables.js";
import { camera, controls} from "./scene.js";
import { heatmapCtx, heatmapTexture, heatmapSize, heatmapWidth, heatmapHeight} from "./scene.js";
import { all, max } from "three/tsl";

export const playback = {
    frame: 0,
    maxFrames: FPS * LOOP_DURATION,
    playing: true,
    speed: 1,
    showHeatmap: false
};

export const tracker = './active_files/combined_tracks_1234.csv';
export const globalCount = 18;

export const raycaster = new THREE.Raycaster();
export const screenCenter = new THREE.Vector2(0, 0); // (0,0) is the center of the screen

// Define the "Floor" mathematically: A flat plane pointing Up (0,1,0) at height 0
export const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Create a variable to hold the result
export const intersectionPoint = new THREE.Vector3();

export const trackers = { acWasted: {}, lightsWasted: {}, tempWarm: {}, tempCold: {} };
export const roomLastAlertTime = {}; 
export let lastSecond = -1;

function getDate(dateElement) {
    if (!dateElement) return; // Safety check
    
    const now = new Date();
    const options = { 
        weekday: 'short', 
        month: 'short',   
        day: 'numeric',   
        year: 'numeric'   
    };

    // Format the date
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Apply the date to the element (NO uiElements mentioned here!)
    dateElement.innerHTML = formattedDate;
}

let globalTrackFrames = []; 
let globalTrackData = new Map(); 
let globalIoTData = []; 
let trackMarkers = new Map();
//new
let globalCountData = new Map();

export function renderFrame(index) {

    const uiElements = {
        uiOccupancy: document.getElementById('ui-iot-occupancy'),
        uiOccuHeader: document.getElementById('ui-iot-occu-header'),
        uiTemp: document.getElementById('ui-iot-temp'),
        uiAC: document.getElementById('ui-iot-ac'),
        uiLights: document.getElementById('ui-iot-lights'),
        uiDate: document.getElementById('ui-iot-date'),
        uiTime: document.getElementById('ui-iot-time'),
        uiName: document.getElementById('ui-room-name'),
        uiID: document.getElementById('ui-room-id'),
        uiFloor: document.getElementById('ui-room-floor'),
        uiCoords: document.getElementById('ui-coords')
    };

    const deptEl = document.getElementById('department');
    const department = deptEl ? deptEl.textContent.trim() : "Security";
    
    trackMarkers.forEach(m => m.visible = false);

    raycaster.setFromCamera(screenCenter, camera);

    // 2. Intersect
    // We use a temporary variable to check if we actually hit the floor
    const hit = raycaster.ray.intersectPlane(floorPlane, intersectionPoint);

    const room = hit ? getRoom(intersectionPoint.x, intersectionPoint.z) : null;
    const roomInf = room ? roomInfo[room] : null;
    const second = Math.floor(playback.frame / FPS);
    let row = null;
    
    if (room && iot && iot[room] && iot[room].length > 0) {
        const safeIndex = second % iot[room].length; 
        row = iot[room][safeIndex];
    }

    else row = null; // Explicitly set to null if no data is found for safety

    // ✨ ADD THIS DIAGNOSTIC BLOCK ✨
    // This will print to your console once every 2 seconds
    if (Math.floor(playback.frame) % 50 === 0) { 
        console.log("--- 3D ENGINE DIAGNOSTIC ---");
        console.log("1. Raycaster sees room: ", room || "NONE (Look at the floor!)");
        console.log("2. Array length for room: ", iot[room] ? iot[room].length : 0);
        console.log("3. Current Second: ", second);
        console.log("4. Extracted Row Data: ", row);
        console.log("5. Logged in Dept: ", department);
    }

    if (roomInf) {
        // Safe Check: Only update if React hasn't deleted the element yet!
        if (uiElements.uiName) {
            uiElements.uiName.innerText = roomInf.name;
        }
        if (uiElements.uiID) {
            uiElements.uiID.innerText = roomInf.room_id;
        }
        if (uiElements.uiFloor) {
            uiElements.uiFloor.innerText = roomInf.room_floor;
        }
    } else {
        if (uiElements.uiName) {
            uiElements.uiName.innerText = "--";
        }
        if (uiElements.uiID) {
            uiElements.uiID.innerText = "--";
        }
        if (uiElements.uiFloor) {
            uiElements.uiFloor.innerText = "--";
        }
    }
        
    if (row) {
        if (department === "Security") {
            const event = new CustomEvent('iotDataUpdate', { 
                detail: { 
                    occupancy: row.occupancy,
                    max_occupancy: roomInf ? roomInf.max_occupancy : null
                }
            });
            window.dispatchEvent(event);
        }

        if (department === "Facilities") {
            const event = new CustomEvent('iotDataUpdate', { 
                detail: { 
                    occ_status: row.occu > 0 ? true : false,
                    temperature: row.temperature,
                    ac: row.ac,
                    lights: row.lights
                }
            });
            window.dispatchEvent(event);
        }

        if (department === "Admin") {
            const event = new CustomEvent('iotDataUpdate', { 
                detail: { 
                    occupancy: row.occupancy,
                    max_occupancy: roomInf ? roomInf.max_occupancy : null,
                    temperature: row.temperature,
                    ac: row.ac,
                    lights: row.lights
                }
            });
            window.dispatchEvent(event);
        }
    }

    else {
        // If no data row is found, dispatch an event with nulls so the UI can reset
        const event = new CustomEvent('iotDataUpdate', {
            detail: { 
                occupancy: null,
                max_occupancy: 0,
                temperature: null,
                ac: null,
                lights: null
            }
        });
        window.dispatchEvent(event);
    }

    if (uiElements.uiDate) {
        getDate(uiElements.uiDate); // <-- Pass it here!
    }
        
    // --- NEW CODE START: TIME CALCULATION ---
    if (uiElements.uiTime && Math.floor(playback.frame) % 60 === 0) {
        const now = new Date();
        const nowSeconds = Math.floor(now.getTime() / 1000);
        
        const secondsIntoCycle = nowSeconds % LOOP_DURATION;
        const cycleStartTime = new Date(now.getTime() - (secondsIntoCycle * 1000));
        
        const frameTime = new Date(cycleStartTime.getTime() + (second) * 1000);
        
        uiElements.uiTime.innerText = frameTime.toLocaleTimeString(); 
        
    }

    const seconds = Math.floor(Date.now() / 1000);
    
    if (seconds !== lastSecond) {
        lastSecond = seconds;

        Object.keys(iot).forEach(roomId => {
            const safeIndex = second % iot[roomId].length;
            const row = iot[roomId][safeIndex];
            
            if (!row) return; // Safety check in case the room has no data yet

            const threshold = 200;
            
            if (row.occupancy === 0 && row.ac) trackers.acWasted[roomId] = (trackers.acWasted[roomId] || 0) + 1;
            else trackers.acWasted[roomId] = 0;

            if (row.occupancy === 0 && row.lights) trackers.lightsWasted[roomId] = (trackers.lightsWasted[roomId] || 0) + 1;
            else trackers.lightsWasted[roomId] = 0;

            if (row.temperature > 28) trackers.tempWarm[roomId] = (trackers.tempWarm[roomId] || 0) + 1;
            else trackers.tempWarm[roomId] = 0;

            if (row.temperature < 22) trackers.tempCold[roomId] = (trackers.tempCold[roomId] || 0) + 1;
            else trackers.tempCold[roomId] = 0;

            row.uiAlerts = { ac: null, lights: null, temp: null, occu: null };
            
            const formatTime = (totalSec) => {
                const m = Math.floor(totalSec / 60);
                const s = totalSec % 60;
                return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
            };

            // If a tracker crossed the threshold, attach the formatted time string!
            if (trackers.acWasted[roomId] >= threshold) row.uiAlerts.ac = formatTime(trackers.acWasted[roomId]);
            if (trackers.lightsWasted[roomId] >= threshold) row.uiAlerts.lights = formatTime(trackers.lightsWasted[roomId]);
            
            if (trackers.tempWarm[roomId] >= threshold) row.uiAlerts.temp = `Too Warm (${row.temperature.toFixed(1)}°C) for ${formatTime(trackers.tempWarm[roomId])}`;
            else if (trackers.tempCold[roomId] >= threshold) row.uiAlerts.temp = `Too Cold (${row.temperature.toFixed(1)}°C) for ${formatTime(trackers.tempCold[roomId])}`;
            
            // Instant Occupancy Alert (no threshold needed)
            const roomInf = roomInfo[roomId];
            if (roomInf && row.occupancy > roomInf.max_occupancy) row.uiAlerts.occu = `Over capacity: ${row.occupancy}/${roomInf.max_occupancy}`;
            
            const lastAlert = roomLastAlertTime[roomId] || 0;
            if (seconds - lastAlert >= threshold) {
                const activeAlerts = [];
                const descriptions = [];

                if (trackers.acWasted[roomId] >= threshold) {
                    activeAlerts.push("AC Being Wasted");
                    descriptions.push(`AC being wasted with zero occupancy for ${formatTime(trackers.acWasted[roomId])}.`);
                }
                if (trackers.lightsWasted[roomId] >= threshold) {
                    activeAlerts.push("Lights Being Wasted");
                    descriptions.push(`Lights being wasted with zero occupancy for ${formatTime(trackers.lightsWasted[roomId])}.`);
                }
                if (trackers.tempWarm[roomId] >= threshold) {
                    activeAlerts.push("Temperature Too Warm");
                    descriptions.push(`Temperature over 28°C (${row.temperature.toFixed(1)}°C) for ${formatTime(trackers.tempWarm[roomId])}.`);
                }
                if (trackers.tempCold[roomId] >= threshold) {
                    activeAlerts.push("Temperature Too Cold");
                    descriptions.push(`Temperature under 20°C (${row.temperature.toFixed(1)}°C) for ${formatTime(trackers.tempCold[roomId])}.`);
                }

                if (activeAlerts.length > 0) {
                    const combinedTitle = activeAlerts.join(" & ");
                    const combinedDesc = descriptions.join("\n \n");
                    
                    if (typeof sendFacilitiesAlert === 'function') {
                        sendFacilitiesAlert(roomId, combinedTitle, combinedDesc);
                    } else {
                        console.warn(`[ALERT READY] But sendFacilitiesAlert is missing! Data:`, {roomId, combinedTitle, combinedDesc});
                    }

                    roomLastAlertTime[roomId] = seconds;
                }
            }
        });
    }

    const allmarkers = [];

    if (index < globalTrackFrames.length) {
        const realFrameNumber = globalTrackFrames[index];
        const detections = globalTrackData.get(realFrameNumber) || [];
        if (department != "Facilities") {
            
            detections.forEach(d => {
                if (!playback.showHeatmap) {
                    const marker = trackMarkers.get(d.id);

                    if (marker) {
                        marker.position.x = d.z; 
                        marker.position.z = d.x;

                        marker.visible = true;
                    }
                }
                else allmarkers.push(d);
            });
            

            if (typeof window.heatmapThrottle === 'undefined') window.heatmapThrottle = 0;
                    
            if (playback.showHeatmap) {
                window.heatmapThrottle++;
                // Only run the heavy math every 10 frames instead of every single frame
                if (window.heatmapThrottle >= 5) {
                    updateHeatmap(allmarkers);
                    window.heatmapThrottle = 0;
                }
            }
        }
    }
}

let density = new Float32Array(80 * 80);

const smoothSigma = 4.0;
const radius = Math.ceil(3 * smoothSigma);
const weightCache = new Float32Array((radius * 2 + 1) * (radius * 2 + 1));
for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
        const w = Math.exp(-(dx*dx + dy*dy) / (2 * smoothSigma * smoothSigma));
        weightCache[(dy + radius) * (radius * 2 + 1) + (dx + radius)] = w;
    }
}

export function updateHeatmap(markers) {
    const gridCols = 80;
    const gridRows = 80;
    const smoothSigma = 4.0; // slightly wider spread looks more natural

    const xMin = -8.75, xMax = 16.5;
    const zMin = -9, zMax = 9;

    const coolingFactor = 0.98; 
    for (let i = 0; i < density.length; i++) {
        density[i] *= coolingFactor; 
    }

    // Step 1: Accumulate raw counts
    // const density = new Float32Array(gridCols * gridRows);
    markers.forEach(marker => {
        // const gx = Math.floor(((marker.position.x - xMin) / (xMax - xMin)) * gridCols);
        // const gy = Math.floor(((marker.position.z - zMin) / (zMax - zMin)) * gridRows);
        const gx = Math.floor(((marker.x - xMin) / (xMax - xMin)) * gridCols);
        const gy = Math.floor(((marker.z - zMin) / (zMax - zMin)) * gridRows);
        if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
            density[gy * gridCols + gx] += 1;
        }
    });

    // Step 2: Gaussian smoothing — weighted SUM (not average)
    const smoothed = new Float32Array(gridCols * gridRows);

    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridCols; x++) {
            let sum = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                        // Grab the pre-calculated weight from the cache!
                        const w = weightCache[(dy + radius) * (radius * 2 + 1) + (dx + radius)];
                        sum += density[ny * gridCols + nx] * w;
                    }
                }
            }
            smoothed[y * gridCols + x] = sum;
        }
    }

    
    // Red appears when smoothed density >= this many people per grid cell
    // const densityCap = 3; // tune this to your scenario
    const densityCap = 120; // tune this to your scenario
    const normalized = smoothed.map(d => Math.min(d / densityCap, 1.0));

    // Step 4: Render with SMOOTH color interpolation (no hard bands)
    const imageData = heatmapCtx.createImageData(heatmapWidth, heatmapHeight);
    const data = imageData.data;

    // Standard crowd heatmap color stops: transparent → blue → cyan → green → yellow → red
    const colorStops = [
        { t: 0.00, r: 0,   g: 0,   b: 150, a: 80  }, 
        // ---------------------------------
        { t: 0.15, r: 0,   g: 0,   b: 255, a: 120 }, // Soft blue
        { t: 0.35, r: 0,   g: 255, b: 255, a: 160 }, // Cyan
        { t: 0.55, r: 0,   g: 255, b: 0,   a: 200 }, // Green
        { t: 0.80, r: 255, g: 255, b: 0,   a: 220 }, // Yellow
        { t: 1.00, r: 255, g: 0,   b: 0,   a: 245 }, // Red
    ];

    function sampleColor(t) {
        // Find bracketing stops and lerp between them
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

    for (let py = 0; py < heatmapHeight; py++) {
        for (let px = 0; px < heatmapWidth; px++) {
            // Map the 512px canvas back to your 80x80 grid
            const gx = (px / heatmapWidth) * gridCols;
            const gy = (py / heatmapHeight) * gridRows;

            const x0 = Math.floor(gx), x1 = Math.min(x0 + 1, gridCols - 1);
            const y0 = Math.floor(gy), y1 = Math.min(y0 + 1, gridRows - 1);
            const fx = gx - x0, fy = gy - y0;

            const d00 = normalized[y0 * gridCols + x0];
            const d10 = normalized[y0 * gridCols + x1];
            const d01 = normalized[y1 * gridCols + x0];
            const d11 = normalized[y1 * gridCols + x1];
            const densityValue = (d00*(1-fx) + d10*fx)*(1-fy) + (d01*(1-fx) + d11*fx)*fy;

            const { r, g, b, a } = sampleColor(densityValue);
            
            // Map the pixel to the massive 1D imageData array
            const idx = (py * heatmapWidth + px) * 4;
            data[idx]   = r;
            data[idx+1] = g;
            data[idx+2] = b;
            data[idx+3] = a;
        }
    }

    heatmapCtx.putImageData(imageData, 0, 0);
    heatmapTexture.needsUpdate = true;
}

export async function loadSimulationData(onLoadComplete) {
    globalTrackFrames = [];
    globalTrackData.clear();
    trackMarkers.clear();
    
    try {
        const tResp = await fetch(tracker); 
        if (!tResp.ok) throw new Error(`Track CSV not found`);

        const tText = await tResp.text();
        const tLines = tText.split('\n').filter(l => l.trim());

        if (tLines.length > 1) {
            const headers = tLines[0].split(',').map(h => h.trim().toLowerCase());
            const frameIdx = headers.indexOf('frame');
            const idIdx = headers.findIndex(h => h.includes('id') || h.includes('track'));
            const xIdx = headers.findIndex(h => h.includes('three_x') || h === 'x');
            const zIdx = headers.findIndex(h => h.includes('three_z') || h === 'z');
            //new
            const camIdx = headers.findIndex(h => h.includes('camera'));
            const countIdx = headers.findIndex((h) => h.includes("count"));
            /**********/

            if (frameIdx > -1 && xIdx > -1 && zIdx > -1) {
                tLines.slice(1).forEach(line => {
                    const cols = line.split(',');
                    const frame = parseInt(cols[frameIdx]);
                    //new
                    const id = `${cols[idIdx]}_${cols[camIdx]}`;
                    //comment
                    //const id = cols[idIdx];
                    const x = parseFloat(cols[xIdx]);
                    const z = parseFloat(cols[zIdx]);
                    
                    if (isNaN(frame) || isNaN(x) || isNaN(z)) return;

                    if (!globalTrackData.has(frame)) globalTrackData.set(frame, []);
                    globalTrackData.get(frame).push({ id, x, z });

                    if (!trackMarkers.has(id) && !playback.showHeatmap) {
                        let hash = 0;
                        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
                        const color = new THREE.Color(`hsl(${Math.abs(hash) % 360}, 70%, 50%)`);
                        const marker = createMarker(0, 0, color.getHex(), 0.2, id);
                        marker.visible = false;
                        trackMarkers.set(id, marker);
                    }
                });
                globalTrackFrames = Array.from(globalTrackData.keys()).sort((a, b) => a - b);
            }
        }
    } catch (e) { 
        console.error("Error loading tracks:", e); 
    }
    
    if (onLoadComplete) onLoadComplete();
}

// const dummy = createMarker(-5, -4.3, "red", 0.1);
// const cam1 = createMarker(-8.65, 9, "white", 0.1, "Camera 1");
// const cam2 = createMarker(-8.65, -1.5, "white", 0.1, "Camera 2");
// const cam3 = createMarker(8.5, -5, "white", 0.1, "Camera 3");