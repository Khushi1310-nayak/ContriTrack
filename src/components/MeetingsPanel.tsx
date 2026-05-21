"use client";

import React, { useState, useEffect, useMemo, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Plus, 
  Trash2, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  CheckSquare, 
  Square, 
  Layers, 
  Check, 
  AlertCircle,
  X,
  PlusCircle,
  Link as LinkIcon
} from "lucide-react";
import { 
  fetchWorkspaceMeetings, 
  createMeeting, 
  cancelMeeting, 
  deleteMeeting, 
  updateParticipantStatus, 
  addMeetingNote, 
  addAgendaItem, 
  toggleAgendaItem 
} from "@/app/actions/meeting-actions";
import { createWorkspaceTask } from "@/app/actions/task-actions";

// Match the database schemas
interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  role: string;
  attendanceStatus: string;
}

interface MeetingAgenda {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  completed: boolean;
  taskId: string | null;
}

interface MeetingNote {
  id: string;
  meetingId: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string | Date;
}

interface MeetingReminder {
  id: string;
  meetingId: string;
  reminderType: string;
  minutesBefore: number;
}

interface Meeting {
  id: string;
  workspaceId: string;
  creatorId: string | null;
  title: string;
  description: string | null;
  platform: string;
  meetingLink: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  recurring: boolean;
  recurrenceRule: string | null;
  status: string;
  participants: MeetingParticipant[];
  agenda: MeetingAgenda[];
  notes: MeetingNote[];
  reminders: MeetingReminder[];
}

interface Collaborator {
  id: string;
  fullName: string;
  email: string;
  githubUsername?: string | null;
}

interface MeetingsPanelProps {
  workspaceId: string;
  user: { uid: string; displayName?: string | null; email?: string | null } | null;
  collaborators: Collaborator[];
}

export default function MeetingsPanel({ workspaceId, user, collaborators }: MeetingsPanelProps) {
  // Lists & data states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  
  // Creation/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("meet");
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timezone] = useState("Asia/Kolkata");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("weekly");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [agendaFields, setAgendaFields] = useState<{ title: string; description: string }[]>([]);
  const [reminderMinutes] = useState<number[]>([15]);

  // Selected meeting detail drawer/modal state
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [agendaTitleInput, setAgendaTitleInput] = useState("");
  const [agendaDescInput, setAgendaDescInput] = useState("");
  const [taskCreatingId, setTaskCreatingId] = useState<string | null>(null);

  // Time & Live counter state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Calculate real teammate attendance rate
  const attendanceRate = useMemo(() => {
    // 1. Get all completed or past meetings (or meetings that have happened / started)
    const completedOrPastMeetings = meetings.filter(m => {
      if (m.status === "completed") return true;
      if (m.status === "cancelled") return false;
      const startTime = new Date(`${m.scheduledDate}T${m.startTime}:00`);
      return startTime <= currentTime;
    });

    let totalSlots = 0;
    let attendedSlots = 0;

    completedOrPastMeetings.forEach(m => {
      m.participants.forEach(p => {
        totalSlots++;
        if (p.attendanceStatus === "attended") {
          attendedSlots++;
        }
      });
    });

    return totalSlots > 0 ? Math.round((attendedSlots / totalSlots) * 100) : 0;
  }, [meetings, currentTime]);

  // Interactive custom monthly calendar controls
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());

  // Fetch all meetings on mount or workspace transition
  const loadMeetings = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const res = await fetchWorkspaceMeetings(workspaceId);
    if (res.success && res.meetings) {
      setMeetings(res.meetings as Meeting[]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    startTransition(() => {
      void loadMeetings();
    });
  }, [loadMeetings]);

  // Time tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Utility to auto-detect platform from URLs
  const detectPlatform = (url: string) => {
    if (!url) return "other";
    const lower = url.toLowerCase();
    if (lower.includes("meet.google.com")) return "meet";
    if (lower.includes("zoom.us")) return "zoom";
    if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com")) return "teams";
    return "other";
  };

  const handleLinkChange = (val: string) => {
    setMeetingLink(val);
    const detected = detectPlatform(val);
    if (detected !== "other") {
      setPlatform(detected);
    }
  };

  // Build a Google Calendar TEMPLATE deep link
  const makeGoogleCalendarLink = (meet: Meeting) => {
    const startStr = `${meet.scheduledDate.replace(/-/g, "")}T${meet.startTime.replace(/:/g, "")}00Z`;
    const endStr = `${meet.scheduledDate.replace(/-/g, "")}T${meet.endTime.replace(/:/g, "")}00Z`;
    const details = meet.description || "ContriTrack Collaborative Sync Meeting";
    const location = meet.meetingLink || "Online Meeting";
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meet.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  };

  // Handle meeting scheduling creation
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate || !startTime || !endTime) {
      setFormError("Please fill out all mandatory schedule parameters.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const res = await createMeeting({
      workspaceId,
      creatorId: user?.uid || "",
      title,
      description,
      platform,
      meetingLink,
      scheduledDate,
      startTime,
      endTime,
      timezone,
      recurring,
      recurrenceRule: recurring ? recurrenceRule : undefined,
      participantIds: selectedParticipants,
      agendaItems: agendaFields.filter((item) => item.title.trim() !== ""),
      reminderMinutes
    });

    setSubmitting(false);

    if (res.success && res.meeting) {
      setMeetings((prev) => [...prev, res.meeting as Meeting].sort((a, b) => {
        const dateDiff = a.scheduledDate.localeCompare(b.scheduledDate);
        return dateDiff !== 0 ? dateDiff : a.startTime.localeCompare(b.startTime);
      }));
      // Reset fields
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setPlatform("meet");
      setMeetingLink("");
      setScheduledDate("");
      setStartTime("");
      setEndTime("");
      setSelectedParticipants([]);
      setAgendaFields([]);
    } else {
      setFormError(res.error || "Failed to create meeting link in the database.");
    }
  };

  // Convert agenda item directly to a workspace task card
  const handleConvertAgendaToTask = async (agenda: MeetingAgenda, meet: Meeting) => {
    if (!user?.uid) return;
    setTaskCreatingId(agenda.id);
    const res = await createWorkspaceTask({
      title: `[Meeting decision] ${meet.title} - ${agenda.title}`,
      description: agenda.description || `Action item created from meeting decision on ${meet.scheduledDate}`,
      priority: "high",
      status: "todo",
      labels: "Meeting Action",
      workspaceId,
      creatorId: user.uid,
    });
    setTaskCreatingId(null);
    if (res.success && res.task) {
      // Toggle it to link it/complete agenda link
      await toggleAgendaItem(agenda.id, true);
      alert(`Action item converted successfully into a trackable Task card: "${res.task.title}"`);
      loadMeetings();
    }
  };

  // Post collaborative meeting notes
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !selectedMeeting || !user?.uid) return;
    const authorName = user.displayName || user.email?.split("@")[0] || "Contributor";
    const res = await addMeetingNote(selectedMeeting.id, user.uid, authorName, noteInput);
    if (res.success && res.note) {
      setSelectedMeeting((prev) => prev ? {
        ...prev,
        notes: [res.note as MeetingNote, ...prev.notes]
      } : null);
      setMeetings((prev) => prev.map((m) => m.id === selectedMeeting.id ? {
        ...m,
        notes: [res.note as MeetingNote, ...m.notes]
      } : m));
      setNoteInput("");
    }
  };

  // Add agenda item live
  const handleAddAgendaLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaTitleInput.trim() || !selectedMeeting || !user?.uid) return;
    const res = await addAgendaItem(selectedMeeting.id, agendaTitleInput, agendaDescInput, user.uid);
    if (res.success && res.item) {
      setSelectedMeeting((prev) => prev ? {
        ...prev,
        agenda: [...prev.agenda, res.item as MeetingAgenda]
      } : null);
      setMeetings((prev) => prev.map((m) => m.id === selectedMeeting.id ? {
        ...m,
        agenda: [...m.agenda, res.item as MeetingAgenda]
      } : m));
      setAgendaTitleInput("");
      setAgendaDescInput("");
    }
  };

  // Soft cancel meeting
  const handleCancelMeeting = async (meetId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled meeting sync?")) return;
    const res = await cancelMeeting(meetId);
    if (res.success && res.meeting) {
      setMeetings((prev) => prev.map((m) => m.id === meetId ? { ...m, status: "cancelled" } : m));
      if (selectedMeeting?.id === meetId) {
        setSelectedMeeting((prev) => prev ? { ...prev, status: "cancelled" } : null);
      }
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async (meetId: string) => {
    if (!confirm("Permanently delete this meeting and all associated collaborative notes?")) return;
    const res = await deleteMeeting(meetId);
    if (res.success) {
      setMeetings((prev) => prev.filter((m) => m.id !== meetId));
      if (selectedMeeting?.id === meetId) {
        setSelectedMeeting(null);
      }
    }
  };

  // Toggle agenda complete
  const handleToggleAgenda = async (agendaId: string, currentVal: boolean) => {
    const res = await toggleAgendaItem(agendaId, !currentVal);
    if (res.success && res.item) {
      setSelectedMeeting((prev) => prev ? {
        ...prev,
        agenda: prev.agenda.map((a) => a.id === agendaId ? { ...a, completed: !currentVal } : a)
      } : null);
      setMeetings((prev) => prev.map((m) => m.id === selectedMeeting?.id ? {
        ...m,
        agenda: m.agenda.map((a) => a.id === agendaId ? { ...a, completed: !currentVal } : a)
      } : m));
    }
  };

  // RSVP status change
  const handleRSVP = async (meetId: string, status: string) => {
    if (!user?.uid) return;
    const res = await updateParticipantStatus(meetId, user.uid, status);
    if (res.success && res.participant) {
      setMeetings((prev) => prev.map((m) => {
        if (m.id === meetId) {
          const exists = m.participants.some((p) => p.userId === user.uid);
          const updatedParts = exists 
            ? m.participants.map((p) => p.userId === user.uid ? { ...p, attendanceStatus: status } : p)
            : [...m.participants, { ...res.participant, userEmail: user.email || null, userFullName: user.displayName || null } as MeetingParticipant];
          return { ...m, participants: updatedParts };
        }
        return m;
      }));
      if (selectedMeeting?.id === meetId) {
        setSelectedMeeting((prev) => {
          if (!prev) return null;
          const exists = prev.participants.some((p) => p.userId === user.uid);
          const updatedParts = exists 
            ? prev.participants.map((p) => p.userId === user.uid ? { ...p, attendanceStatus: status } : p)
            : [...prev.participants, { ...res.participant, userEmail: user.email || null, userFullName: user.displayName || null } as MeetingParticipant];
          return { ...prev, participants: updatedParts };
        });
      }
    }
  };

  const handleJoinCallClick = async (meetId: string) => {
    if (!user?.uid) return;
    await handleRSVP(meetId, "attended");
  };

  // Live timer countdown logic
  const getCountdownString = (meet: Meeting) => {
    const meetTime = new Date(`${meet.scheduledDate}T${meet.startTime}:00`);
    const diffMs = meetTime.getTime() - currentTime.getTime();
    if (diffMs < 0) {
      // Calculate end time
      const endTime = new Date(`${meet.scheduledDate}T${meet.endTime}:00`);
      if (currentTime.getTime() < endTime.getTime()) {
        return "LIVE NOW";
      }
      return "COMPLETED";
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const secs = diffSecs % 60;
    const diffMins = Math.floor(diffSecs / 60);
    const mins = diffMins % 60;
    const diffHours = Math.floor(diffMins / 60);
    const hours = diffHours % 24;
    const days = Math.floor(diffHours / 24);

    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m left`;
    }
    return `${mins}m ${secs}s left`;
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
    
    const days = [];
    // Pad previous month days
    const prevMonthDays = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: currentCalendarMonth === 0 ? 11 : currentCalendarMonth - 1,
        year: currentCalendarMonth === 0 ? currentCalendarYear - 1 : currentCalendarYear,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: currentCalendarMonth,
        year: currentCalendarYear,
        isCurrentMonth: true,
      });
    }

    // Pad next month days to make multiple of 7 (full calendar grid)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1,
        year: currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentCalendarMonth, currentCalendarYear]);

  // Map meetings to specific calendar dates
  const getMeetingsForDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return meetings.filter((m) => m.scheduledDate === dateStr && m.status !== "cancelled");
  };

  // Navigation handlers for custom calendar
  const handlePrevMonth = () => {
    if (currentCalendarMonth === 0) {
      setCurrentCalendarMonth(11);
      setCurrentCalendarYear((y) => y - 1);
    } else {
      setCurrentCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalendarMonth === 11) {
      setCurrentCalendarMonth(0);
      setCurrentCalendarYear((y) => y + 1);
    } else {
      setCurrentCalendarMonth((m) => m + 1);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Academic Timelines</span>
          <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">Meeting Scheduler</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setActiveView("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition ${activeView === "list" ? "bg-[#F2C1A3] text-black font-semibold" : "text-[#857C91] hover:text-white"}`}
            >
              List
            </button>
            <button 
              onClick={() => setActiveView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition ${activeView === "calendar" ? "bg-[#F2C1A3] text-black font-semibold" : "text-[#857C91] hover:text-white"}`}
            >
              Calendar
            </button>
          </div>
          {/* Schedule CTA */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg shadow-[#F2C1A3]/10 cursor-pointer"
          >
            <Plus size={14} />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* STATS MONITOR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col gap-1">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Scheduled Syncs</span>
          <span className="text-2xl font-serif text-white font-light">
            {meetings.filter((m) => m.status === "upcoming").length}
          </span>
          <span className="text-[8px] text-[#F2C1A3] font-mono uppercase">Upcoming Peer events</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col gap-1">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Live Meetings</span>
          <span className="text-2xl font-serif text-emerald-400 font-light flex items-center gap-1.5">
            {meetings.some((m) => {
              const start = new Date(`${m.scheduledDate}T${m.startTime}:00`);
              const end = new Date(`${m.scheduledDate}T${m.endTime}:00`);
              return currentTime >= start && currentTime <= end && m.status !== "cancelled";
            }) ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Active
              </>
            ) : "None"}
          </span>
          <span className="text-[8px] text-[#857C91] font-mono uppercase">In progress rooms</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col gap-1">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Completed Sessions</span>
          <span className="text-2xl font-serif text-white/50 font-light">
            {meetings.filter((m) => m.status === "completed" || new Date(`${m.scheduledDate}T${m.endTime}:00`) < currentTime).length}
          </span>
          <span className="text-[8px] text-[#CD9FA0] font-mono uppercase">Archived discussions</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col gap-1">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Attendance Rate</span>
          <span className="text-2xl font-serif text-white font-light">{attendanceRate}%</span>
          <span className="text-[8px] text-emerald-400 font-mono uppercase">100% PERSISTENT PRESENCE</span>
        </div>
      </div>

      {/* VIEWS CONTAINER */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border border-[#F2C1A3]/30 border-t-[#F2C1A3] animate-spin" />
          <span className="text-xs text-[#857C91] font-mono uppercase tracking-wider">Syncing database calendar...</span>
        </div>
      ) : activeView === "list" ? (
        /* LIST VIEW */
        <div className="flex flex-col gap-4">
          {meetings.map((meet) => {
            const isCancelled = meet.status === "cancelled";
            const countdown = getCountdownString(meet);
            const isLive = countdown === "LIVE NOW";

            return (
              <motion.div 
                key={meet.id}
                layoutId={`meet-card-${meet.id}`}
                onClick={() => setSelectedMeeting(meet)}
                className={`p-5 rounded-3xl border ${isLive ? "border-emerald-500/25 bg-emerald-500/[0.02]" : "border-white/5 bg-[#141523]/45"} hover:border-white/10 hover:bg-[#141523]/60 transition flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-2xl bg-white/[0.02] border ${isLive ? "border-emerald-500/20 text-emerald-400" : "border-white/5 text-[#F2C1A3]"} shrink-0 mt-0.5`}>
                    {meet.platform === "zoom" ? (
                      <Video size={20} className="text-[#CD9FA0]" />
                    ) : meet.platform === "teams" ? (
                      <Users size={20} className="text-[#857C91]" />
                    ) : (
                      <Video size={20} />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-semibold text-white ${isCancelled ? "line-through text-white/40" : ""}`}>
                        {meet.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${
                        isLive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" :
                        isCancelled ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-white/5 border border-white/10 text-[#857C91]"
                      }`}>
                        {isCancelled ? "Cancelled" : countdown}
                      </span>
                    </div>
                    <p className="text-[#857C91] text-xs font-light mt-1.5 line-clamp-1 max-w-[450px]">
                      {meet.description || "No agenda description loaded."}
                    </p>

                    {/* Timeline elements */}
                    <div className="flex items-center gap-4 mt-3 text-[10px] font-mono uppercase tracking-wide text-[#857C91] flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={10} />
                        {meet.scheduledDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {meet.startTime} - {meet.endTime} ({meet.timezone})
                      </span>
                    </div>

                    {/* Participants bubbles & Agenda progress */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      {meet.participants.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {meet.participants.slice(0, 4).map((p) => (
                            <div 
                              key={p.id} 
                              className="w-5 h-5 rounded-full bg-[#CD9FA0]/20 text-[#CD9FA0] border border-[#111221] text-[8px] font-bold flex items-center justify-center font-mono"
                              title={p.userFullName || p.userEmail || "Contributor"}
                            >
                              {(p.userFullName || "C").substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {meet.participants.length > 4 && (
                            <div className="w-5 h-5 rounded-full bg-white/5 border border-[#111221] text-[8px] font-bold text-white flex items-center justify-center font-mono">
                              +{meet.participants.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                      {meet.agenda.length > 0 && (
                        <span className="text-[9px] font-mono text-[#857C91] uppercase">
                          {meet.agenda.filter(a => a.completed).length}/{meet.agenda.length} agenda items completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live launch action buttons */}
                <div className="flex items-center gap-3 justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0" onClick={(e) => e.stopPropagation()}>
                  {meet.meetingLink ? (
                    <a 
                      href={meet.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleJoinCallClick(meet.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold transition ${
                        isLive ? "bg-emerald-400 text-black hover:bg-emerald-500" : "bg-[#F2C1A3]/10 border border-[#F2C1A3]/25 text-[#F2C1A3] hover:bg-[#F2C1A3] hover:text-[#12131e]"
                      }`}
                    >
                      <ExternalLink size={10} />
                      Join Call
                    </a>
                  ) : (
                    <span className="text-[10px] text-[#857C91] italic pr-2">No meeting room link</span>
                  )}
                  {/* Google Calendar Template Sync */}
                  <a 
                    href={makeGoogleCalendarLink(meet)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[#857C91] hover:text-white hover:border-white/10 transition"
                    title="Sync to Google Calendar"
                  >
                    <CalendarIcon size={12} />
                  </a>
                </div>
              </motion.div>
            );
          })}

          {meetings.length === 0 && (
            <div className="py-24 border border-dashed border-white/5 rounded-3xl text-center flex flex-col items-center justify-center p-6 gap-3 bg-white/[0.01]">
              <CalendarIcon className="w-8 h-8 text-[#857C91]/65" />
              <span className="text-xs text-[#857C91] font-light">No meetings found. Try scheduling a peer alignment sync!</span>
            </div>
          )}
        </div>
      ) : (
        /* MONTHLY CALENDAR VIEW */
        <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45">
          {/* Calendar Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h3 className="text-white text-base font-serif font-light">
              {new Date(currentCalendarYear, currentCalendarMonth).toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-2 rounded-xl bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={handleNextMonth}
                title="Next Month"
                className="p-2 rounded-xl bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono text-[#857C91] uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayObj, index) => {
              const dateMeetings = getMeetingsForDate(dayObj.year, dayObj.month, dayObj.day);
              const isToday = new Date().getDate() === dayObj.day && new Date().getMonth() === dayObj.month && new Date().getFullYear() === dayObj.year;

              return (
                <div 
                  key={index}
                  className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition ${
                    dayObj.isCurrentMonth ? "bg-[#111221]/30 border-white/5" : "bg-black/10 border-transparent opacity-20"
                  } ${isToday ? "border-[#F2C1A3]/30 bg-[#F2C1A3]/[0.02]" : ""}`}
                >
                  <span className={`text-[10px] font-mono ${isToday ? "text-[#F2C1A3] font-bold" : "text-[#857C91]"}`}>
                    {dayObj.day}
                  </span>
                  
                  {/* Event Indicators */}
                  <div className="flex flex-col gap-1 mt-1.5 overflow-hidden">
                    {dateMeetings.slice(0, 3).map((meet) => (
                      <div 
                        key={meet.id}
                        onClick={() => setSelectedMeeting(meet)}
                        className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] truncate cursor-pointer hover:bg-[#F2C1A3] hover:text-black transition"
                        title={meet.title}
                      >
                        {meet.startTime} {meet.title}
                      </div>
                    ))}
                    {dateMeetings.length > 3 && (
                      <span className="text-[7px] text-[#857C91] font-mono pl-1">
                        +{dateMeetings.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE MEETING MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#12131e] p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-[#F2C1A3]" />
                  <h3 className="text-white text-base font-serif font-light">Schedule Meeting Room</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  title="Close modal"
                >
                  <X size={14} />
                </button>
              </div>

              {formError && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSchedule} className="flex flex-col gap-4 text-left">
                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Meeting Title *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Sprint Kickoff Alignment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Agenda Description</label>
                  <textarea 
                    placeholder="Briefly describe meeting goal..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition resize-none"
                  />
                </div>

                {/* Video Meeting Link */}
                <div className="flex flex-col gap-1">
                  <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Call Link (Zoom, Meet, Teams)</label>
                  <div className="relative">
                    <input 
                      type="url"
                      placeholder="Paste meeting URL..."
                      value={meetingLink}
                      onChange={(e) => handleLinkChange(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                    <LinkIcon size={12} className="absolute left-3 top-3.5 text-[#857C91]" />
                  </div>
                </div>

                {/* Date & Time fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Date *</label>
                    <input 
                      type="date"
                      required
                      title="Meeting Date"
                      placeholder="Select Date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Start Time *</label>
                    <input 
                      type="time"
                      required
                      title="Start Time"
                      placeholder="Select Start Time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">End Time *</label>
                    <input 
                      type="time"
                      required
                      title="End Time"
                      placeholder="Select End Time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                  </div>
                </div>

                {/* Curated Participant multi-selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Invite Active Workspace Peers</label>
                  <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto p-1.5 rounded-xl bg-white/[0.01] border border-white/5">
                    {collaborators.map((c) => {
                      const isInvited = selectedParticipants.includes(c.id);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            setSelectedParticipants(prev => 
                              isInvited ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition flex items-center gap-1 ${
                            isInvited 
                              ? "bg-[#F2C1A3] text-black font-semibold" 
                              : "bg-white/5 border border-white/5 text-[#857C91] hover:text-white"
                          }`}
                        >
                          {isInvited ? <Check size={10} /> : <Plus size={10} />}
                          {c.fullName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recurrence Setup */}
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs text-[#857C91] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                      className="rounded border-white/10 bg-white/[0.02] text-[#F2C1A3] focus:ring-0 cursor-pointer"
                    />
                    <span>Recurring Event</span>
                  </label>
                  {recurring && (
                    <select 
                      value={recurrenceRule} 
                      title="Recurrence frequency"
                      onChange={(e) => setRecurrenceRule(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#F2C1A3]"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  )}
                </div>

                {/* Agenda Builder */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1">
                    <label className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Custom Agenda Points</label>
                    <button
                      type="button"
                      onClick={() => setAgendaFields(prev => [...prev, { title: "", description: "" }])}
                      className="text-[9px] font-mono text-[#F2C1A3] hover:text-white transition flex items-center gap-0.5 cursor-pointer"
                    >
                      <PlusCircle size={10} /> Add Point
                    </button>
                  </div>
                  {agendaFields.map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text"
                        placeholder={`Agenda #${idx + 1} Title`}
                        value={field.title}
                        onChange={(e) => {
                          const updated = [...agendaFields];
                          updated[idx].title = e.target.value;
                          setAgendaFields(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/10 text-[10px] text-white outline-none focus:border-[#F2C1A3]"
                      />
                      <button
                        type="button"
                        onClick={() => setAgendaFields(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                        title="Delete agenda point"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Submit button */}
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 mt-2 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg shadow-[#F2C1A3]/10 disabled:opacity-40 cursor-pointer"
                >
                  {submitting ? "Publishing Schedule..." : "Save Scheduled Meeting"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED MEETING DRAWER */}
      <AnimatePresence>
        {selectedMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="w-full max-w-md h-[95vh] rounded-3xl border border-white/10 bg-[#12131e] p-6 flex flex-col justify-between text-left"
            >
              {/* Drawer Scroll Container */}
              <div className="overflow-y-auto pr-1 flex flex-col gap-6 flex-1">
                {/* Drawer Header */}
                <div className="flex items-start justify-between border-b border-white/5 pb-4">
                  <div className="flex flex-col gap-1 pr-6">
                    <span className="text-[8px] font-mono text-[#F2C1A3] uppercase tracking-widest bg-[#F2C1A3]/10 px-2 py-0.5 rounded-full inline-block w-fit">
                      {selectedMeeting.platform}
                    </span>
                    <h3 className="text-white text-base font-serif font-light mt-1.5">{selectedMeeting.title}</h3>
                    <span className="text-[10px] text-[#857C91] font-mono uppercase mt-1">
                      {selectedMeeting.scheduledDate} at {selectedMeeting.startTime}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedMeeting(null)}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                    title="Close details"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* RSVP Attendance Controls */}
                {selectedMeeting.status !== "cancelled" && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between gap-4">
                    <span className="text-[10px] font-mono uppercase text-[#857C91] tracking-wider">Attend Meeting?</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRSVP(selectedMeeting.id, "accepted")}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono transition cursor-pointer ${
                          selectedMeeting.participants.find(p => p.userId === user?.uid)?.attendanceStatus === "accepted"
                            ? "bg-[#F2C1A3] text-black font-semibold"
                            : "bg-white/5 text-[#857C91] hover:text-white"
                        }`}
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleRSVP(selectedMeeting.id, "attended")}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono transition cursor-pointer ${
                          selectedMeeting.participants.find(p => p.userId === user?.uid)?.attendanceStatus === "attended"
                            ? "bg-emerald-400 text-black font-semibold"
                            : "bg-white/5 text-[#857C91] hover:text-white"
                        }`}
                      >
                        Attend
                      </button>
                      <button 
                        onClick={() => handleRSVP(selectedMeeting.id, "declined")}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono transition cursor-pointer ${
                          selectedMeeting.participants.find(p => p.userId === user?.uid)?.attendanceStatus === "declined"
                            ? "bg-red-500/20 text-red-400 border border-red-500/20"
                            : "bg-white/5 text-[#857C91] hover:text-white"
                        }`}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Meeting Agenda Items Section */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-white uppercase font-mono tracking-wider border-b border-white/5 pb-1">
                    Agenda Points
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedMeeting.agenda.map((item) => (
                      <div 
                        key={item.id}
                        className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex items-start justify-between gap-3 text-xs leading-normal hover:bg-[#141523]/40 transition"
                      >
                        <div className="flex items-start gap-2.5">
                          <button 
                            onClick={() => handleToggleAgenda(item.id, item.completed)}
                            className="text-[#F2C1A3] mt-0.5 cursor-pointer"
                          >
                            {item.completed ? <CheckSquare size={14} className="text-[#F2C1A3]" /> : <Square size={14} />}
                          </button>
                          <div className="flex flex-col text-left">
                            <span className={`text-white font-light text-[11px] ${item.completed ? "line-through text-white/30" : ""}`}>
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="text-[#857C91] text-[9px] font-light mt-0.5">{item.description}</span>
                            )}
                          </div>
                        </div>

                        {/* Convert agenda to task CTA */}
                        {!item.completed && (
                          <button
                            onClick={() => handleConvertAgendaToTask(item, selectedMeeting)}
                            disabled={taskCreatingId === item.id}
                            className="p-1 rounded bg-white/5 border border-white/5 text-[#857C91] hover:text-[#F2C1A3] transition shrink-0"
                            title="Convert to workspace Task card"
                          >
                            <Layers size={10} className={taskCreatingId === item.id ? "animate-pulse text-[#F2C1A3]" : ""} />
                          </button>
                        )}
                      </div>
                    ))}
                    {selectedMeeting.agenda.length === 0 && (
                      <span className="text-[10px] text-[#857C91] italic pl-1">No custom agenda items scheduled.</span>
                    )}

                    {/* Add agenda live form */}
                    {selectedMeeting.status !== "cancelled" && (
                      <form onSubmit={handleAddAgendaLive} className="flex gap-2 mt-2">
                        <input 
                          type="text"
                          required
                          placeholder="Quick add agenda title..."
                          value={agendaTitleInput}
                          onChange={(e) => setAgendaTitleInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-[10px] text-white outline-none focus:border-[#F2C1A3]"
                        />
                        <button 
                          type="submit"
                          className="px-3 py-2 rounded-xl bg-[#F2C1A3] text-black text-[10px] font-bold"
                        >
                          Add
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* 2. Collaborative Sync Notes Section */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-white uppercase font-mono tracking-wider border-b border-white/5 pb-1">
                    Collaborative Notes
                  </h4>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                    {selectedMeeting.notes.map((note) => (
                      <div key={note.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center justify-between text-[9px] text-[#857C91] font-mono">
                          <span className="text-white font-medium">@{note.authorName}</span>
                          <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[#857C91] font-light leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                    {selectedMeeting.notes.length === 0 && (
                      <span className="text-[10px] text-[#857C91] italic pl-1">No collaborative sync notes saved yet.</span>
                    )}
                  </div>

                  {/* Add note live form */}
                  {selectedMeeting.status !== "cancelled" && (
                    <form onSubmit={handlePostNote} className="flex gap-2 mt-1">
                      <input 
                        type="text"
                        required
                        placeholder="Type note or consensus result..."
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-[10px] text-white outline-none focus:border-[#F2C1A3]"
                      />
                      <button 
                        type="submit"
                        className="px-3 py-2 rounded-xl bg-[#F2C1A3] text-black text-[10px] font-bold"
                      >
                        Post
                      </button>
                    </form>
                  )}
                </div>

                {/* 3. Invitee list */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-white uppercase font-mono tracking-wider border-b border-white/5 pb-1">
                    Attendees invite status
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedMeeting.participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-[#857C91]">{p.userFullName || p.userEmail}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold ${
                          p.attendanceStatus === "attended" ? "bg-emerald-400/20 text-emerald-400 border border-emerald-500/30" :
                          p.attendanceStatus === "accepted" ? "bg-[#F2C1A3]/25 text-[#F2C1A3] border border-[#F2C1A3]/25" :
                          p.attendanceStatus === "declined" ? "bg-red-500/10 text-red-400" :
                          "bg-white/5 text-[#857C91]"
                        }`}>
                          {p.attendanceStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Action controls at bottom */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                {selectedMeeting.status !== "cancelled" ? (
                  <button 
                    onClick={() => handleCancelMeeting(selectedMeeting.id)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition cursor-pointer"
                  >
                    Cancel Meeting
                  </button>
                ) : (
                  <span className="flex-1 text-center py-2.5 rounded-xl bg-red-500/5 text-red-400 text-xs font-semibold border border-red-500/10">
                    Cancelled Sync
                  </span>
                )}
                <button 
                  onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-[#857C91] hover:text-red-400 transition cursor-pointer"
                  title="Delete meeting"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
