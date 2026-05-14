"use client";

import { useState, useEffect } from "react";
import { Clock, User, Users, AlertTriangle } from "lucide-react";
import StatRow from "@/components/StatRow";
import Navbar from "../../components/Navbar";
import StaffList from "../../components/StaffList";
import { LOOP_DURATION } from "@/lib/three/variables";
import IntButton from "@/components/IntButton";

export default function SecurityHome() {
  // --- States ---
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffRooms, setStaffRooms] = useState<any>({});
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [currentRole, setCurrentRole] = useState("Security Officer");
  const [name, setName] = useState("");
  
  const [currentRoomStats, setCurrentRoomStats] = useState<any>({});
  const [currentTimeSpan, setCurrentTimeSpan] = useState("...");

  // --- Initial Data Fetch ---
  useEffect(() => {
    fetch("/api/security_home_data", {
      method: "GET",
      headers: { "ngrok-skip-browser-warning": "true" }
    })
      .then((res) => res.json())
      .then((data) => {
        setStaffList(data.staff_list || []);
        setStaffRooms(data.staff_rooms || {});
        setRoomsData(data.rooms || []);
        if (data.current_role) setCurrentRole(data.current_role);
        if (data.name) setName(data.name);
      })
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  // --- Real-Time Simulation Loop ---
  useEffect(() => {
    if (roomsData.length === 0) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const currentFrame = Math.floor(now.getTime() / 1000) % LOOP_DURATION;
      
      const cycleStartTime = new Date(now.getTime() - (currentFrame * 1000));
      setCurrentTimeSpan(new Date(cycleStartTime.getTime() + (currentFrame * 1000)).toLocaleTimeString());

      const newStats: any = {};
      roomsData.forEach(room => {
        if (room.timeseries?.length > 0) {
          newStats[room.room_id] = room.timeseries.find((e: any) => e.time === currentFrame) 
            || [...room.timeseries].reverse().find((e: any) => e.time <= currentFrame) 
            || room.timeseries[0];
        } else {
          newStats[room.room_id] = { occupancy: "--", temperature: "--" };
        }
      });
      setCurrentRoomStats(newStats);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [roomsData]);

  const handleSendAllAlerts = async () => {
    // Failsafe to prevent accidental clicks
    if (!window.confirm("🚨 Are you sure you want to trigger a campus-wide emergency alert for ALL rooms")) return;

    try {
      // Create an array of fetch promises for every room
      const alertPromises = roomsData.map(room => {
        // Grab the live occupancy at this exact second
        const liveStats = currentRoomStats[room.room_id] || {};
        const currentOccupancy = liveStats.occupancy !== "--" ? liveStats.occupancy : 0;
         if (currentOccupancy === 0) return;
        return fetch('/api/send_emergency_alert', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
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

  // --- UI Render ---
  return (
    <>
      <Navbar department="Security" />

      {/* Side Nav */}
      <div className="side-nav row mt-0!">
        <span>Security Dashboard</span>
      </div>

      <div className="main-home scroll">

        <div className="row px-5">
          <div className="">
            <h2 className="font-bold">Welcome, {name}!</h2>
            <p className="text-[var(--sub-text-color)]">Security data and metrics will be displayed here.</p>
          </div>
          {currentRole === 'Security Admin' && (
            <IntButton icon={AlertTriangle} label="Create Emergency" onClick={handleSendAllAlerts} classes="btn btn-red btn-auto m-0! py-2! text-2xl" size="28" />
          )}
        </div>

        <div className="row boxes">  
          {/* Column 1: Alerts */}
          <div className="tracker-ui scroll outer box basis-70">
            <h3 className="font-bold">Occupancy Alerts</h3>
            {/* Dynamic Alerts will map here later */}
            <div className="tracker-ui mt-4 p-4 text-[var(--sub-text-color)] text-center">
              No active alerts.
            </div>
          </div>

          <div className="tracker-ui outer box basis-220 overflow-hidden flex flex-col">
            <h3 className="row mt-0! font-bold shrink-0">
              <span className="flex-2">Rooms Real-Time Data</span>
              <StatRow icon={Clock} label={currentTimeSpan} size="32"/>
            </h3>
            <div className="w-full overflow-x-auto mt-4 pb-2">
              <table className="table w-full border-separate border-spacing-0 whitespace-nowrap">
                <thead className="bg-[var(--primary-color)] text-[var(--primary-text-color)]">
                  <tr>
                    <th className="w-[1%] sticky left-0 z-20 bg-[--bg-color] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      ID
                    </th>
                    
                    <th className="hidden min-[26rem]:table-cell w-full text-left">
                      Room Name
                    </th>
                    
                    <th className="text-center!">
                      <span className="iot min-[30rem]:inline!">Occupancy</span>
                      <Users size={24} className="th-small-iot min-[30rem]:hidden!" />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-color)] bg-[var(--bg-color)]">
                  {[...roomsData]
                    .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true }))
                    .map(room => {
                    const stats = currentRoomStats[room.room_id] || { occupancy: "--", temperature: "--", ac: null, lights: null };

                    const count = stats.occupancy;
                    const bgColor = count > room.max_occupancy ? "#ff4444" : (count !== "--" && count !== 0) ? "#00ff88" : "#ffffff";

                    return (
                      <tr key={room.id}>
                        {/* 5. Matches the w-[1%] from the header */}
                        <td className="w-[1%] sticky left-0 z-10 bg-[--bg-color] font-bold shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          {room.room_id}
                        </td>
                        <td className="hidden min-[26rem]:table-cell">{room.name}</td>
                        <td className="text-center!">
                          <span className="fill small-iot" style={{ backgroundColor: bgColor }}>
                            {count ?? "??"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column 3: Staff List */}
          {currentRole === 'Security Admin' && (
            <StaffList 
              staffList={staffList}
              staffRooms={staffRooms}
              department="Security"
            />
          )}
        </div>
      </div>
    </>
  );
}