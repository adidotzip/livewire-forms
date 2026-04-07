"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { Send, Users, X, CheckCircle, PlusCircle, Trash2, Copy, AlertCircle, Cloud, Check, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT_LIST, EVENT_DETAILS } from "@/lib/events";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface EventDetail {
  teamSize?: number | null;
  requiresInGameId?: boolean;
  idFormat?: string;
  icon?: string | React.ReactNode;
  category?: string;
  description?: string;
}

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

type SaveState = "idle" | "saving" | "saved";

import { Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

export default function Home() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedSchoolName = localStorage.getItem("schoolName");
    const savedSchoolEmail = localStorage.getItem("schoolEmail");
    const savedTeams = localStorage.getItem("teams");

    if (savedSchoolName) setSchoolName(savedSchoolName);
    if (savedSchoolEmail) setSchoolEmail(savedSchoolEmail);
    if (savedTeams) {
      try { setTeams(JSON.parse(savedTeams)); } 
      catch (e) { console.error("Failed to parse teams", e); }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      setSaveState("saving");
      const timeout = setTimeout(() => {
        localStorage.setItem("schoolName", schoolName);
        localStorage.setItem("schoolEmail", schoolEmail);
        localStorage.setItem("teams", JSON.stringify(teams));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      }, 500); 
      return () => clearTimeout(timeout);
    }
  }, [schoolName, schoolEmail, teams, mounted]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (teams.length > 0 || schoolName || schoolEmail) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [teams.length, schoolName, schoolEmail]);

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  };
  
  const getEventDetails = (eventName: string): EventDetail => EVENT_DETAILS[eventName as keyof typeof EVENT_DETAILS] || {};

  const getTeamProgress = (team: Team) => {
    const details = getEventDetails(team.event);
    const targetSize = details?.teamSize || team.members.length || 1;
    
    let validCount = 0;
    team.members.forEach((m) => {
      const isValid = m.name.trim() !== "" && 
                      m.class.trim() !== "" && 
                      isPhoneValid(m.phone) && 
                      (!details?.requiresInGameId || (m.inGameId && m.inGameId.trim() !== ""));
      if (isValid) validCount++;
    });

    const isComplete = validCount === targetSize && team.members.length === targetSize;
    const isStarted = team.members.some(m => m.name.trim() !== "" || m.class.trim() !== "" || m.phone.trim() !== "");

    return {
      validCount,
      targetSize,
      isComplete,
      status: isComplete ? "completed" : isStarted ? "in-progress" : "not-started"
    };
  };

  const createTeamForEvent = (eventName: string) => {
    if (teams.some(t => t.event === eventName)) {
       toast.error(`${eventName} is already selected. Edit it instead.`);
       return;
    }

    const eventDetails = getEventDetails(eventName);
    const size = eventDetails?.teamSize || 1; 

    const newTeam: Team = {
      id: crypto.randomUUID(),
      event: eventName,
      members: Array.from({ length: size }).map(() => ({
        id: crypto.randomUUID(),
        name: "",
        class: "",
        phone: "",
        inGameId: eventDetails?.requiresInGameId ? "" : undefined,
      })),
    };

    setCurrentTeam(newTeam);
    setActiveMemberIndex(0);
    setShowErrors(false);
    setShowTeamModal(true);
  };

  const saveTeam = () => {
    if (!currentTeam) return;
    const progress = getTeamProgress(currentTeam);

    if (!progress.isComplete) {
      setShowErrors(true);
      toast.error(`Please complete all fields correctly for all ${progress.targetSize} participants.`);
      return;
    }

    setTeams(prev => {
      const existingIndex = prev.findIndex(t => t.event === currentTeam.event);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = currentTeam;
        return updated;
      }
      return [...prev, currentTeam];
    });

    setShowTeamModal(false);
    setCurrentTeam(null);
    setShowErrors(false);
    toast.success(`${currentTeam.event} team saved!`);
  };

  const removeTeam = (teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setConfirmDeleteId(null);
    toast.success("Team removed");
    if (currentTeam?.id === teamId) setShowTeamModal(false);
  };

  const editTeam = (team: Team) => {
    setCurrentTeam(team);
    setActiveMemberIndex(0);
    setShowErrors(false);
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
    
    if (eventDetails?.teamSize && currentTeam.members.length >= eventDetails.teamSize) {
        toast.error(`Limit reached: ${eventDetails.teamSize} participants max.`);
        return;
    }

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
    setActiveMemberIndex(currentTeam.members.length);
  };

  const removeTeamMember = (memberId: string) => {
    if (!currentTeam) return;
    const updatedMembers = currentTeam.members.filter(member => member.id !== memberId);
    setCurrentTeam(prev => ({ ...prev!, members: updatedMembers }));
    if (activeMemberIndex >= updatedMembers.length) {
      setActiveMemberIndex(Math.max(0, updatedMembers.length - 1));
    }
  };

  const duplicateToNext = (currentIndex: number, type: "class" | "all") => {
    if (!currentTeam || currentIndex >= currentTeam.members.length - 1) return;
    const currentMember = currentTeam.members[currentIndex];
    setCurrentTeam(prev => ({
      ...prev!,
      members: prev!.members.map((member, idx) => {
        if (idx === currentIndex + 1) {
          return type === "all" 
            ? { ...member, class: currentMember.class, phone: currentMember.phone }
            : { ...member, class: currentMember.class };
        }
        return member;
      }),
    }));
    toast.success(type === "all" ? "Class & Phone copied" : "Class copied");
    setActiveMemberIndex(currentIndex + 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      const inputs = Array.from(e.currentTarget.querySelectorAll('input:not([disabled])')) as HTMLInputElement[];
      const index = inputs.indexOf(e.target);
      if (index > -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    }
  };

  const getFormError = () => {
    if (!schoolName.trim()) return "School Name is required";
    if (!schoolEmail.trim() || !isEmailValid(schoolEmail)) return "Valid School Email is required";
    if (teams.length === 0) return "Select at least one event";
    const incompleteTeam = teams.find(t => !getTeamProgress(t).isComplete);
    if (incompleteTeam) return `Complete all participants for ${incompleteTeam.event}`;
    return null;
  };

  const formError = getFormError();
  const isFormValid = formError === null;
  const totalParticipants = teams.reduce((acc, team) => acc + team.members.length, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
        toast.error(formError);
        return;
    }

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
        body: JSON.stringify({ schoolName, schoolEmail, students }),
      });

      if (!response.ok) throw new Error("Failed to submit");
      toast.success("Registration successful!", { id: toastId });
      window.location.href = "https://thelivewire.club/";

    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.", { id: toastId });
      setIsSubmitting(false);
    } 
  };

  const individualEvents = EVENT_LIST.filter(e => (getEventDetails(e)?.teamSize || 1) === 1);
  const teamEvents = EVENT_LIST.filter(e => (getEventDetails(e)?.teamSize || 1) > 1);

  const renderEventGrid = (events: string[], title: string) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent"></div>
      </div>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {events.map((event) => {
          const eventDetails = getEventDetails(event);
          const existingTeam = teams.find(t => t.event === event);
          const isSelected = !!existingTeam;
          const progress = existingTeam ? getTeamProgress(existingTeam) : null;

          return (
            <motion.button
              variants={cardVariants}
              key={event}
              type="button"
              onClick={() => existingTeam ? editTeam(existingTeam) : createTeamForEvent(event)}
              className={cn(
                "p-6 rounded-[2rem] transition-all duration-300 text-left relative overflow-hidden group flex flex-col justify-between min-h-[170px]",
                isSelected && progress?.isComplete
                  ? "bg-green-500/10 border border-green-500/30 shadow-[0_4px_30px_rgba(34,197,94,0.08)]"
                  : isSelected && progress?.status === "in-progress"
                  ? "bg-orange-500/10 border border-orange-500/30 shadow-[0_4px_30px_rgba(249,115,22,0.08)]"
                  : "bg-card border border-border hover:border-primary/50 shadow-sm"
              )}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {eventDetails?.icon && (
                 <div className="absolute -right-4 -bottom-6 text-[130px] opacity-[0.02] pointer-events-none transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-3 group-hover:opacity-[0.04]">
                   {eventDetails.icon}
                 </div>
              )}

              <div className="flex items-start justify-between mb-4 w-full relative z-10">
                <div className="pr-3">
                  <h3 className="font-serif text-xl font-medium tracking-tight text-foreground group-hover:text-primary transition-colors">{event}</h3>
                  {eventDetails?.category && (
                    <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-muted text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      {eventDetails.category}
                    </span>
                  )}
                </div>
                {isSelected && progress?.isComplete && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle className="w-6 h-6 text-green-500 drop-shadow-md flex-shrink-0" />
                  </motion.div>
                )}
                {isSelected && progress?.status === "in-progress" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <AlertCircle className="w-6 h-6 text-orange-500 drop-shadow-md flex-shrink-0" />
                  </motion.div>
                )}
              </div>

              {eventDetails?.description && !isSelected && (
                <p className="text-sm text-muted-foreground mt-2 mb-4 line-clamp-2 relative z-10 leading-relaxed">
                  {eventDetails.description}
                </p>
              )}

              <div className="mt-auto pt-4 space-y-3 w-full relative z-10">
                {isSelected && progress ? (
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[11px] font-semibold tabular-nums uppercase tracking-wider">
                      <span className={progress.isComplete ? "text-green-500" : "text-orange-500"}>
                        {progress.isComplete ? "Registered" : "In Progress"}
                      </span>
                      <span className="text-muted-foreground">{progress.validCount} / {progress.targetSize}</span>
                    </div>
                    <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.validCount / progress.targetSize) * 100}%` }}
                        className={cn("h-full rounded-full", progress.isComplete ? "bg-green-500" : "bg-orange-500")}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Users className="w-4 h-4 opacity-70" />
                    <span>{eventDetails?.teamSize ? `${eventDetails.teamSize} Participants` : "Flexible Team Size"}</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );

  return (
    <main className="min-h-screen pb-48 px-4 sm:px-6 lg:px-8 py-16 bg-background text-foreground relative selection:bg-primary/30 font-sans overflow-x-hidden">
      
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none mix-blend-screen blur-3xl opacity-60" />
      
      <AnimatePresence>
        {saveState !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-popover/90 backdrop-blur-xl border border-border rounded-2xl shadow-custom text-sm font-medium"
          >
            {saveState === "saving" ? (
              <><Cloud className="w-4 h-4 animate-pulse text-muted-foreground" /> <span className="text-muted-foreground">Saving securely...</span></>
            ) : saveState === "saved" ? (
              <><Check className="w-4 h-4 text-green-500" /> <span className="text-muted-foreground">Changes saved</span></>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-20 relative z-10">
        
        <div className="text-center space-y-10 mt-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="relative inline-block"
          >
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-[2] animate-pulse" />
            <Link href="/events" className="relative block group">
              <img 
                src="https://framerusercontent.com/images/GuPYr7ZLGnklkwJ5MitUN7nvgcA.png" 
                alt="Event Logo" 
                className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-3xl mx-auto shadow-custom group-hover:scale-105 transition-all duration-500 ring-1 ring-border bg-card p-1"
              />
            </Link>
          </motion.div>
          <div className="space-y-5">
            <h1 className="text-5xl md:text-7xl font-serif font-semibold tracking-tight text-foreground pb-2">
              Registration
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light leading-relaxed">
              Secure your spot for the upcoming events. Let&apos;s start with your school details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-20">
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-[2.5rem] opacity-50 group-focus-within:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-card/60 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-custom border border-border">
              <div className="flex items-center mb-10 gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-serif font-medium text-foreground">
                  School Details
                </h2>
              </div>
              
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3 group/input">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1 group-focus-within/input:text-primary transition-colors">School Name</label>
                  <input
                    type="text" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-input border border-border focus:outline-none focus:border-primary/50 focus:bg-background transition-all text-base text-foreground placeholder:text-muted-foreground"
                    placeholder="e.g. Springfield High"
                  />
                </div>
                <div className="space-y-3 group/input">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1 group-focus-within/input:text-primary transition-colors">School Email</label>
                  <input
                    type="email" required value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-input border border-border focus:outline-none focus:border-primary/50 focus:bg-background transition-all text-base text-foreground placeholder:text-muted-foreground"
                    placeholder="school@example.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pl-2">
              <div className="space-y-2">
                <h2 className="text-3xl font-serif font-medium text-foreground tracking-tight">
                  Choose Events
                </h2>
                <p className="text-base text-muted-foreground font-light">Select and build your teams for the events below.</p>
              </div>
            </div>
            
            {teams.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 text-primary bg-primary/5 px-5 py-3 rounded-2xl border border-primary/20"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="text-sm font-medium">Select an event to begin</span>
              </motion.div>
            )}

            <div className="space-y-16">
              {renderEventGrid(teamEvents, "Team Events")}
              {renderEventGrid(individualEvents, "Individual Events")}
            </div>
          </div>

          <AnimatePresence>
            {teams.length > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-8 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[calc(100%-32px)] sm:max-w-3xl bg-popover/90 backdrop-blur-2xl border border-border shadow-custom rounded-full p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between z-40 gap-4"
              >
                <div className="flex-1 flex flex-col justify-center px-6">
                  <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <span>{teams.length} {teams.length === 1 ? 'Event' : 'Events'}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">{totalParticipants} {totalParticipants === 1 ? 'Student' : 'Students'}</span>
                  </div>
                  {!isFormValid ? (
                    <p className="text-destructive text-xs mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {formError}
                    </p>
                  ) : (
                    <p className="text-green-500 text-xs mt-1.5 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> All requirements met
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={cn(
                    "w-full sm:w-auto px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-3 transition-all duration-300",
                    isFormValid && !isSubmitting
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] shadow-sm"
                      : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                  )}
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Finalizing..." : "Submit Registration"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <AnimatePresence>
          {showTeamModal && currentTeam && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
              onClick={() => setShowTeamModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="bg-card border border-border rounded-[2rem] shadow-custom max-w-3xl w-full h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
              >
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="w-full space-y-3">
                    <h2 className="text-2xl font-serif font-medium text-foreground">{currentTeam.event}</h2>
                    <div className="flex items-center gap-4 text-sm font-medium">
                       <span className={getTeamProgress(currentTeam).isComplete ? "text-green-500" : "text-muted-foreground"}>
                         {getTeamProgress(currentTeam).validCount} of {getTeamProgress(currentTeam).targetSize} Ready
                       </span>
                       <div className="h-1 flex-1 max-w-[120px] bg-secondary rounded-full overflow-hidden">
                         <motion.div 
                           className={cn("h-full rounded-full", getTeamProgress(currentTeam).isComplete ? "bg-green-500" : "bg-primary")}
                           animate={{ width: `${(getTeamProgress(currentTeam).validCount / getTeamProgress(currentTeam).targetSize) * 100}%` }}
                         />
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {confirmDeleteId === currentTeam.id ? (
                      <div className="flex items-center gap-3 bg-destructive/10 px-4 py-2.5 rounded-2xl border border-destructive/20">
                        <span className="text-xs font-semibold text-destructive">Delete team?</span>
                        <button onClick={() => removeTeam(currentTeam.id)} className="text-foreground hover:text-destructive font-bold text-xs px-2">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-muted-foreground hover:text-foreground text-xs px-2">No</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDeleteId(currentTeam.id)} 
                        className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowTeamModal(false)} 
                      className="p-3 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-xl transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Stepper */}
                {currentTeam.members.length > 1 && (
                  <div className="flex items-center gap-3 overflow-x-auto px-8 py-5 border-b border-border bg-muted/50 scrollbar-hide">
                    {currentTeam.members.map((_, idx) => {
                      const m = currentTeam.members[idx];
                      const evDetail = getEventDetails(currentTeam.event);
                      const isComplete = m.name && m.class && isPhoneValid(m.phone) && (!evDetail?.requiresInGameId || m.inGameId);
                      return (
                        <button
                          key={m.id}
                          onClick={() => setActiveMemberIndex(idx)}
                          className={cn(
                            "flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap gap-3 border",
                            activeMemberIndex === idx 
                              ? "bg-primary text-primary-foreground border-transparent"
                              : "bg-transparent text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          {isComplete ? <Check className={cn("w-4 h-4", activeMemberIndex === idx ? "text-primary-foreground" : "text-green-500")} /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
                          Participant {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto flex-1 bg-background relative">
                  <AnimatePresence mode="wait">
                    {currentTeam.members[activeMemberIndex] && (() => {
                      const member = currentTeam.members[activeMemberIndex];
                      const eventDetails = getEventDetails(currentTeam.event);
                      const isNameValid = member.name.trim() !== "";
                      const isClassValid = member.class.trim() !== "";
                      const isPhoneCheckValid = isPhoneValid(member.phone);
                      const isIdValid = !eventDetails?.requiresInGameId || member.inGameId?.trim() !== "";

                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                          className="space-y-8"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="font-serif font-medium text-xl text-foreground">
                              Participant Details
                            </h3>
                            <div className="flex items-center gap-2">
                              {activeMemberIndex < currentTeam.members.length - 1 && (
                                <div className="flex items-center bg-secondary rounded-xl p-1 border border-border">
                                  <button
                                    type="button" onClick={() => duplicateToNext(activeMemberIndex, "class")}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors px-4 py-2.5 rounded-lg"
                                  >
                                    Copy Class
                                  </button>
                                  <div className="w-[1px] h-4 bg-border mx-1"></div>
                                  <button
                                    type="button" onClick={() => duplicateToNext(activeMemberIndex, "all")}
                                    className="text-xs font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-background transition-colors px-4 py-2.5 rounded-lg"
                                  >
                                    <Copy className="w-3 h-3" /> All to Next
                                  </button>
                                </div>
                              )}
                              {!eventDetails?.teamSize && currentTeam.members.length > 1 && (
                                <button
                                  type="button" onClick={() => removeTeamMember(member.id)}
                                  className="text-destructive bg-destructive/10 hover:bg-destructive/20 p-3 rounded-xl transition-all ml-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                            <div className="space-y-3 sm:col-span-2 group/input">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1 flex justify-between">
                                Full Name {showErrors && !isNameValid && <span className="text-destructive">Required</span>}
                              </label>
                              <input
                                type="text" value={member.name} onChange={(e) => updateTeamMember(member.id, "name", e.target.value)}
                                autoComplete="name"
                                className={cn(
                                  "w-full px-5 py-4 rounded-2xl bg-input border focus:outline-none focus:bg-background transition-all text-base text-foreground placeholder:text-muted-foreground",
                                  showErrors && !isNameValid ? "border-destructive" : "border-border focus:border-primary/50"
                                )}
                                placeholder="Student's full name"
                              />
                            </div>
                            <div className="space-y-3 group/input">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1 flex justify-between">
                                Class & Section {showErrors && !isClassValid && <span className="text-destructive">Required</span>}
                              </label>
                              <input
                                type="text" value={member.class} onChange={(e) => updateTeamMember(member.id, "class", e.target.value)}
                                className={cn(
                                  "w-full px-5 py-4 rounded-2xl bg-input border focus:outline-none focus:bg-background transition-all text-base text-foreground placeholder:text-muted-foreground",
                                  showErrors && !isClassValid ? "border-destructive" : "border-border focus:border-primary/50"
                                )}
                                placeholder="e.g. 10-A"
                              />
                            </div>
                            <div className="space-y-3 group/input">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1 flex justify-between">
                                Contact Number 
                                {showErrors && (!isPhoneCheckValid && member.phone) && <span className="text-destructive">Invalid</span>}
                                {showErrors && !member.phone && <span className="text-destructive">Required</span>}
                              </label>
                              <input
                                type="tel" inputMode="numeric" autoComplete="tel"
                                value={member.phone} onChange={(e) => updateTeamMember(member.id, "phone", e.target.value)}
                                className={cn(
                                  "w-full px-5 py-4 rounded-2xl bg-input border focus:outline-none focus:bg-background transition-all text-base text-foreground placeholder:text-muted-foreground",
                                  showErrors && !isPhoneCheckValid ? "border-destructive" : "border-border focus:border-primary/50"
                                )}
                                placeholder="Mobile number"
                              />
                            </div>
                            
                            {eventDetails?.requiresInGameId && (
                              <div className="space-y-3 sm:col-span-2 group/input">
                                <label className="text-xs font-semibold text-orange-500 uppercase tracking-widest pl-1 flex justify-between">
                                  <span>In-Game ID <span className="text-orange-500/70 normal-case tracking-normal ml-1">({eventDetails.idFormat})</span></span>
                                  {showErrors && !isIdValid && <span className="text-destructive">Required</span>}
                                </label>
                                <input
                                  type="text" value={member.inGameId || ""} onChange={(e) => updateTeamMember(member.id, "inGameId", e.target.value)}
                                  className={cn(
                                    "w-full px-5 py-4 rounded-2xl bg-orange-500/5 border focus:outline-none focus:bg-orange-500/10 transition-all text-base text-foreground placeholder:text-orange-500/50",
                                    showErrors && !isIdValid ? "border-destructive" : "border-orange-500/20 focus:border-orange-500/50"
                                  )}
                                  placeholder={`e.g., ${eventDetails.idFormat === "Riot ID (Username#Tagline)" ? "PlayerOne#1234" : "1234567890"}`}
                                />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>

                  {!getEventDetails(currentTeam.event)?.teamSize && activeMemberIndex === currentTeam.members.length - 1 && (
                    <motion.div layout className="flex justify-start pt-8">
                      <button
                        type="button" onClick={addTeamMember}
                        className="px-6 py-4 bg-secondary text-muted-foreground font-medium rounded-2xl hover:bg-secondary/80 hover:text-foreground transition-all flex items-center gap-3 border border-border w-full justify-center sm:w-auto"
                      >
                        <PlusCircle className="w-5 h-5" /> Add Another Participant
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 border-t border-border bg-muted/30 flex flex-col sm:flex-row justify-between gap-4 relative z-10">
                   <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 order-2 sm:order-1">
                     {currentTeam.members.length > 1 && (
                       <>
                         <button
                           onClick={() => setActiveMemberIndex(Math.max(0, activeMemberIndex - 1))}
                           disabled={activeMemberIndex === 0}
                           className="p-4 bg-secondary border border-border rounded-2xl hover:bg-secondary/80 disabled:opacity-50 disabled:hover:bg-secondary transition-all"
                         >
                           <ChevronLeft className="w-5 h-5 text-foreground" />
                         </button>
                         <button
                           onClick={() => setActiveMemberIndex(Math.min(currentTeam.members.length - 1, activeMemberIndex + 1))}
                           disabled={activeMemberIndex === currentTeam.members.length - 1}
                           className="p-4 bg-secondary border border-border rounded-2xl hover:bg-secondary/80 disabled:opacity-50 disabled:hover:bg-secondary transition-all"
                         >
                           <ChevronRight className="w-5 h-5 text-foreground" />
                         </button>
                       </>
                     )}
                   </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                    <button
                      onClick={() => setShowTeamModal(false)}
                      className="flex-1 sm:flex-none px-6 py-4 text-muted-foreground font-medium hover:text-foreground rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveTeam}
                      className={cn(
                        "flex-1 sm:flex-none px-8 py-4 font-semibold rounded-2xl transition-all flex justify-center items-center gap-2",
                        getTeamProgress(currentTeam).isComplete 
                          ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {getTeamProgress(currentTeam).isComplete ? (
                        <><CheckCircle className="w-4 h-4" /> Save Team</>
                      ) : (
                        "Save Draft"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
