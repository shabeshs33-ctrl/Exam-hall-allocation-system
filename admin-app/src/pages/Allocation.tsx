import React, { useEffect, useState } from "react";
import api from "../api";
import { Play, Search, Info, Trash2 } from "lucide-react";

export default function Allocation() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [studentLists, setStudentLists] = useState<any[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [selectedExam, setSelectedExam] = useState("");
  const [allocationMode, setAllocationMode] = useState("same_section");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  const [selectedDepartment2, setSelectedDepartment2] = useState("");
  const [selectedYear2, setSelectedYear2] = useState("");
  const [selectedBatch2, setSelectedBatch2] = useState("");
  const [selectedSection2, setSelectedSection2] = useState("");
  const [selectedHalls, setSelectedHalls] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [filterHall, setFilterHall] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchAllocations = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    if (filterDepartment) params.append("department", filterDepartment);
    if (filterYear) params.append("year", filterYear);
    if (filterBatch) params.append("batch", filterBatch);
    if (filterSection) params.append("section", filterSection);
    if (filterExam) params.append("exam_id", filterExam);
    if (filterHall) params.append("hall_id", filterHall);

    api.get(`/admin/allocation?${params.toString()}`).then(res => {
      setAllocations(res.data);
      setSelectedIds([]); // clear selection
    }).catch(console.error);
  };

  const fetchFormOptions = async () => {
    try {
      const [ex, st, ha, sl] = await Promise.all([
        api.get("/admin/exams"),
        api.get("/admin/students"),
        api.get("/admin/halls"),
        api.get("/admin/student_lists")
      ]);
      setExams(ex.data);
      setStudents(st.data);
      setHalls(ha.data);
      setStudentLists(sl.data);
    } catch (error) {
      console.error("Failed to fetch form options", error);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [filterDepartment, filterYear, filterBatch, filterSection, filterExam, filterHall]);

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchAllocations();
    }, 300);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    fetchFormOptions();
  }, []);

  const handleGenerateClick = () => {
    setShowGenerateModal(true);
  };

  const departmentOptions = Array.from(new Set(studentLists.map(sl => sl.department).filter(Boolean)));
  
  const getYearOptions = (dept: string) => Array.from(new Set(studentLists.filter(sl => !dept || sl.department === dept).map(sl => sl.year).filter(Boolean))).sort();
  const getBatchOptions = (dept: string, year: string) => Array.from(new Set(studentLists.filter(sl => (!dept || sl.department === dept) && (!year || sl.year === year)).map(sl => sl.batch).filter(Boolean))).sort();
  const getSectionOptions = (dept: string, year: string, batch: string) => Array.from(new Set(studentLists.filter(sl => (!dept || sl.department === dept) && (!year || sl.year === year) && (!batch || sl.batch === batch)).map(sl => sl.section).filter(Boolean))).sort();

  const yearOptions = getYearOptions(selectedDepartment);
  const batchOptions = getBatchOptions(selectedDepartment, selectedYear);
  const sectionOptions = getSectionOptions(selectedDepartment, selectedYear, selectedBatch);

  const yearOptions2 = getYearOptions(selectedDepartment2);
  const batchOptions2 = getBatchOptions(selectedDepartment2, selectedYear2);
  const sectionOptions2 = getSectionOptions(selectedDepartment2, selectedYear2, selectedBatch2);
  
  const matchingLists = studentLists.filter(sl => {
    if (allocationMode === "same_section") {
      return (!selectedDepartment || sl.department === selectedDepartment) &&
             (!selectedYear || sl.year === selectedYear) &&
             (!selectedBatch || sl.batch === selectedBatch) &&
             (!selectedSection || sl.section === selectedSection);
    } else {
      const match1 = (!selectedDepartment || sl.department === selectedDepartment) &&
                     (!selectedYear || sl.year === selectedYear) &&
                     (!selectedBatch || sl.batch === selectedBatch) &&
                     (!selectedSection || sl.section === selectedSection);
      const match2 = selectedDepartment2 && (!selectedDepartment2 || sl.department === selectedDepartment2) &&
                     (!selectedYear2 || sl.year === selectedYear2) &&
                     (!selectedBatch2 || sl.batch === selectedBatch2) &&
                     (!selectedSection2 || sl.section === selectedSection2);
      return match1 || match2;
    }
  });
  const matchingStudents = students.filter(s => matchingLists.some(sl => sl.id === s.student_list_id));


  
  const handleHallToggle = (id: number) => {
    setSelectedHalls(prev => prev.includes(id) ? prev.filter(hId => hId !== id) : [...prev, id]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || selectedHalls.length === 0) {
      alert("Please select an exam and at least one hall.");
      return;
    }
    
    if (allocationMode === "same_section") {
      if (!selectedDepartment || !selectedYear || !selectedBatch || !selectedSection) {
        alert("Please select Department, Year, Batch, and Section.");
        return;
      }
    } else {
      if (!selectedDepartment || !selectedYear || !selectedBatch || !selectedSection ||
          !selectedDepartment2 || !selectedYear2 || !selectedBatch2 || !selectedSection2) {
        alert("Please completely fill out both groups for Mixed Department.");
        return;
      }
      if (selectedDepartment === selectedDepartment2) {
        alert("Department 1 and Department 2 must be different.");
        return;
      }
    }
    
    if (matchingStudents.length === 0) {
      alert("No students found for the selected criteria.");
      return;
    }

    try {
      const payload = {
        exam_id: parseInt(selectedExam),
        allocation_mode: allocationMode,
        group1: {
          department: selectedDepartment,
          year: selectedYear,
          batch: selectedBatch,
          section: selectedSection,
        },
        group2: allocationMode === "mixed_department" ? {
          department: selectedDepartment2,
          year: selectedYear2,
          batch: selectedBatch2,
          section: selectedSection2,
        } : null,
        hall_ids: selectedHalls
      };
      const res = await api.post("/admin/allocation/generate", payload);
      alert(res.data.message);
      setShowGenerateModal(false);
      fetchAllocations();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Allocation failed");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected allocations?`)) {
      try {
        const res = await api.delete("/admin/allocation/bulk", { data: { ids: selectedIds } });
        alert(`${res.data.deleted} records deleted successfully.`);
        fetchAllocations();
      } catch (err: any) {
        alert(err.response?.data?.detail || "Bulk delete failed");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(allocations.map(a => a.id));
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

  const allFilteredSelected = allocations.length > 0 && selectedIds.length === allocations.length;
  const someFilteredSelected = selectedIds.length > 0 && selectedIds.length < allocations.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Hall Allocation</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search allocations..."
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
          <button onClick={handleGenerateClick} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Play size={18} className="mr-2" /> Generate Allocation
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-center bg-gray-50 p-4 rounded-lg border">
        <span className="font-semibold text-sm text-gray-700">Filters:</span>
        <select value={filterDepartment} onChange={e => { setFilterDepartment(e.target.value); setSelectedIds([]); }} className="border p-1.5 rounded text-sm bg-white text-gray-700">
           <option value="">Department: All</option>
           {Array.from(new Set(studentLists.map(sl => sl.department))).filter(Boolean).map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setSelectedIds([]); }} className="border p-1.5 rounded text-sm bg-white text-gray-700">
           <option value="">Year: All</option>
           {Array.from(new Set(studentLists.filter(sl => !filterDepartment || sl.department === filterDepartment).map(sl => sl.year))).filter(Boolean).map(y => <option key={y as string} value={y as string}>{y as string}</option>)}
        </select>
        <select value={filterBatch} onChange={e => { setFilterBatch(e.target.value); setSelectedIds([]); }} className="border p-1.5 rounded text-sm bg-white text-gray-700">
           <option value="">Batch: All</option>
           {Array.from(new Set(studentLists.filter(sl => (!filterDepartment || sl.department === filterDepartment) && (!filterYear || sl.year === filterYear)).map(sl => sl.batch))).filter(Boolean).map(b => <option key={b as string} value={b as string}>{b as string}</option>)}
        </select>
        <select value={filterSection} onChange={e => { setFilterSection(e.target.value); setSelectedIds([]); }} className="border p-1.5 rounded text-sm bg-white text-gray-700">
           <option value="">Section: All</option>
           {Array.from(new Set(studentLists.filter(sl => (!filterDepartment || sl.department === filterDepartment) && (!filterYear || sl.year === filterYear) && (!filterBatch || sl.batch === filterBatch)).map(sl => sl.section))).filter(Boolean).map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
        </select>
        <select value={filterExam} onChange={e => { setFilterExam(e.target.value); setSelectedIds([]); }} className="border p-1.5 rounded text-sm bg-white text-gray-700 max-w-[150px] truncate">
           <option value="">Exam: All</option>
           {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name}</option>)}
        </select>
        <select value={filterHall} onChange={e => { setFilterHall(e.target.value); setSelectedIds([]); }} className="border p-1.5 rounded text-sm bg-white text-gray-700 max-w-[150px] truncate">
           <option value="">Hall: All</option>
           {halls.map(h => <option key={h.id} value={h.id}>{h.hall_number}</option>)}
        </select>
      </div>

      <div className="mb-4 flex items-center gap-2 px-1">
        <input 
          type="checkbox"
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
          checked={allFilteredSelected}
          ref={input => { if (input) input.indeterminate = someFilteredSelected; }}
          onChange={handleSelectAll}
          id="selectAllAllocations"
        />
        <label htmlFor="selectAllAllocations" className="text-gray-700 font-medium cursor-pointer select-none">
          Select All
        </label>
      </div>

      {allocations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No records found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allocations.map(a => (
            <div key={a.id} className={`bg-white rounded-lg shadow overflow-hidden border flex flex-col ${selectedIds.includes(a.id) ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200'}`}>
              <div className="bg-purple-600 text-white px-6 py-4 flex justify-start items-center gap-3">
                <input 
                  type="checkbox"
                  className="rounded border-purple-400 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  checked={selectedIds.includes(a.id)}
                  onChange={(ev) => handleSelectOne(a.id, ev.target.checked)}
                />
                <h3 className="font-bold text-lg uppercase truncate">{a.exam.exam_name}</h3>
              </div>
              <div className="px-6 py-4 flex-grow space-y-2 text-sm">
                <p className="flex justify-between"><span className="text-gray-500">Student:</span> <span className="font-medium text-gray-800">{a.student.name}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Roll No:</span> <span className="font-medium text-gray-800">{a.student.roll_number}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Department:</span> <span className="font-medium text-gray-800">{a.student.student_list?.department || a.student.department || "-"}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Year:</span> <span className="font-medium text-gray-800">{a.student.student_list?.year || a.student.year || "-"}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Batch:</span> <span className="font-medium text-gray-800">{a.student.student_list?.batch || "-"}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Section:</span> <span className="font-medium text-gray-800">{a.student.student_list?.section || a.student.class_section || "-"}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Date:</span> <span className="font-medium text-gray-800">{a.exam.exam_date}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Time:</span> <span className="font-medium text-gray-800">{a.exam.start_time}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Hall:</span> <span className="font-medium text-gray-800">{a.hall.hall_number}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Seat No:</span> <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{a.seat_number}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">Status:</span> <span className="font-medium text-green-600">Allocated</span></p>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setSelectedAllocation(a)} className="text-purple-600 hover:text-purple-800 font-medium flex items-center text-sm w-full justify-center">
                  <Info size={16} className="mr-1" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Generate Allocation</h3>
            <form onSubmit={handleGenerate}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Select Exam</label>
                <select className="w-full px-3 py-2 border rounded" value={selectedExam} onChange={e => setSelectedExam(e.target.value)} required>
                  <option value="">-- Choose Exam --</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} - {e.subject}</option>)}
                </select>
              </div>

              <div className="mb-4 border-b pb-4">
                <label className="block mb-2 font-medium">Allocation Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="allocationMode" value="same_section" checked={allocationMode === "same_section"} onChange={() => setAllocationMode("same_section")} />
                    Same Section
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="allocationMode" value="mixed_department" checked={allocationMode === "mixed_department"} onChange={() => setAllocationMode("mixed_department")} />
                    Mixed Department
                  </label>
                </div>
              </div>
              
              {allocationMode === "same_section" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 font-medium text-sm">Department</label>
                    <select className="w-full px-3 py-2 border rounded text-sm" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} required>
                      <option value="">-- Choose --</option>
                      <option value="All Departments">All</option>
                      {departmentOptions.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm">Year</label>
                    <select className="w-full px-3 py-2 border rounded text-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} required>
                      <option value="">-- Choose --</option>
                      <option value="All Years">All</option>
                      {yearOptions.map(y => <option key={y as string} value={y as string}>{y as string}{['1','2','3','4'].includes(y as string) ? ' Year' : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm">Batch</label>
                    <select className="w-full px-3 py-2 border rounded text-sm" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} required>
                      <option value="">-- Choose --</option>
                      <option value="All Batches">All</option>
                      {batchOptions.map(b => <option key={b as string} value={b as string}>{b as string}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm">Section</label>
                    <select className="w-full px-3 py-2 border rounded text-sm" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} required>
                      <option value="">-- Choose --</option>
                      {sectionOptions.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="mb-4 p-4 border rounded bg-gray-50">
                    <h4 className="font-bold mb-3 text-gray-700">Department 1</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block mb-2 font-medium text-sm">Department</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {departmentOptions.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm">Year</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {yearOptions.map(y => <option key={y as string} value={y as string}>{y as string}{['1','2','3','4'].includes(y as string) ? ' Year' : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm">Batch</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {batchOptions.map(b => <option key={b as string} value={b as string}>{b as string}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm">Section</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {sectionOptions.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded bg-gray-50">
                    <h4 className="font-bold mb-3 text-gray-700">Department 2</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block mb-2 font-medium text-sm">Department</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedDepartment2} onChange={e => setSelectedDepartment2(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {departmentOptions.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm">Year</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedYear2} onChange={e => setSelectedYear2(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {yearOptions2.map(y => <option key={y as string} value={y as string}>{y as string}{['1','2','3','4'].includes(y as string) ? ' Year' : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm">Batch</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedBatch2} onChange={e => setSelectedBatch2(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {batchOptions2.map(b => <option key={b as string} value={b as string}>{b as string}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm">Section</label>
                        <select className="w-full px-3 py-2 border rounded text-sm" value={selectedSection2} onChange={e => setSelectedSection2(e.target.value)} required>
                          <option value="">-- Choose --</option>
                          {sectionOptions2.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6 border rounded p-3 h-32 overflow-y-auto">
                <label className="block mb-2 font-medium flex justify-between">
                  <span>Select Halls ({selectedHalls.length})</span>
                  <button type="button" className="text-sm text-blue-600" onClick={() => setSelectedHalls(halls.map(h => h.id))}>Select All</button>
                </label>
                {halls.map(h => (
                  <label key={h.id} className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={selectedHalls.includes(h.id)} onChange={() => handleHallToggle(h.id)} />
                    {h.hall_number} ({h.building}) - Capacity: {h.capacity}
                  </label>
                ))}
              </div>

              <div className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">Pre-flight Validation</h4>
                
                {matchingLists.length > 0 && (
                  <div className="mb-3 text-sm text-blue-900 bg-white/50 p-2 rounded border border-blue-100">
                    <p className="font-semibold mb-1">Selected Groups:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {matchingLists.map(sl => {
                        const count = students.filter(s => s.student_list_id === sl.id).length;
                        return (
                          <li key={sl.id}>
                            {sl.department} | {sl.year === "1" ? "1st" : sl.year === "2" ? "2nd" : sl.year === "3" ? "3rd" : "4th"} Year | {sl.batch} | Section {sl.section} <span className="font-medium text-blue-700">({count} Students)</span>
                          </li>
                        );
                      })}
                    </ul>
                    {allocationMode === "mixed_department" && selectedDepartment && selectedDepartment2 && (
                      <div className="mt-3 pt-2 border-t border-blue-200 font-semibold space-y-1">
                        <p>Students from Department 1 ({selectedDepartment}): {students.filter(s => matchingLists.some(sl => sl.id === s.student_list_id && sl.department === selectedDepartment && sl.year === selectedYear && sl.batch === selectedBatch && sl.section === selectedSection)).length}</p>
                        <p>Students from Department 2 ({selectedDepartment2}): {students.filter(s => matchingLists.some(sl => sl.id === s.student_list_id && sl.department === selectedDepartment2 && sl.year === selectedYear2 && sl.batch === selectedBatch2 && sl.section === selectedSection2)).length}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Students Found:</span>
                  <span className={`font-bold text-lg ${matchingStudents.length === 0 ? 'text-red-600' : 'text-blue-700'}`}>
                    {matchingStudents.length}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">Selected Hall Capacity:</span>
                  <span className={`font-bold text-lg ${
                    selectedHalls.reduce((acc, id) => acc + (halls.find(h => h.id === id)?.capacity || 0), 0) < matchingStudents.length 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {selectedHalls.reduce((acc, id) => acc + (halls.find(h => h.id === id)?.capacity || 0), 0)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={matchingStudents.length === 0} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-0 rounded-lg w-[450px] shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-purple-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg uppercase text-center">{selectedAllocation.exam.exam_name}</h3>
            </div>
            <div className="px-6 py-6 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Student</span>
                <span className="font-medium text-right">{selectedAllocation.student.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Roll No</span>
                <span className="font-medium text-right">{selectedAllocation.student.roll_number}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Department</span>
                <span className="font-medium text-right">{selectedAllocation.student.student_list?.department || selectedAllocation.student.department || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Year</span>
                <span className="font-medium text-right">{selectedAllocation.student.student_list?.year || selectedAllocation.student.year || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Batch</span>
                <span className="font-medium text-right">{selectedAllocation.student.student_list?.batch || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Section</span>
                <span className="font-medium text-right">{selectedAllocation.student.student_list?.section || selectedAllocation.student.class_section || "-"}</span>
              </div>
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
                <span className="font-bold text-blue-600 text-right">{selectedAllocation.seat_number}</span>
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
