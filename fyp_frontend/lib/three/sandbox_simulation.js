import * as THREE from "three";
import { createMarker } from "./world.js";
import { FPS, LOOP_DURATION, iot, getRoom, roomInfo, getDate, getTime, sendFacilitiesAlert } from "./variables.js";

export class SandboxSimulation {
    constructor(engine, onDataUpdate = null) {
        this.engine = engine; 
        this.onDataUpdate = onDataUpdate; 

        this.spawnedPeople = [];

        // Track the room we are currently looking at
        this.currentRoom = null;
        this.lastRoom = null;

        this.roomIoT = {
            "C-007": { occupancy: 0, temp: 25.0, ac: false, lights: false },
            "C-006": { occupancy: 0, temp: 25.0, ac: false, lights: false }
        }

        this.trackers = { acWasted: {}, lightsWasted: {}, tempWarm: {}, tempCold: {} };
        this.roomLastAlertTime = {}; 
        this.lastSecond = -1;          
        this.lastIoTString = ""; 
        
        this.raycaster = new THREE.Raycaster();
        this.screenCenter = new THREE.Vector2(0, 0); 
        this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.intersectionPoint = new THREE.Vector3();
    }

    // --- NEW TARGETED ROOM CONTROLS ---
    toggleOccu() {
        if (this.currentRoom) {
            this.roomIoT[this.currentRoom].occupancy = this.roomIoT[this.currentRoom].occupancy === 0 ? 20 : 0;
        }
    }

    toggleAC() {
        if (this.currentRoom) {
            this.roomIoT[this.currentRoom].ac = !this.roomIoT[this.currentRoom].ac;
            console.log(`AC in ${this.currentRoom} is now ${this.roomIoT[this.currentRoom].ac ? "ON" : "OFF"}`);
        }
    }

    toggleLights() {
        if (this.currentRoom) {
            this.roomIoT[this.currentRoom].lights = !this.roomIoT[this.currentRoom].lights;
        }
    }

    changeTemp(value) {
        if (this.currentRoom) {
            if (!this.roomIoT[this.currentRoom]) {
                this.roomIoT[this.currentRoom] = { occupancy: 0, temp: 25.0, ac: false, lights: false };
            }
            // Change temp for THIS room only!
            this.roomIoT[this.currentRoom].temp = parseFloat(value);
        }
    }
    // ----------------------------------

    spawnPerson() {
        this.raycaster.setFromCamera(this.screenCenter, this.engine.camera);
        const hit = this.raycaster.ray.intersectPlane(this.floorPlane, this.intersectionPoint);
        
        if (hit) {
            const id = "SandboxNPC_" + Date.now();
            
            // Note: Make sure X is first, then Z!
            const marker = createMarker(this.intersectionPoint.x, this.intersectionPoint.z, 0x00ff88, 0.2, id);
            
            marker.visible = true;
            
            // 🌟 THE FIX: Brand the exact coordinates into the object's brain
            marker.userData.gridX = this.intersectionPoint.x;
            marker.userData.gridZ = this.intersectionPoint.z;
            
            this.spawnedPeople.push(marker); 
            
            const targetRoom = getRoom(this.intersectionPoint.x, this.intersectionPoint.z);
            if (targetRoom) {
                if (!this.roomIoT[targetRoom]) {
                    this.roomIoT[targetRoom] = { occupancy: 0, temp: 25.0, ac: false, lights: false };
                }
                this.roomIoT[targetRoom].occupancy += 1;
            }
        }
    }

    removePerson() {
        this.raycaster.setFromCamera(this.screenCenter, this.engine.camera);
        const hits = this.raycaster.intersectObjects(this.spawnedPeople, true);

        let personToRemove = null;

        if (hits.length > 0) {
            let hitMesh = hits[0].object;
            if (this.spawnedPeople.includes(hitMesh)) {
                personToRemove = hitMesh;
            } else {
                hitMesh.traverseAncestors((ancestor) => {
                    if (this.spawnedPeople.includes(ancestor)) personToRemove = ancestor;
                });
            }
        } else {
            personToRemove = this.spawnedPeople.pop();
        }

        if (personToRemove) {
            const posX = personToRemove.position.x;
            const posZ = personToRemove.position.z;
            const targetRoom = getRoom(posX, posZ);
            
            if (targetRoom && this.roomIoT[targetRoom] && this.roomIoT[targetRoom].occupancy > 0) {
                this.roomIoT[targetRoom].occupancy -= 1;
            }

            this.engine.scene.remove(personToRemove);
            const index = this.spawnedPeople.indexOf(personToRemove);
            if (index > -1) {
                this.spawnedPeople.splice(index, 1);
            }
        }
    }

    removeAll() {
        // 1. Physically remove all the 3D models from the scene first!
        for (const person of this.spawnedPeople) {
            this.engine.scene.remove(person);
        }

        // 2. Now it is safe to empty our tracking array
        this.spawnedPeople = [];

        // 3. Reset the IoT data (with the correct capital 'T'!)
        for (const room in this.roomIoT) {
            this.roomIoT[room].occupancy = 0;
        }
        
        console.log("Sandbox cleared!");
    }

    removeAllRoom() {
        this.raycaster.setFromCamera(this.screenCenter, this.engine.camera);
        const hit = this.raycaster.ray.intersectPlane(this.floorPlane, this.intersectionPoint);

        if (hit) {
            const targetRoom = getRoom(this.intersectionPoint.x, this.intersectionPoint.z);

            if (targetRoom) {
                for (let i = this.spawnedPeople.length - 1; i >= 0; i--) {
                    const person = this.spawnedPeople[i];
                    
                    // 🌟 THE FIX: Read from our custom stamped data!
                    const trueX = person.userData.gridX;
                    const trueZ = person.userData.gridZ;
                    
                    if (getRoom(trueX, trueZ) === targetRoom) {
                        this.engine.scene.remove(person);
                        this.spawnedPeople.splice(i, 1);
                    }
                }

                if (this.roomIoT[targetRoom]) {
                    this.roomIoT[targetRoom].occupancy = 0;
                }
                
                console.log(`Room ${targetRoom} is now completely empty!`);
            }
        }
    }

    renderFrame() {
        const uiElements = {
            uiOccupancy: document.getElementById('ui-iot-occupancy'),
            uiOccuHeader: document.getElementById('ui-iot-occu-header'),
            uiTemp: document.getElementById('ui-iot-temp'),
            uiAC: document.getElementById('ui-iot-ac'),
            uiLights: document.getElementById('ui-iot-lights'),
            uiDate: document.getElementById('ui-iot-date'),
            uiTime: document.getElementById('ui-iot-time'),
            uiTime2: document.getElementById('time'),
            uiName: document.getElementById('ui-room-name'),
            uiID: document.getElementById('ui-room-id'),
            uiFloor: document.getElementById('ui-room-floor')
        };

        // Sandbox Controls Elements
        const btnOccu = document.getElementById('sandbox-btn-occu');
        const btnAC = document.getElementById('sandbox-btn-ac');
        const btnLights = document.getElementById('sandbox-btn-lights');
        const scrubTemp = document.getElementById('temp-scrubber');
        const textTemp = document.getElementById('temp-text');

        const deptEl = document.getElementById('department');
        const department = deptEl ? deptEl.textContent.trim() : "Security";

        this.raycaster.setFromCamera(this.screenCenter, this.engine.camera);
        const hit = this.raycaster.ray.intersectPlane(this.floorPlane, this.intersectionPoint);

        const room = hit ? getRoom(this.intersectionPoint.x, this.intersectionPoint.z) : null;
        const roomInf = (room && roomInfo && roomInfo[room]) ? roomInfo[room] : null;
        const row = (room && this.roomIoT && this.roomIoT[room]) ? this.roomIoT[room] : null;

        // Save the room globally so the buttons know what room to affect!
        this.currentRoom = room;

        // --- SYNCHRONIZE SANDBOX CONTROLS TO CURRENT ROOM ---
        if (this.currentRoom !== this.lastRoom) {
            this.lastRoom = this.currentRoom;
            
            // We just looked at a NEW room. Update the Temp slider instantly!
            if (this.currentRoom && row) {
                if (scrubTemp) scrubTemp.value = row.temp;
                if (textTemp) textTemp.value = row.temp;
            } else {
                if (scrubTemp) scrubTemp.value = 25;
                if (textTemp) textTemp.value = 25;
            }
        }

        // Color the buttons dynamically every frame based on the room's data
        if (roomInf && row && department !== "Security") {
            if (btnAC) btnAC.className = row.ac ? "btn btn-primary m-0! flex-1!" : "btn btn-red m-0! flex-1!";
            if (btnLights) btnLights.className = row.lights ? "btn btn-primary m-0! flex-1!" : "btn btn-red m-0! flex-1!";
            if (btnOccu) btnOccu.className = row.occupancy === 0 ? "btn btn-primary m-0! flex-1!" : "btn btn-red m-0! flex-1!";
        } else {
            // Grey out the buttons if looking at a hallway!
            if (btnAC) btnAC.className = "btn bg-gray-700 m-0! flex-1! pointer-events-none";
            if (btnLights) btnLights.className = "btn bg-gray-700 m-0! flex-1! pointer-events-none";
            if (btnOccu) btnOccu.className = "btn bg-gray-700 m-0! flex-1! pointer-events-none";
        }
        // ----------------------------------------------------

        // --- Standard UI Panel Updates ---
        if (roomInf) {
            if (uiElements.uiName) uiElements.uiName.innerText = roomInf.name;
            if (uiElements.uiID) uiElements.uiID.innerText = roomInf.room_id;
            if (uiElements.uiFloor) uiElements.uiFloor.innerText = roomInf.room_floor;

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
                            occ_status: row.occupancy > 0 ? true : false,
                            temperature: row.temp,
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
                            temperature: row.temp,
                            ac: row.ac,
                            lights: row.lights
                        }
                    });
                    window.dispatchEvent(event);
                }
            }

        } else {
            if (uiElements.uiName) uiElements.uiName.innerText = "--";
            if (uiElements.uiID) uiElements.uiID.innerText = "--";
            if (uiElements.uiFloor) uiElements.uiFloor.innerText = "--";
            
            if (uiElements.uiAC) { uiElements.uiAC.innerText = "--"; uiElements.uiAC.style.backgroundColor = "#ffffff"; }
            if (uiElements.uiLights) { uiElements.uiLights.innerText = "--"; uiElements.uiLights.style.backgroundColor = "#ffffff"; }
            if (uiElements.uiOccupancy) { uiElements.uiOccupancy.innerText = "--"; uiElements.uiOccupancy.style.backgroundColor = "#ffffff"; }
            if (uiElements.uiTemp) { uiElements.uiTemp.innerText = "--"; uiElements.uiTemp.style.backgroundColor = "#ffffff"; }
        }

        if (uiElements.uiDate) uiElements.uiDate.innerText = getDate();
        if (uiElements.uiTime) uiElements.uiTime.innerText = getTime();
        if (uiElements.uiTime2) uiElements.uiTime2.innerText = getTime();

        // ---- Facilities email notification -----
        const seconds = Math.floor(Date.now() / 1000);

        if (seconds !== this.lastSecond) {
            this.lastSecond = seconds;

            Object.keys(this.roomIoT).forEach(roomId => {
                const row = this.roomIoT[roomId];
                const threshold = 20;
                
                if (row.occupancy === 0 && row.ac) this.trackers.acWasted[roomId] = (this.trackers.acWasted[roomId] || 0) + 1;
                else this.trackers.acWasted[roomId] = 0;

                if (row.occupancy === 0 && row.lights) this.trackers.lightsWasted[roomId] = (this.trackers.lightsWasted[roomId] || 0) + 1;
                else this.trackers.lightsWasted[roomId] = 0;

                if (row.temp > 28) this.trackers.tempWarm[roomId] = (this.trackers.tempWarm[roomId] || 0) + 1;
                else this.trackers.tempWarm[roomId] = 0;

                if (row.temp < 22) this.trackers.tempCold[roomId] = (this.trackers.tempCold[roomId] || 0) + 1;
                else this.trackers.tempCold[roomId] = 0;

                // ✨ NEW: Attach UI alerts directly to the data payload so React can see them!
                row.uiAlerts = { ac: null, lights: null, temp: null, occu: null };
                
                const formatTime = (totalSec) => {
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
                };

                // If a tracker crossed the threshold, attach the formatted time string!
                if (this.trackers.acWasted[roomId] >= threshold) row.uiAlerts.ac = formatTime(this.trackers.acWasted[roomId]);
                if (this.trackers.lightsWasted[roomId] >= threshold) row.uiAlerts.lights = formatTime(this.trackers.lightsWasted[roomId]);
                
                if (this.trackers.tempWarm[roomId] >= threshold) row.uiAlerts.temp = `Too Warm (${row.temp.toFixed(1)}°C) for ${formatTime(this.trackers.tempWarm[roomId])}`;
                else if (this.trackers.tempCold[roomId] >= threshold) row.uiAlerts.temp = `Too Cold (${row.temp.toFixed(1)}°C) for ${formatTime(this.trackers.tempCold[roomId])}`;
                
                // Instant Occupancy Alert (no threshold needed)
                if (roomInf && row.occupancy > roomInf.max_occupancy) row.uiAlerts.occu = `Over capacity: ${row.occupancy}/${roomInf.max_occupancy}`;
                
                const lastAlert = this.roomLastAlertTime[roomId] || 0;
                if (seconds - lastAlert >= threshold) {
                    const activeAlerts = [];
                    const descriptions = [];

                    const formatTime = (totalSec) => {
                        const m = Math.floor(totalSec / 60);
                        const s = totalSec % 60;
                        return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
                    };

                    if (this.trackers.acWasted[roomId] >= threshold) {
                        activeAlerts.push("AC Being Wasted");
                        descriptions.push(`AC being wasted with zero occupancy for ${formatTime(this.trackers.acWasted[roomId])}.`);
                    }
                    if (this.trackers.lightsWasted[roomId] >= threshold) {
                        activeAlerts.push("Lights Being Wasted");
                        descriptions.push(`Lights being wasted with zero occupancy for ${formatTime(this.trackers.lightsWasted[roomId])}.`);
                    }
                    if (this.trackers.tempWarm[roomId] >= threshold) {
                        activeAlerts.push("Temperature Too Warm");
                        descriptions.push(`Temperature over 28°C (${row.temp.toFixed(1)}°C) for ${formatTime(this.trackers.tempWarm[roomId])}.`);
                    }
                    if (this.trackers.tempCold[roomId] >= threshold) {
                        activeAlerts.push("Temperature Too Cold");
                        descriptions.push(`Temperature under 20°C (${row.temp.toFixed(1)}°C) for ${formatTime(this.trackers.tempCold[roomId])}.`);
                    }

                    if (activeAlerts.length > 0) {
                        const combinedTitle = activeAlerts.join(" & ");
                        const combinedDesc = descriptions.join("\n \n");

                        sendFacilitiesAlert(roomId, combinedTitle, getTime(), combinedDesc);

                        this.roomLastAlertTime[roomId] = seconds;
                    }
                }
            });
        }

        const currentIoTString = JSON.stringify(this.roomIoT);
        
        if (currentIoTString !== this.lastIoTString) {
            if (this.onDataUpdate) {
                this.onDataUpdate(JSON.parse(currentIoTString));
            }
            this.lastIoTString = currentIoTString;
        }
    }
}