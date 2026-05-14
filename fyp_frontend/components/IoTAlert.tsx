"use client";

interface IoTAlertProps {
  roomData: any;
  time?: string;
}

export default function IoTAlert({ roomData, time }: IoTAlertProps) {
  return (
    <div className="tracker-ui p-4!">
        <h4 className="font-bold">{roomData.name}</h4>
        <div className="flex justify-between items-center text-[var(--sub-text-color)] mt-2">
            <span className="text-[var(--sub-text-color)] text-[0.9rem]">
                {roomData.room_id}
            </span>
            <span className="fill" style={{ backgroundColor: '#ff4444'}}>
                {time}
            </span>
        </div>
    </div>
  );
}