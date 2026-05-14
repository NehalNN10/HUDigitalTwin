"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Users, Thermometer, Wind, Lightbulb, LightbulbOff, Check, X, User, UserMinus, AirVent } from "lucide-react";
import Navbar from "../../components/Navbar";
import StaffList from "../../components/StaffList";
import FormRow from "../../components/FormRow";
import StatRow from "@/components/StatRow";
import IoTAlert from "@/components/IoTAlert";
import { LOOP_DURATION } from "@/lib/three/variables";


export default function Dashboard() {
  // --- States ---
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [currentRole, setCurrentRole] = useState("Facilities Officer");
  const [name, setName] = useState("");
  const [isEmergencyModalOpen, setEmergencyModalOpen] = useState(false);

  const [facilityStaff, setFacilityStaff] = useState<any[]>([]);

  const [securityStaffList, setSecurityStaffList] = useState<any[]>([]);
  const [securityStaffRooms, setSecurityStaffRooms] = useState<any>({});
  
  const [emergencyForm, setEmergencyForm] = useState({ roomNumber: "", alertType: "AC", timeSince: "", description: "" });
  const [currentRoomStats, setCurrentRoomStats] = useState<any>({});
  const [currentTimeSpan, setCurrentTimeSpan] = useState("Loading Time...");

  const trackersRef = useRef<any>({ acWasted: {}, lightsWasted: {}, tempWarm: {}, tempCold: {} });
  const lastAlertRef = useRef<any>({});

  // --- Initial Data Fetch ---
  useEffect(() => {
    fetch("/api/facility_home_data")
      .then((res) => res.json())
      .then((data) => {
        const sortedRooms = (data.rooms || []).sort((a: any, b: any) => 
          a.room_id.localeCompare(b.room_id, undefined)
        );
        setRoomsData(sortedRooms);
        
        setFacilityStaff(data.staff_list || []);
        if (data.current_role) setCurrentRole(data.current_role);
        if (data.name) setName(data.name);
      })
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  useEffect(() => {
      fetch("/api/security_home_data")
        .then((res) => res.json())
        .then((data) => {
          setSecurityStaffList(data.staff_list || []);
          setSecurityStaffRooms(data.staff_rooms || {});
          setRoomsData(data.rooms || []);
          if (data.current_role) setCurrentRole(data.current_role);
          if (data.name) setName(data.name);
        })
        .catch(err => console.error("Error fetching data:", err));
    }, []);

  useEffect(() => {
    if (roomsData.length === 0) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const currentSecond = Math.floor(now.getTime() / 1000);
      const currentFrame = currentSecond % LOOP_DURATION;
      
      const cycleStartTime = new Date(now.getTime() - (currentFrame * 1000));
      setCurrentTimeSpan(new Date(cycleStartTime.getTime() + (currentFrame * 1000)).toLocaleTimeString());

      const newStats: any = {};
      const trackers = trackersRef.current;
      const lastAlerts = lastAlertRef.current;

      roomsData.forEach(room => {
        let row = null;
        if (room.timeseries?.length > 0) {
          row = room.timeseries.find((e: any) => e.time === currentFrame) 
            || [...room.timeseries].reverse().find((e: any) => e.time <= currentFrame) 
            || room.timeseries[0];
        }

        if (!row || row.occupancy === "--") {
          newStats[room.room_id] = { occupancy: "--", temperature: "--", ac: null, lights: null, uiAlerts: null };
          return;
        }

        const roomId = room.room_id;
        const threshold = 120;

        if (row.occupancy === 0 && row.ac) trackers.acWasted[roomId] = (trackers.acWasted[roomId] || 0) + 1;
        else trackers.acWasted[roomId] = 0;

        if (row.occupancy === 0 && row.lights) trackers.lightsWasted[roomId] = (trackers.lightsWasted[roomId] || 0) + 1;
        else trackers.lightsWasted[roomId] = 0;

        if (row.temperature > 28) trackers.tempWarm[roomId] = (trackers.tempWarm[roomId] || 0) + 1;
        else trackers.tempWarm[roomId] = 0;

        if (row.temperature < 22) trackers.tempCold[roomId] = (trackers.tempCold[roomId] || 0) + 1;
        else trackers.tempCold[roomId] = 0;

        const uiAlerts: any = { ac: null, lights: null, temp: null, occu: null };

        const formatTime = (totalSec: number) => {
            const m = Math.floor(totalSec / 60);
            const s = totalSec % 60;
            return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
        };

        if (trackers.acWasted[roomId] >= threshold) uiAlerts.ac = formatTime(trackers.acWasted[roomId]);
        if (trackers.lightsWasted[roomId] >= threshold) uiAlerts.lights = formatTime(trackers.lightsWasted[roomId]);
        if (trackers.tempWarm[roomId] >= threshold) uiAlerts.temp = `Too Warm (${Math.round(row.temperature)}°C) for ${formatTime(trackers.tempWarm[roomId])}`;
        if (trackers.tempCold[roomId] >= threshold) uiAlerts.temp = `Too Cold (${Math.round(row.temperature)}°C) for ${formatTime(trackers.tempCold[roomId])}`;

        if (room.max_occupancy && row.occupancy > room.max_occupancy) {
            uiAlerts.occu = `Over capacity: ${row.occupancy}/${room.max_occupancy}`;
        }

        const lastAlert = lastAlerts[roomId] || 0;
        if (currentSecond - lastAlert >= threshold) {
            const activeAlerts = [];
            const descriptions = [];

            if (trackers.acWasted[roomId] >= threshold) {
                activeAlerts.push("AC Wasted");
                descriptions.push(`AC being wasted with zero occupancy for ${formatTime(trackers.acWasted[roomId])}.`);
            }
            if (trackers.lightsWasted[roomId] >= threshold) {
                activeAlerts.push("Lights Wasted");
                descriptions.push(`Lights being wasted with zero occupancy for ${formatTime(trackers.lightsWasted[roomId])}.`);
            }
            if (trackers.tempWarm[roomId] >= threshold) {
                activeAlerts.push("Temp Too Warm");
                descriptions.push(`Temperature over 28°C (${row.temperature}°C) for ${formatTime(trackers.tempWarm[roomId])}.`);
            }
            if (trackers.tempCold[roomId] >= threshold) {
                activeAlerts.push("Temp Too Cold");
                descriptions.push(`Temperature under 20°C (${row.temperature}°C) for ${formatTime(trackers.tempCold[roomId])}.`);
            }

            if (activeAlerts.length > 0) {
                const combinedTitle = activeAlerts.join(" & ");
                const combinedDesc = descriptions.join("\n \n");

                fetch('/api/send_facilities_alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        room_number: roomId,
                        alert_type: combinedTitle,
                        time_since: now.toLocaleTimeString(),
                        description: combinedDesc
                    })
                }).catch(err => console.error("Failed to send auto-alert:", err));

                lastAlerts[roomId] = currentSecond;
            }
        }

        newStats[roomId] = { ...row, uiAlerts };
      });

      setCurrentRoomStats(newStats);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [roomsData]);

  // --- Handlers ---
  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/send_facilities_alert', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        room_number: emergencyForm.roomNumber, 
        alert_type: emergencyForm.alertType,
        time_since: emergencyForm.timeSince,
        description: emergencyForm.description 
      })
    });

    if (res.ok) {
      alert('Facilities alert sent!');
      setEmergencyModalOpen(false);
      setEmergencyForm({ roomNumber: "", alertType: "AC", timeSince: "", description: "" });
    } else {
      alert('Error sending alert.');
    }
  };

  const handleSendAllAlerts = async () => {
    // Failsafe to prevent accidental clicks
    if (!window.confirm("🚨 Are you sure you want to trigger a campus-wide emergency alert for ALL rooms")) return;

    try {
      // Create an array of fetch promises for every room
      const alertPromises = roomsData.map(room => {
        // Grab the live occupancy at this exact second
        const liveStats = currentRoomStats[room.room_id] || {};
        const currentOccupancy = liveStats.occupancy !== "--" ? liveStats.occupancy : 0;
        if (currentOccupancy === 0) {
          return Promise.resolve(); // Skip sending alert for empty rooms
        }
        return fetch('/api/send_emergency_alert', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room_number: room.room_id, 
            occupancy_count: currentOccupancy
          })
        });
      });

      // Fire them all off at the same time
      await Promise.all(alertPromises);
      alert('✅ Mass emergency alerts successfully sent to all rooms!');

    } catch (error) {
      console.error("Error sending mass alerts:", error);
      alert('❌ Error sending alerts. Check the console.'); 
    }
  };

  // Helper function for your temperature color logic
  const getTempColor = (t: any) => {
    if (t === "--" || t === undefined) return "#ffffff";
    if (t <= 20) return "#0088ff";
    if (t <= 22) return "#00ffff";
    if (t <= 28) return "#00ff88";
    if (t <= 30) return "#ff8800";
    return "#ff0000";
  };

  const acAlerts = roomsData.filter(room => currentRoomStats[room.room_id]?.uiAlerts?.ac);
  const lightsAlerts = roomsData.filter(room => currentRoomStats[room.room_id]?.uiAlerts?.lights);
  const tempAlerts = roomsData.filter(room => currentRoomStats[room.room_id]?.uiAlerts?.temp);
  const occuAlerts = roomsData.filter(room => currentRoomStats[room.room_id]?.uiAlerts?.occu);

  // --- UI Render ---
  return (
    <>
      <Navbar department="Admin" />

      <div className="side-nav row mt-0! text-black">
        <span>Admin Dashboard</span>
      </div>

      <div className="main-home scroll">
        <div className="row px-5">
          <div className="">
            <h2 className="font-bold">Welcome, {name}!</h2>
            <p className="text-[var(--sub-text-color)]">Security data and metrics will be displayed here.</p>
          </div>
          <div className="flex flex-row gap-2">
            <button className="btn btn-red btn-auto m-0! py-1!" onClick={handleSendAllAlerts}>
              <h2 className="font-bold text-white text-xl">Create Emergency</h2>
            </button>
          </div>
        </div>
        
        {/* Top Alerts Row */}
        <div className="row boxes">
          <div className="tracker-ui scroll outer box basis-70">
            <h3 className="font-bold">AC Alerts</h3>
            <div className="mt-4">
              {acAlerts.length > 0 ? (
                acAlerts.map(room => (
                  <IoTAlert 
                    key={room.room_id} // 🚨 ADD THIS
                    roomData={room} 
                    time={currentRoomStats[room.room_id].uiAlerts.ac} 
                  />
                ))
              ) : (
                <div className="p-4 text-center">No active alerts.</div>
              )}
            </div>
          </div>

          {/* LIGHTS ALERTS */}
          <div className="tracker-ui scroll outer box basis-70">
            <h3 className="font-bold">Lights Alerts</h3>
            <div className="mt-4">
              {lightsAlerts.length > 0 ? (
                lightsAlerts.map(room => (
                  <IoTAlert 
                    key={room.room_id} // 🚨 ADD THIS
                    roomData={room}
                    time={currentRoomStats[room.room_id].uiAlerts.lights} 
                  />
                ))
              ) : (
                <div className="p-4 text-center">No active alerts.</div>
              )}
            </div>
          </div>

          {/* TEMPERATURE ALERTS */}
          <div className="tracker-ui scroll outer box basis-70">
            <h3 className="font-bold">Temperature Alerts</h3>
            <div className="mt-4">
              {tempAlerts.length > 0 ? (
                tempAlerts.map(room => (
                  <IoTAlert 
                    key={room.room_id} // 🚨 ADD THIS
                    roomData={room}
                    time={currentRoomStats[room.room_id].uiAlerts.temp}
                  />
                ))
              ) : (
                <div className="p-4 text-center">No active alerts.</div>
              )}
            </div>
          </div>

          {/* OCCUPANCY ALERTS */}
          <div className="tracker-ui scroll outer box basis-70">
            <h3 className="font-bold">Occupancy Alerts</h3>
            <div className="mt-4">
              {occuAlerts.length > 0 ? (
                occuAlerts.map(room => (
                  <IoTAlert 
                    key={room.room_id} // 🚨 ADD THIS
                    roomData={room}
                    time={currentRoomStats[room.room_id].uiAlerts.occu}
                  />
                ))
              ) : (
                <div className="p-4 text-center">No active alerts.</div>
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Data Table */}
        <div className="row boxes">
          <div className="tracker-ui outer box basis-220 overflow-hidden flex flex-col mx-0!">
            <h3 className="row mt-0! font-bold shrink-0">
              <span className="flex-2">Rooms Real-Time Data</span>
              <StatRow icon={Clock} label={currentTimeSpan} size="32"/>
            </h3>
            <div className="w-full overflow-x-auto mt-4 pb-2">
              <table className="table w-full border-separate border-spacing-0 whitespace-nowrap">
                <thead className="bg-[var(--primary-color)] text-[var(--primary-text-color)]">
                  <tr>
                    <th className="w-[1%] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      ID
                    </th>
                    
                    <th className="hidden min-[43rem]:table-cell w-full text-left">
                      Room Name
                    </th>
                    
                    <th className="text-center!">
                      <span className="iot">Occupancy</span>
                      <Users size={24} className="th-small-iot" />
                    </th>
                    <th className="text-center!">
                      <span className="iot">Temperature</span>
                      <Thermometer size={24} className="th-small-iot" />
                    </th>
                    <th className="text-center!">
                      <span className="iot">AC</span>
                      <AirVent size={24} className="th-small-iot" />
                    </th>
                    <th className="text-center!">
                      <span className="iot">Lights</span>
                      <Lightbulb size={24} className="th-small-iot" />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-color)] bg-[var(--bg-color)]">
                  {[...roomsData]
                    .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true }))
                    .map(room => {
                    const stats = currentRoomStats[room.room_id] || { occupancy: "--", temperature: "--", ac: null, lights: null };
                    const hasData = stats.occupancy !== "--";

                    const count = stats.occupancy;
                    const bgColor = count > room.max_occupancy ? "#ff4444" : (count !== "--" && count !== 0) ? "#00ff88" : "#ffffff";
                    
                    const isAcOn = stats.ac;
                    const acColor = stats.ac !== null ? (isAcOn ? "#00ff88" : "#ff4444") : "#ffffff";
                    
                    const isLightsOn = stats.lights;
                    const lightsColor = stats.lights !== null ? (isLightsOn ? "#00ff88" : "#ff4444") : "#ffffff";

                    const tempText = hasData ? `${stats.temperature} °C` : "--";
                    const tempTextSmall = hasData ? `${Math.round(stats.temperature)}°` : "--";
                    const tempColor = getTempColor(stats.temperature);

                    return (
                      <tr key={room.id}>
                        {/* 5. Matches the w-[1%] from the header */}
                        <td className="w-[1%] sticky left-0 z-10 bg-[--bg-color] font-bold shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          {room.room_id}
                        </td>
                        <td className="hidden min-[43rem]:table-cell">{room.name}</td>
                        <td className="text-center!">
                          <span className="fill small-iot" style={{ backgroundColor: bgColor }}>
                            {count ?? "??"}
                          </span>
                        </td>
                        <td className="text-center!">
                          <span className="fill small-iot" style={{ backgroundColor: tempColor }}>
                            {hasData ? (
                              <>
                                <span className="small">{tempTextSmall}</span>
                                <span className="iot">{tempText}</span>
                              </>
                            ) : "--"}
                          </span>
                        </td>
                        <td className="text-center!">
                          <span className="fill small-iot" style={{ backgroundColor: acColor }}>
                            {stats.ac !== null ? (
                              <>
                                <span className="small">{isAcOn ? <Wind size={24} className="animate-pulse"/> : <X size={24}/>}</span>
                                <span className="iot">{isAcOn ? "• ON" : "- OFF"}</span>
                              </>
                            ) : "--"}
                          </span>
                        </td>
                        <td className="text-center!">
                          <span className="fill small-iot" style={{ backgroundColor: lightsColor }}>
                            {stats.lights !== null ? (
                              <>
                                <span className="small">{isLightsOn ? <Lightbulb size={24}/> : <LightbulbOff size={24}/>}</span>
                                <span className="iot">{isLightsOn ? "• ON" : "- OFF"}</span>
                              </>
                            ) : "--"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="box basis-200 overflow-hidden flex flex-row px-0! gap-5!">
            <StaffList 
              staffList={securityStaffList}
              staffRooms={securityStaffRooms}
              department="Security"
            />
            <StaffList 
              staffList={facilityStaff}
              department="Facilities"
            />
          </div>
        </div>
      </div>

      {/* EMERGENCY MODAL */}
      {isEmergencyModalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setEmergencyModalOpen(false)}>
          <div className="tracker-ui modal">
            <div className="modal-header p-4 text-3xl text-[#f33]">🚨 FACILITIES ALERT 🚨</div>
            <p className="text-xl mb-4">Please provide details about the situation:</p>
            
            <form onSubmit={handleEmergencySubmit}>
              
              <FormRow label="Room Number" value={emergencyForm.roomNumber} onChange={e => setEmergencyForm({...emergencyForm, roomNumber: e.target.value})} />
              
              <FormRow label="Alert Type">
                <select className="formInput" required value={emergencyForm.alertType} onChange={e => setEmergencyForm({...emergencyForm, alertType: e.target.value})}>
                  <option value="AC">AC</option><option value="Lights">Lights</option><option value="Temperature">Temperature</option>
                </select>
              </FormRow>
              
              <FormRow label="Time Since (mins)">
                <input type="number" min="0" className="formInput" required value={emergencyForm.timeSince} onChange={e => setEmergencyForm({...emergencyForm, timeSince: e.target.value})} />
              </FormRow>
              
              <FormRow label="Description" value={emergencyForm.description} onChange={e => setEmergencyForm({...emergencyForm, description: e.target.value})} />
              
              <div className="row mt-4! justify-center!">
                <button type="button" className="btn btn-primary btn-auto" onClick={() => setEmergencyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-red btn-auto">Send Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}