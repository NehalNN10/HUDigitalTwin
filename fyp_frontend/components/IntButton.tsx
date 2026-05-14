"use client";

interface IntButtonProps {
  icon: React.ElementType; // Type for the Lucide icons
  size?: string;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  classes?: string;
}

export default function IntButton ({ icon: Icon, size = "20", label, onClick, isActive = false, classes = "" }: IntButtonProps){
  return (
    <button className={`group ${isActive ? "selected" : ""} ${classes}`} onClick={onClick}>
      <Icon size={size} />
      <span className={`btn-base ${isActive ? "btn-active" : "btn-inactive"}`}> {label}</span>
    </button>
  );
};