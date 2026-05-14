"use client";

import { useState, useEffect } from "react";
import StaffModal from "./StaffModal";
import IntButton from "./IntButton"
import { Plus, Pencil, Trash } from "lucide-react"

interface StaffListProps {
  staffList: any[];
  staffRooms?: any;
  department: string;
}

export default function StaffList({ staffList, staffRooms, department }: StaffListProps) {
  const [isStaffModalOpen, setStaffModalOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({ 
    id: "", user_id: "", name: "", email: "", password: "", role: "Security Officer", assigned_rooms: [] as string[] 
  });

  useEffect(() => {
    if (department === "Security") {
      fetch("/api/security_info")
        .then(res => res.json())
        .then(data => {
          setAvailableRoles(data.roles || []);
          setAvailableRooms(data.rooms || []);
        });
    } else if (department === "Facilities") {
      fetch("/api/facility_info")
        .then(res => res.json())
        .then(data => {
          setAvailableRoles(data.roles || []);
        });
    }
  }, [department]); // <-- Add 'department' to the dependency array

  // --- Functions moved from the main page! ---
  const openStaffModal = async (staff: any = null) => {
    if (staff) {
      // SAFE EDIT: Provide fallbacks so 'null' from the database never breaks React!
      setStaffForm({ id: staff.id || "", user_id: staff.user_id || "", name: staff.name || "", email: staff.email || "", 
        password: "", role: staff.role || availableRoles[0]?.name || "Security Officer", assigned_rooms: [] 
      });

      const res = await fetch(`/api/user_assignments/${staff.id}`);
      const data = await res.json();
      setStaffForm(prev => ({ ...prev, assigned_rooms: data.assigned_rooms || [] }));
      
    } else {
      setStaffForm({ id: "", user_id: "", name: "", email: "", password: "", 
        role: availableRoles[0]?.name || "Security Officer", assigned_rooms: [] 
      });
    }
    setStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(staffForm.id ? '/api/staff/edit' : '/api/staff/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffDbId: staffForm.id, ...staffForm })
    });
    if (res.ok) window.location.reload();
    else alert('Error saving staff.');
  };

  const deleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    const res = await fetch('/api/staff/delete', { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) 
    });
    if (res.ok) window.location.reload();
  };

  const toggleRoom = (roomId: string) => {
    setStaffForm(p => ({ 
      ...p, assigned_rooms: p.assigned_rooms.includes(roomId) 
        ? p.assigned_rooms.filter(id => id !== roomId) 
        : [...p.assigned_rooms, roomId] 
    }));
  };

  return (
    <>
      <div className="tracker-ui scroll outer box basis-95">
        <h3 className="row mt-0! font-bold">
          <span>{department} Staff</span>
          <IntButton icon={Plus} label="Add User" onClick={openStaffModal} classes={"btn-header btn-blue btn-auto m-0!"} />
        </h3>
        <div className="flex flex-wrap items-stretch gap-2 mt-4">
            {staffList.map(staff => (
            <div key={staff.id} className="tracker-ui mt-4 p-4! flex-1 basis-90">
              <div className="row m-0! mb-2! gap-2 font-bold">
              <h4 className="m-0 flex-3">{staff.name}</h4>
              <div className="row m-0! gap-2 flex-1 justify-end! h-full!">
                <IntButton icon={Pencil} label="Edit User" onClick={() => openStaffModal(staff)} classes={"btn btn-yellow btn-list m-0!"} />
                <IntButton icon={Trash} label="Delete User" onClick={() => deleteStaff(staff.id)} classes={"btn btn-red btn-list m-0!"} />
              </div>
              </div>
              <div><span className="sub-text">{staff.user_id} - {staff.email} <br/> {staff.role}</span></div>
              {staffRooms && (
              <>
                <div className="mt-2">
                <span>Rooms Assigned: </span>
                <span className="sub-text">{staffRooms[staff.user_id]?.length > 0 ? staffRooms[staff.user_id].join(", ") : "N/A"}</span>
                </div>
              </>
              )}
            </div>
            ))}
        </div>
      </div>

      {isStaffModalOpen && (
        <StaffModal 
          onClose={() => setStaffModalOpen(false)}
          onSubmit={handleStaffSubmit}
          staffForm={staffForm}
          setStaffForm={setStaffForm}
          availableRoles={availableRoles}
          availableRooms={availableRooms}
          toggleRoom={toggleRoom}
        />
      )}
    </>
  );
}