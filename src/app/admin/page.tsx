"use client";

import { useEffect, useState, useCallback } from "react";
import { LogOut, Search, RefreshCw, Filter, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { EVENT_LIST } from "@/lib/events";
import { cn } from "@/lib/utils";

type RegistrationRecord = {
  timestamp: string;
  schoolName: string;
  schoolEmail: string;
  studentName: string;
  studentEmail: string;
  event: string;
};

export default function AdminDashboard() {
  const [data, setData] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("All");
  const [sortField, setSortField] = useState<keyof RegistrationRecord>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
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

      // Ensure the returned data is an array
      if (Array.isArray(result)) {
        setData(result);
      } else if (result.data && Array.isArray(result.data)) {
         setData(result.data);
      } else {
         setData([]);
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
    }
  };

  const handleSort = (field: keyof RegistrationRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Search Logic
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.schoolName.toLowerCase().includes(search.toLowerCase()) ||
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      item.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      item.event.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filterEvent === "All" || item.event === filterEvent;

    return matchesSearch && matchesFilter;
  });

  // Sort Logic
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neutral-900 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-neutral-500">Manage school event registrations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
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

        {/* Controls */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="lg:col-span-2 relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search schools, students, or events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
            />
          </div>
          <div className="relative">
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
          <div className="flex items-center justify-end px-4 text-sm font-medium text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
            Total Records: {filteredData.length}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200">
                <tr>
                  {[
                    { key: "timestamp", label: "Date & Time" },
                    { key: "schoolName", label: "School" },
                    { key: "studentName", label: "Student" },
                    { key: "studentEmail", label: "Student Email" },
                    { key: "event", label: "Event" },
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
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse bg-white">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={`cell-${i}-${j}`} className="px-6 py-5">
                          <div className="h-4 bg-neutral-200 rounded-full w-3/4"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      No records found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((record, index) => (
                    <tr key={index} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-500">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">{record.schoolName}</div>
                        <div className="text-xs text-neutral-500">{record.schoolEmail}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900 whitespace-nowrap">
                        {record.studentName}
                      </td>
                      <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                        {record.studentEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                          {record.event}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
