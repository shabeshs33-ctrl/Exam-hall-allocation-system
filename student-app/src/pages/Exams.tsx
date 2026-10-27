
import React, { useEffect, useState } from "react";
import api from "../api";
import { Search, Info } from "lucide-react";

export default function Exams() {
  const [exams, setExams] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<any>(null);

  useEffect(() => {
    api.get("/students/me/exams").then(res => setExams(res.data)).catch(console.error);
  }, []);

  const filteredExams = exams.filter(e => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      e.exam_name.toLowerCase().includes(searchLower) ||
      e.exam_date.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Exam Details</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-gray-500 text-center">No matching records found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <div key={exam.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-shadow flex flex-col" onClick={() => setSelectedExam(exam)}>
              <div className="bg-blue-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold mb-1">{exam.exam_name}</h3>
                <p className="text-blue-100">{exam.subject}</p>
              </div>
              <div className="px-6 py-4 flex-grow">
                <p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Date:</span> {exam.exam_date}</p>
                <p className="text-sm text-gray-600"><span className="font-semibold">Time:</span> {exam.start_time} to {exam.end_time}</p>
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

      {selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-0 rounded-lg w-full max-w-[400px] shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg uppercase text-center">{selectedExam.exam_name}</h3>
            </div>
            <div className="px-6 py-6 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Subject</span>
                <span className="font-medium text-right">{selectedExam.subject}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-right">{selectedExam.exam_date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Start Time</span>
                <span className="font-medium text-right">{selectedExam.start_time}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">End Time</span>
                <span className="font-medium text-right">{selectedExam.end_time}</span>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t">
              <button onClick={() => setSelectedExam(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
