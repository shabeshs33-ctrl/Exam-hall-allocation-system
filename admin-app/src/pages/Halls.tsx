import React, { useEffect, useState } from "react";
import api from "../api";
import { Plus, Trash2, Search, Info } from "lucide-react";

export default function Halls() {
  const [halls, setHalls] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ hall_number: "", building: "", capacity: 30 });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHall, setSelectedHall] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchHalls = () => {
    api.get("/admin/halls").then(res => {
      setHalls(res.data);
      setSelectedIds([]); // clear selection
    }).catch(console.error);
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/halls", formData);
      setShowModal(false);
      setFormData({ hall_number: "", building: "", capacity: 30 });
      fetchHalls();
    } catch (err) {
      alert("Error adding hall. Ensure hall number is unique.");
    }
  };

  const handleDelete = async (id: number) => {
    if(window.confirm("Are you sure?")) {
      await api.delete(`/admin/halls/${id}`);
      if (selectedHall && selectedHall.id === id) setSelectedHall(null);
      fetchHalls();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected halls?`)) {
      try {
        const res = await api.delete("/admin/halls/bulk", { data: { ids: selectedIds } });
        alert(`${res.data.deleted} records deleted successfully.`);
        fetchHalls();
      } catch (err: any) {
        alert(err.response?.data?.detail || "Bulk delete failed");
      }
    }
  };

  const filteredHalls = halls.filter(h => {
    const searchLower = searchTerm.toLowerCase();
    return !searchTerm || h.hall_number.toLowerCase().includes(searchLower) || h.building.toLowerCase().includes(searchLower);
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredHalls.map(h => h.id));
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

  const allFilteredSelected = filteredHalls.length > 0 && selectedIds.length === filteredHalls.length;
  const someFilteredSelected = selectedIds.length > 0 && selectedIds.length < filteredHalls.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Halls</h2>
        <div className="flex gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search halls..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedIds([]); }}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded border border-red-200">
              <span className="text-red-700 font-medium">{selectedIds.length} selected</span>
              <button onClick={handleBulkDelete} className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                <Trash2 size={16} className="mr-1" /> Delete Selected
              </button>
            </div>
          )}
          <button onClick={() => setShowModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Plus size={18} className="mr-2" /> Add Hall
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 px-1">
        <input 
          type="checkbox"
          className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer h-4 w-4"
          checked={allFilteredSelected}
          ref={input => { if (input) input.indeterminate = someFilteredSelected; }}
          onChange={handleSelectAll}
          id="selectAllHalls"
        />
        <label htmlFor="selectAllHalls" className="text-gray-700 font-medium cursor-pointer select-none">
          Select All
        </label>
      </div>

      {filteredHalls.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No records found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredHalls.map(h => (
            <div key={h.id} className={`bg-white rounded-lg shadow overflow-hidden border flex flex-col ${selectedIds.includes(h.id) ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
              <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox"
                    className="mt-1 rounded border-green-400 text-green-600 focus:ring-green-500 cursor-pointer"
                    checked={selectedIds.includes(h.id)}
                    onChange={(ev) => handleSelectOne(h.id, ev.target.checked)}
                  />
                  <div>
                    <h3 className="font-bold text-lg uppercase">{h.hall_number}</h3>
                  </div>
                </div>
                <button onClick={(ev) => { ev.stopPropagation(); handleDelete(h.id); }} className="text-green-200 hover:text-white">
                  <Trash2 size={18}/>
                </button>
              </div>
              <div className="px-6 py-4 flex-grow">
                <p className="text-gray-600 mb-1"><span className="font-semibold">Capacity:</span> {h.capacity}</p>
                <p className="text-gray-600"><span className="font-semibold">Building:</span> {h.building}</p>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setSelectedHall(h)} className="text-green-600 hover:text-green-800 font-medium flex items-center text-sm w-full justify-center">
                  <Info size={16} className="mr-1" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add Hall</h3>
            <form onSubmit={handleAdd}>
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Hall Number" required value={formData.hall_number} onChange={e => setFormData({...formData, hall_number: e.target.value})} />
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Building" required value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} />
              <input type="number" className="w-full mb-4 px-3 py-2 border rounded" placeholder="Capacity" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
              
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedHall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-0 rounded-lg w-96 shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-green-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg uppercase text-center">{selectedHall.hall_number}</h3>
            </div>
            <div className="px-6 py-6 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Hall Name</span>
                <span className="font-medium">{selectedHall.hall_number}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Capacity</span>
                <span className="font-medium">{selectedHall.capacity}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Building</span>
                <span className="font-medium">{selectedHall.building}</span>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t">
              <button onClick={() => setSelectedHall(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
