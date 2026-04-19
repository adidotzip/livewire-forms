"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  LogOut, Search, RefreshCw, Filter, ShieldCheck, 
  ChevronDown, ChevronUp, Sparkles, Download, EyeOff, Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { EVENT_LIST } from "@/lib/events";
import { cn } from "@/lib/utils";

type RegistrationRecord = {
  timestamp: string;
  schoolName: string;
  schoolEmail: string;
  studentName: string;
  studentClass?: string;
  studentSection?: string;
  studentPhone: string;
  event: string;
  inGameId?: string;
  isSpam?: boolean;
};

type MaterialsRecord = {
  submissionId: string;
  respondentId: string;
  submittedAt: string;
  schoolName: string;
  event: string;
  driveLink: string;
};

export default function AdminDashboard() {
  const [data, setData] = useState<RegistrationRecord[]>([]);
  const [materialsData, setMaterialsData] = useState<MaterialsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("All");
  const [sortField, setSortField] = useState<keyof RegistrationRecord>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
  const [activeTab, setActiveTab] = useState<"registrations" | "materials">("registrations");
  
  // New States
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [isScanningSpam, setIsScanningSpam] = useState(false);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/data");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to fetch data");
      }

      const result = await response.json();
      const normalize = (arr: RegistrationRecord[]) =>
        arr.map((r) => ({ ...r, studentPhone: String(r.studentPhone ?? "") }));

      if (Array.isArray(result)) setData(normalize(result));
      else if (result.data && Array.isArray(result.data)) setData(normalize(result.data));
      else setData([]);
    } catch (error) {
      toast.error("Error loading data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchMaterialsData = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const response = await fetch("/api/materials");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to fetch materials data");
      }

      const result = await response.json();
      if (Array.isArray(result)) setMaterialsData(result);
      else if (result.data && Array.isArray(result.data)) setMaterialsData(result.data);
      else setMaterialsData([]);
    } catch (error) {
      toast.error("Error loading materials data");
      console.error(error);
    } finally {
      setMaterialsLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === "materials") fetchMaterialsData();
  }, [activeTab, fetchMaterialsData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
    }
  };

  // --- NEW FEATURE: AI Spam Scan ---
  const handleScanSpam = async () => {
    if (data.length === 0) return toast.error("No data to scan");
    setIsScanningSpam(true);
    const toastId = toast.loading("AI is scanning for spam...");
    
    try {
      const response = await fetch("/api/admin/scan-spam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: data }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan spam");
      }
      
      const result = await response.json();
      setData(result.data); // Update with AI-flagged data
      toast.success("Spam scan complete!", { id: toastId });
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error(error.message || "AI Scan failed. Check console.", { id: toastId });
    } finally {
      setIsScanningSpam(false);
    }
  };

  // --- NEW FEATURE: Export to CSV ---
  const handleExportCSV = () => {
    const exportData = activeTab === "registrations" ? filteredData : filteredMaterialsData;
    if (exportData.length === 0) return toast.error("No data to export");

    const headers = Object.keys(exportData[0]).join(",");
    const rows = exportData.map(obj => 
      Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV Downloaded!");
  };

  // --- DATA PROCESSING & FILTERING ---
  const processDuplicates = (records: RegistrationRecord[]) => {
    if (showDuplicates) return records;
    const seen = new Set();
    return records.filter((item) => {
      // Define a duplicate as same student name + phone + event
      const uniqueKey = `${item.studentName}-${item.studentPhone}-${item.event}`.toLowerCase();
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    });
  };

  const processedData = processDuplicates(data);

  const filteredData = processedData.filter((item) => {
    const matchesFilter = filterEvent === "All" || item.event === filterEvent;
    
    if (!search.trim()) return matchesFilter;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      (item.schoolName && item.schoolName.toLowerCase().includes(searchLower)) ||
      (item.studentName && item.studentName.toLowerCase().includes(searchLower)) ||
      (item.event && item.event.toLowerCase().includes(searchLower)) ||
      (item.studentPhone && item.studentPhone.includes(search));

    return matchesSearch && matchesFilter;
  });

  const filteredMaterialsData = materialsData.filter((item) => {
    const matchesFilter = filterEvent === "All" || item.event === filterEvent;
    
    // Safely return if search is empty to prevent undefined errors
    if (!search.trim()) return matchesFilter;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      (item.schoolName && item.schoolName.toLowerCase().includes(searchLower)) ||
      (item.event && item.event.toLowerCase().includes(searchLower)) ||
      (item.submissionId && item.submissionId.toLowerCase().includes(searchLower));

    return matchesSearch && matchesFilter;
  });

  const handleSort = (field: keyof RegistrationRecord) => {
    if (sortField === field) setSortAsc((prev) => !prev);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedData = [...filteredData].sort((a, b) => {
    const valA = a[sortField]?.toString() || "";
    const valB = b[sortField]?.toString() || "";
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neutral-900 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-neutral-500">
                {activeTab === "registrations" ? "Manage school event registrations" : "View submitted materials"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeTab === "registrations" && (
              <>
                <button
                  onClick={handleScanSpam}
                  disabled={isScanningSpam || loading}
                  className="px-4 py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  title="Scan for fake/spam entries using AI"
                >
                  <Sparkles className={cn("w-4 h-4", isScanningSpam && "animate-pulse")} />
                  <span className="hidden sm:inline">AI Spam Scan</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors"
                  title="Export to CSV"
                >
                  <Download className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={activeTab === "registrations" ? fetchData : fetchMaterialsData}
              disabled={activeTab === "registrations" ? loading : materialsLoading}
              className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-5 h-5", (activeTab === "registrations" ? loading : materialsLoading) && "animate-spin")} />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white p-1 rounded-2xl border border-neutral-200 shadow-sm inline-flex">
          <button
            onClick={() => setActiveTab("registrations")}
            className={cn(
              "px-6 py-3 rounded-xl font-medium transition-all",
              activeTab === "registrations" ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            )}
          >
            Registrations
          </button>
          <button
            onClick={() => setActiveTab("materials")}
            className={cn(
              "px-6 py-3 rounded-xl font-medium transition-all",
              activeTab === "materials" ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
            )}
          >
            Materials
          </button>
        </div>

        {/* Controls */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={activeTab === "registrations" ? "Search by name, school, event, or phone..." : "Search schools, IDs, or events..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
            />
          </div>
          <div className="lg:col-span-3 relative">
            <Filter className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="All">All Events</option>
              {EVENT_LIST.map((event) => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>
          
          <div className="lg:col-span-4 flex items-center justify-end gap-3">
            {activeTab === "registrations" && (
              <button
                onClick={() => setShowDuplicates(!showDuplicates)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-colors text-sm font-medium",
                  showDuplicates 
                    ? "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100" 
                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                )}
                title="Hide duplicate registrations based on Name, Phone, and Event"
              >
                {showDuplicates ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showDuplicates ? "Hide Duplicates" : "Duplicates Hidden"}
              </button>
            )}
            <div className="px-4 py-3 text-sm font-medium text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200 whitespace-nowrap">
              Total: {activeTab === "registrations" ? filteredData.length : filteredMaterialsData.length}
            </div>
          </div>
        </div>

        {/* Data Table - Registrations */}
        {activeTab === "registrations" && (
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200">
                  <tr>
                    {[
                      { key: "timestamp", label: "Date & Time" },
                      { key: "schoolName", label: "School" },
                      { key: "studentName", label: "Student" },
                      { key: "studentClass", label: "Class" },
                      { key: "studentSection", label: "Section" },
                      { key: "studentPhone", label: "Phone No." },
                      { key: "event", label: "Event" },
                      ...(filteredData.some(d => d.inGameId) ? [{ key: "inGameId", label: "In-Game ID" }] : []),
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key as keyof RegistrationRecord)}
                        className="px-6 py-4 font-medium tracking-wider cursor-pointer group hover:bg-neutral-100/50 transition-colors"
                      >
                        <div className="flex items-center">
                          {label}
                          {sortField === key ? (
                            sortAsc ? <ChevronUp className="w-4 h-4 ml-1 inline-block text-neutral-900" /> : <ChevronDown className="w-4 h-4 ml-1 inline-block text-neutral-900" />
                          ) : (
                            <div className="w-4 h-4 ml-1 inline-block opacity-0 group-hover:opacity-50"><ChevronDown className="w-4 h-4" /></div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="animate-pulse bg-white">
                        {Array.from({ length: filteredData.some(d => d.inGameId) ? 8 : 7 }).map((_, j) => (
                          <td key={`cell-${i}-${j}`} className="px-6 py-5">
                            <div className="h-4 bg-neutral-200 rounded-full w-3/4"></div>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sortedData.length === 0 ? (
                    <tr>
                      <td colSpan={filteredData.some(d => d.inGameId) ? 8 : 7} className="px-6 py-12 text-center text-neutral-500">
                        No records found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((record, index) => (
                      <tr key={index} className={cn(
                        "hover:bg-neutral-50/50 transition-colors group",
                        record.isSpam && "bg-red-50/30 hover:bg-red-50/50"
                      )}>
                        <td className="px-6 py-4 whitespace-nowrap text-neutral-500">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900 flex items-center gap-2">
                            {record.schoolName}
                            {record.isSpam && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                Spam
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500">{record.schoolEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-neutral-900 whitespace-nowrap">
                          {record.studentName}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                          {record.studentClass || "-"}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                          {record.studentSection || "-"}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 whitespace-nowrap font-mono text-sm">
                          {record.studentPhone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                            {record.event}
                          </span>
                        </td>
                        {filteredData.some(d => d.inGameId) && (
                          <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                            {record.inGameId || "-"}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Cards - Materials */}
        {activeTab === "materials" && (
          <div className="space-y-6">
             {materialsLoading ? (
               <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                 <RefreshCw className="w-8 h-8 animate-spin mb-4 text-neutral-400" />
                 <p>Loading materials...</p>
               </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMaterialsData.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-neutral-500 bg-white rounded-3xl border border-neutral-200">
                      No materials found matching your search or filters.
                    </div>
                  ) : (
                    filteredMaterialsData.map((material) => (
                      <div key={material.submissionId} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="font-semibold text-neutral-900 leading-tight">
                              {material.schoolName}
                            </h3>
                            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium mt-3 inline-block">
                              {material.event}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 whitespace-nowrap">
                            {new Date(material.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between gap-4">
                          <div className="text-xs text-neutral-400 truncate" title={material.submissionId}>
                            ID: {material.submissionId.substring(0, 12)}...
                          </div>
                          <a
                            href={material.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            View Drive
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
