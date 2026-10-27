import React, { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get("/students/me").then(res => setProfile(res.data)).catch(console.error);
  }, []);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">My Profile</h2>
      <div className="bg-white p-8 rounded-lg shadow max-w-2xl">
        <div className="grid grid-cols-3 gap-4 border-b pb-4 mb-4">
          <div className="font-semibold text-gray-600">Name</div>
          <div className="col-span-2 text-gray-900">{profile.name}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-b pb-4 mb-4">
          <div className="font-semibold text-gray-600">Roll Number</div>
          <div className="col-span-2 text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded inline-block w-max">{profile.roll_number}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-b pb-4 mb-4">
          <div className="font-semibold text-gray-600">Department</div>
          <div className="col-span-2 text-gray-900">{profile.department}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-b pb-4 mb-4">
          <div className="font-semibold text-gray-600">Class/Section</div>
          <div className="col-span-2 text-gray-900">{profile.class_section || 'N/A'}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-b pb-4 mb-4">
          <div className="font-semibold text-gray-600">Year</div>
          <div className="col-span-2 text-gray-900">{profile.year}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="font-semibold text-gray-600">Email</div>
          <div className="col-span-2 text-gray-900">{profile.email || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}
