"use client";

import { useState, useEffect } from "react";
import { Send, Users, X, CheckCircle, PlusCircle, Trash2 } from "lucide-react";
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

    const newTeam: Team = {
      id: crypto.randomUUID(),
      event: eventName,
      members: [{
        id: crypto.randomUUID(),
        name: "",
        class: "",
        phone: "",
        inGameId: eventDetails?.requiresInGameId ? "" : undefined,
      }],
    };

    setCurrentTeam(newTeam);
    setShowTeamModal(true);
  };

  const saveTeam = () => {
    if (!currentTeam) return;

    const eventDetails = getEventDetails(currentTeam.event);
    
    // Check if mandatory size is met
    if (eventDetails?.teamSize && currentTeam.members.length !== eventDetails.teamSize) {
      toast.error(`This event requires exactly ${eventDetails.teamSize} mandatory participants.`);
      return;
    }

    const isValid = currentTeam.members.every(member =>
      member.name.trim() !== "" &&
      member.class.trim() !== "" &&
      member.phone.trim() !== "" &&
      (!eventDetails?.requiresInGameId || (member.inGameId && member.inGameId.trim() !== ""))
    );

    if (!isValid) {
      toast.error("Please fill in all required fields for all participants.");
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
    teams.every(team => {
      const eventDetails = getEventDetails(team.event);
      const isSizeValid = !eventDetails?.teamSize || team.members.length === eventDetails.teamSize;
      
      const areMembersValid = team.members.every(member => {
        return member.name.trim() !== "" &&
               member.class.trim() !== "" &&
               member.phone.trim() !== "" &&
               (!eventDetails?.requiresInGameId || (member.inGameId && member.inGameId.trim() !== ""));
      });

      return isSizeValid && areMembersValid;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting registration...");

    try {
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

      localStorage.removeItem("schoolName");
      localStorage.removeItem("schoolEmail");
      localStorage.removeItem("teams");

      setSchoolName("");
      setSchoolEmail("");
      setTeams([]);

      window.location.href = "https://livewire.imreallyadi.space/";

    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 py-12 bg-[url('https://images.unsplash.com/photo-1506744626753-1fa28f6f53cb?auto=format&fit=crop&w=2560&q=80')] bg-cover bg-center bg-fixed text-foreground relative selection:bg-primary/30">
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-0" />
      
      <div className="max-w-3xl mx-auto space-y-12 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <motion.img 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            src="https://framerusercontent.com/images/GuPYr7ZLGnklkwJ5MitUN7nvgcA.png" 
            alt="Event Logo" 
            onClick={() => window.location.href = "/events"}
            className="w-20 h-20 object-cover rounded-2xl mx-auto shadow-xl cursor-pointer hover:scale-105 transition-transform duration-300 ring-2 ring-white/20"
          />
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground drop-shadow-sm">
              Event Registration
            </h1>
            <p className="text-muted-foreground/90 text-lg max-w-xl mx-auto">
              Register your school and students for upcoming events. Fill out the details below to get started.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* School Information Section */}
          <div className="bg-background/70 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-white/10 dark:border-white/5">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full"></div>
              School Information
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80 pl-1">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 text-foreground shadow-inner"
                  placeholder="e.g. Springfield High"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80 pl-1">
                  School Email
                </label>
                <input
                  type="email"
                  required
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 text-foreground shadow-inner"
                  placeholder="school@example.com"
                />
              </div>
            </div>
          </div>

          {/* Teams Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pl-2">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                 <div className="w-2 h-6 bg-primary rounded-full"></div>
                Teams <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-sm">{teams.length}</span>
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
                      "p-5 rounded-3xl border transition-all text-left backdrop-blur-md relative overflow-hidden group",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                        : "border-white/10 bg-background/40 hover:bg-background/60 hover:border-white/20"
                    )}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-base">{event}</h3>
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {eventDetails?.teamSize ? `Mandatory ${eventDetails.teamSize} participants` : "Flexible team size"}
                        </span>
                      </div>
                      {eventDetails?.requiresInGameId && (
                        <span className="inline-flex w-fit px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 text-[10px] uppercase font-bold tracking-wider">
                          In-game ID Req.
                        </span>
                      )}
                    </div>
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
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-background/70 backdrop-blur-xl p-6 sm:p-7 rounded-[2rem] shadow-xl border border-white/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold">{team.event}</h3>
                        <p className="text-sm font-medium text-primary">
                          {team.members.length} participant{team.members.length !== 1 ? 's' : ''} registered
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editTeam(team)}
                          className="flex-1 sm:flex-none px-4 py-2.5 text-sm bg-primary/10 text-primary font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          Edit Details
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTeam(team.id)}
                          className="flex-1 sm:flex-none p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex justify-center"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {team.members.map((member, index) => (
                        <div key={member.id} className="bg-background/50 px-4 py-3 rounded-xl border border-white/5 flex flex-col justify-center">
                          <span className="font-semibold text-sm truncate">{member.name || `Player ${index + 1}`}</span>
                          {member.class && <span className="text-xs text-muted-foreground font-medium">Class: {member.class}</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-white/10 flex justify-center z-40">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={cn(
                "w-full max-w-3xl py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-xl",
                isFormValid && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] shadow-primary/25"
                  : "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-70"
              )}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSubmitting ? "Finalizing..." : "Complete Registration"}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
              onClick={() => setShowTeamModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-background border border-white/10 rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 sm:p-8 border-b border-white/10 bg-muted/30 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                  <div>
                    <h2 className="text-2xl font-bold">{currentTeam.event}</h2>
                    <p className="text-sm font-medium text-primary mt-1">
                      {currentTeam.members.length} {getEventDetails(currentTeam.event)?.teamSize ? `of ${getEventDetails(currentTeam.event)?.teamSize} mandatory` : ''} participants
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="p-2.5 bg-background hover:bg-muted rounded-full transition-all hover:rotate-90 duration-300 shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gradient-to-b from-background to-muted/10">
                  <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                      {currentTeam.members.map((member, index) => {
                        const eventDetails = getEventDetails(currentTeam.event);
                        return (
                          <motion.div
                            layout
                            key={member.id}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0, margin: 0, padding: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-card rounded-3xl p-6 border border-white/5 shadow-lg relative group"
                          >
                            <div className="flex items-center justify-between mb-5">
                              <h3 className="font-bold text-muted-foreground flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">
                                  {index + 1}
                                </span>
                                Participant Details
                              </h3>
                              {currentTeam.members.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTeamMember(member.id)}
                                  className="text-red-400 hover:bg-red-500/10 hover:text-red-500 p-2 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider pl-1">Name *</label>
                                <input
                                  type="text"
                                  value={member.name}
                                  onChange={(e) => updateTeamMember(member.id, "name", e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                  placeholder="Full name"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider pl-1">Class *</label>
                                <input
                                  type="text"
                                  value={member.class}
                                  onChange={(e) => updateTeamMember(member.id, "class", e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                  placeholder="e.g. 12th A"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider pl-1">Phone *</label>
                                <input
                                  type="tel"
                                  value={member.phone}
                                  onChange={(e) => updateTeamMember(member.id, "phone", e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                  placeholder="Contact number"
                                />
                              </div>
                              
                              {eventDetails?.requiresInGameId && (
                                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                                  <label className="text-xs font-bold text-orange-500/90 uppercase tracking-wider pl-1">
                                    In-Game ID * <span className="text-muted-foreground/60 normal-case tracking-normal">({eventDetails.idFormat})</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={member.inGameId || ""}
                                    onChange={(e) => updateTeamMember(member.id, "inGameId", e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-orange-500/5 border border-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium placeholder:text-orange-500/40"
                                    placeholder={`e.g., ${eventDetails.idFormat === "Riot ID (Username#Tagline)" ? "PlayerOne#1234" : eventDetails.idFormat === "Epic Games ID / Rocket ID" ? "YourEpicID" : "1234567890 (IGN)"}`}
                                  />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Add Participant Logic - Only show if not exceeding mandatory limit */}
                    {(!getEventDetails(currentTeam.event)?.teamSize || currentTeam.members.length < getEventDetails(currentTeam.event)!.teamSize!) && (
                      <motion.div layout className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={addTeamMember}
                          className="px-6 py-3.5 bg-primary/10 text-primary font-bold rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 border border-primary/20"
                        >
                          <PlusCircle className="w-5 h-5" />
                          Add Next Participant
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-white/10 bg-muted/30 backdrop-blur-xl flex justify-end gap-3 sticky bottom-0 z-10">
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="px-6 py-3 text-muted-foreground font-semibold hover:bg-background rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTeam}
                    className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-primary/20"
                  >
                    Confirm Team
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
