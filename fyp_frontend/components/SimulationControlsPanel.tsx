"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FastForward, Pause, Play, Rewind, RotateCcw } from "lucide-react";
import IntButton from "./IntButton";

export default function SimulationControlsPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const ui = "../lib/three/ui.js";

  const onChangeScrubberText = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
      
    if (isNaN(val)) return;

    const rangeSlider = document.getElementById('frame-scrubber') as HTMLInputElement | null;
    const maxLimit = rangeSlider ? parseFloat(rangeSlider.max) : 22500;

    if (val < 0) val = 0;
    if (val > maxLimit) val = maxLimit;

    import(ui).then(mod => mod.scrubFrame(val));

    if (rangeSlider) rangeSlider.value = val.toString();
  };

  const onChangeSpeedText = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
      
    if (isNaN(val)) return;

    const speedSlider = document.getElementById('speed-scrubber') as HTMLInputElement | null;
    const maxLimit = 5;

    if (val < 0.1) val = 0.1;
    if (val > maxLimit) val = maxLimit;

    import(ui).then(mod => mod.changeSpeed(val));

    if (speedSlider) speedSlider.value = val.toString();
  };
  
  const handleIsPlaying = () => {
    // Flip the React state so your UI knows what's happening
    setIsPlaying(!isPlaying);
    
    // Tell the 3D engine to flip its heatmap state
    import(ui).then(mod => {
      mod.togglePlayPause();
    });
  };

  const handleReset = () => {
    handleIsPlaying();
    import(ui).then(mod => mod.resetSim());

    const speedSlider = document.getElementById('speed-scrubber') as HTMLInputElement | null;
    const speedText = document.getElementById('speed-text') as HTMLInputElement | null;
    if (speedSlider) speedSlider.value = "1";
    if (speedText) speedText.value = "1";

    const frameSlider = document.getElementById('frame-scrubber') as HTMLInputElement | null;
    const frameText = document.getElementById('frame-scrubber-text') as HTMLInputElement | null;
    if (frameSlider) frameSlider.value = "0";
    if (frameText) frameText.value = "0";
  };

  return (
    <div className="tracker-ui outer p-4! absolute bottom-8 translate-x-[-50%] left-[50%] z-999 flex flex-row! w-max! max-w-full items-center! gap-5">
      <div className="header pb-0! cursor-auto!" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="font-bold">
          Simulation Controls
        </h3>
      </div> 
      <div className="flex items-center my-3 text-[var(--text-color)] flex-wrap">
        <div className="w-12.5 text-left shrink-0">Speed</div>
        <div className="flex-1 flex items-center justify-end h-5">
          <input 
            type="range" min="0.1" max="5" step="0.1" defaultValue="1" id="speed-scrubber"
            className="scrubber w-20"
            onChange={(e) => {
              import(ui).then(mod => mod.changeSpeed(e.target.value));
              // Update the little text box dynamically
              const textEl = document.getElementById('speed-text') as HTMLInputElement;
              if (textEl) textEl.value = e.target.value;
            }} 
          />
          {/* The dat.gui style text box */}
          <input 
            id="speed-text"
            type="text" 
            defaultValue="1"
            className="scrubber-text w-12.5!"
            onChange={onChangeSpeedText} 
          />      
        </div>
      </div>

      {/* Scrubber Row (Matches dat.gui 40/60 split) */}
      <div className="flex flex-wrap items-center my-3 text-[var(--text-color)]">
        <div className="w-18 text-left pr-2">Scrubber</div>
        <div className="flex-1 flex items-center justify-end h-5">
          <input 
            type="range" min="0.00" max="899.96" step="0.04" defaultValue="0.00" id="frame-scrubber"
            className="scrubber w-25"
            onChange={(e) => {
              import(ui).then(mod => mod.scrubFrame(e.target.value));
              // Update the little text box dynamically
              const textEl = document.getElementById('frame-scrubber-text') as HTMLInputElement;
              if (textEl) textEl.value = e.target.value;
            }} 
          />
          {/* The dat.gui style text box */}
          <input 
            id="frame-scrubber-text"
            type="text" 
            defaultValue="0" 
            className="scrubber-text w-20!"
            onChange={onChangeScrubberText} 
          />
        </div>
      </div>

      {/* Media Buttons Row (Using your .btn-track class!) */}
      <div className="flex justify-between gap-2 flex-wrap w-100!">

        <IntButton icon={Rewind} label={"-5s"} onClick={() => import(ui).then(mod => mod.rewindSim())} classes="btn btn-primary flex-1 m-0!" />

        <IntButton icon={isPlaying ? Pause : Play} label={isPlaying ? "Pause" : "Play"} onClick={handleIsPlaying} classes="btn btn-primary flex-1 m-0!" />
        
        <IntButton icon={FastForward} label={"+5s"} onClick={() => import(ui).then(mod => mod.fastForwardSim())} classes="btn btn-primary flex-1 m-0!" />

        <IntButton icon={RotateCcw} label={"Reset Playback"} onClick={handleReset} classes="btn btn-primary flex-1 m-0!" />
      </div>
    </div>
  );
}