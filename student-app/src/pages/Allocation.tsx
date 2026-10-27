import React, { useEffect, useState } from "react";
import api from "../api";
import { Search, Info } from "lucide-react";

export default function Allocation() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);

  useEffect(() => {
    api.get("/students/me/allocation").then(res => setAllocations(res.data)).catch(console.error);
  }, []);

  const filteredAllocations = allocations.filter(a => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      a.exam.exam_name.toLowerCase().includes(searchLower) ||
      a.hall.hall_number.toLowerCase().includes(searchLower) ||
      a.exam.exam_date.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Hall Allocation</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search allocations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>
      
      {filteredAllocations.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-gray-500 text-center">No matching records found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAllocations.map(alloc => (
            <div key={alloc.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAllocation(alloc)}>
              <div className="bg-green-600 text-white p-4">
                <h3 className="text-lg font-bold">{alloc.exam.exam_name}</h3>
                <p className="text-green-100">{alloc.exam.subject}</p>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-800">{alloc.exam.exam_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-semibold text-gray-800">{alloc.exam.start_time}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Hall Number</p>
                    <p className="text-2xl font-bold text-gray-800">{alloc.hall.hall_number}</p>
                    <p className="text-xs text-gray-500">{alloc.hall.building}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Seat Number</p>
                    <div className="inline-block bg-blue-100 text-blue-800 text-2xl font-bold px-4 py-2 rounded-lg">
                      {alloc.seat_number}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-center">
                <span className="text-blue-600 font-medium flex items-center text-sm">
                  <Info size={16} className="mr-1" /> View Details
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-0 rounded-lg w-full max-w-[450px] shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-green-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg uppercase text-center">{selectedAllocation.exam.exam_name}</h3>
            </div>
            <div className="px-6 py-6 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Exam</span>
                <span className="font-medium text-right max-w-[200px]">{selectedAllocation.exam.exam_name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-right">{selectedAllocation.exam.exam_date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-right">{selectedAllocation.exam.start_time} - {selectedAllocation.exam.end_time}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Hall</span>
                <span className="font-medium text-right">{selectedAllocation.hall.hall_number} ({selectedAllocation.hall.building})</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Seat No</span>
                <span className="font-bold text-blue-600 text-right text-lg">{selectedAllocation.seat_number}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-green-600 text-right">Allocated</span>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t">
              <button onClick={() => setSelectedAllocation(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
