"use client";

import { IntegerType } from "three/src/nodes/core/Node.js";

interface StatRowProps {
  icon: React.ElementType; // Type for the Lucide icons
  label: string;
  id?: string;
  id2?: string;
  value?: string | number;
  classes?: string;
  size?: string;
}

export default function StatRow ({ icon: Icon, label, id = "", id2 = "", value="", classes="", size="20"}: StatRowProps) {
  return (
  <>
    <span className={`flex gap-2 items-center font-bold`}>
      <Icon size={size} />
      <span id={id}> {label} </span>
    </span>

    {id2 !== "" && (
    <>
      <span className="fill" id={id2}>
        --
      </span>
    </>
    )}

    {value !== "" && (
    <>
      <span className={`fill ${classes}`} id={id2}>
        {value}
      </span>
    </>
    )}
  </>
  )
};