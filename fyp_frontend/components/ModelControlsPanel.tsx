"use client";

import { useState } from "react";
import { Camera, ChevronDown, ChevronUp, ListRestart } from "lucide-react";
import IntButton from "./IntButton";

interface ModelControlsPanelProps {
    isReplay?: boolean;
    isLive?: boolean;
}

export default function ModelControlsPanel({ isReplay = false, isLive = false }: ModelControlsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const ui = "../lib/three/ui.js";

  return (
    <div className="tracker-ui outer p-0!">
      <div className="header p-4!" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="font-bold">
          Model Controls
        </h3>
        <div className="ml-2">
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </div>
      <div className={`content-expand ${isExpanded ? "expanded" : "collapsed"}`}>
        <div className="content" id="ui-content">
          <div className="row mt-0!">
            <span>Zoom:</span>
            <span>Scroll Wheel/Pinch</span>
          </div>
          <div className="row">
              <span>Move:</span>
              <span>Right Click & Pan</span>
          </div>
          <div className="row">
              <span>Rotate:</span>
              <span>Left Click & Pan</span>
          </div>

          {!isLive && (
            <button 
              className="btn btn-primary mx-0! mb-0! mt-2!" 
              onClick={() => import(ui).then(mod => mod.resetCameraView())}
            >
                <Camera size={20} /> <span className="ml-2">Reset Camera</span>
            </button>
          )}

          {isLive && (
            <button 
              className="btn btn-primary mx-0! mb-0! mt-2!" 
              onClick={() => import(ui).then(mod => mod.resetCameraViewLive())}
            >
              <Camera size={20} /> <span className="ml-2">Reset Camera</span>
            </button>
          )}

          {/* {!isReplay && (
              <button 
              className="btn btn-primary mx-0! mb-0! mt-2!" 
              id="replay-btn" 
              onClick={() => {
                  import("../lib/three/simulation.js").then(mod => {
                  const currentFrame = Math.floor(mod.playback.frame);
                  window.location.href = `/model_replay?frame=${currentFrame}`;
                  });
              }}
              >
                <ListRestart size={20} /> <span className="ml-2">Model Replay</span>
              </button>
          )} */}
        </div>
      </div>
    </div>
  );
}