"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import RoomStatsPanel from "../../components/RoomStatsPanel";
import ModelControlsPanel from "../../components/ModelControlsPanel";
import { Clock, LayoutDashboard, Box, AirVent, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lightbulb, UserMinus, UserPlus, Bomb, BrushCleaning, User, Users, Thermometer, Wind, LightbulbOff, X } from "lucide-react";
import Link from 'next/link';
import StatRow from "@/components/StatRow";
import FormRow from "@/components/FormRow";
import StaffList from "@/components/StaffList";
import IoTAlert from "@/components/IoTAlert";

declare global {
  interface Window {
    sandboxAPI?: any;
  }
}

export default function SandboxModel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [department, setDepartment] = useState("Loading...");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [isEmergencyModalOpen, setEmergencyModalOpen] = useState(false);
  
  const [emergencyForm, setEmergencyForm] = useState({ roomNumber: "", alertType: "AC", timeSince: "", description: "" });
  const [currentRoomStats, setCurrentRoomStats] = useState<any>({});

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
    async function fetchSession() {
      try {
        const response = await fetch('/api/session', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            credentials: 'include' 
        });
        const data = await response.json();
        setDepartment(data.department || "Guest");
      } catch (error) {
        console.error("Session fetch failed:", error);
        setDepartment("Security"); 
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
    if (department === "Loading..." || !containerRef.current) return;

    let sandboxApp: any;
    
    import("../../lib/three/sandbox.js").then((module: any) => {
      console.log("Booting up OOP Sandbox Engine...");
      
      sandboxApp = new module.SandboxEngine(
        containerRef.current!, 
        
        (liveData: any[]) => {
          setCurrentRoomStats(liveData);
        },
        
        (roomsList: any[]) => {
          setRoomsData(roomsList);
        }
      );
      
      window.sandboxAPI = sandboxApp.simulation;
      sandboxApp.init();
    });

    return () => {
      if (sandboxApp) sandboxApp.destroy();
      delete window.sandboxAPI;
    };
  }, [department]);

  // Handlers
  const handleSpawn = () => window.sandboxAPI?.spawnPerson();
  const handleRemove = () => window.sandboxAPI?.removePerson();
  const handleRemoveAll = () => window.sandboxAPI?.removeAll();
  const handleRemoveAllRoom = () => window.sandboxAPI?.removeAllRoom();

  const onChangeTempText = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;

    const tempSlider = document.getElementById('temp-scrubber') as HTMLInputElement | null;
    if (val < 15) val = 15;
    if (val > 35) val = 35;

    window.sandboxAPI?.changeTemp(val);
    if (tempSlider) tempSlider.value = val.toString();
  };

  // 2. These now just tell the engine to flip whatever room we are looking at!
  const handleToggleOccu = () => window.sandboxAPI?.toggleOccu();
  const handleToggleLights = () => window.sandboxAPI?.toggleLights();
  const handleToggleAC = () => window.sandboxAPI?.toggleAC();

  // --- Handlers ---
  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/send_facilities_alert', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
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

  if (department === "Loading...") {
    return <div className="loading-screen text-white text-center mt-20">Loading Sandbox...</div>;
  }

  return (
    <div className="relative min-h-screen">
      <Navbar department={department} />

      <button 
        onClick={() => {
          if (isScrolledDown) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' }); 
          }
        }}
        className="fixed top-24 right-[-1] z-[999] group flex items-center bg-[var(--primary-color)] border border-[var(--primary-color)]/50 hover:border-[var(--primary-color)] text-[var(--primary-text-color)] p-2 rounded-l-lg transition-all duration-300 shadow-[0_0_15px_var(--primary-color)] cursor-pointer"
      >
        {isScrolledDown ? <Box size={24} className="shrink-0" /> : <LayoutDashboard size={24} className="shrink-0" />}
        
        <span className="max-w-0 opacity-0 overflow-hidden group-hover:max-w-[160px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out whitespace-nowrap font-bold">
          {isScrolledDown ? "3D Model View" : "Dashboard View"}
        </span>
      </button>

      <div className="main flex h-[calc(100vh-4.5rem)] relative overflow-hidden">

        <div className={`float ${isSidebarOpen ? "float-width" : "w-0"}`}>
          <div className="w-full h-full overflow-hidden relative">
            
            <div className="h-full overflow-y-auto overflow-x-hidden p-5 pr-0! float-width">
              <RoomStatsPanel department={department} />

              <div className="tracker-ui outer p-0!">
                <div className="header p-4!" onClick={() => setIsExpanded(!isExpanded)}>
                  <h3 className="font-bold">Sandbox Controls</h3>
                  <div className="ml-2">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>  
                
                <div className={`content-expand ${isExpanded ? "expanded" : "collapsed"}`}>
                  <div className="content">
                    {department !== "Facilities" && (
                    <>
                      <div className="row flex-wrap gap-5 mt-0!">
                        <button onClick={handleSpawn} className="btn btn-green m-0! flex-1">
                          <UserPlus size={20} /> <span className="ml-2">Spawn</span>
                        </button>
                        <button onClick={handleRemove} className="btn btn-red m-0! flex-1">
                          <UserMinus size={20} /> <span className="ml-2">Remove</span>
                        </button>
                      </div>
                      <div className="row flex-wrap gap-5 mt-4!">
                        <button onClick={handleRemoveAll} className="btn btn-red m-0! flex-1">
                          <Bomb size={20} /> <span className="ml-2">Clear All</span>
                        </button>
                        <button onClick={handleRemoveAllRoom} className="btn btn-red m-0! flex-1">
                          <BrushCleaning size={20} /> <span className="ml-2">Clear Room</span>
                        </button>
                      </div>
                    </>
                    )}

                    {department === "Facilities" && (
                      <div className="row flex-wrap gap-5 mt-4!">
                        <button id="sandbox-btn-occu" onClick={handleToggleOccu} className={`btn btn-red m-0! flex-1!`}>
                          <User size={20} /> <span className="ml-2">Toggle Occupancy</span>
                        </button>
                      </div>
                    )}

                    {department !== "Security" && (
                    <>
                      <div className="flex flex-wrap items-center my-3 border-t border-t-[var(--text-color)] mt-4! py-4! text-[var(--text-color)]">
                        <div className="w-10 text-left pr-2">Temp</div>
                        <div className="flex-1 flex items-center justify-end h-5">
                          <input 
                            type="range" min="15" max="35" step="0.1" defaultValue="25" id="temp-scrubber"
                            className="scrubber"
                            onChange={(e) => {
                              window.sandboxAPI?.changeTemp(e.target.value);
                              const textEl = document.getElementById('temp-text') as HTMLInputElement;
                              if (textEl) textEl.value = e.target.value;
                            }} 
                          />
                          <input 
                            id="temp-text"
                            type="text" 
                            defaultValue="25"
                            className="scrubber-text"
                            onChange={onChangeTempText} 
                          />      
                        </div>
                      </div>

                      <div className="row gap-5">
                        <button id="sandbox-btn-ac" onClick={handleToggleAC} className={`btn btn-red m-0! flex-1!`}>
                          <AirVent size={20} /> <span className="ml-2">AC</span>
                        </button>
                        <button id="sandbox-btn-lights" onClick={handleToggleLights} className={`btn btn-red m-0! flex-1!`}>
                          <Lightbulb size={20} /> <span className="ml-2">Lights</span>
                        </button>
                      </div>
                    </>
                    )}
                  </div>
                </div>
              </div>

              <ModelControlsPanel isReplay={true}/>
              
              <div style={{ display: "none" }}>
                <span id="department">{department}</span>
                <span id="live">false</span>
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
        
        <div id="model-container" ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-[--bg-color]/50">
          <div className="crosshair"></div>
        </div>
      </div>

      <div id="dashboard-section" className="side-nav row mt-0! text-black">
        <span>Dashboard</span>
      </div>

      {/* Added relative here so our absolute button attaches to it */}
      <div className="main-home scroll relative"> 
        
        {/* Top Alerts Row */}
        <div className="row boxes">
          
          {/* AC ALERTS */}
          <div className="tracker-ui scroll outer box basis-70">
            <h3 className="font-bold">AC Alerts</h3>
            <div className="mt-4">
              {acAlerts.length > 0 ? (
                acAlerts.map(room => (
                  <IoTAlert 
                    key={room.room_id}
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
                    key={room.room_id}
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
                    key={room.room_id}
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
                    key={room.room_id}
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
        <div className="tracker-ui outer box basis-220 overflow-hidden flex flex-col mx-5!">
          <h3 className="row mt-0! font-bold shrink-0">
            <span className="flex-2">Rooms Real-Time Data</span>
            <StatRow icon={Clock} label="Loading..." id="time" size="32"/>
          </h3>
          <div className="w-full overflow-x-auto mt-4 pb-2">
            <table className="table w-full border-separate border-spacing-0 whitespace-nowrap">
              <thead className="bg-[var(--primary-color)] text-[var(--primary-text-color)]">
                <tr>
                  <th className="w-[1%] sticky left-0 z-20 bg-[--bg-color] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
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
      </div>

      {/* EMERGENCY MODAL */}
      {isEmergencyModalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setEmergencyModalOpen(false)}>
          <div className="tracker-ui modal text-white">
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
    </div>
  );
  
}