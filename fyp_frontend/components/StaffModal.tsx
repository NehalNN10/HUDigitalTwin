"use client";

import { useState } from "react";
import FormRow from "./FormRow"; // <-- Adjust the import path as needed!

// 1. Define the props (the data and functions this modal needs from the main page)
interface StaffModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  staffForm: any;
  setStaffForm: React.Dispatch<React.SetStateAction<any>>;
  availableRoles: any[];
  availableRooms?: any[];                     // <-- Added ?
  toggleRoom?: (roomId: string) => void;      // <-- Added ?
}

export default function StaffModal({
  onClose,
  onSubmit,
  staffForm,
  setStaffForm,
  availableRoles,
  availableRooms,
  toggleRoom
}: StaffModalProps) {
  
  // 2. We moved this state inside the component to keep the parent file clean!
  const [showRoomList, setShowRoomList] = useState(false);

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tracker-ui modal text-white overflow-y-auto! max-h-[90vh]">
        <div className={`modal-header p-4 text-3xl fill ${staffForm.id ? "bg-[#fc3] text-black!" : "bg-[#88f] text-white!"}`}>
          {staffForm.id ? "Edit Staff" : "Add Staff"}
        </div>
        
        <div className="overflow-y-auto max-h-[90vh] pr-4">
        <form onSubmit={onSubmit}>
          {/* --- REFACTORED FORM ROWS --- */}
          <FormRow label="Username/ID" value={staffForm.user_id} onChange={e => setStaffForm({...staffForm, user_id: e.target.value})}  />
          
          <FormRow label="Full Name" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} />
          
          <FormRow label="Email" type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} />
          
          <FormRow label="Password" type="password" required={!staffForm.id} placeholder={staffForm.id ? "(Leave blank to keep current)" : ""} value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} />
          
          <FormRow label="Role">
            <select className="formInput" required value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
              {availableRoles.map(r => (<option key={r.name} value={r.name}>{r.name}</option>))}
            </select>
          </FormRow>
        
          {availableRooms && availableRooms.length > 0 && (
            <>
              <div className="row">
                <h4>Rooms</h4>
                <button type="button" className="btn btn-primary btn-auto m-0!" onClick={() => setShowRoomList(!showRoomList)}>
                  {showRoomList ? "Hide ▲" : "Show ▼"}
                </button>
              </div>
              
              {showRoomList && (
                <div className="tracker-ui max-h-40 overflow-y-auto w-max ml-auto p-2!">
                  {availableRooms.map(room => (
                    <div key={room.id} className="checklist-item">
                      <input type="checkbox" className="checklist-checkbox" checked={staffForm.assigned_rooms.includes(room.id)} onChange={() => toggleRoom?.(room.id)} />
                      <label className="checklist-label">{room.room_id} - {room.name}</label>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          <div className="row justify-center! mt-4!">
            <button type="button" className="btn btn-primary btn-auto" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn ${staffForm.id ? "btn-yellow" : "btn-blue"} btn-auto`}>
              {staffForm.id ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}