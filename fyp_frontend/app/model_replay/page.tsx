"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import RoomStatsPanel from "../../components/RoomStatsPanel";
import ModelControlsPanel from "../../components/ModelControlsPanel";
import SimulationControlsPanel from "../../components/SimulationControlsPanel";
import { ChevronLeft, ChevronRight, Radar } from "lucide-react";
import IntButton from "@/components/IntButton";

export default function ModelReplay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState("Loading...");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const ui = "../../lib/three/ui.js";

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/session');
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

    let destroyFn: () => void;
    
    import("../../lib/three/model.js").then((module) => {
      console.log("Three.js engine booting in REPLAY mode...");
      module.initThreeEngine(containerRef.current!);
      destroyFn = module.destroyThreeEngine;
    });

    return () => {
      if (destroyFn) destroyFn();
    };
  }, [department]); 

  const handleToggleHeatmap = () => {
    // Flip the React state so your UI knows what's happening
    setShowHeatmap(!showHeatmap);
    
    // Tell the 3D engine to flip its heatmap state
    import(ui).then(mod => {
      mod.toggleHeatmap();
    });
  };

  if (department === "Loading...") {
    return <div className="loading-screen text-white bg-[#131313] h-screen flex justify-center items-center">Loading Replay...</div>;
  }

  return (
    <>
      <Navbar department={department} />

      <div className="main flex w-full" style={{ height: 'calc(100vh - 4.5rem)' }}>

        <IntButton 
          icon={Radar} 
          size="30"
          label={showHeatmap ? "Heatmap: ON" : "Heatmap: OFF"} 
          onClick={handleToggleHeatmap} 
          classes={`absolute top-5 right-5 btn btn-auto m-0! p-2! rounded-0 z-150 text-[1.25rem]! ${showHeatmap ? "btn-yellow" : "btn-black"}`} 
        />
        
        <div className={`float ${isSidebarOpen ? "float-width" : "w-0"}`}>
          <div className="w-full h-full overflow-hidden relative">
            
            <div className="h-full overflow-y-auto overflow-x-hidden p-5 pr-0! float-width">
              <RoomStatsPanel department={department} />
          
              {/* <SimulationControlsPanel /> */}
              
              <ModelControlsPanel isReplay={true} />
              
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

        <div id="model-container" ref={containerRef}>
          <div className="crosshair"></div>
        </div>

        <SimulationControlsPanel />
      </div>
    </>
  );
}