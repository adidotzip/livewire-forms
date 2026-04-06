"use client";

import { useState, useEffect } from "react";
import { Send, GraduationCap, Users, X, CheckCircle, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT_LIST, EVENT_DETAILS } from "@/lib/events";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type TeamMember = {
  id: string;
  name: string;
  class: string;
  phone: string;
  inGameId?: string;
};

type Team = {
  id: string;
  event: string;
  members: TeamMember[];
};

export default function Home() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedSchoolName = localStorage.getItem("schoolName");
    const savedSchoolEmail = localStorage.getItem("schoolEmail");
    const savedTeams = localStorage.getItem("teams");

    if (savedSchoolName) setSchoolName(savedSchoolName);
    if (savedSchoolEmail) setSchoolEmail(savedSchoolEmail);
    if (savedTeams) {
      try {
        setTeams(JSON.parse(savedTeams));
      } catch (e) {
        console.error("Failed to parse teams from local storage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("schoolName", schoolName);
      localStorage.setItem("schoolEmail", schoolEmail);
      localStorage.setItem("teams", JSON.stringify(teams));
    }
  }, [schoolName, schoolEmail, teams, mounted]);

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getEventDetails = (eventName: string) => {
    return EVENT_DETAILS[eventName];
  };

  const createTeamForEvent = (eventName: string) => {
    const eventDetails = getEventDetails(eventName);
    const teamSize = eventDetails?.teamSize || 1;

    const newTeam: Team = {
      id: crypto.randomUUID(),
      event: eventName,
      members: Array.from({ length: teamSize }, () => ({
        id: crypto.randomUUID(),
        name: "",
        class: "",
        phone: "",
        inGameId: eventDetails?.requiresInGameId ? "" : undefined,
      })),
    };

    setCurrentTeam(newTeam);
    setShowTeamModal(true);
  };

  const saveTeam = () => {
    if (!currentTeam) return;

    const eventDetails = getEventDetails(currentTeam.event);
    const isValid = currentTeam.members.every(member =>
      member.name.trim() !== "" &&
      member.class.trim() !== "" &&
      member.phone.trim() !== "" &&
      (!eventDetails?.requiresInGameId || (member.inGameId && member.inGameId.trim() !== ""))
    );

    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    setTeams(prev => {
      const existingIndex = prev.findIndex(t => t.id === currentTeam.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = currentTeam;
        return updated;
      } else {
        return [...prev, currentTeam];
      }
    });

    setShowTeamModal(false);
    setCurrentTeam(null);
    toast.success("Team saved successfully!");
  };

  const removeTeam = (teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    toast.success("Team removed");
  };

  const editTeam = (team: Team) => {
    setCurrentTeam(team);
    setShowTeamModal(true);
  };

  const updateTeamMember = (memberId: string, field: keyof TeamMember, value: string) => {
    if (!currentTeam) return;

    setCurrentTeam(prev => ({
      ...prev!,
      members: prev!.members.map(member =>
        member.id === memberId ? { ...member, [field]: value } : member
      ),
    }));
  };

  const addTeamMember = () => {
    if (!currentTeam) return;

    const eventDetails = getEventDetails(currentTeam.event);
    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: "",
      class: "",
      phone: "",
      inGameId: eventDetails?.requiresInGameId ? "" : undefined,
    };

    setCurrentTeam(prev => ({
      ...prev!,
      members: [...prev!.members, newMember],
    }));
  };

  const removeTeamMember = (memberId: string) => {
    if (!currentTeam) return;

    setCurrentTeam(prev => ({
      ...prev!,
      members: prev!.members.filter(member => member.id !== memberId),
    }));
  };

  const isFormValid =
    schoolName.trim() !== "" &&
    isEmailValid(schoolEmail) &&
    teams.length > 0 &&
    teams.every(team =>
      team.members.every(member => {
        const eventDetails = getEventDetails(team.event);
        return member.name.trim() !== "" &&
               member.class.trim() !== "" &&
               member.phone.trim() !== "" &&
               (!eventDetails?.requiresInGameId || (member.inGameId && member.inGameId.trim() !== ""));
      })
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting registration...");

    try {
      // Convert teams to individual student records for the API
      const students = teams.flatMap(team =>
        team.members.map(member => ({
          name: member.name,
          phone: member.phone,
          event: team.event,
          inGameId: member.inGameId || null,
          class: member.class,
        }))
      );

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          schoolEmail,
          students,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");

      toast.success("Registration successful!", { id: toastId });

      // Clear local storage
      localStorage.removeItem("schoolName");
      localStorage.removeItem("schoolEmail");
      localStorage.removeItem("teams");

      // Reset form
      setSchoolName("");
      setSchoolEmail("");
      setTeams([]);

      // Redirect to external URL
      window.location.href = "https://livewire.imreallyadi.space/";

    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 py-12 bg-background text-foreground">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-2xl mb-4 shadow-custom">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Event Registration
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Register your school and students for upcoming events. Fill out the details below to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* School Information Section */}
          <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-3xl shadow-custom border border-border">
            <h2 className="text-xl font-medium mb-6">School Information</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                  placeholder="e.g. Springfield High"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  School Email
                </label>
                <input
                  type="email"
                  required
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                  placeholder="school@example.com"
                />
              </div>
            </div>
          </div>

          {/* Teams Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-foreground">
                Teams ({teams.length})
              </h2>
            </div>

            {/* Event Selection Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVENT_LIST.map((event) => {
                const eventDetails = getEventDetails(event);
                const existingTeam = teams.find(t => t.event === event);
                const isSelected = existingTeam !== undefined;

                return (
                  <motion.button
                    key={event}
                    type="button"
                    onClick={() => {
                      if (existingTeam) {
                        editTeam(existingTeam);
                      } else {
                        createTeamForEvent(event);
                      }
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-border hover:border-primary/50 hover:shadow-md"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm">{event}</h3>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>
                        {eventDetails?.teamSize ? `${eventDetails.teamSize} players` : ""}
                      </span>
                    </div>
                    {eventDetails?.requiresInGameId && (
                      <div className="mt-1 text-xs text-orange-600">
                        Requires in-game ID
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Teams List */}
            <div className="space-y-4">
              <AnimatePresence>
                {teams.map((team) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card text-card-foreground p-6 rounded-3xl shadow-custom border border-border"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{team.event}</h3>
                        <p className="text-sm text-muted-foreground">
                          {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editTeam(team)}
                          className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTeam(team.id)}
                          className="px-3 py-1 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {team.members.map((member, index) => (
                        <div key={member.id} className="text-sm">
                          <span className="font-medium">{member.name || `Member ${index + 1}`}</span>
                          {member.class && <span className="text-muted-foreground"> - {member.class}</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border flex justify-center z-50">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={cn(
                "w-full max-w-3xl py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all shadow-custom",
                isFormValid && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Registration"}
            </button>
          </div>
        </form>

        {/* Team Modal */}
        <AnimatePresence>
          {showTeamModal && currentTeam && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowTeamModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card text-card-foreground rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{currentTeam.event}</h2>
                      <p className="text-sm text-muted-foreground">
                        {currentTeam.members.length} team member{currentTeam.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowTeamModal(false)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-6">
                    {currentTeam.members.map((member, index) => {
                      const eventDetails = getEventDetails(currentTeam.event);
                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-muted/50 rounded-2xl p-4"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Team Member {index + 1}</h3>
                            {currentTeam.members.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTeamMember(member.id)}
                                className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Name *</label>
                              <input
                                type="text"
                                value={member.name}
                                onChange={(e) => updateTeamMember(member.id, "name", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                placeholder="Full name"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Class *</label>
                              <input
                                type="text"
                                value={member.class}
                                onChange={(e) => updateTeamMember(member.id, "class", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                placeholder="e.g. 12th"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Phone *</label>
                              <input
                                type="tel"
                                value={member.phone}
                                onChange={(e) => updateTeamMember(member.id, "phone", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                placeholder="1234567890"
                              />
                            </div>
                            {eventDetails?.requiresInGameId && (
                              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                                <label className="text-sm font-medium">
                                  In-Game ID * ({eventDetails.idFormat})
                                </label>
                                <input
                                  type="text"
                                  value={member.inGameId || ""}
                                  onChange={(e) => updateTeamMember(member.id, "inGameId", e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                  placeholder={`e.g., ${eventDetails.idFormat === "Riot ID (Username#Tagline)" ? "PlayerOne#1234" : eventDetails.idFormat === "Epic Games ID / Rocket ID" ? "YourEpicID" : "1234567890 (IGN)"}`}
                                />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    <div className="flex justify-center pt-4">
                      <button
                        type="button"
                        onClick={addTeamMember}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-2"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Member
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTeam}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Save Team
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
