"use client";

import StatRow from "./StatRow";
import { useState } from "react";
import { MapPin, Calendar, Clock, User, Thermometer, AirVent, Lightbulb, ChevronDown, ChevronUp, Droplets } from "lucide-react";

interface DataBoxProps {
  icon: React.ElementType; // Type for the Lucide icons
  label: string;
  id?: string;
  id2?: string;
  value?: string | number | null;
  bgCases: string;
  classes?: string;
  suffix?: string;
  size?: string;
}

export default function DataBox ({ icon: Icon, label, id = "", id2 = "", value="", bgCases, classes="", suffix="", size="20"}: DataBoxProps) {
    return (
    <div className={`py-4! px-0! basis-30 box rounded-[8px] flex flex-col items-center justify-center border ${bgCases}`}>
        <span className="text-[var(--text-color)] uppercase tracking-wider mb-1 flex items-center font-bold gap-2">
            <Icon size={size}/>
            <span id={id}> {label} </span>
        </span>
        <span className="text-2xl font-bold text-[var(--text-color)]">
            {id2 !== "" ? '--' : value !== null ? `${value}${suffix}` : '--'}
        </span>
    </div>
    );

}