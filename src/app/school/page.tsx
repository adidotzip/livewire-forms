"use client";

import { useState } from "react";
import { Download, Search, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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

export default function SchoolDataPage() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [data, setData] = useState<RegistrationRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !schoolEmail) {
      toast.error("Please enter both School Name and Email");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/school-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolName, schoolEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const result = await response.json();
      setData(result);
      if (result.length === 0) {
        toast.error("No records found for this school and email");
      } else {
        toast.success(`Found ${result.length} records`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data || data.length === 0) return;

    const headers = ["Date", "School", "Email", "Student", "Class", "Section", "Phone", "Event", "In-Game ID"];
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          new Date(row.timestamp).toLocaleString(),
          row.schoolName,
          row.schoolEmail,
          row.studentName,
          row.studentClass || "",
          row.studentSection || "",
          row.studentPhone || "",
          row.event,
          row.inGameId || "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `school_data_${schoolName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-16 bg-background text-foreground font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Registration
        </Link>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-foreground">
            School Data Access
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl font-light">
            Enter your school details exactly as they were registered to view and download your students&apos; registration data.
          </p>
        </div>

        <form onSubmit={fetchData} className="bg-card/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-custom border border-border">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-5 items-end">
            <div className="space-y-3 group/input md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">School Name</label>
              <input
                type="text" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-input border border-border focus:outline-none focus:border-primary/50 focus:bg-background transition-all"
                placeholder="e.g. BGS International School"
              />
            </div>
            <div className="space-y-3 group/input md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">School Email</label>
              <input
                type="email" required value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-input border border-border focus:outline-none focus:border-primary/50 focus:bg-background transition-all"
                placeholder="school@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="md:col-span-1 w-full px-5 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70"
            >
              {loading ? (
                 <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Search className="w-4 h-4" /> Search</>
              )}
            </button>
          </div>
        </form>

        {data && data.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-serif font-medium text-foreground">
                Registered Students ({data.length})
              </h2>
              <button
                onClick={downloadCSV}
                className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium flex items-center justify-center gap-2 transition-all border border-border shadow-sm text-sm"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
            </div>

            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                      <th className="px-6 py-4 font-medium tracking-wider">Student</th>
                      <th className="px-6 py-4 font-medium tracking-wider">Class</th>
                      <th className="px-6 py-4 font-medium tracking-wider">Phone</th>
                      <th className="px-6 py-4 font-medium tracking-wider">Event</th>
                      {data.some(d => d.inGameId) && <th className="px-6 py-4 font-medium tracking-wider">In-Game ID</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.map((record, index) => (
                      <tr key={index} className="hover:bg-secondary/30 transition-colors group">
                         <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString()}
                         </td>
                         <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                            {record.studentName}
                         </td>
                         <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            {record.studentClass || "-"}
                         </td>
                         <td className="px-6 py-4 text-muted-foreground whitespace-nowrap font-mono text-sm">
                            {record.studentPhone || "-"}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-secondary text-foreground rounded-full text-xs font-medium border border-border">
                               {record.event}
                            </span>
                         </td>
                         {data.some(d => d.inGameId) && (
                            <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                               {record.inGameId || "-"}
                            </td>
                         )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {data && data.length === 0 && (
           <div className="p-8 text-center bg-card rounded-3xl border border-border flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">No registrations found.</p>
           </div>
        )}
      </div>
    </main>
  );
}
