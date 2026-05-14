export const FPS = 25; 
export const LOOP_DURATION = 1200; 

// Start them as empty objects
export const roomInfo = {};
export const iot = {};
export const liveRoomInfo = {};

// We will call this function right before booting the 3D world!
export async function initRoomInfo() {
    roomInfo["C-007"] = await getRoomInfo("C-007");
    roomInfo["C-006"] = await getRoomInfo("C-006");
}

export async function initRoomData() {
    iot["C-007"] = await getRoomData("C-007");
    iot["C-006"] = await getRoomData("C-006");
}

export async function initVariables() {
    await initRoomInfo();
    await initRoomData();
}

export async function initLiveVariables() {
    liveRoomInfo["C-067"] = await getRoomInfo("C-067");
}

export async function getRoomData(roomId) {
    try {
        const response = await fetch(`/api/room_data?room_id=${roomId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        const rows = data.room_data;

        const secondsArray = rows.map((row) => ({
            occupancy: row.occupancy,
            temperature: row.temperature, 
            ac: row.ac,
            lights: row.lights
        }));

        return secondsArray;
    } catch (error) {
        console.error("Failed to fetch room data:", error.message);
        return []; 
    }
}

export async function getRoomInfo(roomId) {
    try {
        const response = await fetch(`/api/room_info?room_id=${roomId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch room info:", error.message);
        return null;
    }
}

export function getLiveRoom(x, z) {
    if (z >= -4.25/2 && z <= 4.25/2 && x >= 0 && x <= 7.5) {
        return "C-067";
    } 
    return null;
}

export function getRoom(x, z) {
    if (z >= -9.1 && z <= 9.1 && x >= -9.35 && x <= 9.35) {
        return "C-007";
    } else if (z > 9.1 && z <= 16.95 && x >= -9.35 && x <= 9.35) {
        return "C-006";
    }
    return null;
}

export function getTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: true });
}

// Format Real-Time Date
export function getDate() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return now.toLocaleDateString('en-US', options);
}

export function sendFacilitiesAlert(roomId, alertType, timeStr, description) {
    console.warn(`[Sandbox Alert] ${roomId} firing: ${alertType} at ${timeStr}`);

    fetch('http://localhost:1767/api/send_facilities_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            room_number: roomId,
            alert_type: alertType,
            description: description
        })
    })
    .then(r => r.json())
    .then(data => console.log(`[${roomId}] ✅ Alert sent:`, data))
    .catch(err => console.error(`[${roomId}] ❌ Alert failed:`, err));
}