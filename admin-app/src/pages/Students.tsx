import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import { Upload, Plus, Trash2, Search, Check, AlertCircle, ArrowLeft, Folder } from "lucide-react";

export default function Students() {
  // State for Student Lists
  const [studentLists, setStudentLists] = useState<any[]>([]);
  const [currentList, setCurrentList] = useState<any>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listFormData, setListFormData] = useState({ department: "", year: "", batch: "", section: "" });

  // State for Students inside a List
  const [students, setStudents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ name: "", roll_number: "", department: "", year: 1, email: "", class_section: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [filterClass, setFilterClass] = useState("All Classes");
  const [searchTerm, setSearchTerm] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch lists on mount
  useEffect(() => {
    fetchStudentLists();
  }, []);

  const fetchStudentLists = () => {
    api.get("/admin/student_lists").then(res => setStudentLists(res.data)).catch(console.error);
  };

  const fetchStudentsForList = (listId: number) => {
    api.get(`/admin/students?student_list_id=${listId}`).then(res => {
      setStudents(res.data);
      setSelectedIds([]);
    }).catch(console.error);
  };

  // List Handlers
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/student_lists", listFormData);
      setShowListModal(false);
      setListFormData({ department: "", year: "", batch: "", section: "" });
      fetchStudentLists();
    } catch (err: any) {
      console.error("Error creating student list:", err);
      let errorMsg = "Error creating student list.";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === "string") {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      alert(errorMsg);
    }
  };

  const handleDeleteList = async (listId: number, count: number) => {
    if (window.confirm(`Are you sure you want to delete this Student List?\n\nWARNING: This will delete the list and all ${count} students inside it! Related allocations and logins will also be removed.`)) {
      try {
        await api.delete(`/admin/student_lists/${listId}`);
        fetchStudentLists();
      } catch (err) {
        alert("Failed to delete list.");
      }
    }
  };

  const openList = (list: any) => {
    setCurrentList(list);
    fetchStudentsForList(list.id);
  };

  const backToLists = () => {
    setCurrentList(null);
    setStudents([]);
    fetchStudentLists(); // refresh counts
  };

  // Student Handlers
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentList) return;
    try {
      const data = { 
        ...formData, 
        class_section: formData.class_section || currentList.section,
        department: formData.department || currentList.department,
        year: formData.year || parseInt(currentList.year) || 1,
        username: formData.roll_number.toLowerCase(), 
        password: formData.roll_number.toLowerCase(),
        student_list_id: currentList.id 
      };
      await api.post("/admin/students", data);
      alert(`Student created successfully!\n\nLogin Credentials:\nUsername: ${data.username}\nPassword: ${data.password}`);
      setShowModal(false);
      setFormData({ name: "", roll_number: "", department: "", year: 1, email: "", class_section: "" });
      fetchStudentsForList(currentList.id);
    } catch (err) {
      alert("Error adding student. Ensure roll number is unique.");
    }
  };

  const handleDelete = async (id: number) => {
    if(window.confirm("Are you sure?")) {
      await api.delete(`/admin/students/${id}`);
      if (currentList) fetchStudentsForList(currentList.id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected students?`)) {
      try {
        const res = await api.delete("/admin/students/bulk", { data: { ids: selectedIds } });
        alert(`${res.data.deleted} records deleted successfully.`);
        if (currentList) fetchStudentsForList(currentList.id);
      } catch (err: any) {
        alert(err.response?.data?.detail || "Bulk delete failed");
      }
    }
  };

  // Excel Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      setIsUploading(true);
      try {
        const res = await api.post("/admin/students/analyze", fd);
        setAnalysisData(res.data);
        setUploadFile(file);
        setShowUploadPreview(true);
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || "Upload failed";
        alert(errorMsg);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };
  
  const handleConfirmImport = async () => {
    if (!uploadFile || !analysisData || !currentList) return;
    
    const mapping: Record<string, string> = {};
    for (const col of analysisData.columns) {
      if (col.col_type === "STUDENT_FIELD" && col.mapped_field) {
        mapping[col.index] = col.mapped_field;
      }
    }
    
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("mapping", JSON.stringify(mapping));
    fd.append("header_row_idx", analysisData.header_row_idx.toString());
    fd.append("student_list_id", currentList.id.toString());
    
    setIsImporting(true);
    try {
      const res = await api.post("/admin/students/import_analyzed", fd);
      const { message, added, skipped_duplicates, errors } = res.data;
      let msg = `${message}\n\nStudents Added: ${added}\nDuplicates Skipped: ${skipped_duplicates}\n`;
      if (errors && errors.length > 0) {
        msg += "\nErrors:\n" + errors.join("\n");
      }
      alert(msg);
      setShowUploadPreview(false);
      setUploadFile(null);
      fetchStudentsForList(currentList.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const classOptions = Array.from(new Set(students.map(s => s.class_section).filter(Boolean)));
  
  const filteredStudents = students.filter(s => {
    const matchesClass = filterClass === "All Classes" || s.class_section === filterClass;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchLower) || s.roll_number.toLowerCase().includes(searchLower);
    return matchesClass && matchesSearch;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newIds = filteredStudents.map(s => s.id);
      setSelectedIds(newIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const allFilteredSelected = filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;
  const someFilteredSelected = selectedIds.length > 0 && selectedIds.length < filteredStudents.length;

  return (
    <div>
      {!currentList ? (
        // STUDENT LISTS VIEW
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Student Lists</h2>
            <button onClick={() => setShowListModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus size={18} className="mr-2" /> Create Student List
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentLists.map(list => (
              <div key={list.id} className="bg-white rounded-lg shadow border p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <Folder className="mr-2 text-blue-500" />
                    {list.department}
                  </h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-semibold">
                    Section {list.section}
                  </span>
                </div>
                
                <div className="flex-grow space-y-2 mb-6">
                  <p className="text-gray-600"><span className="font-semibold text-gray-700">Year:</span> {list.year}</p>
                  <p className="text-gray-600"><span className="font-semibold text-gray-700">Batch:</span> {list.batch}</p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-blue-900">Total Students</span>
                    <span className="text-xl font-bold text-blue-700">{list.students_count}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openList(list)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded font-semibold transition">
                    Open
                  </button>
                  <button 
                    onClick={() => {
                      openList(list);
                      setTimeout(() => fileInputRef.current?.click(), 100);
                    }} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition"
                  >
                    Upload Excel
                  </button>
                  <button onClick={() => handleDeleteList(list.id, list.students_count)} className="px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {studentLists.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded shadow">
                No student lists found. Create one to get started.
              </div>
            )}
          </div>
          
          <input type="file" accept=".csv,.xlsx" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>
      ) : (
        // INSIDE A STUDENT LIST VIEW
        <div>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={backToLists} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                {currentList.department} - {currentList.year} - {currentList.batch} - Section {currentList.section}
              </h2>
              <p className="text-gray-500 text-sm">Managing students for this specific group</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <select 
                value={filterClass} 
                onChange={e => { setFilterClass(e.target.value); setSelectedIds([]); }}
                className="border rounded px-3 py-1"
              >
                <option value="All Classes">All Classes</option>
                {classOptions.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
              </select>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSelectedIds([]); }}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <input type="file" accept=".csv,.xlsx" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`flex items-center px-4 py-2 text-white rounded ${isUploading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                <Upload size={18} className="mr-2" /> {isUploading ? "Analyzing..." : "Upload CSV/Excel"}
              </button>
              <button onClick={() => setShowModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Plus size={18} className="mr-2" /> Add Student
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={allFilteredSelected}
                      ref={input => { if (input) input.indeterminate = someFilteredSelected; }}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class/Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No records found in this list.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(s => (
                    <tr key={s.id} className={selectedIds.includes(s.id) ? "bg-blue-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.includes(s.id)}
                          onChange={e => handleSelectOne(s.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{s.roll_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{s.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{s.class_section}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{s.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{s.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE LIST MODAL */}
      {showListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Create Student List</h3>
            <form onSubmit={handleCreateList}>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input className="w-full px-3 py-2 border rounded" placeholder="e.g. CSE" required value={listFormData.department} onChange={e => setListFormData({...listFormData, department: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input className="w-full px-3 py-2 border rounded" placeholder="e.g. 2nd Year" required value={listFormData.year} onChange={e => setListFormData({...listFormData, year: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                  <input className="w-full px-3 py-2 border rounded" placeholder="e.g. 2024-2028" required value={listFormData.batch} onChange={e => setListFormData({...listFormData, batch: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input className="w-full px-3 py-2 border rounded" placeholder="e.g. A" required value={listFormData.section} onChange={e => setListFormData({...listFormData, section: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowListModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Create List</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL UPLOAD PREVIEW MODAL */}
      {showUploadPreview && analysisData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">FILE ANALYSIS COMPLETE</h3>
            
            <div className="mb-6 bg-gray-50 p-4 rounded border">
              <p className="text-gray-700"><strong>Detected table:</strong> Rows {analysisData.header_row_idx + 2} to end</p>
              <p className="text-gray-700"><strong>Students detected:</strong> {analysisData.total_students}</p>
            </div>
            
            {analysisData.needs_review && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800 flex items-start">
                <AlertCircle className="mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold">Manual Review Recommended</p>
                  <p className="text-sm">We were unable to confidently identify all required fields, or confidence is low.</p>
                  {analysisData.missing_required.length > 0 && (
                    <p className="text-sm font-semibold mt-1">Missing: {analysisData.missing_required.join(", ")}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-3">Student fields detected:</h4>
              <ul className="space-y-2">
                {analysisData.columns.filter((c: any) => c.col_type === "STUDENT_FIELD").map((c: any, i: number) => (
                  <li key={i} className="flex items-center text-gray-800">
                    <Check className="text-green-500 mr-2" size={18} />
                    <span className="w-32 font-semibold capitalize">{c.mapped_field.replace("_", " ")}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">"{c.header}"</span>
                    <span className="ml-3 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{c.confidence}% confident</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-8">
              <h4 className="font-bold text-lg mb-3">Ignored Information:</h4>
              <ul className="space-y-1 text-sm text-gray-500 list-disc list-inside">
                {analysisData.columns.filter((c: any) => c.col_type !== "STUDENT_FIELD").map((c: any, i: number) => (
                  <li key={i}>
                    "{c.header}" <span className="italic">({c.col_type.replace("_", " ").toLowerCase()})</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                onClick={() => { setShowUploadPreview(false); setUploadFile(null); }} 
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmImport} 
                disabled={analysisData.missing_required.length > 0 || isImporting}
                className={`px-6 py-2 text-white rounded font-semibold ${(analysisData.missing_required.length > 0 || isImporting) ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isImporting ? `Importing ${analysisData.total_students} Students...` : `Import ${analysisData.total_students} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE STUDENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add Student</h3>
            <form onSubmit={handleAdd}>
              <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded">
                <strong>Note:</strong> The student's login username and temporary password will default to their Roll Number (lowercase).
              </p>
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Roll Number" required value={formData.roll_number} onChange={e => setFormData({...formData, roll_number: e.target.value})} />
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Class / Section" value={formData.class_section || currentList?.section || ""} onChange={e => setFormData({...formData, class_section: e.target.value})} />
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Department" value={formData.department || currentList?.department || ""} onChange={e => setFormData({...formData, department: e.target.value})} />
              <input className="w-full mb-3 px-3 py-2 border rounded" placeholder="Year" type="number" value={formData.year || parseInt(currentList?.year) || 1} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || 1})} />
              <input className="w-full mb-4 px-3 py-2 border rounded" placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
