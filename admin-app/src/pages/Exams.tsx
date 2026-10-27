import React, { useEffect, useState } from "react";
import api from "../api";
import { Plus, Trash2, Search, Info } from "lucide-react";

export default function Exams() {
  const [exams, setExams] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ exam_name: "", subject: "", exam_date: "", start_time: "", end_time: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchExams = () => {
    api.get("/admin/exams").then(res => {
      setExams(res.data);
      setSelectedIds([]); // clear selection
    }).catch(console.error);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/exams", formData);
      setShowModal(false);
      setFormData({ exam_name: "", subject: "", exam_date: "", start_time: "", end_time: "" });
      fetchExams();
    } catch (err) {
      alert("Error adding exam");
    }
  };

  const handleDelete = async (id: number) => {
    if(window.confirm("Are you sure?")) {
      await api.delete(`/admin/exams/${id}`);
      if (selectedExam && selectedExam.id === id) setSelectedExam(null);
      fetchExams();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected exams?`)) {
      try {
        const res = await api.delete("/admin/exams/bulk", { data: { ids: selectedIds } });
        alert(`${res.data.deleted} records deleted successfully.`);
        fetchExams();
      } catch (err: any) {
        alert(err.response?.data?.detail || "Bulk delete failed");
      }
    }
  };

  const filteredExams = exams.filter(e => {
    const searchLower = searchTerm.toLowerCase();
    return !searchTerm || e.exam_name.toLowerCase().includes(searchLower) || e.exam_date.toLowerCase().includes(searchLower);
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredExams.map(ex => ex.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selId => selId !== id));
    }
  };

  const allFilteredSelected = filteredExams.length > 0 && selectedIds.length === filteredExams.length;
  const someFilteredSelected = selectedIds.length > 0 && selectedIds.length < filteredExams.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Exams</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedIds([]); }}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded border border-red-200">
              <span className="text-red-700 font-medium">{selectedIds.length} selected</span>
              <button onClick={handleBulkDelete} className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                <Trash2 size={16} className="mr-1" /> Delete Selected
              </button>
            </div>
          )}
          <button onClick={() => setShowModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Plus size={18} className="mr-2" /> Add Exam
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 px-1">
        <input 
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
          checked={allFilteredSelected}
          ref={input => { if (input) input.indeterminate = someFilteredSelected; }}
          onChange={handleSelectAll}
          id="selectAllExams"
        />
        <label htmlFor="selectAllExams" className="text-gray-700 font-medium cursor-pointer select-none">
          Select All
        </label>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No records found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(e => (
            <div key={e.id} className={`bg-white rounded-lg shadow overflow-hidden border flex flex-col ${selectedIds.includes(e.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
              <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox"
                    className="mt-1 rounded border-blue-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={selectedIds.includes(e.id)}
                    onChange={(ev) => handleSelectOne(e.id, ev.target.checked)}
                  />
                  <div>
                    <h3 className="font-bold text-lg uppercase">{e.exam_name}</h3>
                    <p className="text-blue-100 text-sm">{e.subject}</p>
                  </div>
                </div>
                <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="text-blue-200 hover:text-white">
                  <Trash2 size={18}/>
                </button>
              </div>
              <div className="px-6 py-4 flex-grow">
                <p className="text-gray-600 mb-1"><span className="font-semibold">Date:</span> {e.exam_date}</p>
                <p className="text-gray-600"><span className="font-semibold">Time:</span> {e.start_time} - {e.end_time}</p>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setSelectedExam(e)} className="text-blue-600 hover:text-blue-800 font-medium flex items-center text-sm w-full justify-center">
                  <Info size={16} className="mr-1" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add Exam</h3>
            <form onSubmit={handleAdd}>
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Exam Name" required value={formData.exam_name} onChange={e => setFormData({...formData, exam_name: e.target.value})} />
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Subject" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
              <input type="date" className="w-full mb-3 px-3 py-2 border rounded" required value={formData.exam_date} onChange={e => setFormData({...formData, exam_date: e.target.value})} />
              <div className="flex gap-2 mb-4">
                <input type="time" className="w-full px-3 py-2 border rounded" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                <input type="time" className="w-full px-3 py-2 border rounded" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
              </div>
              
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-0 rounded-lg w-96 shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg uppercase text-center">{selectedExam.exam_name}</h3>
            </div>
            <div className="px-6 py-6 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Subject</span>
                <span className="font-medium">{selectedExam.subject}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{selectedExam.exam_date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Start Time</span>
                <span className="font-medium">{selectedExam.start_time}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">End Time</span>
                <span className="font-medium">{selectedExam.end_time}</span>
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
