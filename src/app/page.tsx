"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { Send, Users, X, CheckCircle, PlusCircle, Trash2, Copy, AlertCircle, Cloud, Check, ArrowRight } from "lucide-react";
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

type SaveState = "idle" | "saving" | "saved" | "unsaved";

export default function Home() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // LocalStorage Loading
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
        console.error("Failed to parse teams", e);
      }
    }
  }, []);

  // Autosave Logic
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

  // Back-navigation guard
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
  // Basic length and numeric validation for phone numbers (allows spaces/dashes but checks digit count)
  const isPhoneValid = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  };
  
  const getEventDetails = (eventName: string) => EVENT_DETAILS[eventName] || {};

  // Helper: Get Team Status
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
    // Duplicate prevention
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
      const existingIndex = prev.findIndex(t => t.event === currentTeam.event); // Guard against dupe event states
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
    if (window.confirm("Are you sure you want to remove this team? All participant data will be lost.")) {
      setTeams(prev => prev.filter(t => t.id !== teamId));
      toast.success("Team removed");
      if (currentTeam?.id === teamId) setShowTeamModal(false);
    }
  };

  const editTeam = (team: Team) => {
    setCurrentTeam(team);
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
  };

  const removeTeamMember = (memberId: string) => {
    if (!currentTeam) return;
    setCurrentTeam(prev => ({
      ...prev!,
      members: prev!.members.filter(member => member.id !== memberId),
    }));
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
  };

  // Scoped Auto-focus next input on Enter
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      // Scope specifically to the modal container
      const inputs = Array.from(e.currentTarget.querySelectorAll('input:not([disabled])')) as HTMLInputElement[];
      const index = inputs.indexOf(e.target);
      if (index > -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    }
  };

  // Validation & Stats
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
  const incompleteTeamsCount = teams.filter(t => !getTeamProgress(t).isComplete).length;

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
      
      // Removed redundant local state reset because we navigate away instantly
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
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-2">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const eventDetails = getEventDetails(event) as any;
          const existingTeam = teams.find(t => t.event === event);
          const isSelected = !!existingTeam;
          const progress = existingTeam ? getTeamProgress(existingTeam) : null;

          return (
            <motion.button
              key={event}
              type="button"
              onClick={() => existingTeam ? editTeam(existingTeam) : createTeamForEvent(event)}
              className={cn(
                "p-5 rounded-3xl border transition-all text-left backdrop-blur-md relative overflow-hidden group flex flex-col justify-between h-full min-h-[150px]",
                isSelected && progress?.isComplete
                  ? "border-green-500/50 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                  : isSelected && progress?.status === "in-progress"
                  ? "border-orange-500/50 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                  : "border-border/50 bg-background/40 hover:bg-background/60 hover:border-border"
              )}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between mb-2 w-full">
                <div className="pr-2">
                  <div className="flex items-center gap-2">
                    {eventDetails?.icon && <span className="text-xl">{eventDetails.icon}</span>}
                    <h3 className="font-semibold text-base leading-tight">{event}</h3>
                  </div>
                  {eventDetails?.category && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-muted text-[10px] uppercase font-bold text-muted-foreground">
                      {eventDetails.category}
                    </span>
                  )}
                </div>
                {isSelected && progress?.isComplete && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </motion.div>
                )}
                {isSelected && progress?.status === "in-progress" && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  </motion.div>
                )}
              </div>

              {eventDetails?.description && !isSelected && (
                <p className="text-xs text-muted-foreground/80 mt-1 mb-3 line-clamp-2">
                  {eventDetails.description}
                </p>
              )}

              <div className="mt-auto pt-3 space-y-3 w-full">
                {isSelected && progress ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={progress.isComplete ? "text-green-500" : "text-orange-500"}>
                        {progress.isComplete ? "Completed" : "In Progress"}
                      </span>
                      <span className="text-muted-foreground">{progress.validCount} / {progress.targetSize}</span>
                    </div>
                    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.validCount / progress.targetSize) * 100}%` }}
                        className={cn("h-full rounded-full", progress.isComplete ? "bg-green-500" : "bg-orange-500")}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                      <Users className="w-3.5 h-3.5" />
                      <span>{eventDetails?.teamSize ? `${eventDetails.teamSize} Participants` : "Flexible Size"}</span>
                    </div>
                    {eventDetails?.requiresInGameId && (
                      <span className="inline-flex w-fit px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">
                        Game ID Req.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen pb-40 px-4 sm:px-6 lg:px-8 py-12 bg-[url('https://images.unsplash.com/photo-1506744626753-1fa28f6f53cb?auto=format&fit=crop&w=2560&q=80')] bg-cover bg-center bg-fixed text-foreground relative selection:bg-primary/30">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[4px] z-0" />
      
      {/* Autosave Indicator */}
      <AnimatePresence>
        {saveState !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-full shadow-lg text-sm font-medium"
          >
            {saveState === "saving" ? (
              <><Cloud className="w-4 h-4 animate-pulse text-muted-foreground" /> Saving...</>
            ) : saveState === "saved" ? (
              <><Check className="w-4 h-4 text-green-500" /> Saved</>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-6">
          <motion.img 
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            src="https://framerusercontent.com/images/GuPYr7ZLGnklkwJ5MitUN7nvgcA.png" 
            alt="Event Logo" 
            onClick={() => window.location.href = "/events"}
            className="w-20 h-20 object-cover rounded-2xl mx-auto shadow-xl cursor-pointer hover:scale-105 transition-transform duration-300 ring-2 ring-ring/50"
          />
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground drop-shadow-sm">
              Event Registration
            </h1>
            <p className="text-muted-foreground/90 text-lg max-w-xl mx-auto">
              Register your school and participants for upcoming events.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* School Information */}
          <div className="bg-background/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-border/50">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full"></div>
              School Information
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/80 pl-1 uppercase tracking-wider">School Name</label>
                <input
                  type="text" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground text-base sm:text-sm"
                  placeholder="e.g. Springfield High"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/80 pl-1 uppercase tracking-wider">School Email</label>
                <input
                  type="email" required value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground text-base sm:text-sm"
                  placeholder="school@example.com"
                />
              </div>
            </div>
          </div>

          {/* Events Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between pl-2">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                 <div className="w-2 h-6 bg-primary rounded-full"></div>
                Select Events
              </h2>
            </div>
            
            {teams.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-primary animate-pulse pl-2 mb-2"
              >
                <ArrowRight className="w-5 h-5" />
                <span className="text-sm font-medium">Start by selecting an event below</span>
              </motion.div>
            )}

            {renderEventGrid(teamEvents, "Team Events")}
            {renderEventGrid(individualEvents, "Individual Events")}
          </div>

          {/* Sticky Submit Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe sm:p-6 bg-background/80 backdrop-blur-xl border-t border-border/50 flex flex-col items-center justify-center z-40">
            <div className="w-full max-w-4xl">
              {/* Progress Summary Bar */}
              {teams.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mb-3 text-sm font-medium text-muted-foreground">
                  <span className="text-foreground">{teams.length} {teams.length === 1 ? 'Event' : 'Events'}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-foreground">{totalParticipants} {totalParticipants === 1 ? 'Participant' : 'Participants'}</span>
                  {incompleteTeamsCount > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-orange-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {incompleteTeamsCount} Incomplete
                      </span>
                    </>
                  )}
                </div>
              )}

              {!isFormValid && teams.length > 0 && (
                <p className="text-orange-500 text-sm font-semibold mb-3 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-xl relative",
                  isFormValid && !isSubmitting
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] shadow-primary/25"
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-70"
                )}
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSubmitting ? "Finalizing..." : saveState === "saving" ? "Saving progress..." : "Complete Registration"}
              </button>
            </div>
          </div>
        </form>

        {/* Dynamic Team Modal */}
        <AnimatePresence>
          {showTeamModal && currentTeam && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-6"
              onClick={() => setShowTeamModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-background border border-border/50 sm:rounded-[2rem] shadow-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
              >
                {/* Modal Header */}
                <div className="p-5 sm:p-8 border-b border-border/50 bg-muted/30 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                  <div className="w-full pr-4">
                    <h2 className="text-2xl font-bold">{currentTeam.event}</h2>
                    {/* Progress Bar in Header */}
                    <div className="mt-3 w-full max-w-md">
                       <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground">
                         <span>Setup Progress</span>
                         <span>{getTeamProgress(currentTeam).validCount} / {getTeamProgress(currentTeam).targetSize} Valid</span>
                       </div>
                       <div className="h-1.5 w-full bg-background/50 rounded-full overflow-hidden">
                         <motion.div 
                           className={cn("h-full rounded-full", getTeamProgress(currentTeam).isComplete ? "bg-green-500" : "bg-primary")}
                           animate={{ width: `${(getTeamProgress(currentTeam).validCount / getTeamProgress(currentTeam).targetSize) * 100}%` }}
                         />
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                      onClick={() => removeTeam(currentTeam.id)} 
                      className="p-3 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                      title="Delete Team"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowTeamModal(false)} 
                      className="p-3 bg-background hover:bg-muted rounded-full transition-all hover:rotate-90"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-8 overflow-y-auto flex-1 bg-gradient-to-b from-background to-muted/10 space-y-6">
                  <AnimatePresence mode="popLayout">
                    {currentTeam.members.map((member, index) => {
                      const eventDetails = getEventDetails(currentTeam.event);
                      const isNameValid = member.name.trim() !== "";
                      const isClassValid = member.class.trim() !== "";
                      const isPhoneCheckValid = isPhoneValid(member.phone);
                      const isIdValid = !eventDetails?.requiresInGameId || member.inGameId?.trim() !== "";
                      
                      const isMemberComplete = isNameValid && isClassValid && isPhoneCheckValid && isIdValid;

                      return (
                        <motion.div
                          layout key={member.id}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "bg-card rounded-3xl p-5 sm:p-6 border shadow-lg relative transition-colors duration-300",
                            isMemberComplete ? "border-green-500/30 bg-green-500/5" : "border-border/30",
                            showErrors && !isMemberComplete ? "border-red-500/50" : ""
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <h3 className="font-bold text-foreground flex items-center gap-3">
                              <span className={cn(
                                "flex items-center justify-center w-7 h-7 rounded-full text-sm transition-colors",
                                isMemberComplete ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
                              )}>
                                {isMemberComplete ? <Check className="w-4 h-4" /> : index + 1}
                              </span>
                              Participant {index + 1}
                            </h3>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {index < currentTeam.members.length - 1 && (
                                <div className="flex items-center bg-background/50 border border-border/30 rounded-lg overflow-hidden">
                                  <button
                                    type="button" onClick={() => duplicateToNext(index, "class")}
                                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors px-3 py-2 border-r border-border/30"
                                    title="Copy Class only"
                                  >
                                    Class
                                  </button>
                                  <button
                                    type="button" onClick={() => duplicateToNext(index, "all")}
                                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors px-3 py-2"
                                    title="Copy Class & Phone to next participant"
                                  >
                                    <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">All</span>
                                  </button>
                                </div>
                              )}
                              {!eventDetails?.teamSize && currentTeam.members.length > 1 && (
                                <button
                                  type="button" onClick={() => removeTeamMember(member.id)}
                                  className="text-red-400 hover:bg-red-500/10 hover:text-red-500 p-2 rounded-xl transition-all ml-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider pl-1 flex justify-between">
                                Name * {showErrors && !isNameValid && <span className="text-red-500 normal-case">Required</span>}
                              </label>
                              <input
                                type="text" value={member.name} onChange={(e) => updateTeamMember(member.id, "name", e.target.value)}
                                autoComplete="name"
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl bg-card border focus:outline-none focus:ring-2 transition-all font-medium text-base sm:text-sm",
                                  showErrors && !isNameValid ? "border-red-500/50 focus:ring-red-500/50" : "border-border focus:ring-primary/50"
                                )}
                                placeholder="Full name"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider pl-1 flex justify-between">
                                Class * {showErrors && !isClassValid && <span className="text-red-500 normal-case">Required</span>}
                              </label>
                              <input
                                type="text" value={member.class} onChange={(e) => updateTeamMember(member.id, "class", e.target.value)}
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl bg-card border focus:outline-none focus:ring-2 transition-all font-medium text-base sm:text-sm",
                                  showErrors && !isClassValid ? "border-red-500/50 focus:ring-red-500/50" : "border-border focus:ring-primary/50"
                                )}
                                placeholder="e.g. 10"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider pl-1 flex justify-between">
                                Phone * {showErrors && (!isPhoneCheckValid && member.phone) && <span className="text-red-500 normal-case">Invalid</span>}
                                        {showErrors && !member.phone && <span className="text-red-500 normal-case">Required</span>}
                              </label>
                              <input
                                type="tel" inputMode="numeric" autoComplete="tel"
                                value={member.phone} onChange={(e) => updateTeamMember(member.id, "phone", e.target.value)}
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl bg-card border focus:outline-none focus:ring-2 transition-all font-medium text-base sm:text-sm",
                                  showErrors && !isPhoneCheckValid ? "border-red-500/50 focus:ring-red-500/50" : "border-border focus:ring-primary/50"
                                )}
                                placeholder="Contact number"
                              />
                            </div>
                            
                            {eventDetails?.requiresInGameId && (
                              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                                <label className="text-xs font-bold text-orange-500/90 uppercase tracking-wider pl-1 flex justify-between">
                                  <span>In-Game ID * <span className="text-muted-foreground/60 normal-case tracking-normal">({eventDetails.idFormat})</span></span>
                                  {showErrors && !isIdValid && <span className="text-red-500 normal-case">Required</span>}
                                </label>
                                <input
                                  type="text" value={member.inGameId || ""} onChange={(e) => updateTeamMember(member.id, "inGameId", e.target.value)}
                                  className={cn(
                                    "w-full px-4 py-3 rounded-xl bg-orange-500/5 border focus:outline-none focus:ring-2 transition-all font-medium text-base sm:text-sm placeholder:text-orange-500/40",
                                    showErrors && !isIdValid ? "border-red-500/50 focus:ring-red-500/50" : "border-orange-500/20 focus:ring-orange-500/50"
                                  )}
                                  placeholder={`e.g., ${eventDetails.idFormat === "Riot ID (Username#Tagline)" ? "PlayerOne#1234" : "1234567890 (IGN)"}`}
                                />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Flexible Team Size Logic */}
                  {!getEventDetails(currentTeam.event)?.teamSize && (
                    <motion.div layout className="flex justify-center pt-2 pb-6">
                      <button
                        type="button" onClick={addTeamMember}
                        className="px-6 py-3.5 bg-primary/10 text-primary font-bold rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 border border-primary/20"
                      >
                        <PlusCircle className="w-5 h-5" /> Add Another Participant
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-5 pb-safe sm:p-6 border-t border-border/50 bg-muted/30 backdrop-blur-xl flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="px-6 py-4 sm:py-3 text-muted-foreground font-semibold hover:bg-background rounded-2xl transition-all order-2 sm:order-1"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={saveTeam}
                    className={cn(
                      "px-8 py-4 sm:py-3 font-bold rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 order-1 sm:order-2",
                      getTeamProgress(currentTeam).isComplete 
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20 hover:-translate-y-0.5" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:-translate-y-0.5"
                    )}
                  >
                    {getTeamProgress(currentTeam).isComplete ? (
                      <><CheckCircle className="w-5 h-5" /> Confirm Valid Team</>
                    ) : (
                      "Save Draft"
                    )}
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
