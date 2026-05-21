"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Download, 
  Video, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  ExternalLink,
  Loader2,
  Lock,
  Zap,
  Info,
  Database,
  ClipboardList,
  Trash2,
  Archive,
  Star,
  FileText,
  GraduationCap,
  Sparkles,
  GitBranch,
  Github,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  ChevronLeft,
  X,
  Award,
  Globe,
  Briefcase,
  Columns
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  getJobApplicationsAction, 
  updateApplicationStatusAction,
  deleteJobApplicationAction
} from "@/app/actions/application-actions";
import { getJobRolesAction, JobRoleMetadata } from "@/app/actions/career-actions";

interface JobApplicationData {
  id: string;
  roleId: string;
  roleTitle: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  university: string;
  degree: string;
  gradYear: string;
  experienceLevel: string;
  github: string;
  linkedin: string;
  portfolio: string;
  resumeUrl: string;
  whyJoin: string;
  bestProject: string;
  techStrengths: string;
  collabExp: string;
  availability: string;
  status: string;
  notes: string;
  interviewLink: string;
  interviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Evaluation scorecard ratings parser
const parseScores = (notesStr: string) => {
  const defaultScores = { frontend: 0, backend: 0, architecture: 0, communication: 0 };
  if (!notesStr) return defaultScores;
  const match = notesStr.match(/⭐Scores: Frontend=(\d), Backend=(\d), Architecture=(\d), Communication=(\d)/);
  if (match) {
    return {
      frontend: parseInt(match[1]),
      backend: parseInt(match[2]),
      architecture: parseInt(match[3]),
      communication: parseInt(match[4])
    };
  }
  return defaultScores;
};

// Evaluation scorecard ratings serializer
const serializeScores = (scores: { frontend: number, backend: number, architecture: number, communication: number }, textNotes: string) => {
  const cleaned = (textNotes || "").replace(/⭐Scores: Frontend=\d, Backend=\d, Architecture=\d, Communication=\d\s*\n*/g, "");
  return `⭐Scores: Frontend=${scores.frontend}, Backend=${scores.backend}, Architecture=${scores.architecture}, Communication=${scores.communication}\n${cleaned.trim()}`;
};

// Clean notes for display in text fields (without the serialized score block)
const cleanDisplayNotes = (notesStr: string) => {
  if (!notesStr) return "";
  return notesStr.replace(/⭐Scores: Frontend=\d, Backend=\d, Architecture=\d, Communication=\d\s*\n*/g, "").trim();
};

// Helper to compute skill match % dynamically
const calculateSkillMatch = (app: JobApplicationData, rolesList: JobRoleMetadata[]) => {
  const role = rolesList.find(r => r.title.toLowerCase() === app.roleTitle.toLowerCase() || r.id === app.roleId);
  if (!role || !role.technologies || role.technologies.length === 0) {
    return 75; // baseline fallback
  }
  const techStrengthsLower = (app.techStrengths || "").toLowerCase();
  let matches = 0;
  role.technologies.forEach(tech => {
    if (techStrengthsLower.includes(tech.toLowerCase())) {
      matches++;
    }
  });
  const pct = Math.round((matches / role.technologies.length) * 100);
  return pct > 20 ? pct : 55; // minimum baseline match
};

export default function AdminCareersPage() {
  const { profile, loading: authLoading } = useAuth();
  
  const [applications, setApplications] = useState<JobApplicationData[]>([]);
  const [dbRoles, setDbRoles] = useState<JobRoleMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedApp, setSelectedApp] = useState<JobApplicationData | null>(null);
  
  // Developer evaluation auth bypass override
  const [devBypass, setDevBypass] = useState<boolean>(false);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedRole, setSelectedRole] = useState<string>("All");

  // Admin Pipeline Modification Form Inputs
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [meetLink, setMeetLink] = useState<string>("");
  const [meetDate, setMeetDate] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Scorecard states
  const [scores, setScores] = useState({ frontend: 0, backend: 0, architecture: 0, communication: 0 });
  const [showResumePreview, setShowResumePreview] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Sidebar Detail Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "scorecard" | "interview" | "answers" | "resume">("overview");

  // Drag and drop column hovering feedback states
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Load candidates & database open roles
  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const appsRes = await getJobApplicationsAction();
      setApplications(appsRes as JobApplicationData[]);
      const rolesRes = await getJobRolesAction();
      setDbRoles(rolesRes);
    } catch (err) {
      console.error("Failed to load recruitment center metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectApp = (app: JobApplicationData | null) => {
    setSelectedApp(app);
    if (app) {
      setAdminNotes(cleanDisplayNotes(app.notes || ""));
      setMeetLink(app.interviewLink || "");
      setMeetDate(app.interviewDate ? app.interviewDate.slice(0, 16) : "");
      setScores(parseScores(app.notes || ""));
      setActiveTab("overview"); // reset to default tab
    } else {
      setAdminNotes("");
      setMeetLink("");
      setMeetDate("");
      setScores({ frontend: 0, backend: 0, architecture: 0, communication: 0 });
      setShowResumePreview(false);
    }
  };

  useEffect(() => {
    let active = true;
    const initFetch = async () => {
      try {
        const appsRes = await getJobApplicationsAction();
        const rolesRes = await getJobRolesAction();
        if (active) {
          setApplications(appsRes as JobApplicationData[]);
          setDbRoles(rolesRes);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
      }
    };
    initFetch();
    return () => {
      active = false;
    };
  }, []);

  // Auth Guard Gate parameters
  const isAuthorized = useMemo(() => {
    if (devBypass) return true;
    if (!profile) return false;
    return profile.email === "khushinayak127@gmail.com";
  }, [profile, devBypass]);

  // Extract unique roles dynamically from database and applications
  const roles = useMemo(() => {
    const set = new Set<string>();
    dbRoles.forEach(r => set.add(r.title));
    applications.forEach(a => set.add(a.roleTitle));
    return ["All", ...Array.from(set)];
  }, [dbRoles, applications]);

  // Fuzzy filter list of applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = 
        app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.techStrengths.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === "All" || app.status === selectedStatus;
      const matchesRole = selectedRole === "All" || app.roleTitle === selectedRole;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [applications, searchQuery, selectedStatus, selectedRole]);

  // Run status updates
  const handleStatusChange = async (targetStatus: string, specificAppId?: string) => {
    const targetApp = specificAppId ? applications.find(a => a.id === specificAppId) : selectedApp;
    if (!targetApp) return;

    setIsUpdating(true);
    try {
      const finalNotes = specificAppId 
        ? targetApp.notes 
        : serializeScores(scores, adminNotes);

      const mLink = specificAppId ? targetApp.interviewLink : meetLink;
      const mDate = specificAppId ? targetApp.interviewDate : meetDate;

      const res = await updateApplicationStatusAction(
        targetApp.id,
        targetStatus,
        finalNotes,
        targetStatus === "interview" ? mDate : null,
        targetStatus === "interview" ? mLink : null
      );

      if (res.success) {
        // Refresh listings
        const updatedApps = await getJobApplicationsAction();
        setApplications(updatedApps as JobApplicationData[]);
        
        // Refresh active details sidebar if it is the current candidate
        if (selectedApp && selectedApp.id === targetApp.id) {
          const refreshedApp = updatedApps.find(a => a.id === selectedApp.id);
          handleSelectApp(refreshedApp ? (refreshedApp as JobApplicationData) : null);
        }
      } else {
        alert(res.error || "Failed to update applicant status.");
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger Notes and Competency scorecard save
  const handleSaveNotesAndScores = async () => {
    if (!selectedApp) return;
    await handleStatusChange(selectedApp.status);
    alert("Competency scorecard ratings & internal notes saved successfully.");
  };

  // Perform permanent applicant database and storage purging
  const handleDeleteCandidate = async () => {
    if (!selectedApp) return;
    setIsDeleting(true);
    try {
      const res = await deleteJobApplicationAction(selectedApp.id);
      if (res.success) {
        alert("Candidate profile & associated tracking records permanently purged.");
        setShowDeleteModal(false);
        handleSelectApp(null);
        loadApplications();
      } else {
        alert(res.error || "Failed to purge candidate records.");
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData("text/plain", appId);
    setDraggedAppId(appId);
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain");
    if (appId) {
      handleStatusChange(targetStatus, appId);
    }
    setDraggedAppId(null);
    setDragOverColumn(null);
  };

  // Export single candidate dossier as text file report
  const exportSingleCandidateDossier = (app: JobApplicationData) => {
    const scoreText = `Frontend: ${scores.frontend}/5 | Backend: ${scores.backend}/5 | Architecture: ${scores.architecture}/5 | Communication: ${scores.communication}/5`;
    const content = `
CONTRITRACK APPLICANT DOSSIER REPORT
====================================
Candidate Name: ${app.fullName}
Email:          ${app.email}
Phone:          ${app.phone}
Country:        ${app.country}
University:     ${app.university}
Degree:         ${app.degree} (Class of ${app.gradYear})
Experience:     ${app.experienceLevel.toUpperCase()}
Applied Role:   ${app.roleTitle}
Applied Date:   ${new Date(app.createdAt).toLocaleString()}
Current Status: ${app.status.toUpperCase()}

TECHNICAL SKILL RATINGS
-----------------------
${scoreText}

INTERVIEW SPECIFICATIONS
------------------------
Schedule:       ${app.interviewDate ? new Date(app.interviewDate).toLocaleString() : "Not Scheduled"}
Meeting Link:   ${app.interviewLink || "None"}

WHY JOIN CONTRITRACK:
---------------------
${app.whyJoin}

BEST CAPSTONE PROJECT:
----------------------
${app.bestProject}

CORE TECH STRENGTHS:
--------------------
${app.techStrengths}

COLLABORATIVE EXPERIENCES:
-------------------------
${app.collabExp}

RECRUITER INTERNAL REVIEW NOTES:
--------------------------------
${adminNotes || "No notes registered yet."}

====================================
Report generated: ${new Date().toLocaleString()}
`;
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Dossier_${app.fullName.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Build client-side telemetry CSV exporter for multiple matching rows
  const exportCandidatesCSV = () => {
    if (filteredApps.length === 0) return;

    const headers = ["ID", "Name", "Email", "Role", "University", "Degree", "Experience", "Status", "Resume", "Applied At"];
    const rows = filteredApps.map(a => [
      a.id,
      a.fullName,
      a.email,
      a.roleTitle,
      a.university,
      a.degree,
      a.experienceLevel,
      a.status,
      a.resumeUrl,
      a.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ContriTrack_Applicants_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pipeline Columns Definition
  const pipelineColumns = [
    { id: "pending", title: "Pending Review", color: "from-amber-500/10 to-amber-600/5", border: "border-amber-500/20", text: "text-amber-400" },
    { id: "reviewing", title: "Screening", color: "from-indigo-500/10 to-indigo-600/5", border: "border-indigo-500/20", text: "text-indigo-400" },
    { id: "shortlisted", title: "Shortlisted", color: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-400" },
    { id: "interview", title: "Interview Scheduled", color: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", text: "text-blue-400" },
    { id: "selected", title: "Selected/Hired", color: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", text: "text-purple-400" },
    { id: "rejected", title: "Rejected", color: "from-rose-500/10 to-rose-600/5", border: "border-rose-500/20", text: "text-rose-400" },
    { id: "archived", title: "Archived", color: "from-slate-500/10 to-slate-600/5", border: "border-slate-500/20", text: "text-slate-400" },
  ];

  // Calculate rich statistics
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(a => a.status === "pending").length;
    const shortlisted = applications.filter(a => a.status === "shortlisted").length;
    const activeInterviews = applications.filter(a => a.status === "interview").length;
    const hired = applications.filter(a => a.status === "selected").length;
    
    // Average Match Index
    let matchSum = 0;
    applications.forEach(a => {
      matchSum += calculateSkillMatch(a, dbRoles);
    });
    const avgMatch = total > 0 ? Math.round(matchSum / total) : 0;

    // Conversion Rate
    const conversion = total > 0 ? Math.round((hired / total) * 100) : 0;

    return { total, pending, shortlisted, activeInterviews, hired, avgMatch, conversion };
  }, [applications, dbRoles]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07080b] text-white flex items-center justify-center font-mono text-xs">
        <Loader2 className="animate-spin text-[#CD9FA0] mr-2" size={16} />
        <span>Authenticating recruitment credentials...</span>
      </div>
    );
  }

  // RENDER SECURITY SHIELD FOR UNAUTHORIZED USERS
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#12131e] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-red-500/[0.015] blur-[180px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 md:p-10 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl max-w-md w-full text-center flex flex-col items-center gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)] relative"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Lock size={24} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
              Access Restricted
            </span>
            <h2 className="text-xl font-serif text-white font-light">
              Admin Recruitment Auth
            </h2>
            <p className="text-xs text-[#8e94a0] leading-relaxed mt-2">
              The ATS platform is locked to coordinators matching credentials: <code className="text-white">khushinayak127@gmail.com</code>.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => {
                setDevBypass(true);
                loadApplications();
              }}
              className="w-full py-3 rounded-2xl bg-[#CD9FA0] hover:bg-[#dcb0b1] text-[#12131e] font-semibold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#CD9FA0]/15"
            >
              <Zap size={13} className="animate-pulse" />
              <span>Bypass & Test ATS Pipeline (Developer Mode)</span>
            </button>

            <Link
              href="/"
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 text-[#8e94a0] hover:text-white font-semibold text-xs tracking-wider transition text-center"
            >
              ← Return to Main Portal
            </Link>
          </div>

          <span className="text-[9.5px] font-mono text-white/20">
            🔐 Relational database security locks enabled.
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0b10] via-[#12131e] to-[#07080b] text-white relative overflow-hidden font-sans pb-12 selection:bg-[#CD9FA0]/25 selection:text-[#F8CCAA]">
      
      {/* Visual background glows */}
      <div className="absolute top-0 left-[50%] -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-[#CD9FA0]/[0.05] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-[#F2C1A3]/[0.03] blur-[200px] pointer-events-none" />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0a0b10]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-end gap-[3px] h-6 w-6 rounded-lg bg-[#F8CCAA]/10 border border-[#F8CCAA]/20 p-1.5 justify-center">
              <span className="w-[3px] h-1.5 bg-[#CD9FA0] rounded-full"></span>
              <span className="w-[3px] h-3.5 bg-[#F2C1A3] rounded-full"></span>
              <span className="w-[3px] h-2.5 bg-[#F8CCAA] rounded-full"></span>
            </div>
            <span className="font-semibold text-white tracking-wider text-sm font-serif">
              Contri<span className="text-[#F2C1A3]">Track</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/40">
            <span>Admin Control Panel</span>
            <ChevronRight size={10} />
            <span className="text-[#F8CCAA]">Enterprise ATS Console</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {devBypass && (
            <span className="px-2.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/25 text-[8.5px] font-mono text-yellow-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
              <span>DEV BYPASS</span>
            </span>
          )}
          <button 
            onClick={loadApplications}
            className="p-1.5 text-white/50 hover:text-white rounded border border-white/10 bg-white/[0.02] transition"
            title="Refresh Candidate Pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link 
            href="/"
            className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs font-mono text-[#8e94a0] hover:text-white transition-all"
          >
            ← Exit Console
          </Link>
        </div>
      </header>

      {/* DASHBOARD HERO */}
      <section className="relative pt-8 pb-4 px-6 max-w-7xl mx-auto text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#CD9FA0]">
            <Columns size={13} />
            <span>RECRUITER WORKSPACE</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-white font-light tracking-tight mt-1">
            Hiring <span className="text-[#F2C1A3] italic">Operations Hub</span>
          </h1>
          <p className="text-xs text-[#8e94a0] font-light max-w-xl">
            Review applicant telemetry, rate technical competence, schedule interviews, and drag candidates across hiring stages.
          </p>
        </div>

        <button
          onClick={exportCandidatesCSV}
          disabled={filteredApps.length === 0}
          className={`px-4 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-wider border flex items-center gap-1.5 transition ${
            filteredApps.length > 0 
              ? "bg-[#CD9FA0]/10 border-[#CD9FA0]/20 text-[#F8CCAA] hover:bg-[#CD9FA0]/20 cursor-pointer"
              : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
          }`}
        >
          <Download size={12} />
          <span>Export CSV Pipeline ({filteredApps.length})</span>
        </button>
      </section>

      {/* STATS BENTO GRID */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          <div className="p-4 rounded-2xl bg-[#1b1c2b]/35 border border-white/5 flex flex-col justify-between min-h-[90px] shadow-sm relative overflow-hidden group hover:border-white/10 transition">
            <span className="text-2xl font-serif text-white font-light">{stats.total}</span>
            <span className="text-[9px] uppercase tracking-wider text-[#8e94a0] font-mono">Total Candidates</span>
            <ClipboardList className="absolute right-3 top-3 text-[#CD9FA0]/15 group-hover:text-[#CD9FA0]/25 transition" size={24} />
          </div>

          <div className="p-4 rounded-2xl bg-[#1b1c2b]/35 border border-white/5 flex flex-col justify-between min-h-[90px] shadow-sm relative overflow-hidden group hover:border-white/10 transition">
            <span className="text-2xl font-serif text-yellow-400 font-light">{stats.pending}</span>
            <span className="text-[9px] uppercase tracking-wider text-[#8e94a0] font-mono">Pending Review</span>
            <Info className="absolute right-3 top-3 text-yellow-400/10 group-hover:text-yellow-400/20 transition" size={24} />
          </div>

          <div className="p-4 rounded-2xl bg-[#1b1c2b]/35 border border-white/5 flex flex-col justify-between min-h-[90px] shadow-sm relative overflow-hidden group hover:border-white/10 transition">
            <span className="text-2xl font-serif text-emerald-400 font-light">{stats.shortlisted}</span>
            <span className="text-[9px] uppercase tracking-wider text-[#8e94a0] font-mono">Shortlisted</span>
            <Award className="absolute right-3 top-3 text-emerald-400/10 group-hover:text-emerald-400/20 transition" size={24} />
          </div>

          <div className="p-4 rounded-2xl bg-[#1b1c2b]/35 border border-white/5 flex flex-col justify-between min-h-[90px] shadow-sm relative overflow-hidden group hover:border-white/10 transition">
            <span className="text-2xl font-serif text-blue-400 font-light">{stats.activeInterviews}</span>
            <span className="text-[9px] uppercase tracking-wider text-[#8e94a0] font-mono">Interviews Scheduled</span>
            <Video className="absolute right-3 top-3 text-blue-400/10 group-hover:text-blue-400/20 transition" size={24} />
          </div>

          <div className="p-4 rounded-2xl bg-[#1b1c2b]/35 border border-white/5 flex flex-col justify-between min-h-[90px] shadow-sm relative overflow-hidden group hover:border-white/10 transition">
            <span className="text-2xl font-serif text-[#F8CCAA] font-light">{stats.avgMatch}%</span>
            <span className="text-[9px] uppercase tracking-wider text-[#8e94a0] font-mono">Avg Match Index</span>
            <Sparkles className="absolute right-3 top-3 text-[#F8CCAA]/10 group-hover:text-[#F8CCAA]/20 transition" size={24} />
          </div>

          <div className="p-4 rounded-2xl bg-[#1b1c2b]/35 border border-white/5 flex flex-col justify-between min-h-[90px] shadow-sm relative overflow-hidden group hover:border-white/10 transition">
            <span className="text-2xl font-serif text-purple-400 font-light">{stats.conversion}%</span>
            <span className="text-[9px] uppercase tracking-wider text-[#8e94a0] font-mono">Hiring Ratio</span>
            <UserCheck className="absolute right-3 top-3 text-purple-400/10 group-hover:text-purple-400/20 transition" size={24} />
          </div>

        </div>
      </section>

      {/* FILTER CONTROLS TOOLBAR */}
      <section className="max-w-7xl mx-auto px-6 mb-6">
        <div className="p-4 rounded-2xl border border-white/5 bg-[#12131e]/40 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input
              type="text"
              placeholder="Search candidate name, email, university, strengths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0a0b10]/60 border border-white/10 focus:outline-none focus:border-[#CD9FA0] focus:ring-1 focus:ring-[#CD9FA0]/30 text-xs font-mono text-white transition-all placeholder-white/20"
            />
          </div>

          {/* Filters dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            {/* Roles */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#CD9FA0] uppercase tracking-wider">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0a0b10]/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#CD9FA0] transition cursor-pointer"
              >
                {roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Status Override */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#CD9FA0] uppercase tracking-wider">Board Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0a0b10]/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#CD9FA0] transition cursor-pointer"
              >
                <option value="All">All columns</option>
                <option value="pending">Pending Review</option>
                <option value="reviewing">Screening</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview Scheduled</option>
                <option value="selected">Selected/Hired</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {(searchQuery || selectedRole !== "All" || selectedStatus !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRole("All");
                  setSelectedStatus("All");
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#F8CCAA] transition cursor-pointer"
              >
                Clear Filters
              </button>
            )}

          </div>
        </div>
      </section>

      {/* KANBAN BOARD CONTAINER */}
      <section className="max-w-7xl mx-auto px-6 overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
            {[1, 2, 3, 4].map(col => (
              <div key={col} className="p-4 rounded-2xl border border-white/5 bg-[#1b1c2b]/10 min-h-[400px] animate-pulse flex flex-col gap-4">
                <div className="w-1/2 h-5 bg-white/5 rounded-md" />
                <div className="w-full h-24 bg-white/5 rounded-xl" />
                <div className="w-full h-24 bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-8 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {pipelineColumns.map((col) => {
              const colApps = filteredApps.filter(app => app.status === col.id);
              const isHovered = dragOverColumn === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`w-80 shrink-0 flex flex-col rounded-2xl border bg-gradient-to-b ${col.color} ${col.border} p-3.5 min-h-[500px] transition-all duration-200 ${
                    isHovered ? "ring-2 ring-[#CD9FA0] border-transparent shadow-[0_0_20px_rgba(205,159,160,0.15)] bg-white/[0.03]" : ""
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        col.id === "pending" ? "bg-amber-400" :
                        col.id === "reviewing" ? "bg-indigo-400" :
                        col.id === "shortlisted" ? "bg-emerald-400" :
                        col.id === "interview" ? "bg-blue-400" :
                        col.id === "selected" ? "bg-purple-400" :
                        col.id === "rejected" ? "bg-rose-400" : "bg-slate-400"
                      }`} />
                      <h3 className="font-serif text-sm font-light text-white tracking-wide">{col.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-white/55">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards Queue */}
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1.5 scrollbar-thin scrollbar-thumb-white/5">
                    {colApps.length === 0 ? (
                      <div className="flex-1 py-12 text-center flex flex-col items-center justify-center text-white/20 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                        <Plus size={16} className="mb-1" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Drag to Move</span>
                      </div>
                    ) : (
                      colApps.map((app) => {
                        const matchIndex = calculateSkillMatch(app, dbRoles);
                        const isSelected = selectedApp?.id === app.id;

                        return (
                          <motion.div
                            key={app.id}
                            layoutId={`app-card-${app.id}`}
                            draggable
                            onDragStartCapture={(e) => handleDragStart(e, app.id)}
                            onDragEndCapture={handleDragEnd}
                            onClick={() => handleSelectApp(app)}
                            className={`p-4 rounded-xl border text-left cursor-grab active:cursor-grabbing transition-all duration-300 relative group flex flex-col gap-3 overflow-hidden ${
                              isSelected 
                                ? "bg-[#CD9FA0]/15 border-[#CD9FA0]/50 shadow-[0_4px_15px_rgba(205,159,160,0.1)]" 
                                : "bg-[#12131e]/70 border-white/5 hover:border-white/15 hover:bg-[#1b1c2b]/80 shadow-sm"
                            }`}
                          >
                            {/* Card Glow */}
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#CD9FA0]/[0.02] blur-xl pointer-events-none group-hover:bg-[#CD9FA0]/[0.04] transition" />

                            <div className="flex flex-col gap-1 z-10">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-serif font-light text-white group-hover:text-[#F8CCAA] transition truncate max-w-[150px]">
                                  {app.fullName}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${
                                  matchIndex >= 85 ? "bg-emerald-500/10 text-emerald-400" :
                                  matchIndex >= 70 ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                                }`}>
                                  {matchIndex}% Match
                                </span>
                              </div>
                              <span className="text-[10.5px] text-[#F2C1A3] font-mono font-medium truncate">
                                {app.roleTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9.5px] text-white/50 font-mono z-10 border-t border-white/5 pt-2">
                              <GraduationCap size={11} className="text-[#CD9FA0] shrink-0" />
                              <span className="truncate">{app.university}</span>
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-white/30 font-mono z-10">
                              <span className="capitalize">{app.experienceLevel}</span>
                              <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                            </div>

                            {/* Quick column shifting actions */}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-300 z-20">
                              {col.id !== "rejected" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange("rejected", app.id);
                                  }}
                                  className="p-1 rounded bg-[#0a0b10] border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 transition"
                                  title="Reject Candidate"
                                >
                                  <XCircle size={10} />
                                </button>
                              )}
                              {col.id === "pending" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange("shortlisted", app.id);
                                  }}
                                  className="p-1 rounded bg-[#0a0b10] border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition"
                                  title="Shortlist Candidate"
                                >
                                  <CheckCircle size={10} />
                                </button>
                              )}
                            </div>

                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* DOSSIER DETAILED WORKSPACE SIDEBAR */}
      <AnimatePresence>
        {selectedApp && (
          <>
            {/* Backdrop Blur Lockout */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => handleSelectApp(null)}
              className="fixed inset-0 bg-[#000] z-40 backdrop-blur-xs cursor-pointer"
            />

            {/* Sliding Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 z-50 h-screen w-full max-w-xl md:max-w-2xl bg-[#0e1017] border-l border-white/10 p-6 shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col gap-6 text-left relative overflow-hidden"
            >
              {/* Background gradient orb */}
              <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#CD9FA0]/[0.03] blur-3xl pointer-events-none" />

              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4 relative z-10">
                <div className="flex flex-col gap-1.5 max-w-[80%]">
                  <span className="text-[9px] font-mono text-[#CD9FA0] uppercase tracking-wider">
                    Candidate dossier telemetry
                  </span>
                  <h2 className="text-xl font-serif text-white font-light tracking-wide leading-snug">
                    {selectedApp.fullName}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-mono text-slate-300 border border-white/5 uppercase">
                      {selectedApp.experienceLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F2C1A3]/10 text-[9px] font-mono text-[#F8CCAA] border border-[#F2C1A3]/15">
                      {selectedApp.roleTitle}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                      selectedApp.status === "shortlisted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      selectedApp.status === "interview" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      selectedApp.status === "selected" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                      selectedApp.status === "rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {selectedApp.status}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleSelectApp(null)}
                  className="p-1 rounded-lg border border-white/10 hover:border-white/20 text-white/50 hover:text-white transition cursor-pointer"
                  title="Close Details Panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tab Navigation Menu */}
              <div className="flex border-b border-white/5 text-xs font-mono select-none overflow-x-auto relative z-10 scrollbar-none">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "scorecard", label: "Scorecard" },
                  { id: "answers", label: "Capstone telemetry" },
                  { id: "interview", label: "Interview Hub" },
                  { id: "resume", label: "Resume PDF" }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`pb-3 px-3 relative transition whitespace-nowrap cursor-pointer font-medium ${
                      activeTab === t.id ? "text-[#F2C1A3]" : "text-white/45 hover:text-white"
                    }`}
                  >
                    {t.label}
                    {activeTab === t.id && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F2C1A3]" 
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content Display Area */}
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5 relative z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="min-h-full flex flex-col gap-5"
                  >
                    {/* TAB: OVERVIEW */}
                    {activeTab === "overview" && (
                      <div className="flex flex-col gap-5">
                        
                        {/* Profile metrics panel */}
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-4 text-xs font-mono">
                          <div className="flex items-center gap-2.5">
                            <Mail className="text-[#CD9FA0]" size={15} />
                            <div className="flex flex-col">
                              <span className="text-[9px] text-white/40 uppercase">Email address</span>
                              <a href={`mailto:${selectedApp.email}`} className="text-white hover:text-[#F2C1A3] truncate max-w-[180px]">
                                {selectedApp.email}
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <Phone className="text-[#CD9FA0]" size={15} />
                            <div className="flex flex-col">
                              <span className="text-[9px] text-white/40 uppercase">Phone contact</span>
                              <span className="text-white">{selectedApp.phone}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <MapPin className="text-[#CD9FA0]" size={15} />
                            <div className="flex flex-col">
                              <span className="text-[9px] text-white/40 uppercase">Location</span>
                              <span className="text-white">{selectedApp.country}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <Calendar className="text-[#CD9FA0]" size={15} />
                            <div className="flex flex-col">
                              <span className="text-[9px] text-white/40 uppercase">Applied date</span>
                              <span className="text-white">{new Date(selectedApp.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Education Details bento card */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                          <h3 className="text-xs uppercase font-mono tracking-wider text-[#CD9FA0] flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <GraduationCap size={15} />
                            <span>Academic Credentials</span>
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-white/40 uppercase">Institution</span>
                              <span className="text-white font-medium">{selectedApp.university}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-white/40 uppercase">Degree specification</span>
                              <span className="text-white font-medium">{selectedApp.degree}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-white/40 uppercase">Graduation Year</span>
                              <span className="text-white font-medium">{selectedApp.gradYear}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-white/40 uppercase">Experience track</span>
                              <span className="text-white font-medium uppercase">{selectedApp.experienceLevel}</span>
                            </div>
                          </div>
                        </div>

                        {/* Professional Networks Panel */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                          <h3 className="text-xs uppercase font-mono tracking-wider text-[#CD9FA0] flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <GitBranch size={15} />
                            <span>Social Repositories & Networks</span>
                          </h3>
                          <div className="flex flex-col gap-3 text-xs font-mono">
                            {selectedApp.github ? (
                              <a 
                                href={selectedApp.github} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2.5 rounded-xl bg-[#0a0b10]/60 border border-white/5 hover:border-white/10 text-white hover:text-[#F2C1A3] flex items-center justify-between transition group"
                              >
                                <div className="flex items-center gap-2">
                                  <Github size={15} className="text-slate-400 group-hover:text-[#F2C1A3] transition" />
                                  <span>GitHub Repository</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-white/30 group-hover:text-white/55 transition">
                                  <span>Open Profile</span>
                                  <ExternalLink size={10} />
                                </div>
                              </a>
                            ) : null}

                            {selectedApp.linkedin ? (
                              <a 
                                href={selectedApp.linkedin} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2.5 rounded-xl bg-[#0a0b10]/60 border border-white/5 hover:border-white/10 text-white hover:text-[#F2C1A3] flex items-center justify-between transition group"
                              >
                                <div className="flex items-center gap-2">
                                  <ExternalLink size={15} className="text-slate-400 group-hover:text-[#F2C1A3] transition" />
                                  <span>LinkedIn Network</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-white/30 group-hover:text-white/55 transition">
                                  <span>Open Network</span>
                                  <ExternalLink size={10} />
                                </div>
                              </a>
                            ) : null}

                            {selectedApp.portfolio ? (
                              <a 
                                href={selectedApp.portfolio} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2.5 rounded-xl bg-[#0a0b10]/60 border border-white/5 hover:border-white/10 text-white hover:text-[#F2C1A3] flex items-center justify-between transition group"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText size={15} className="text-slate-400 group-hover:text-[#F2C1A3] transition" />
                                  <span>Personal Portfolio</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-white/30 group-hover:text-white/55 transition">
                                  <span>Open Portfolio</span>
                                  <ExternalLink size={10} />
                                </div>
                              </a>
                            ) : null}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* TAB: SCORECARD */}
                    {activeTab === "scorecard" && (
                      <div className="flex flex-col gap-5">
                        
                        {/* Competency Ratings */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h3 className="text-xs uppercase font-mono tracking-wider text-[#CD9FA0] flex items-center gap-1.5">
                              <Star size={15} />
                              <span>Evaluator Competency Scorecard</span>
                            </h3>
                            {/* Average score readout */}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8CCAA]/10 text-[#F8CCAA] border border-[#F8CCAA]/15">
                              Avg score: {((scores.frontend + scores.backend + scores.architecture + scores.communication) / 4).toFixed(1)} / 5
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                            {[
                              { key: "frontend", label: "Frontend Architecture", desc: "React hooks state, layout shift control, visual alignment precision" },
                              { key: "backend", label: "Backend REST/SQL Execution", desc: "Parameterized SQL syntax, prisma schemas mapping, server action limits" },
                              { key: "architecture", label: "System Design & Scaling", desc: "Relational database constraints, clean file boundaries, folder patterns" },
                              { key: "communication", label: "Communication & Clarity", desc: "Structured answering clarity, documentation thoroughness" }
                            ].map((item) => (
                              <div key={item.key} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0a0b10]/40 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <span className="text-white font-mono text-xs">{item.label}</span>
                                  <span className="text-[10px] font-mono text-white/40">{(scores[item.key as keyof typeof scores] || 0)} / 5</span>
                                </div>
                                <p className="text-[9.5px] text-white/30 font-mono leading-tight">{item.desc}</p>
                                <div className="flex items-center gap-1.5 pt-1.5">
                                  {[1, 2, 3, 4, 5].map((star) => {
                                    const val = scores[item.key as keyof typeof scores] || 0;
                                    const active = star <= val;
                                    return (
                                      <button
                                        key={star}
                                        onClick={() => setScores(prev => ({ ...prev, [item.key]: star }))}
                                        className={`transition cursor-pointer ${active ? "text-[#F2C1A3]" : "text-white/10 hover:text-[#F2C1A3]/40"}`}
                                        title={`Rate ${star}/5`}
                                      >
                                        <Star size={14} fill={active ? "currentColor" : "none"} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Notes Textarea */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                            <span className="text-[9.5px] font-mono text-[#CD9FA0] uppercase tracking-wider">Internal evaluator review remarks</span>
                            <textarea
                              rows={3}
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Add specific observations, technical gaps, strengths, or core feedback notes here..."
                              className="p-3 rounded-xl bg-[#0a0b10]/60 hover:bg-[#0a0b10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-1 focus:ring-[#CD9FA0]/30 placeholder-white/20 transition resize-none"
                            />
                          </div>

                          <button
                            onClick={handleSaveNotesAndScores}
                            disabled={isUpdating}
                            className="mt-2 py-2.5 rounded-xl border border-[#CD9FA0]/30 bg-[#CD9FA0]/10 hover:bg-[#CD9FA0]/20 text-[#F8CCAA] font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            <span>Save Evaluation Scorecard & Notes</span>
                          </button>

                        </div>

                      </div>
                    )}

                    {/* TAB: ANSWERS */}
                    {activeTab === "answers" && (
                      <div className="flex flex-col gap-5">
                        
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                          <h3 className="text-xs uppercase font-mono tracking-wider text-[#CD9FA0] flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Sparkles size={15} />
                            <span>Application Telemetry Answers</span>
                          </h3>
                          
                          <div className="flex flex-col gap-4 text-xs font-mono">
                            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#0a0b10]/40 border border-white/5">
                              <span className="text-[9px] text-[#F2C1A3] uppercase font-bold tracking-wider">Why ContriTrack?</span>
                              <p className="text-white/80 leading-relaxed text-[11px] font-sans">{selectedApp.whyJoin}</p>
                            </div>

                            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#0a0b10]/40 border border-white/5">
                              <span className="text-[9px] text-[#F2C1A3] uppercase font-bold tracking-wider">Best Capstone Project built</span>
                              <p className="text-white/80 leading-relaxed text-[11px] font-sans">{selectedApp.bestProject}</p>
                            </div>

                            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#0a0b10]/40 border border-white/5">
                              <span className="text-[9px] text-[#F2C1A3] uppercase font-bold tracking-wider">Core Technical Strengths</span>
                              <p className="text-white/80 leading-relaxed text-[11px] font-sans">{selectedApp.techStrengths}</p>
                            </div>

                            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#0a0b10]/40 border border-white/5">
                              <span className="text-[9px] text-[#F2C1A3] uppercase font-bold tracking-wider">Collaborative Teamwork Experience</span>
                              <p className="text-white/80 leading-relaxed text-[11px] font-sans">{selectedApp.collabExp}</p>
                            </div>

                            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#0a0b10]/40 border border-white/5">
                              <span className="text-[9px] text-[#F2C1A3] uppercase font-bold tracking-wider">Availability & Commitment</span>
                              <p className="text-white/80 leading-relaxed text-[11px] font-sans">{selectedApp.availability}</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* TAB: INTERVIEW */}
                    {activeTab === "interview" && (
                      <div className="flex flex-col gap-5">
                        
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                          <h3 className="text-xs uppercase font-mono tracking-wider text-[#CD9FA0] flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Video size={15} />
                            <span>Technical Interview Coordinator</span>
                          </h3>

                          <div className="flex flex-col gap-4 text-xs font-mono">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] text-white/40 uppercase">Interview Date & Time</span>
                              <input
                                type="datetime-local"
                                value={meetDate}
                                onChange={(e) => setMeetDate(e.target.value)}
                                className="px-3.5 py-2.5 rounded-xl bg-[#0a0b10]/60 border border-white/10 text-xs text-white focus:outline-none focus:border-[#CD9FA0] transition cursor-pointer"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] text-white/40 uppercase">Video Call Meeting Link (Zoom/Google Meet)</span>
                              <input
                                type="url"
                                placeholder="https://meet.google.com/abc-defg-hij"
                                value={meetLink}
                                onChange={(e) => setMeetLink(e.target.value)}
                                className="px-3.5 py-2.5 rounded-xl bg-[#0a0b10]/60 border border-white/10 text-xs text-white focus:outline-none focus:border-[#CD9FA0] transition placeholder-white/15"
                              />
                            </div>

                            {selectedApp.interviewDate && (
                              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-slate-300 text-[10px] leading-relaxed">
                                <div className="font-semibold text-blue-400 uppercase tracking-wider text-[8px] mb-1">Active Scheduled Interview</div>
                                <div>📅 Date: {new Date(selectedApp.interviewDate).toLocaleString()}</div>
                                <div className="mt-0.5 truncate">
                                  🔗 Meet Link: <a href={selectedApp.interviewLink} target="_blank" rel="noreferrer" className="text-[#F2C1A3] hover:underline">{selectedApp.interviewLink}</a>
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                if (!meetLink || !meetDate) {
                                  alert("Please fill in meeting date/time and links to set up Technical Sprints!");
                                  return;
                                }
                                handleStatusChange("interview");
                                alert("Technical interview scheduled successfully. Notifications dispatched.");
                              }}
                              disabled={isUpdating}
                              className="mt-2 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer font-semibold"
                            >
                              <Calendar size={12} />
                              <span>Schedule & Invite Candidate</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* TAB: RESUME */}
                    {activeTab === "resume" && (
                      <div className="flex-1 flex flex-col gap-4 min-h-[450px]">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h3 className="text-xs uppercase font-mono tracking-wider text-[#CD9FA0] flex items-center gap-1.5">
                            <FileText size={15} />
                            <span>Physical Resume Reader</span>
                          </h3>
                          <a 
                            href={selectedApp.resumeUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-[#CD9FA0]/15 border border-[#CD9FA0]/30 text-[#F8CCAA] text-[10px] font-mono flex items-center gap-1 hover:bg-[#CD9FA0]/30 transition"
                          >
                            <span>Open PDF Tab</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>

                        {selectedApp.resumeUrl ? (
                          <div className="flex-1 rounded-2xl border border-white/10 overflow-hidden bg-black/40 relative shadow-inner">
                            <iframe 
                              src={selectedApp.resumeUrl} 
                              className="w-full h-full border-none min-h-[400px]" 
                              title="Applicant Resume Document" 
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-white/20 border border-dashed border-white/10 rounded-2xl p-12 bg-white/[0.01]">
                            <AlertTriangle size={24} className="mb-2 text-[#CD9FA0]" />
                            <span className="text-xs font-mono uppercase">Resume Document Missing</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Drawer footer action bar */}
              <div className="border-t border-white/5 pt-4 flex flex-col gap-3 relative z-10">
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
                  Review Action Controller
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleStatusChange("shortlisted")}
                    disabled={isUpdating}
                    className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle size={12} />
                    <span>Shortlist</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange("rejected")}
                    disabled={isUpdating}
                    className="py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle size={12} />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange("selected")}
                    disabled={isUpdating}
                    className="py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 font-semibold text-xs tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserCheck size={12} />
                    <span>Hired</span>
                  </button>

                  <button
                    onClick={() => exportSingleCandidateDossier(selectedApp)}
                    className="py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Download dossier report"
                  >
                    <Download size={11} />
                    <span>Export Dossier</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => handleStatusChange("archived")}
                    disabled={isUpdating}
                    className="py-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 hover:bg-slate-500/20 text-slate-400 font-mono text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Archive size={11} />
                    <span>Safe Archive Candidate</span>
                  </button>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-mono text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Purge Record</span>
                  </button>
                </div>
              </div>

            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 md:p-8 rounded-3xl border border-red-500/25 bg-[#1b1c2b] max-w-md w-full flex flex-col gap-6 shadow-[0_10px_50px_rgba(239,68,68,0.15)] text-left"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-serif text-white font-light">Purge Candidate Profile?</h3>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                You are initiating a permanent database purge of <strong className="text-white">{selectedApp.fullName}</strong>.
                <br /><br />
                This action will permanently delete:
              </p>
              
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400 font-mono">
                <li>Database records & application telemetry</li>
                <li>Archived drafts & evaluation details</li>
                <li>Physical resume documents & storage assets</li>
              </ul>
              
              <p className="text-xs text-red-400/90 font-medium font-mono">
                ⚠️ This operation is destructive and cannot be undone.
              </p>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleDeleteCandidate}
                  disabled={isDeleting}
                  className="w-full py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/40 text-red-400 font-semibold text-xs tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>Permanently Delete Records</span>
                </button>
                
                <button
                  onClick={() => {
                    handleStatusChange("archived");
                    setShowDeleteModal(false);
                  }}
                  disabled={isUpdating}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 text-slate-300 font-semibold text-xs tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1"
                >
                  <Archive size={12} />
                  <span>Safe Archive Instead</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3 rounded-2xl text-center text-xs text-slate-400 hover:text-white transition font-mono cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
