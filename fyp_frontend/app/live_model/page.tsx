"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import RoomStatsPanel from "../../components/RoomStatsPanel";
import ModelControlsPanel from "../../components/ModelControlsPanel";
import IntButton from "@/components/IntButton";
import { ChevronLeft, ChevronRight, Thermometer, Droplets, Lightbulb, Snowflake, User, LayoutDashboard, Box, Clock, Users, AirVent, AlertTriangle, Radar, LightbulbOff, Wind, X } from "lucide-react";
import { io } from "socket.io-client";
import DataBox from "@/components/DataBox";
import StatRow from "@/components/StatRow";
import IoTAlert from "../../components/IoTAlert";

declare global {
  interface Window {
    updateLiveAvatars?: (detections: any[], roomCount: number) => void;
    updateLiveSensorData?: (sensorData: any) => void;
  }
}

export default function LiveModel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState("Loading...");
  const [role, setRole] = useState("Loading..."); // 🌟 Added Role state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [currentRoomStats, setCurrentRoomStats] = useState<any>({});
  const trackersRef = useRef<any>({ acWasted: {}, lightsWasted: {}, tempWarm: {}, tempCold: {} });
  const lastAlertRef = useRef<any>({});

  // IoT State
  const [sensorData, setSensorData] = useState({
    device_id: null,
    temperature: null,
    humidity: null,
    lights_state: null,
    ac_state: null
  });

  // YOLO Tracking State
  const [liveDetections, setLiveDetections] = useState([]);
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/session', {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await response.json();
        setDepartment(data.department || "Guest");
        setRole(data.role || "Guest"); // 🌟 Fetch the role
      } catch (error) {
        setDepartment("Security"); 
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
    fetch("/api/facility_home_data", {
      headers: { "ngrok-skip-browser-warning": "true" }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.rooms) setRoomsData(data.rooms);
      })
      .catch(err => console.error("Error fetching rooms:", err));
  }, []);

  // ==========================================
  // 🌟 EMERGENCY ALERT LOGIC
  // ==========================================
  const handleEmergencyAlert = async () => {
    if (!window.confirm("🚨 Are you sure you want to trigger an emergency alert for this live room?")) return;
     if (roomCount == 0) {
      return;
    }
    try {
      await fetch('/api/send_emergency_alert', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // Use the ESP32 ID if available, otherwise fallback to a generic name
          room_number: 'C-067', 
          occupancy_count: roomCount
        })
      });
      alert('✅ Emergency alert successfully sent for the live room!');
    } catch (error) {
      console.error("Error sending alert:", error);
      alert('❌ Error sending alert. Check the console.'); 
    }
  };

  // ==========================================
  // 2. THE WEBSOCKET CONNECTION
  // ==========================================
  useEffect(() => {
    const socket = io('https://pretended-surgery-likely.ngrok-free.dev');

    socket.on('connect', () => {
      console.log('✅ Connected to Flask WebSocket Server!');
    });

    socket.on('iot_update', (data) => {
      console.log('🌡️ Live IoT Update:', data);
      setSensorData(data); 
      
      // 1. Send data to 3D Engine
      if (window.updateLiveSensorData) {
        window.updateLiveSensorData(data);
      }

      // 2. Send data to React Dashboard Table
      const roomId = data.room_id || data.device_id; 
      if (roomId) {
        setCurrentRoomStats((prev: any) => ({
          ...prev,
          [roomId]: {
            ...prev[roomId], 
            ...data,
            occupancy: data.occupancy ?? prev[roomId]?.occupancy ?? "--", 
            temp: data.temperature ?? data.temp ?? prev[roomId]?.temp ?? "--",
            ac: data.ac_state === 'ON' || data.ac_state === true || data.ac === true, 
            lights: data.lights_state === 'ON' || data.lights_state === true || data.lights === true
          }
        }));
      }
    });

    socket.on('live_tracking_update', (data) => {
      console.log('🎥 Live YOLO Data:', data);
      
      if (data) {
        setRoomCount(data.room_count);
        setLiveDetections(data.detections || []); 
      
        if (window.updateLiveAvatars) {
          window.updateLiveAvatars(data.detections || [], data.room_count);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ==========================================
  // 3. THREE.JS ENGINE BOOT
  // ==========================================
  useEffect(() => {
    if (department === "Loading..." || !containerRef.current) return;

    let destroyFn: () => void;
    
    import("../../lib/three/live_model.js").then((module) => {
      console.log("Three.js LIVE engine booting up...");
      module.initLiveEngine(containerRef.current!);
      destroyFn = module.destroyLiveEngine;
    });

    return () => {
      if (destroyFn) destroyFn();
    };
  }, [department]); 

  useEffect(() => {
    const handleScroll = () => {
      // If we've scrolled past 30% of the screen height, flip the button!
      if (window.scrollY > window.innerHeight * 0.7) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (roomsData.length === 0) return;
    const interval = setInterval(() => {
      const currentSecond = Math.floor(Date.now() / 1000);
      const trackers = trackersRef.current;
      const lastAlerts = lastAlertRef.current;

      setCurrentRoomStats((prevStats: any) => {
        const newStats = { ...prevStats };
        roomsData.forEach(room => {
          const roomId = room.room_id;
          const row = newStats[roomId];
          if (!row || row.occupancy === undefined || row.occupancy === "--") return;

          const threshold = 20;
          if (row.occupancy === 0 && row.ac) trackers.acWasted[roomId] = (trackers.acWasted[roomId] || 0) + 1;
          else trackers.acWasted[roomId] = 0;
          if (row.occupancy === 0 && row.lights) trackers.lightsWasted[roomId] = (trackers.lightsWasted[roomId] || 0) + 1;
          else trackers.lightsWasted[roomId] = 0;
          if (row.temp > 28) trackers.tempWarm[roomId] = (trackers.tempWarm[roomId] || 0) + 1;
          else trackers.tempWarm[roomId] = 0;
          if (row.temp < 22) trackers.tempCold[roomId] = (trackers.tempCold[roomId] || 0) + 1;
          else trackers.tempCold[roomId] = 0;

          const uiAlerts: any = { ac: null, lights: null, temp: null, occu: null };
          const formatTime = (totalSec: number) => {
              const m = Math.floor(totalSec / 60);
              const s = totalSec % 60;
              return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
          };

          if (trackers.acWasted[roomId] >= threshold) uiAlerts.ac = formatTime(trackers.acWasted[roomId]);
          if (trackers.lightsWasted[roomId] >= threshold) uiAlerts.lights = formatTime(trackers.lightsWasted[roomId]);
          if (trackers.tempWarm[roomId] >= threshold) uiAlerts.temp = `Too Warm (${Math.round(row.temp)}°C) for ${formatTime(trackers.tempWarm[roomId])}`;
          if (trackers.tempCold[roomId] >= threshold) uiAlerts.temp = `Too Cold (${Math.round(row.temp)}°C) for ${formatTime(trackers.tempCold[roomId])}`;
          if (room.max_occupancy && row.occupancy > room.max_occupancy) uiAlerts.occu = `Over capacity: ${row.occupancy}/${room.max_occupancy}`;

          const lastAlert = lastAlerts[roomId] || 0;
          if (currentSecond - lastAlert >= threshold) {
              const activeAlerts = [];
              const descriptions = [];
              if (trackers.acWasted[roomId] >= threshold) { activeAlerts.push("AC Wasted"); descriptions.push(`AC wasted for ${formatTime(trackers.acWasted[roomId])}.`); }
              if (trackers.lightsWasted[roomId] >= threshold) { activeAlerts.push("Lights Wasted"); descriptions.push(`Lights wasted for ${formatTime(trackers.lightsWasted[roomId])}.`); }
              if (trackers.tempWarm[roomId] >= threshold) { activeAlerts.push("Temp Too Warm"); descriptions.push(`Temp > 28°C for ${formatTime(trackers.tempWarm[roomId])}.`); }
              if (trackers.tempCold[roomId] >= threshold) { activeAlerts.push("Temp Too Cold"); descriptions.push(`Temp < 20°C for ${formatTime(trackers.tempCold[roomId])}.`); }

              if (activeAlerts.length > 0) {
                  fetch('/api/send_facilities_alert', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ room_number: roomId, alert_type: activeAlerts.join(" & "), description: descriptions.join("\n \n") })
                  }).catch(err => console.error(err));
                  lastAlerts[roomId] = currentSecond;
              }
          }
          newStats[roomId] = { ...row, uiAlerts };
        });
        return newStats;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roomsData]);

  const threeCanvas = useMemo(() => (
    <div id="model-container" ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-[--bg-color]/50">
      <div className="crosshair"></div>
    </div>
  ), []);

  if (department === "Loading...") {
    return <div className="loading-screen text-white bg-[#131313] h-screen flex justify-center items-center">Loading Live Feed...</div>;
  }

  const handleToggleHeatmap = () => {
    const newState = !showHeatmap;
    setShowHeatmap(newState);
    
    import("../../lib/three/live_model.js").then(mod => {
      if (mod.toggleHeatmap) {
         mod.toggleHeatmap(newState);
      }
    });
  };

  const getTempColor = (t: any) => {
    if (t === "--" || t === undefined || t === null) return "#ffffff";
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

  return (
  <div className="relative min-h-screen">
    <Navbar department={department} />

    {/* <button 
      onClick={() => {
        if (isScrolledDown) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' }); 
        }
      }}
      className="fixed top-50 right-[-1] z-[999] group flex items-center bg-[var(--primary-color)] border border-[var(--primary-color)]/50 hover:border-[var(--primary-color)] text-[var(--primary-text-color)] p-2 rounded-l-lg transition-all duration-300 shadow-[0_0_15px_var(--primary-color)] cursor-pointer"
    >
      {isScrolledDown ? <Box size={24} className="shrink-0" /> : <LayoutDashboard size={24} className="shrink-0" />}
      
      <span className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[160px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out whitespace-nowrap font-bold">
        {isScrolledDown ? "3D Model View" : "Dashboard View"}
      </span>
    </button> */}
    

    <div className="main flex h-[calc(100vh-4.5rem)] relative overflow-hidden">

      {/* {department !== "Facilities" && (
        <IntButton 
          icon={Radar} 
          size="30"
          label={showHeatmap ? "Heatmap: ON" : "Heatmap: OFF"} 
          onClick={handleToggleHeatmap} 
          classes={`absolute top-5 right-5 btn btn-auto m-0! p-2! rounded-0 z-50 text-[1.25rem]! ${showHeatmap ? "btn-yellow" : "btn-black"}`} 
        />
      )} */}

      {department !== "Facilities" && (
        <IntButton 
          icon={AlertTriangle} 
          label="Create Emergency" 
          onClick={handleEmergencyAlert} 
          classes="absolute top-5 right-5 btn btn-red btn-auto m-0! p-2! rounded-0 z-50 text-[1.25rem]!" 
          size="24" 
        />
      )}
            
      <div className={`float ${isSidebarOpen ? "float-width" : "w-0"}`}>
        <div className="w-full h-full overflow-hidden relative">
          
          <div className="h-full overflow-y-auto overflow-x-hidden p-5 pr-0! float-width">
            
            {/* <div className="mb-4">
              <IntButton 
                icon={AlertTriangle} 
                label="Create Emergency" 
                onClick={handleEmergencyAlert} 
                classes="btn btn-red btn-auto m-0! py-2! text-xl w-full flex justify-center" 
                size="24" 
              />
            </div> */}

            <RoomStatsPanel 
              department={department} 
              isLive={true} 
              liveOccupancy={roomCount} 
              sensorData={sensorData}
            />
            
            <ModelControlsPanel isLive={true}/>
            
            <div style={{ display: "none" }}>
              <span id="department">{department}</span>
              <span id="live">true</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="sidebar-toggle"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>
      </div>
        
      {threeCanvas}

    </div>

    {/* <div id="dashboard-section" className="side-nav row mt-0! text-black">
      <span>Dashboard</span>
    </div>

    <div className="main-home scroll relative"> 
      
      <div className="row boxes">
        
        <div className="tracker-ui scroll outer box basis-70">
          <h3 className="font-bold">AC Alerts</h3>
          <div className="mt-4">
            {acAlerts.length > 0 ? (
              acAlerts.map(room => (
                <IoTAlert key={room.room_id} roomData={room} time={currentRoomStats[room.room_id].uiAlerts.ac} />
              ))
            ) : (<div className="p-4 text-center">No active alerts.</div>)}
          </div>
        </div>

        <div className="tracker-ui scroll outer box basis-70">
          <h3 className="font-bold">Lights Alerts</h3>
          <div className="mt-4">
            {lightsAlerts.length > 0 ? (
              lightsAlerts.map(room => (
                <IoTAlert key={room.room_id} roomData={room} time={currentRoomStats[room.room_id].uiAlerts.lights} />
              ))
            ) : (<div className="p-4 text-center">No active alerts.</div>)}
          </div>
        </div>

        <div className="tracker-ui scroll outer box basis-70">
          <h3 className="font-bold">Temperature Alerts</h3>
          <div className="mt-4">
            {tempAlerts.length > 0 ? (
              tempAlerts.map(room => (
                <IoTAlert key={room.room_id} roomData={room} time={currentRoomStats[room.room_id].uiAlerts.temp} />
              ))
            ) : (<div className="p-4 text-center">No active alerts.</div>)}
          </div>
        </div>

        <div className="tracker-ui scroll outer box basis-70">
          <h3 className="font-bold">Occupancy Alerts</h3>
          <div className="mt-4">
            {occuAlerts.length > 0 ? (
              occuAlerts.map(room => (
                <IoTAlert key={room.room_id} roomData={room} time={currentRoomStats[room.room_id].uiAlerts.occu} />
              ))
            ) : (<div className="p-4 text-center">No active alerts.</div>)}
          </div>
        </div>

      </div>

      <div className="tracker-ui outer box basis-220 overflow-hidden flex flex-col mx-5!">
        <h3 className="row mt-0! font-bold shrink-0">
          <span className="flex-2">Rooms Real-Time Data</span>
          <StatRow icon={Clock} label="Loading..." id="time" size="32"/>
        </h3>
        <div className="w-full overflow-x-auto mt-4 pb-2">
          <table className="table w-full border-separate border-spacing-0 whitespace-nowrap">
            <thead className="bg-[var(--primary-color)] text-[var(--primary-text-color)]">
              <tr>
                <th className="w-[1%] sticky left-0 z-20 bg-[--bg-color] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">ID</th>
                <th className="hidden min-[43rem]:table-cell w-full text-left">Room Name</th>
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
              {roomsData.map(room => {
                const stats = currentRoomStats[room.room_id] || { occupancy: "--", temp: "--", ac: null, lights: null };
                const hasData = stats.occupancy !== "--";

                const count = stats.occupancy;
                const bgColor = count > room.max_occupancy ? "#ff4444" : (count !== "--" && count !== 0) ? "#00ff88" : "#ffffff";
                
                const isAcOn = stats.ac;
                const acColor = stats.ac !== null ? (isAcOn ? "#00ff88" : "#ff4444") : "#ffffff";
                
                const isLightsOn = stats.lights;
                const lightsColor = stats.lights !== null ? (isLightsOn ? "#00ff88" : "#ff4444") : "#ffffff";

                const currentTemp = stats.temp; 
                const tempText = hasData ? `${currentTemp.toFixed(1)} °C` : "--";
                const tempTextSmall = hasData ? `${Math.round(currentTemp)}°` : "--";
                const tempColor = getTempColor(currentTemp);

                return (
                  <tr key={room.id}>
                    <td className="w-[1%] sticky left-0 z-10 bg-[--bg-color] font-bold shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      {room.room_id}
                    </td>
                    <td className="hidden min-[43rem]:table-cell">{room.name}</td>
                    <td className="text-center!">
                      <span className="fill small-iot" style={{ backgroundColor: bgColor }}>{count ?? "??"}</span>
                    </td>
                    <td className="text-center!">
                      <span className="fill small-iot" style={{ backgroundColor: tempColor }}>
                        {hasData ? (<><span className="small">{tempTextSmall}</span><span className="iot">{tempText}</span></>) : "--"}
                      </span>
                    </td>
                    <td className="text-center!">
                      <span className="fill small-iot" style={{ backgroundColor: acColor }}>
                        {stats.ac !== null ? (<><span className="small">{isAcOn ? <Wind size={24} className="animate-pulse"/> : <X size={24}/>}</span><span className="iot">{isAcOn ? "• ON" : "- OFF"}</span></>) : "--"}
                      </span>
                    </td>
                    <td className="text-center!">
                      <span className="fill small-iot" style={{ backgroundColor: lightsColor }}>
                        {stats.lights !== null ? (<><span className="small">{isLightsOn ? <Lightbulb size={24}/> : <LightbulbOff size={24}/>}</span><span className="iot">{isLightsOn ? "• ON" : "- OFF"}</span></>) : "--"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div> */}
  </div>
  );
}