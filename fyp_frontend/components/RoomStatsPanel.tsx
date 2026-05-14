"use client";

import StatRow from "./StatRow";
import { useEffect, useState } from "react";
import DataBox from "./DataBox";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Thermometer, 
  AirVent, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Droplets
} from "lucide-react";

interface RoomStatsPanelProps {
  department: string;
  isLive?: boolean;
  liveOccupancy?: number | null;
  sensorData?: {
    device_id: null,
    temperature: null,
    humidity: null,
    lights_state: null,
    ac_state: null
  };
}

export default function RoomStatsPanel({ 
  department, 
  isLive = false, 
  liveOccupancy = null,
  sensorData = {
    device_id: null,
    temperature: null,
    humidity: null,
    lights_state: null,
    ac_state: null
  }
}: RoomStatsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [roomTemp, setRoomTemp] = useState<number | null>(null);
  const [roomAC, setRoomAC] = useState<boolean | null>(null);
  const [roomLights, setRoomLights] = useState<boolean | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [roomMax, setRoomMax] = useState<number>(5);
  const [roomHumidity, setRoomHumidity] = useState<number | null>(null);

  useEffect(() => {
      let lastUpdate = 0;
      
      const handleUpdate = (e: any) => {
          if (isLive) return;

          const now = Date.now();
          if (now - lastUpdate > 500) {
              setRoomTemp(e.detail.temperature);
              setRoomAC(e.detail.ac);
              setRoomLights(e.detail.lights);
              setRoomCount(e.detail.occupancy);
              setRoomMax(e.detail.max_occupancy);
              lastUpdate = now;
          }
      };

      window.addEventListener('iotDataUpdate', handleUpdate);
      return () => window.removeEventListener('iotDataUpdate', handleUpdate);
  }, [isLive]); 

  useEffect(() => {
      if (isLive) {
          if (liveOccupancy !== null) setRoomCount(liveOccupancy);
          
          if (sensorData) {
            if (sensorData.temperature !== null) setRoomTemp(sensorData.temperature);
            if (sensorData.ac_state !== null) setRoomAC(sensorData.ac_state === "ON" ? true : false);
            if (sensorData.lights_state !== null) setRoomLights(sensorData.lights_state === "ON" ? true : false);
            if (sensorData.humidity !== null) setRoomHumidity(sensorData.humidity);
          }
        setRoomMax(5);
      }

       // You can adjust this as needed
  }, [isLive, liveOccupancy, sensorData]);

  return (
    <div className="tracker-ui outer p-0!">
      <div className="header p-4! bg-[var(--primary-color)] rounded-[8px]" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="flex gap-2 items-center font-bold mt-0! justify-start! text-[var(--primary-text-color)]">
          <StatRow icon={MapPin} label="--" id="ui-room-name" size="32"/>
        </h3>
        <div className="text-[var(--primary-text-color)] ml-2">
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </div>
      <div className={`content-expand ${isExpanded ? "expanded" : "collapsed"}`}>
        <div className="content" id="ui-content">
          <div className="row font-bold text-[var(--text-color)]">
            <span id="ui-room-id">--</span>
            <span id="ui-room-floor">--</span>
          </div>

          <div className="row text-[var(--text-color)] flex-wrap gap-4">
            <StatRow icon={Calendar} label="--" id="ui-iot-date" />
            <StatRow icon={Clock} label="--" id="ui-iot-time" />
          </div>

          <div className="border-t mt-4! pt-4! flex flex-row flex-wrap gap-3 text-white mb-3">
            <DataBox 
              icon={User} 
              label="Occu"
              value={roomCount}
              bgCases={
                roomCount === null || roomCount === 0 ? 'bg-[var(--surface-color)] border-[var(--text-color)]' 
                : roomCount <= roomMax ? 'bg-[#00ff88]/50 border-[#00ff88]' 
                : 'bg-[#ff4444]/50 border-[#ff4444]'
              }
            />

            {department !== "Security" && (
              <>
                <DataBox 
                  icon={Thermometer} 
                  label="Temp"
                  value={roomTemp} 
                  bgCases={
                    roomTemp === null ? 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--text-color)] '
                    : roomTemp <= 20 ? 'bg-[#0088ff]/50 text-[#0088ff] border-[#0088ff]' 
                    : roomTemp <= 22 ? 'bg-[#00ffff]/50 text-[#00ffff] border-[#00ffff]' 
                    : roomTemp <= 28 ? 'bg-[#00ff88]/50 text-[#00ff88] border-[#00ff88]' 
                    : roomTemp <= 30 ? 'bg-[#ff8800]/50 text-[#ff8800] border-[#ff8800]' 
                    : 'bg-[#f44]/50 text-[#f44] border-[#f44]'
                  } 
                  suffix=" °C"
                />
                
                {isLive && (
                  <DataBox 
                    icon={Droplets} 
                    label="Humidity"
                    value={roomHumidity} 
                    bgCases={
                      roomHumidity === null ? 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--text-color)] '
                      : roomHumidity <= 40 ? 'bg-[#00ff88]/50 text-[#00ff88] border-[#00ff88]' 
                      : roomHumidity <= 60 ? 'bg-[#00ffff]/50 text-[#00ffff] border-[#00ffff]' 
                      : 'bg-[#0088ff]/50 text-[#0088ff] border-[#0088ff]'
                    } 
                    suffix="%"
                  />
                )}
              </>
            )}
          </div>
          
          {department !== "Security" && (
            <div className="flex flex-row flex-wrap gap-3 text-white">
              <DataBox 
                icon={AirVent} 
                label="AC"
                value={roomAC === null ? null : roomAC ? "ON" : "OFF"} 
                bgCases={
                  roomAC === null ? 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--text-color)] '
                  : roomAC ? 'bg-[#00ff88]/50 text-[#00ff88] border-[#00ff88]' 
                  : 'bg-[#ff4444]/50 text-[#ff4444] border-[#ff4444]'
                } 
              />

              <DataBox 
                icon={Lightbulb} 
                label="Lights"
                value={roomLights === null ? null : roomLights ? 'ON' : 'OFF'} 
                bgCases={
                  roomLights === null ? 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--text-color)] '
                  : roomLights ? 'bg-[#00ff88]/50 text-[#00ff88] border-[#00ff88]' 
                  : 'bg-[#ff4444]/50 text-[#ff4444] border-[#ff4444]'
                } 
              />
            </div>
          )}
        </div>
      </div>
    </div> 
  );
}