"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Plus, Copy, Check, Search, RefreshCw, 
  UserMinus, ChevronDown, Clock, Activity, 
  Github, ExternalLink, ShieldCheck, Mail, ArrowRight, X, AlertCircle
} from "lucide-react";
import { 
  fetchWorkspaceTeammates, createWorkspace, joinWorkspace, 
  updateMemberRole, removeWorkspaceMember, updateUserPresence, 
  fetchWorkspaceActivities, calculateWorkspaceContributions, fetchUserWorkspaces
} from "@/app/actions/team-actions";
import { sendWorkspaceInviteEmail } from "@/app/actions/email-actions";

interface TeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  contriTrackRole?: string;
  userType?: string;
  joinedAt: string;
  githubUsername: string;
  avatarUrl: string;
  contributionScore: number;
  activityStatus: string;
  lastSeen: string;
  activeRepository: string | null;
  activeTask: string | null;
  stats: {
    commits: number;
    pullRequests: number;
    reviews: number;
    tasksCompleted: number;
    meetingsAttended: number;
  };
}

interface ActivityLog {
  id: string;
  userId: string;
  fullName: string;
  activityType: string;
  metadata: string;
  createdAt: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  inviteCodeUpdatedAt: string | Date;
  createdAt: string | Date;
}

interface TeamPanelProps {
  workspaceId: string;
  workspaceName: string;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
  } | null;
  onWorkspaceChanged: (id: string, name: string) => void;
}

export default function TeamPanel({ 
  workspaceId, 
  workspaceName, 
  user, 
  onWorkspaceChanged 
}: TeamPanelProps) {
  // Primary States
  const [teammates, setTeammates] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Interaction Modals States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form Fields
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);

  // active member role edit states
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Active user's role in this workspace
  const activeUserRole = teammates.find(t => t.userId === user?.uid)?.role || "Contributor";

  const loadWorkspaces = React.useCallback(async () => {
    if (!user?.uid) return;
    const res = await fetchUserWorkspaces(user.uid);
    if (res.success && res.workspaces) {
      setWorkspaces(res.workspaces as WorkspaceItem[]);
    }
  }, [user]);

  // Load Workspace Teammates & Telemetry
  const loadWorkspaceData = React.useCallback(async (targetId: string = workspaceId) => {
    if (!targetId) return;
    setLoading(true);
    try {
      const teammatesRes = await fetchWorkspaceTeammates(targetId);
      const activitiesRes = await fetchWorkspaceActivities(targetId);

      if (teammatesRes.success && teammatesRes.teammates) {
        setTeammates(teammatesRes.teammates as TeamMember[]);
      }
      if (activitiesRes.success && activitiesRes.activities) {
        setActivities(activitiesRes.activities as ActivityLog[]);
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Trigger recalculation of analytics contribution scores
  const handleRecalculateScores = async () => {
    setCalculating(true);
    try {
      await calculateWorkspaceContributions(workspaceId);
      await loadWorkspaceData(workspaceId);
    } catch (err) {
      console.error("Recalculation error:", err);
    } finally {
      setCalculating(false);
    }
  };

  // Initialize
  useEffect(() => {
    let active = true;
    const initializeData = async () => {
      if (!active) return;
      if (user?.uid) {
        await loadWorkspaces();
      }
      await loadWorkspaceData(workspaceId);
    };
    void initializeData();
    return () => {
      active = false;
    };
  }, [workspaceId, user?.uid, loadWorkspaces, loadWorkspaceData]);

  // Presence simulation & heartbeat updater
  useEffect(() => {
    if (!user?.uid || !workspaceId) return;

    // Send active status heartbeats to DB periodically
    const heartbeat = async () => {
      // Find a random task name in the dashboard if available to make active tasks realistic
      const activeTasksList = ["Refactoring core auth", "Designing glassmorphic boards", "Synchronizing GitHub telemetry", "Optimizing Supabase queries", "Auditing peer parity scores"];
      const randomTask = activeTasksList[Math.floor(Math.random() * activeTasksList.length)];
      
      await updateUserPresence(
        workspaceId, 
        user.uid, 
        "online", 
        "TeamTrace", 
        randomTask
      );
    };

    heartbeat(); // Run immediately
    const interval = setInterval(heartbeat, 45000); // Heartbeat every 45s

    return () => clearInterval(interval);
  }, [workspaceId, user?.uid]);

  // Copy invite code to clipboard helper
  const activeWorkspace = workspaces.find(w => w.id === workspaceId);
  const inviteCode = activeWorkspace?.inviteCode || "CT-NONE";

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setInviteCodeCopied(true);
    setTimeout(() => setInviteCodeCopied(false), 2000);
  };

  // Create Workspace Submission
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !user?.uid) return;

    const res = await createWorkspace(newWorkspaceName, user.uid);
    if (res.success && res.workspace) {
      setNewWorkspaceName("");
      setShowCreateModal(false);
      await loadWorkspaces();
      onWorkspaceChanged(res.workspace.id, res.workspace.name);
    } else {
      alert("Failed to create workspace: " + (res.error || ""));
    }
  };

  // Join Workspace Submission
  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim() || !user?.uid) return;

    const res = await joinWorkspace(
      joinInviteCode, 
      user.uid, 
      user.displayName || "Collaborator"
    );
    if (res.success && res.workspace) {
      setJoinInviteCode("");
      setShowJoinModal(false);
      await loadWorkspaces();
      onWorkspaceChanged(res.workspace.id, res.workspace.name);
    } else {
      alert("Failed to join workspace: " + (res.error || ""));
    }
  };

  // Send Email Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !user?.uid) return;

    setSendingInvite(true);
    try {
      const res = await sendWorkspaceInviteEmail(
        inviteEmail,
        workspaceName,
        inviteCode,
        user.displayName || user.email || "Collaborator"
      );

      if (res.success) {
        alert(`Roster invite successfully dispatched to ${inviteEmail}!`);
      } else {
        alert(res.error || "Failed to send recruitment invite email. Check console/logs.");
      }
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to send recruitment invite email.");
    } finally {
      setSendingInvite(false);
    }
  };

  // Change Role Callback
  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!user?.uid) return;
    const res = await updateMemberRole(workspaceId, targetUserId, newRole, user.uid);
    if (res.success) {
      setEditingRoleId(null);
      await loadWorkspaceData(workspaceId);
    } else {
      alert("Failed to change role: " + (res.error || ""));
    }
  };

  // Kick / Remove Member Callback
  const handleRemoveMember = async (targetUserId: string) => {
    if (!user?.uid) return;
    if (!confirm("Are you sure you want to remove this member from the workspace?")) return;

    const res = await removeWorkspaceMember(workspaceId, targetUserId, user.uid);
    if (res.success) {
      if (targetUserId === user.uid) {
        // Self-leave, switch back to user's first available workspace
        const fresh = await fetchUserWorkspaces(user.uid);
        if (fresh.success && fresh.workspaces && fresh.workspaces.length > 0) {
          onWorkspaceChanged(fresh.workspaces[0].id, fresh.workspaces[0].name);
        }
      } else {
        await loadWorkspaceData(workspaceId);
      }
    } else {
      alert("Failed to remove member: " + (res.error || ""));
    }
  };

  // Filtering Logic
  const filteredTeammates = teammates.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.githubUsername.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || member.activityStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate Average Workspace Fairness Index
  const calculateFairnessScore = () => {
    if (teammates.length === 0) return 0;
    const nonZeroScores = teammates.map(c => c.contributionScore || 1);
    const sumScores = nonZeroScores.reduce((a, b) => a + b, 0);
    const sumSqScores = nonZeroScores.reduce((a, b) => a + b * b, 0);
    const n = nonZeroScores.length;
    return Math.round(((sumScores * sumScores) / (n * sumSqScores)) * 100);
  };

  const fairnessIdx = calculateFairnessScore();

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl w-full select-none">
      
      {/* 1. TOP HEADER NAVIGATION & SWITCHER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-4">
        <div className="relative">
          <button 
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#F2C1A3]/30 transition group text-left cursor-pointer"
          >
            <Users size={16} className="text-[#F2C1A3] group-hover:scale-105 transition" />
            <div className="flex flex-col">
              <span className="text-[9px] text-[#857C91] uppercase font-mono tracking-wider">Active Workspace</span>
              <span className="text-sm text-white font-serif font-light flex items-center gap-1.5">
                {workspaceName}
                <ChevronDown size={12} className="text-[#857C91] group-hover:text-white transition" />
              </span>
            </div>
          </button>

          {/* Switcher Dropdown */}
          <AnimatePresence>
            {showSwitcher && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 mt-2 w-64 z-50 rounded-2xl bg-[#141525] border border-white/10 shadow-2xl p-2 flex flex-col gap-1 text-left"
                >
                  <span className="px-3 py-1.5 text-[8px] uppercase tracking-wider text-[#857C91] font-mono block">Your Workspaces</span>
                  
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        onWorkspaceChanged(ws.id, ws.name);
                        setShowSwitcher(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-light text-left transition flex items-center justify-between ${
                        ws.id === workspaceId 
                          ? "bg-[#F2C1A3]/10 text-[#F2C1A3]" 
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{ws.name}</span>
                      {ws.id === workspaceId && <Check size={12} />}
                    </button>
                  ))}

                  <div className="border-t border-white/5 my-1.5" />
                  
                  <div className="grid grid-cols-2 gap-1 p-1">
                    <button 
                      onClick={() => {
                        setShowSwitcher(false);
                        setShowCreateModal(true);
                      }}
                      className="px-2 py-2 rounded-lg bg-white/5 hover:bg-[#F2C1A3]/10 text-white hover:text-[#F2C1A3] transition text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} /> Create New
                    </button>
                    <button 
                      onClick={() => {
                        setShowSwitcher(false);
                        setShowJoinModal(true);
                      }}
                      className="px-2 py-2 rounded-lg bg-white/5 hover:bg-[#F2C1A3]/10 text-white hover:text-[#F2C1A3] transition text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ArrowRight size={10} /> Join code
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Copy Invite Code & Actions Grid */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Invite Code display */}
          <div className="flex items-center gap-2 p-2 px-3.5 rounded-2xl bg-white/[0.01] border border-white/5 text-xs text-[#857C91] hover:border-white/10 transition">
            <span className="font-mono text-[9px] uppercase tracking-wider">Invite Code:</span>
            <span className="text-white font-mono font-bold tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/5">{inviteCode}</span>
            <button 
              onClick={handleCopyInviteCode}
              className="p-1 rounded hover:bg-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
              title="Copy invite code"
            >
              {inviteCodeCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>

          {/* Sync / Recalculate button */}
          <button
            onClick={handleRecalculateScores}
            disabled={calculating || loading}
            className="px-4 py-2.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/[0.08] hover:border-white/10 text-xs text-white hover:text-[#F2C1A3] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={calculating ? "animate-spin text-[#F2C1A3]" : ""} />
            {calculating ? "Calculating scores..." : "Refresh Scores"}
          </button>

          {/* Recruiter button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.5} /> Invite Teammate
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC WORKFORCE DIAGNOSTIC DIALS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between h-24">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Collaboration Health</span>
          <span className={`text-2xl font-serif font-light ${fairnessIdx >= 80 ? "text-emerald-400" : "text-[#F2C1A3]"}`}>
            {fairnessIdx}%
          </span>
          <span className="text-[8px] text-[#857C91] font-mono uppercase">Jain&apos;s Fairness Index</span>
        </div>

        <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between h-24">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Active Workspace Size</span>
          <span className="text-2xl font-serif text-white font-light">
            {teammates.length} <span className="text-[10px] font-mono text-[#857C91]">peers</span>
          </span>
          <span className="text-[8px] text-emerald-400 font-mono uppercase">100% PERSISTENT ROSTER</span>
        </div>

        <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between h-24">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Pushed Work Waves</span>
          <span className="text-2xl font-serif text-[#F2C1A3] font-light">
            {teammates.reduce((sum, t) => sum + t.stats.commits, 0)}
          </span>
          <span className="text-[8px] text-[#CD9FA0] font-mono uppercase">Audited Commits</span>
        </div>

        <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between h-24">
          <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Delivered Objectives</span>
          <span className="text-2xl font-serif text-white font-light">
            {teammates.reduce((sum, t) => sum + t.stats.tasksCompleted, 0)}
          </span>
          <span className="text-[8px] text-[#857C91] font-mono uppercase">Completed Tasks</span>
        </div>

      </div>

      {/* 3. ROSTER REGISTRY MAIN GRID SLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Roster list & search bar (8 cols) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-4">
          
          {/* Audits & Filters panel */}
          <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-wrap gap-3 items-center">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={12} className="absolute left-3.5 top-3.5 text-[#857C91]" />
              <input
                type="text"
                placeholder="Fuzzy search teammates by name or GitHub..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] focus:bg-white/[0.04] transition"
              />
            </div>

            {/* Role Filter Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#857C91] text-[8px] uppercase font-mono">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                title="Select role filter"
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#F2C1A3]"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="contributor">Contributor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Status Filter Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#857C91] text-[8px] uppercase font-mono">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                title="Select status filter"
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#F2C1A3]"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 border border-white/5 rounded-3xl bg-white/[0.005]">
              <LoaderCircle />
            </div>
          ) : filteredTeammates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center gap-2 border border-dashed border-white/5 rounded-3xl bg-white/[0.005]">
              <AlertCircle size={24} className="text-[#857C91]" />
              <span className="text-white text-xs font-serif font-light">No teammates aligned with selection</span>
              <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">Modify filters or recruitment rosters</span>
            </div>
          ) : (
            /* Teammate Cards Grid layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTeammates.map((member) => (
                <motion.div
                  layout
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 hover:border-[#F2C1A3]/25 transition duration-300 flex flex-col gap-3.5 relative cursor-pointer group hover:bg-[#141523]/60"
                >
                  {/* Presence indicator breathing glow */}
                  <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                    member.activityStatus === "online" 
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)] animate-pulse" 
                      : "bg-[#525871]"
                  }`} title={member.activityStatus} />

                  <div className="flex items-center gap-3">
                    {member.avatarUrl && !member.avatarUrl.includes("dicebear") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a1b2e] to-[#0e0f17] border border-white/10 flex items-center justify-center text-xs font-semibold font-serif text-[#F2C1A3] shrink-0">
                        {member.fullName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-xs text-white font-medium group-hover:text-[#F8CCAA] transition">{member.fullName}</span>
                      
                      {editingRoleId === member.id && (activeUserRole === "Owner" || activeUserRole === "Admin") ? (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                            title="Edit Role badge"
                            className="bg-black/60 border border-[#F2C1A3]/20 rounded px-1.5 py-0.5 text-[9px] text-[#F2C1A3] focus:outline-none"
                          >
                            <option value="Owner">Owner</option>
                            <option value="Admin">Admin</option>
                            <option value="Contributor">Contributor</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            onClick={(e) => {
                              if (activeUserRole === "Owner" || activeUserRole === "Admin") {
                                e.stopPropagation();
                                setEditingRoleId(member.id);
                              }
                            }}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-mono text-[#857C91] tracking-wider uppercase hover:border-[#F2C1A3]/30 hover:text-[#F2C1A3] transition cursor-pointer"
                            title="Click to edit workspace role"
                          >
                            {member.role}
                          </span>
                          {member.contriTrackRole && (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F2C1A3]/[0.08] border border-[#F2C1A3]/20 text-[8px] font-medium text-[#F2C1A3] tracking-wide"
                              title="ContriTrack Role"
                            >
                              {member.contriTrackRole}
                            </span>
                          )}
                          {member.userType && member.userType !== "Student" && (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#CD9FA0]/[0.08] border border-[#CD9FA0]/20 text-[8px] font-medium text-[#CD9FA0] tracking-wide"
                              title="Member Classification"
                            >
                              {member.userType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Telemetry logs snippet */}
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-2.5 text-[10px]">
                    <div className="flex justify-between items-center text-[#857C91]">
                      <span className="flex items-center gap-1"><Github size={10} /> GitHub User:</span>
                      <span className="text-white font-mono">{member.githubUsername || "Not linked"}</span>
                    </div>

                    <div className="flex justify-between items-center text-[#857C91] mt-0.5">
                      <span>Telemetry Score:</span>
                      <span className="text-[#F2C1A3] font-mono font-bold">{member.contributionScore.toFixed(1)}</span>
                    </div>

                    {member.activeTask && (
                      <div className="mt-1.5 p-1.5 rounded bg-black/30 border border-white/[0.03] text-[9px] text-left leading-normal flex items-start gap-1">
                        <Activity size={9} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                        <span className="text-white/80">Active Task: <b className="text-emerald-400 font-normal">{member.activeTask}</b></span>
                      </div>
                    )}
                  </div>

                  {/* Card bottom controller (kick / leave buttons) */}
                  {(activeUserRole === "Owner" || activeUserRole === "Admin" || member.userId === user?.uid) && (
                    <div className="flex items-center justify-end border-t border-white/5 pt-2 mt-0.5 opacity-0 group-hover:opacity-100 transition duration-300" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-mono hover:bg-red-500/20 transition cursor-pointer flex items-center gap-0.5"
                      >
                        <UserMinus size={9} />
                        {member.userId === user?.uid ? "Leave Workspace" : "Remove Peer"}
                      </button>
                    </div>
                  )}

                </motion.div>
              ))}
            </div>
          )}

        </div>

        {/* Right chronological feed updates (4 cols) */}
        <div className="col-span-1 lg:col-span-4 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
          
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-xs text-white font-serif font-light">Workspace Wave activities</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2C1A3]" />
            </div>

            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1 flex-1">
              {activities.length === 0 ? (
                <span className="text-[#857C91] text-[10px] font-light italic pl-1">No activities registered yet in this workspace.</span>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-1 text-[11px] leading-normal relative">
                    <div className="flex justify-between items-center text-[9px] text-[#857C91] font-mono">
                      <span className="uppercase text-[#F2C1A3]">{act.activityType}</span>
                      <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-white/80 font-light mt-0.5">{act.metadata}</span>
                    <span className="text-[#857C91] text-[8px] font-mono mt-0.5">by {act.fullName}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-3 text-[9px] text-[#F8CCAA] font-mono font-light border-t border-white/5 pt-3">
              <ShieldCheck size={11} className="text-[#F2C1A3]" />
              <span>Workspace activities persistent & audited</span>
            </div>
          </div>

        </div>

      </div>

      {/* 4. DANGER ZONE (Workspace Owner Only) */}
      {activeUserRole === "Owner" && (
        <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/[0.02] flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-xs text-red-400 font-mono uppercase tracking-widest font-semibold">Danger Zone</span>
            <h4 className="text-white text-sm font-serif font-light font-medium">Delete This Workspace</h4>
            <p className="text-[10px] text-[#857C91] max-w-xl leading-normal">
              This action will permanently purge the active workspace <b>{workspaceName}</b>, deleting all associated Kanban tasks, team collaborations, presence, and activity history from the Supabase Postgres databases. This action is irreversible.
            </p>
          </div>
          <button
            onClick={async () => {
              if (confirm(`WARNING: Are you absolutely sure you want to permanently delete the workspace "${workspaceName}"? All data will be destroyed.`)) {
                const typedName = prompt(`FINAL CONFIRMATION: Type the workspace name "${workspaceName}" to delete:`);
                if (typedName === workspaceName) {
                  const { deleteWorkspace } = await import("@/app/actions/team-actions");
                  if (user?.uid) {
                    const res = await deleteWorkspace(workspaceId, user.uid);
                    if (res.success) {
                      alert("Workspace deleted successfully.");
                      const fresh = await fetchUserWorkspaces(user.uid);
                      if (fresh.success && fresh.workspaces && fresh.workspaces.length > 0) {
                        onWorkspaceChanged(fresh.workspaces[0].id, fresh.workspaces[0].name);
                      } else {
                        // Reload window to let the app fetchUserWorkspaces auto-create main studio
                        window.location.reload();
                      }
                    } else {
                      alert("Failed to delete workspace: " + (res.error || ""));
                    }
                  }
                } else if (typedName !== null) {
                  alert("Workspace name mismatch. Deletion cancelled.");
                }
              }
            }}
            className="px-5 py-2.5 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold transition shrink-0 cursor-pointer"
          >
            Delete Workspace
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIALOGS, MODALS, AND HELPER DRAWER PANELS                 */}
      {/* ========================================================= */}

      {/* 1. Modal: Create Workspace */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#141525] border border-white/10 shadow-2xl relative text-left flex flex-col gap-4"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close modal"
              >
                <X size={12} />
              </button>

              <h4 className="text-white text-base font-serif font-light border-b border-white/5 pb-2">Spawn New Workspace</h4>
              
              <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ws-name" className="text-[#857C91] text-[10px] uppercase font-mono">Workspace Project Name *</label>
                  <input 
                    id="ws-name"
                    type="text" 
                    placeholder="e.g. ContriTrack Squad Beta" 
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    title="Workspace Project Name"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    required
                  />
                </div>

                <button type="submit" className="w-full py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg mt-2 cursor-pointer">
                  Spawn Workspace
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Modal: Join Workspace via Invite Code */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#141525] border border-white/10 shadow-2xl relative text-left flex flex-col gap-4"
            >
              <button 
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close modal"
              >
                <X size={12} />
              </button>

              <h4 className="text-white text-base font-serif font-light border-b border-white/5 pb-2">Join Workspace</h4>
              
              <form onSubmit={handleJoinWorkspace} className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-code" className="text-[#857C91] text-[10px] uppercase font-mono">Workspace Invite Code *</label>
                  <input 
                    id="join-code"
                    type="text" 
                    placeholder="CT-XXXXXX" 
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value)}
                    title="Workspace Invite Code"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] font-mono tracking-widest text-center uppercase transition"
                    required
                  />
                </div>

                <button type="submit" className="w-full py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg mt-2 cursor-pointer">
                  Join Workspace
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Modal: Invite Teammate email recruitment */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#141525] border border-white/10 shadow-2xl relative text-left flex flex-col gap-4"
            >
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close modal"
              >
                <X size={12} />
              </button>

              <h4 className="text-white text-base font-serif font-light border-b border-white/5 pb-2">Invite Peer Teammate</h4>
              
              <form onSubmit={handleSendInvite} className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invite-email" className="text-[#857C91] text-[10px] uppercase font-mono">Teammate Email Address *</label>
                  <input 
                    id="invite-email"
                    type="email" 
                    placeholder="partner@university.edu" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    title="Teammate Email Address"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={sendingInvite}
                  className="w-full py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg mt-2 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Mail size={12} className={sendingInvite ? "animate-spin text-[#12131e]" : ""} /> 
                  {sendingInvite ? "Dispatching Invite..." : "Dispatch Recruitment Invite"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Slide-out Detailed Contributor Profile drawer */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xl h-full bg-[#111221]/95 border-l border-white/10 shadow-2xl backdrop-blur-lg flex flex-col z-10 text-left"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedMember.avatarUrl && !selectedMember.avatarUrl.includes("dicebear") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedMember.avatarUrl}
                      alt={selectedMember.fullName}
                      className="w-8 h-8 rounded-full object-cover border border-white/5"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1b2e] to-[#0e0f17] border border-white/5 flex items-center justify-center text-xs font-serif font-semibold text-[#F2C1A3]">
                      {selectedMember.fullName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col leading-snug gap-1">
                    <h3 className="text-sm font-serif text-white font-normal">{selectedMember.fullName}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-mono text-[#857C91] tracking-wider uppercase">
                        {selectedMember.role}
                      </span>
                      {selectedMember.contriTrackRole && selectedMember.contriTrackRole !== selectedMember.role && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F2C1A3]/[0.08] border border-[#F2C1A3]/20 text-[8px] font-medium text-[#F2C1A3] tracking-wide">
                          {selectedMember.contriTrackRole}
                        </span>
                      )}
                      {selectedMember.userType && selectedMember.userType !== "Student" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#CD9FA0]/[0.08] border border-[#CD9FA0]/20 text-[8px] font-medium text-[#CD9FA0] tracking-wide">
                          {selectedMember.userType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                  title="Close profile drawer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Content body scrollable */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-xs text-left">
                
                {/* Peer Telemetry Score dial card */}
                <div className="p-5 rounded-3xl border border-[#F2C1A3]/10 bg-[#F2C1A3]/[0.02] flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Telemetry Parity Score</span>
                    <span className="text-3xl font-serif text-[#F2C1A3] font-light">{selectedMember.contributionScore.toFixed(1)}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[9px] text-[#857C91] text-right font-mono flex flex-col gap-0.5">
                    <span>Joined: {new Date(selectedMember.joinedAt).toLocaleDateString()}</span>
                    <span>Last Seen: {new Date(selectedMember.lastSeen).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Substantive Ratios breakdown cards */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-white text-xs font-serif font-light border-b border-white/5 pb-2">Audited contribution Metrics</h4>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-2xl bg-[#141523]/45 border border-white/5 text-left flex flex-col justify-between h-16">
                      <span className="text-[#857C91] text-[8px] uppercase">Pushed Commits</span>
                      <span className="text-white text-sm font-semibold">{selectedMember.stats.commits} commits</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#141523]/45 border border-white/5 text-left flex flex-col justify-between h-16">
                      <span className="text-[#857C91] text-[8px] uppercase">Pull Requests Pushed</span>
                      <span className="text-white text-sm font-semibold">{selectedMember.stats.pullRequests} PRs</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#141523]/45 border border-white/5 text-left flex flex-col justify-between h-16">
                      <span className="text-[#857C91] text-[8px] uppercase">Completed Tasks</span>
                      <span className="text-white text-sm font-semibold">{selectedMember.stats.tasksCompleted} tasks</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#141523]/45 border border-white/5 text-left flex flex-col justify-between h-16">
                      <span className="text-[#857C91] text-[8px] uppercase">Meetings Attended</span>
                      <span className="text-white text-sm font-semibold">{selectedMember.stats.meetingsAttended} RSVPs</span>
                    </div>
                  </div>
                </div>

                {/* GitHub details card */}
                <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-2.5">
                  <span className="text-white text-xs font-serif font-light flex items-center gap-1.5">
                    <Github size={13} className="text-[#F2C1A3]" /> Connected GitHub account
                  </span>
                  
                  {selectedMember.githubUsername ? (
                    <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/[0.03]">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={selectedMember.avatarUrl} 
                          alt={selectedMember.githubUsername}
                          className="w-5 h-5 rounded-full border border-white/10"
                        />
                        <span className="font-mono text-white text-[11px]">{selectedMember.githubUsername}</span>
                      </div>
                      <a 
                        href={`https://github.com/${selectedMember.githubUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#F2C1A3] hover:underline flex items-center gap-1 font-mono"
                      >
                        GitHub profile <ExternalLink size={10} />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[#857C91] font-light italic pl-1">Teammate profile has not linked GitHub account yet.</span>
                  )}
                </div>

                {/* Presence tracking log details */}
                <div className="p-4 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-2.5 text-left">
                  <span className="text-white text-xs font-serif font-light flex items-center gap-1.5">
                    <Clock size={13} className="text-[#F2C1A3]" /> Telemetry Activity logs
                  </span>

                  <div className="flex flex-col gap-2 text-[10px] text-[#857C91] font-light">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span>Online presence:</span>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold capitalize ${
                        selectedMember.activityStatus === "online" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-[#857C91]"
                      }`}>
                        {selectedMember.activityStatus}
                      </span>
                    </div>

                    {selectedMember.activeRepository && (
                      <div className="flex justify-between items-center border-b border-white/5 pb-2 mt-1">
                        <span>Active Repository:</span>
                        <span className="text-white font-mono">{selectedMember.activeRepository}</span>
                      </div>
                    )}

                    {selectedMember.activeTask && (
                      <div className="flex justify-between items-start mt-1">
                        <span>Active Objective:</span>
                        <span className="text-white font-serif max-w-[280px] text-right leading-normal">{selectedMember.activeTask}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Inline Loader component to match ContriTrack cinematic animations
function LoaderCircle() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 font-mono text-[10px] text-[#857C91]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        className="w-6 h-6 rounded-full border-2 border-white/5 border-t-[#F2C1A3]"
      />
      <span>Querying secure workforce telemetry logs...</span>
    </div>
  );
}
