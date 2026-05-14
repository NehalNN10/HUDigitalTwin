"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import RoomStatsPanel from "../../components/RoomStatsPanel";
import ModelControlsPanel from "../../components/ModelControlsPanel";
import { ChevronLeft, ChevronRight, Radar } from "lucide-react";
import IntButton from "@/components/IntButton";

export default function DigitalTwinModel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState("Loading...");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const ui = "../../lib/three/ui.js";

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/session', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            credentials: 'include' 
        });
        
        if (!response.ok) throw new Error("Failed to fetch session");
        
        const data = await response.json();
        
        setDepartment(data.department);
        
      } catch (error) {
        console.error("Session fetch failed:", error);
        setDepartment("Security"); 
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
    if (department === "Loading..." || !containerRef.current) return;

    let destroyFn: () => void;
    
    import("../../lib/three/model.js").then((module) => {
      console.log("Three.js engine booting up...");
      module.initThreeEngine(containerRef.current!);
      destroyFn = module.destroyThreeEngine;
    });

    return () => {
      if (destroyFn) destroyFn();
    };
  }, [department]); 

  const threeCanvas = useMemo(() => (
    <div id="model-container" ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-[--bg-color]/50">
      <div className="crosshair"></div>
    </div>
  ), []);

  if (department === "Loading...") {
    return <div className="loading-screen">Loading Digital Twin...</div>;
  }

  const handleToggleHeatmap = () => {
    // Flip the React state so your UI knows what's happening
    setShowHeatmap(!showHeatmap);
    
    // Tell the 3D engine to flip its heatmap state
    import("../../lib/three/ui.js").then(mod => {
      mod.toggleHeatmap();
    });
  };

  return (
    <>
      <Navbar department={department} />

      <div className="main flex w-full" style={{ height: 'calc(100vh - 4.5rem)' }}>

        {department !== "Facilities" && (
          <IntButton 
            icon={Radar} 
            size="30"
            label={showHeatmap ? "Heatmap: ON" : "Heatmap: OFF"} 
            onClick={handleToggleHeatmap} 
            classes={`absolute top-5 right-5 btn btn-auto m-0! p-2! rounded-0 z-150 text-[1.25rem]! ${showHeatmap ? "btn-yellow" : "btn-black"}`} 
          />
        )}
        
        <div className={`float ${isSidebarOpen ? "float-width" : "w-0"}`}>
          <div className="w-full h-full overflow-hidden relative">
            
            <div className="h-full overflow-y-auto overflow-x-hidden p-5 pr-0! float-width">
              <RoomStatsPanel department={department} />
              
              <ModelControlsPanel />
              
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
    </>
  );
}