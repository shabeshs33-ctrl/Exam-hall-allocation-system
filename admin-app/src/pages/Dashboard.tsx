import React, { useEffect, useState } from "react";
import api from "../api";
import { Users, FileText, Building, ListOrdered, Search } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_exams: 0,
    total_halls: 0,
    total_allocated_students: 0,
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [allData, setAllData] = useState<any>({ students: [], exams: [], halls: [], allocations: [] });

  useEffect(() => {
    api.get("/admin/stats").then((res) => {
      setStats(res.data);
    }).catch(console.error);

    Promise.all([
      api.get("/admin/students"),
      api.get("/admin/exams"),
      api.get("/admin/halls"),
      api.get("/admin/allocation")
    ]).then(([st, ex, ha, al]) => {
      setAllData({
        students: st.data,
        exams: ex.data,
        halls: ha.data,
        allocations: al.data
      });
    }).catch(console.error);
  }, []);

  const searchLower = searchTerm.toLowerCase();
  
  const matchedStudents = allData.students.filter((s: any) => 
    s.name.toLowerCase().includes(searchLower) || s.roll_number.toLowerCase().includes(searchLower)
  );
  const matchedExams = allData.exams.filter((e: any) => 
    e.exam_name.toLowerCase().includes(searchLower) || e.exam_date.toLowerCase().includes(searchLower)
  );
  const matchedHalls = allData.halls.filter((h: any) => 
    h.hall_number.toLowerCase().includes(searchLower) || h.building.toLowerCase().includes(searchLower)
  );
  const matchedAllocations = allData.allocations.filter((a: any) => 
    a.student.name.toLowerCase().includes(searchLower) ||
    a.student.roll_number.toLowerCase().includes(searchLower) ||
    a.exam.exam_name.toLowerCase().includes(searchLower) ||
    a.hall.hall_number.toLowerCase().includes(searchLower)
  );

  const totalMatches = matchedStudents.length + matchedExams.length + matchedHalls.length + matchedAllocations.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
      </div>

      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search students, exams, halls, allocations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        />
      </div>

      {!searchTerm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Students</p>
              <p className="text-2xl font-semibold text-gray-700">{stats.total_students}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Exams</p>
              <p className="text-2xl font-semibold text-gray-700">{stats.total_exams}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <Building size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Halls</p>
              <p className="text-2xl font-semibold text-gray-700">{stats.total_halls}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
              <ListOrdered size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Allocations</p>
              <p className="text-2xl font-semibold text-gray-700">{stats.total_allocated_students}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          {totalMatches === 0 ? (
            <div className="text-center text-gray-500 py-8">No matching records found.</div>
          ) : (
            <div className="space-y-6">
              {matchedStudents.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Students</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedStudents.map((s: any) => (
                      <div key={s.id} className="p-4 border rounded bg-gray-50">
                        <p className="font-bold text-blue-600">{s.name}</p>
                        <p className="text-sm text-gray-600">Roll No: {s.roll_number}</p>
                        <p className="text-sm text-gray-600">Class: {s.class_section}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {matchedExams.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Exams</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedExams.map((e: any) => (
                      <div key={e.id} className="p-4 border rounded bg-gray-50">
                        <p className="font-bold text-blue-600">{e.exam_name}</p>
                        <p className="text-sm text-gray-600">Date: {e.exam_date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchedHalls.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Halls</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedHalls.map((h: any) => (
                      <div key={h.id} className="p-4 border rounded bg-gray-50">
                        <p className="font-bold text-blue-600">{h.hall_number}</p>
                        <p className="text-sm text-gray-600">Capacity: {h.capacity}</p>
                        <p className="text-sm text-gray-600">Building: {h.building}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchedAllocations.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-700 mb-3 border-b pb-2">Allocations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedAllocations.map((a: any) => (
                      <div key={a.id} className="p-4 border rounded bg-gray-50">
                        <p className="font-bold text-purple-600">{a.exam.exam_name}</p>
                        <p className="text-sm text-gray-600">Student: {a.student.name} ({a.student.roll_number})</p>
                        <p className="text-sm text-gray-600">Hall: {a.hall.hall_number} - Seat: {a.seat_number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
