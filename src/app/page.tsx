"use client";

import { useState } from "react";
import { PlusCircle, Trash2, Send, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT_LIST } from "@/lib/events";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Student = {
  id: string;
  name: string;
  email: string;
  event: string;
};

export default function Home() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [students, setStudents] = useState<Student[]>([
    { id: crypto.randomUUID(), name: "", email: "", event: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid =
    schoolName.trim() !== "" &&
    isEmailValid(schoolEmail) &&
    students.length > 0 &&
    students.every(
      (s) =>
        s.name.trim() !== "" && isEmailValid(s.email) && s.event.trim() !== ""
    );

  const addStudent = () => {
    setStudents([
      ...students,
      { id: crypto.randomUUID(), name: "", email: "", event: "" },
    ]);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter((s) => s.id !== id));
  };

  const updateStudent = (id: string, field: keyof Student, value: string) => {
    setStudents(
      students.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting registration...");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          schoolEmail,
          students: students.map(({ ...rest }) => ({
            name: rest.name,
            email: rest.email,
            event: rest.event
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");

      toast.success("Registration successful!", { id: toastId });

      // Reset form
      setSchoolName("");
      setSchoolEmail("");
      setStudents([{ id: crypto.randomUUID(), name: "", email: "", event: "" }]);
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-neutral-900 rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Event Registration
          </h1>
          <p className="text-neutral-500 text-lg max-w-xl mx-auto">
            Register your school and students for upcoming events. Fill out the details below to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* School Information Section */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-neutral-200">
            <h2 className="text-xl font-medium mb-6">School Information</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="e.g. Springfield High"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  School Email
                </label>
                <input
                  type="email"
                  required
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="school@example.com"
                />
              </div>
            </div>
          </div>

          {/* Students Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">
                Students ({students.length})
              </h2>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {students.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200 relative group"
                  >
                    {students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStudent(student.id)}
                        className="absolute -right-3 -top-3 p-2 bg-white text-neutral-400 hover:text-red-500 rounded-full shadow-sm border border-neutral-200 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="grid gap-6 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">
                          Student Name
                        </label>
                        <input
                          type="text"
                          required
                          value={student.name}
                          onChange={(e) =>
                            updateStudent(student.id, "name", e.target.value)
                          }
                          className="w-full px-4 py-3 rounded-2xl bg-neutral-50/50 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">
                          Student Email
                        </label>
                        <input
                          type="email"
                          required
                          value={student.email}
                          onChange={(e) =>
                            updateStudent(student.id, "email", e.target.value)
                          }
                          className="w-full px-4 py-3 rounded-2xl bg-neutral-50/50 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">
                          Event
                        </label>
                        <select
                          required
                          value={student.event}
                          onChange={(e) =>
                            updateStudent(student.id, "event", e.target.value)
                          }
                          className="w-full px-4 py-3 rounded-2xl bg-neutral-50/50 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Select an event...</option>
                          {EVENT_LIST.map((event) => (
                            <option key={event} value={event}>
                              {event}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="sticky bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
              <button
                type="button"
                onClick={addStudent}
                className="py-4 px-8 bg-white/90 backdrop-blur-md border border-neutral-200 shadow-lg rounded-full text-neutral-700 font-medium hover:bg-neutral-50 hover:scale-105 hover:shadow-xl transition-all flex items-center justify-center gap-2 pointer-events-auto"
              >
                <PlusCircle className="w-5 h-5" />
                Add Another Student
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-neutral-200 flex justify-center z-50">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={cn(
                "w-full max-w-3xl py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm",
                isFormValid && !isSubmitting
                  ? "bg-neutral-900 text-white hover:bg-neutral-800 hover:scale-[1.01]"
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Registration"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
