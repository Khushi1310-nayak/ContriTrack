"use client";

import React, { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Plus, 
  Users, 
  FileText, 
  Settings, 
  Bell, 
  Github, 
  Check, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  LogOut, 
  ChevronDown,
  Menu,
  X,
  RefreshCw,
  MessageSquare,
  History,
  Loader2,
  Phone
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Workspace, Notification as PrismaNotification } from "@prisma/client";
import ContactModal from "@/components/ContactModal";
import WorkspaceInitializer from "@/components/WorkspaceInitializer";
import EmptyWorkspaceState from "@/components/EmptyWorkspaceState";
import DashboardOverview from "@/components/DashboardOverview";
import { checkGitHubConnection, fetchLinkedRepositories, disconnectGitHubAccount } from "@/app/actions/github-actions";
import { fetchUserProfileAndSecurity } from "@/app/actions/settings-actions";
import { RepositoryImportModal } from "@/components/RepositoryImportModal";
import { RepositoryAnalyticsDrawer } from "@/components/RepositoryAnalyticsDrawer";
import { GitHubWaveTracker, LinkedRepo } from "@/components/GitHubWaveTracker";
import dynamic from "next/dynamic";

const MeetingsPanel = dynamic(() => import("@/components/MeetingsPanel"), { ssr: false });
const TeamPanel = dynamic(() => import("@/components/TeamPanel"), { ssr: false });
const NotificationsPanel = dynamic(() => import("@/components/NotificationsPanel"), { ssr: false });
const ReportsPanel = dynamic(() => import("@/components/ReportsPanel"), { ssr: false });
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel"), { ssr: false });
const AIInsightsPanel = dynamic(() => import("@/components/AIInsightsPanel"), { ssr: false });
const DashboardSkeleton = dynamic(() => import("@/components/DashboardSkeleton"), { ssr: false });
import { fetchUserWorkspaces, createWorkspace } from "@/app/actions/team-actions";
import { fetchNotifications } from "@/app/actions/notification-actions";
import {
  fetchWorkspaceTasks,
  createWorkspaceTask,
  updateTaskStatus,
  deleteWorkspaceTask,
  addTaskComment,
  fetchWorkspaceUsers,
  fetchWorkspaceRepositories,
  syncTaskGitHubTelemetry
} from "@/app/actions/task-actions";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from "recharts";
import { fetchWorkspaceAnalyticsData, syncWorkspaceGithubTelemetry } from "@/app/actions/analytics-actions";

// Fully typed task models representing our real database schemas
interface TaskComment {
  id: string;
  content: string;
  createdAt: string | Date;
  user?: { id: string; fullName: string; email: string } | null;
}

interface TaskActivity {
  id: string;
  metadata: string;
  createdAt: string | Date;
  user?: { id: string; fullName: string; email: string } | null;
}

interface TaskTelemetry {
  id: string;
  commitCount: number;
  pullRequestCount: number;
  linesChanged: number;
  contributionScore: number;
  syncedAt: string | Date | null;
}

interface TaskRepository {
  id: string;
  name: string;
  owner: string;
  url?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  labels: string;
  dueDate: string | Date | null;
  estimatedHours: number;
  githubIssueUrl: string | null;
  linkedPullRequest: string | null;
  linkedCommitHash: string | null;
  repositoryId: string | null;
  workspaceId: string | null;
  creatorId: string | null;
  assigneeId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  completedAt: string | Date | null;
  assignee?: { id: string; fullName: string; email: string } | null;
  creator?: { id: string; fullName: string; email: string } | null;
  comments?: TaskComment[];
  activities?: TaskActivity[];
  telemetry?: TaskTelemetry[];
  repository?: TaskRepository | null;
}

interface Collaborator {
  id: string;
  fullName: string;
  email: string;
  githubUsername?: string | null;
}

interface Repository {
  id: string;
  name: string;
  owner: string;
  url?: string;
  syncedAt?: string | Date;
}

interface ContributorStat {
  id: string;
  fullName: string;
  email?: string;
  githubUsername: string;
  commits: number;
  pullRequests: number;
  issuesClosed: number;
  linesAdded: number;
  linesDeleted: number;
  completedTasks: number;
  contributionScore: number;
}

interface AnalyticsData {
  totalCommits: number;
  activeContributors: number;
  sprintCompletionPct: number;
  fairnessScore: number;
  overdueRatio: number;
  openPRs: number;
  mergedPRs: number;
  openIssues: number;
  closedIssues: number;
  contributorStats: ContributorStat[];
  commitTimeline: { day: string; commits: number }[];
  insights: string[];
  repositories: Repository[];
  activeRepoId: string | null;
  meetingInsights?: { name: string; attendance: number; speaking: number }[];
}

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  category: "task" | "github" | "meeting" | "system";
}

interface UserProfileData {
  displayName?: string | null;
  fullName?: string | null;
  roleInContriTrack?: string | null;
  userType?: string | null;
  avatarUrl?: string | null;
  [key: string]: unknown;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  
  // Relational database profile syncing state
  const [dbProfile, setDbProfile] = useState<UserProfileData | null>(null);

  // Dynamic client time-of-day greeting state (Morning, Afternoon, Evening) computed via lazy initializer
  const [timeGreeting] = useState<string>(() => {
    if (typeof window === "undefined") return "Good evening";
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  });

  const getGreeting = () => timeGreeting;

  const userName = ((dbProfile?.displayName as string) || (dbProfile?.fullName as string) || (profile?.displayName as string) || (profile?.fullName as string) || (user?.displayName as string) || user?.email?.split("@")[0] || "User") as string;
  const userRole = ((dbProfile?.roleInContriTrack as string) || (dbProfile?.userType as string) || "Student") as string;
  const userClassification = ((dbProfile?.userType as string) || "Student") as string;

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [currentWorkspace, setCurrentWorkspace] = useState<string>("");
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>("");
  const currentWorkspaceIdRef = React.useRef(currentWorkspaceId);
  React.useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspaceId;
  }, [currentWorkspaceId]);
  const [dbWorkspaces, setDbWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(true);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  // GitHub Integration System States
  const [githubConnected, setGithubConnected] = useState(false);
  const [linkedRepositories, setLinkedRepositories] = useState<LinkedRepo[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedRepoForDrawer, setSelectedRepoForDrawer] = useState<LinkedRepo | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Disconnect GitHub OAuth States
  const [showDisconnectConfirmModal, setShowDisconnectConfirmModal] = useState(false);
  const [showSignOutConfirmModal, setShowSignOutConfirmModal] = useState(false);
  const [isDisconnectingGit, setIsDisconnectingGit] = useState(false);

  const handleDisconnectGitHub = async () => {
    if (!user?.uid) return;
    setIsDisconnectingGit(true);
    const res = await disconnectGitHubAccount(user.uid);
    setIsDisconnectingGit(false);
    if (res.success) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, { githubUsername: "" }, { merge: true });
      } catch (fsErr) {
        console.error("Firestore githubUsername clear deferred:", fsErr);
      }
      setGithubConnected(false);
      setLinkedRepositories([]);
      setShowDisconnectConfirmModal(false);
      router.refresh();
    } else {
      alert(res.error || "Failed to disconnect account");
    }
  };

  // Connection synchronizer hooks with useCallback to avoid stale references
  const loadLinkedRepos = React.useCallback(async () => {
    if (!user?.uid) return;
    const res = await fetchLinkedRepositories(user.uid);
    if (res.success && res.repositories) {
      setLinkedRepositories(res.repositories);
    }
  }, [user]);

  const checkConnection = React.useCallback(async () => {
    if (!user?.uid) return;
    const res = await checkGitHubConnection(user.uid);
    if (res.connected) {
      setGithubConnected(true);
      loadLinkedRepos();
    } else {
      setGithubConnected(false);
    }
  }, [user, loadLinkedRepos]);

  React.useEffect(() => {
    if (user?.uid) {
      startTransition(() => { void checkConnection(); });
    }
  }, [user, checkConnection]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("github_connected") === "true") {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("GitHub account integrated successfully!");
      if (user?.uid) {
        startTransition(() => { void checkConnection(); });
      }
    }
  }, [user, checkConnection]);

  const handleConnectGitHub = () => {
    if (!user?.uid) {
      alert("Please ensure your team session is active to bridge accounts.");
      return;
    }
    const email = user.email || "";
    const name = userName;
    window.location.href = `/api/auth/github?userId=${user.uid}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
  };
  
  // Custom workspace creation state
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);

  // 1. Kanban System State (Supabase Persistence & Optimistic CRUD Actions)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetailDrawer, setShowTaskDetailDrawer] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [syncingTaskTelemetryId, setSyncingTaskTelemetryId] = useState<string | null>(null);

  // Modal Creation Inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [newTaskLabels, setNewTaskLabels] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskEstimatedHours, setNewTaskEstimatedHours] = useState<number>(0);
  const [newTaskRepositoryId, setNewTaskRepositoryId] = useState<string>("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string>("");
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // 3. Analytics & Telemetry State
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [syncingAnalytics, setSyncingAnalytics] = useState(false);
  const [analyticsFilterRepo, setAnalyticsFilterRepo] = useState<string>("all");
  const [analyticsFilterMember, setAnalyticsFilterMember] = useState<string>("all");
  const [analyticsFilterDate, setAnalyticsFilterDate] = useState<string>("week");

  // Dynamic Workspace Loader
  const loadWorkspaceData = React.useCallback(async () => {
    if (!currentWorkspaceId) return;
    await Promise.resolve();
    setLoadingTasks(true);
    try {
      const [tasksRes, usersRes, reposRes] = await Promise.all([
        fetchWorkspaceTasks(currentWorkspaceId),
        fetchWorkspaceUsers(currentWorkspaceId),
        fetchWorkspaceRepositories(currentWorkspaceId),
      ]);

      if (tasksRes.success && tasksRes.tasks) {
        setTasks(tasksRes.tasks as Task[]);
      }
      if (usersRes.success && usersRes.users) {
        setCollaborators(usersRes.users as Collaborator[]);
      }
      if (reposRes.success && reposRes.repositories) {
        setRepositories(reposRes.repositories as Repository[]);
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [currentWorkspaceId]);

  const loadDbProfile = React.useCallback(async () => {
    if (!user?.uid) return;
    const res = await fetchUserProfileAndSecurity(user.uid);
    if (res.success && res.profile) {
      setDbProfile(res.profile);
      // Trigger reloading workspace data so collaborators list updates with the new name!
      void loadWorkspaceData();
    }
  }, [user, loadWorkspaceData]);

  React.useEffect(() => {
    startTransition(() => { void loadDbProfile(); });
  }, [loadDbProfile]);

  const loadAnalyticsData = React.useCallback(async () => {
    if (!currentWorkspaceId) return;
    await Promise.resolve();
    setLoadingAnalytics(true);
    try {
      const res = await fetchWorkspaceAnalyticsData(currentWorkspaceId, {
        repositoryId: analyticsFilterRepo === "all" ? null : analyticsFilterRepo,
        memberId: analyticsFilterMember === "all" ? null : analyticsFilterMember,
        dateRange: analyticsFilterDate
      });
      if (res.success && res.data) {
        setAnalyticsData(res.data as unknown as AnalyticsData);
      }
    } catch (err) {
      console.error("Failed loading analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [currentWorkspaceId, analyticsFilterRepo, analyticsFilterMember, analyticsFilterDate]);

  const handleSyncWorkspaceAnalytics = async () => {
    if (!user?.uid) return;
    setSyncingAnalytics(true);
    try {
      const res = await syncWorkspaceGithubTelemetry(currentWorkspaceId, user.uid);
      if (res.success) {
        await loadAnalyticsData();
        await loadWorkspaceData();
        alert(`Successfully synced ${res.count} repository telemetry feeds!`);
      } else {
        alert("Failed to sync telemetry: " + res.error);
      }
    } catch (err) {
      const error = err as Error;
      alert("Telemetry sync failed: " + error.message);
    } finally {
      setSyncingAnalytics(false);
    }
  };

  React.useEffect(() => {
    async function initWorkspaces() {
      if (!user?.uid) return;

      // 1. Try to hydrate from localStorage cache immediately for Returning Users
      try {
        const cached = localStorage.getItem(`contritrack_active_ws_${user.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.id && parsed.name && Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
            setCurrentWorkspaceId((prev) => prev || parsed.id);
            setCurrentWorkspace((prev) => prev || parsed.name);
            setDbWorkspaces((prev) => (prev.length > 0 ? prev : parsed.workspaces));
            setLoadingWorkspaces(false);
          }
        }
      } catch (err) {
        console.warn("LocalStorage workspace cache notice:", err);
      }

      try {
        const res = await fetchUserWorkspaces(user.uid);
        if (res.success && res.workspaces) {
          setDbWorkspaces(res.workspaces);
          if (res.workspaces.length > 0) {
            const activeWs = res.workspaces.find((w) => w.id === currentWorkspaceIdRef.current) || res.workspaces[0];
            setCurrentWorkspaceId(activeWs.id);
            setCurrentWorkspace(activeWs.name);
            try {
              localStorage.setItem(
                `contritrack_active_ws_${user.uid}`,
                JSON.stringify({ id: activeWs.id, name: activeWs.name, workspaces: res.workspaces })
              );
            } catch (lsErr) {
              console.warn("LocalStorage save notice:", lsErr);
            }
          } else {
            setCurrentWorkspaceId("");
            setCurrentWorkspace("");
            try {
              localStorage.removeItem(`contritrack_active_ws_${user.uid}`);
            } catch (lsErr) {
              console.warn("LocalStorage clear notice:", lsErr);
            }
          }
        }
      } finally {
        setLoadingWorkspaces(false);
      }
    }
    startTransition(() => { void initWorkspaces(); });
  }, [user]);

  React.useEffect(() => {
    if (user?.uid && currentWorkspaceId) {
      startTransition(() => { void loadWorkspaceData(); });
    }
  }, [user, currentWorkspaceId, loadWorkspaceData]);

  React.useEffect(() => {
    if (user?.uid && currentWorkspaceId) {
      startTransition(() => { void loadAnalyticsData(); });
    }
  }, [user, currentWorkspaceId, loadAnalyticsData]);



  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user?.uid) return;

    // Capture values before resetting form
    const title = newTaskTitle.trim();
    const description = newTaskDescription;
    const priority = newTaskPriority;
    const labels = newTaskLabels;
    const dueDate = newTaskDueDate || null;
    const estimatedHours = newTaskEstimatedHours;
    const repositoryId = newTaskRepositoryId || null;
    const assigneeId = newTaskAssigneeId || null;

    const selectedAssignee = collaborators.find((c) => c.id === assigneeId);
    const selectedRepo = repositories.find((r) => r.id === repositoryId);

    // Instantly collapse modal & reset form states for zero-latency UX
    setShowAddTaskModal(false);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskLabels("");
    setNewTaskDueDate("");
    setNewTaskEstimatedHours(0);
    setNewTaskRepositoryId("");
    setNewTaskAssigneeId("");

    // Create optimistic task card object
    const tempId = `temp_task_${crypto.randomUUID()}`;
    const optimisticTask: Task = {
      id: tempId,
      title,
      description,
      priority,
      status: "todo",
      labels,
      dueDate,
      estimatedHours,
      githubIssueUrl: null,
      linkedPullRequest: null,
      linkedCommitHash: null,
      repositoryId,
      workspaceId: currentWorkspaceId,
      creatorId: user.uid,
      assigneeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      assignee: selectedAssignee ? { id: selectedAssignee.id, fullName: selectedAssignee.fullName, email: selectedAssignee.email } : null,
      repository: selectedRepo ? { id: selectedRepo.id, name: selectedRepo.name, owner: selectedRepo.owner } : null,
      comments: [],
      activities: [],
      telemetry: [],
    };

    // Instantly add task card to UI board
    setTasks((prev) => [optimisticTask, ...prev]);

    // Create local notification
    setNotifications((prev) => [
      {
        id: `n_${crypto.randomUUID()}`,
        text: `Created task "${title}"`,
        time: "Just now",
        read: false,
        category: "task"
      },
      ...prev
    ]);

    // Asynchronous background server deployment
    const result = await createWorkspaceTask({
      title,
      description,
      priority,
      status: "todo",
      labels,
      dueDate,
      estimatedHours,
      repositoryId,
      workspaceId: currentWorkspaceId,
      creatorId: user.uid,
      assigneeId,
    });

    if (result.success && result.task) {
      // Replace optimistic temp ID with server DB task object
      setTasks((prev) => prev.map((t) => (t.id === tempId ? (result.task as Task) : t)));
    } else {
      // Rollback on server error
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      alert("Failed to create task card on database.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const originalTasks = [...tasks];
    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setShowTaskDetailDrawer(false);
    }

    const res = await deleteWorkspaceTask(taskId);
    if (!res.success) {
      setTasks(originalTasks);
      alert("Failed to delete task card from server.");
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    if (!user?.uid) return;
    const originalTasks = [...tasks];

    // Optimistic UI state transition
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === "completed" ? new Date().toISOString() : null,
            }
          : t
      )
    );

    const res = await updateTaskStatus(taskId, newStatus, user.uid);
    if (!res.success) {
      setTasks(originalTasks);
      alert("Failed to update status on server.");
    } else if (res.task) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? (res.task as Task) : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.task as Task);
      }
    }
  };

  const handleSyncTelemetry = async (taskId: string) => {
    if (!user?.uid) return;
    setSyncingTaskTelemetryId(taskId);
    
    const res = await syncTaskGitHubTelemetry(taskId, user.uid);
    if (res.success && res.telemetry) {
      const freshTasks = await fetchWorkspaceTasks(currentWorkspaceId);
      if (freshTasks.success && freshTasks.tasks) {
        setTasks(freshTasks.tasks as Task[]);
        const freshSelected = freshTasks.tasks.find((t) => t.id === taskId);
        if (freshSelected) {
          setSelectedTask(freshSelected as Task);
        }
      }
    } else {
      alert("Failed to sync live GitHub telemetry: " + (res.error || ""));
    }
    setSyncingTaskTelemetryId(null);
  };

  // 2. Meeting Scheduler System State (Database Persistence via MeetingsPanel)

  // 3. Notification State Center & Real-Time Alert Pipeline
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string } | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const syncRealtimeNotifications = React.useCallback(async () => {
    if (!user?.uid) return;
    const res = await fetchNotifications(user.uid);
    if (res.success && res.notifications) {
      const mapped = res.notifications.map((n: PrismaNotification) => ({
        id: n.id,
        text: `${n.title}: ${n.message}`,
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: n.isRead,
        category: n.type === "github" ? "github" : n.type === "meeting" ? "meeting" : "task"
      }));

      setNotifications((prev) => {
        const prevUnread = prev.filter((n) => !n.read).length;
        const freshUnread = mapped.filter((n: { read: boolean }) => !n.read).length;
        if (mapped.length > 0 && freshUnread > prevUnread) {
          const latest = res.notifications[0];
          setActiveToast({
            title: latest.title || "New Message Received",
            message: latest.message || "You have a new unread notification."
          });
          setTimeout(() => setActiveToast(null), 5000);
        }
        return mapped as unknown as Notification[];
      });
    }
  }, [user]);

  React.useEffect(() => {
    if (!user?.uid) return;
    startTransition(() => { void syncRealtimeNotifications(); });
    const interval = setInterval(() => {
      void syncRealtimeNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [user, syncRealtimeNotifications]);



  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  // Compute live, dynamic dashboard metrics from real state
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === "completed").length;
  const gitCommits = analyticsData?.totalCommits || 0;
  const hasWorkspaceActivity = totalTasksCount > 0 || gitCommits > 0;
  
  // 1. Team Score
  const teamScoreVal = !hasWorkspaceActivity
    ? "0"
    : (analyticsData 
        ? `${Math.round((analyticsData.fairnessScore || 0) * 0.4 + (analyticsData.sprintCompletionPct || 0) * 0.6)}/100` 
        : "0/100");
  const teamScoreSub = !hasWorkspaceActivity
    ? "Awaiting activity"
    : (analyticsData ? "Telemetry aggregate" : "Awaiting sync");

  // 2. Tasks Completed
  const tasksVal = !hasWorkspaceActivity ? "0" : `${completedTasksCount}/${totalTasksCount}`;
  const overdueCount = tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const tasksSub = !hasWorkspaceActivity ? "No tasks created" : `Overdue: ${overdueCount} pending`;

  // 3. Time Contributed
  const completedTaskHours = tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const commitHours = gitCommits * 2;
  const totalContributedHours = completedTaskHours + commitHours;
  const timeVal = `${totalContributedHours}h 0m`;
  const timeSub = !hasWorkspaceActivity ? "No active contributions" : "From tasks & commits";

  // 4. AI Fairness Score
  const isSingleUser = collaborators.length <= 1;
  const hasContributionActivity = (analyticsData?.contributorStats || []).some(c => c.contributionScore > 0);
  const aiFairnessVal = !hasWorkspaceActivity || !hasContributionActivity
    ? "Awaiting activity"
    : (isSingleUser 
        ? "Awaiting team collaboration data" 
        : (analyticsData?.fairnessScore ? `${analyticsData.fairnessScore}/100` : "Awaiting team collaboration data"));
  const aiFairnessSub = !hasWorkspaceActivity || !hasContributionActivity
    ? "No tracked activity yet"
    : (isSingleUser ? "Need >= 2 members" : "Parity metric");

  const cards = [
    { title: "Team Score", val: teamScoreVal, sub: teamScoreSub, icon: Activity, accent: "text-[#F2C1A3] bg-[#F2C1A3]/10" },
    { title: "Tasks Completed", val: tasksVal, sub: tasksSub, icon: Check, accent: "text-[#F8CCAA] bg-[#F8CCAA]/10" },
    { title: "Time Contributed", val: timeVal, sub: timeSub, icon: Clock, accent: "text-[#CD9FA0] bg-[#CD9FA0]/10" },
    { title: "AI Fairness Score", val: aiFairnessVal, sub: aiFairnessSub, icon: Sparkles, accent: "text-[#F2C1A3] bg-[#F2C1A3]/10" }
  ];

  // Compute dynamic display stats for the chart
  let displayStats: Array<{ name: string; pct: number; col: string }> = [];
  if (analyticsData?.contributorStats && analyticsData.contributorStats.length > 0) {
    const totalScore = analyticsData.contributorStats.reduce((sum, c) => sum + (c.contributionScore || 0), 0) || 1;
    displayStats = analyticsData.contributorStats.map((c, idx) => {
      const pct = Math.round(((c.contributionScore || 0) / totalScore) * 100);
      const gradients = [
        "bg-gradient-to-t from-[#CD9FA0] to-[#F2C1A3]",
        "bg-gradient-to-t from-[#857C91] to-[#F2C1A3]",
        "bg-gradient-to-t from-[#525871] to-[#CD9FA0]",
        "bg-gradient-to-t from-[#525871] to-[#857C91]"
      ];
      return {
        name: c.fullName.split(" ")[0] || "Member",
        pct,
        col: gradients[idx % gradients.length]
      };
    });
  } else {
    const totalScore = collaborators.length || 1;
    displayStats = collaborators.map((c, idx) => {
      const pct = Math.round(100 / totalScore);
      const gradients = [
        "bg-gradient-to-t from-[#CD9FA0] to-[#F2C1A3]",
        "bg-gradient-to-t from-[#857C91] to-[#F2C1A3]",
        "bg-gradient-to-t from-[#525871] to-[#CD9FA0]",
        "bg-gradient-to-t from-[#525871] to-[#857C91]"
      ];
      return {
        name: c.fullName.split(" ")[0],
        pct,
        col: gradients[idx % gradients.length]
      };
    });
  }

  // Compute database hourly normalized heatmap
  const realHeatmapData = Array.from({ length: 7 }, () => Array(24).fill(0));
  tasks.forEach(t => {
    const date = new Date(t.updatedAt || t.createdAt);
    const day = date.getDay();
    const hour = date.getHours();
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      realHeatmapData[day][hour] = Math.min(4, realHeatmapData[day][hour] + 1);
    }
  });

  // GitHub overview parameters
  const gitPRs = (analyticsData?.openPRs || 0) + (analyticsData?.mergedPRs || 0);
  const gitIssues = analyticsData?.closedIssues || 0;
  const gitSyncPct = gitCommits > 0 ? 100 : (githubConnected ? 80 : 0);
  const strokeDashoffset = Math.round(213 - (213 * gitSyncPct) / 100);

  // Sprint Progress
  const sprintPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // AI insights telemetry parser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realInsights: Array<{ title: string; desc: string; icon: React.ComponentType<any>; color: string; bg: string }> = [];
  
  if (displayStats.length > 0) {
    const topContributor = displayStats.reduce((max, s) => s.pct > max.pct ? s : max, displayStats[0]);
    if (topContributor.pct > 25) {
      realInsights.push({
        title: "High Performer",
        desc: `${topContributor.name} is leading with ${topContributor.pct}% Contribution. Outstanding speed!`,
        icon: Sparkles,
        color: "text-[#F2C1A3]",
        bg: "bg-[#F2C1A3]/5"
      });
    }
  }

  collaborators.forEach(c => {
    const pendingTasks = tasks.filter(t => t.status !== "completed" && t.assigneeId === c.id);
    const totalEstHours = pendingTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    if (totalEstHours > 20) {
      realInsights.push({
        title: "Burnout Risk",
        desc: `${c.fullName.split(" ")[0]} has ${pendingTasks.length} pending tasks (${totalEstHours}h estimated). Suggest lighter load.`,
        icon: Clock,
        color: "text-[#CD9FA0]",
        bg: "bg-[#CD9FA0]/5"
      });
    }
  });

  if (displayStats.length >= 2) {
    const lowContributor = displayStats.reduce((min, s) => s.pct < min.pct ? s : min, displayStats[0]);
    if (lowContributor.pct < 12) {
      realInsights.push({
        title: "Imbalance Detected",
        desc: `${lowContributor.name}'s contribution is at ${lowContributor.pct}%. Consider redistributing tasks.`,
        icon: AlertTriangle,
        color: "text-[#F8CCAA]",
        bg: "bg-[#F8CCAA]/5"
      });
    }
  }

  if (realInsights.length === 0) {
    realInsights.push({
      title: "Workload Balanced",
      desc: "Team tasks and milestones are currently balanced. Keep up the great pace!",
      icon: Sparkles,
      color: "text-[#F2C1A3]",
      bg: "bg-[#F2C1A3]/5"
    });
  }

  return (
    <div className="h-screen bg-[#0e0f17] text-white flex flex-col font-sans select-none overflow-hidden antialiased">
      
      {/* Dynamic Background Ambient Glowing Elements */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[450px] w-[450px] rounded-full bg-[#CD9FA0] opacity-[0.02] blur-[130px] pointer-events-none" />

      {/* Main SaaS Responsive Flex Row Layout */}
      <div className="flex flex-1 relative h-full overflow-hidden">
        
        {/* ========================================================= */}
        {/* DESKTOP SIDEBAR PANEL (Left Layout - Extended Full Height)*/}
        {/* ========================================================= */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#111221] border-r border-white/5 p-6 shrink-0 sticky top-0 h-screen z-30 overflow-hidden">
          
          {/* Top Fixed Header: Brand & Workspace Switcher */}
          <div className="flex flex-col gap-6 shrink-0">
            {/* SaaS branding row */}
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-horizontal.svg" alt="ContriTrack Logo" width={180} height={28} className="h-7 w-auto" />
            </div>

            {/* Premium Workspace Selector Switcher */}
            <div className="relative">
              {loadingWorkspaces ? (
                <div className="w-full h-10 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse flex items-center justify-between min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#CD9FA0]/10 animate-pulse" />
                    <div className="w-16 h-3 rounded bg-white/5 animate-pulse" />
                  </div>
                  <ChevronDown size={12} className="text-[#857C91]/30" />
                </div>
              ) : dbWorkspaces.length === 0 ? (
                <button 
                  onClick={() => setIsCreateWorkspaceModalOpen(true)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#CD9FA0]/5 border border-[#CD9FA0]/15 hover:border-[#F2C1A3]/30 text-left text-xs font-mono font-medium text-[#F2C1A3] flex items-center justify-between cursor-pointer transition-all duration-300 shadow-[0_0_15px_rgba(242,193,163,0.02)] hover:shadow-[0_0_20px_rgba(242,193,163,0.08)] group"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={14} className="text-[#F2C1A3] group-hover:rotate-90 transition-transform duration-300" />
                    <span>Create Workspace</span>
                  </div>
                </button>
              ) : (
                <button 
                  onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 text-left text-xs font-light text-white flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#CD9FA0]/25 text-[#CD9FA0] flex items-center justify-center text-[10px] font-mono font-bold">
                      {(currentWorkspace || "WS").substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{currentWorkspace}</span>
                  </div>
                  <ChevronDown size={12} className={`text-[#857C91] transition-transform duration-300 ${isWorkspaceDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              )}

              <AnimatePresence>
                {isWorkspaceDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 right-0 mt-2 p-2 rounded-2xl bg-[#141525] border border-white/10 shadow-2xl z-45 flex flex-col gap-1"
                  >
                    {dbWorkspaces.map((ws) => (
                      <button 
                        key={ws.id}
                        onClick={() => {
                          setCurrentWorkspaceId(ws.id);
                          setCurrentWorkspace(ws.name);
                          setIsWorkspaceDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-light transition hover:bg-white/[0.04] cursor-pointer flex items-center justify-between ${currentWorkspaceId === ws.id ? "text-[#F2C1A3] font-medium" : "text-[#857C91]"}`}
                      >
                        {ws.name}
                        {currentWorkspaceId === ws.id && <Check size={12} />}
                      </button>
                    ))}
                    <div className="h-[1px] w-full bg-white/5 my-1" />
                    
                    {showWorkspaceInput ? (
                      <div className="p-1 flex flex-col gap-1.5">
                        <input 
                          type="text" 
                          placeholder="Workspace title" 
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3]"
                        />
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setShowWorkspaceInput(false)} className="px-2 py-1 rounded bg-white/5 text-[10px]">Cancel</button>
                          <button 
                            onClick={async () => {
                              if (newWorkspaceName.trim() && user?.uid) {
                                const res = await createWorkspace(newWorkspaceName.trim(), user.uid);
                                if (res.success && res.workspace) {
                                  const fresh = await fetchUserWorkspaces(user.uid);
                                  if (fresh.success && fresh.workspaces) {
                                    setDbWorkspaces(fresh.workspaces);
                                  }
                                  setCurrentWorkspaceId(res.workspace.id);
                                  setCurrentWorkspace(res.workspace.name);
                                  setNewWorkspaceName("");
                                  setShowWorkspaceInput(false);
                                  setIsWorkspaceDropdownOpen(false);
                                }
                              }
                            }} 
                            className="px-2 py-1 rounded bg-[#F2C1A3] text-[#12131e] text-[10px] font-bold cursor-pointer"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowWorkspaceInput(true)}
                        className="w-full px-3 py-2 rounded-xl text-left text-xs font-mono text-[#F2C1A3] hover:bg-white/[0.02] cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus size={12} /> New Workspace
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center Middle: Independently Scrollable Navigation List */}
          <nav className="flex-1 my-4 py-2 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "tasks", label: "Tasks", icon: Check },
              { id: "github", label: "GitHub Projects", icon: Github },
              { id: "analytics", label: "Analytics", icon: TrendingUp },
              { id: "meetings", label: "Meetings", icon: Calendar },
              { id: "reports", label: "Reports", icon: FileText },
              { id: "team", label: "Team", icon: Users },
              { id: "ai-insights", label: "AI Insights", icon: Sparkles },
              { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "logout", label: "Sign Out", icon: LogOut }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "logout") {
                      setShowSignOutConfirmModal(true);
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-light transition-all duration-300 cursor-pointer group ${
                    isActive 
                      ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] font-medium shadow-[0_0_15px_rgba(242,193,163,0.03)]" 
                      : item.id === "logout"
                        ? "text-[#CD9FA0] hover:text-white hover:bg-red-500/5 border border-transparent"
                        : "text-[#857C91] hover:text-white hover:bg-white/[0.02] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={14} className={isActive ? "text-[#F2C1A3]" : item.id === "logout" ? "text-[#CD9FA0] group-hover:text-white transition" : "text-[#857C91] group-hover:text-white transition"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#CD9FA0]/35 text-[#CD9FA0] text-[9px] font-bold font-mono">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Bottom Fixed Footer Layout */}
          <div className="shrink-0 border-t border-white/5 pt-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[#F2C1A3]/5 blur-xl pointer-events-none" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#F2C1A3] block mb-1">
                Student Account
              </span>
              <p className="text-white text-xs font-serif font-light mb-3">Fully Loaded Free Tier</p>
              <button 
                onClick={() => setIsContactOpen(true)}
                className="w-full py-2.5 rounded-xl bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[10px] text-[#F2C1A3] hover:bg-[#F2C1A3]/20 transition cursor-pointer flex items-center justify-center gap-1.5 font-semibold shadow-[0_0_10px_rgba(242,193,163,0.05)]"
              >
                <Phone size={10} />
                <span>Student Support</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE MENU NAV DRAWER OVERLAY */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#0e0f17]/95 backdrop-blur-md lg:hidden flex flex-col p-6 justify-between text-left"
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-horizontal.svg" alt="ContriTrack Logo" width={180} height={28} className="h-7 w-auto" />
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 rounded-full bg-white/5 border border-white/5 text-white"
                    title="Close navigation menu"
                    aria-label="Close navigation menu"
                  >
                    <X size={16} />
                  </button>
                </div>

                <nav className="flex flex-col gap-2">
                  {[
                    { id: "overview", label: "Overview", icon: Activity },
                    { id: "tasks", label: "Tasks", icon: Check },
                    { id: "github", label: "GitHub Projects", icon: Github },
                    { id: "analytics", label: "Analytics", icon: TrendingUp },
                    { id: "meetings", label: "Meetings", icon: Calendar },
                    { id: "reports", label: "Reports", icon: FileText },
                    { id: "team", label: "Team", icon: Users },
                    { id: "ai-insights", label: "AI Insights", icon: Sparkles },
                    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
                    { id: "settings", label: "Settings", icon: Settings },
                    { id: "logout", label: "Sign Out", icon: LogOut }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === "logout") {
                            setShowSignOutConfirmModal(true);
                          } else {
                            setActiveTab(item.id);
                          }
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-sm font-light transition ${
                          isActive 
                            ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] font-medium" 
                            : item.id === "logout"
                              ? "text-[#CD9FA0] hover:bg-red-500/5 hover:text-white"
                              : "text-[#857C91] hover:text-white hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className={item.id === "logout" ? "text-[#CD9FA0]" : ""} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && item.badge > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#CD9FA0]/35 text-[#CD9FA0] text-[10px] font-bold font-mono">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* CORE WORKSPACE CONTENT PANEL (Right Layout)               */}
        {/* ========================================================= */}
        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          
          {/* Dashboard Header Bar row */}
          <header className="sticky top-0 bg-[#0e0f17]/60 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-8 flex items-center justify-between z-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/5 text-white"
                title="Open navigation menu"
                aria-label="Open navigation menu"
              >
                <Menu size={16} />
              </button>
              
              <div className="flex flex-col items-start leading-tight">
                <button 
                  suppressHydrationWarning
                  onClick={() => setActiveTab("settings")}
                  className="text-white text-base md:text-lg font-serif font-light flex items-center gap-2 hover:text-[#F8CCAA] transition focus:outline-none cursor-pointer"
                  title="Edit your workspace profile"
                >
                  {getGreeting()}, {userName.split(" ")[0]} 👋
                </button>
                <span className="text-[#857C91] text-[10px] md:text-xs font-light">Here&apos;s what&apos;s happening with your team today.</span>
              </div>
            </div>

            {/* Center Header search inputs and profiles */}
            <div className="flex items-center gap-4">
              
              {/* Dynamic Quick Buttons */}
              <div className="hidden md:flex items-center gap-2.5">
                <button 
                  onClick={() => setShowAddTaskModal(true)}
                  className="px-4 py-2 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold tracking-wide transition duration-300 flex items-center gap-1.5 shadow-[0_0_15px_rgba(242,193,163,0.15)] cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.5} /> New Task
                </button>
                <button 
                  onClick={() => setActiveTab("team")}
                  className="px-4 py-2 rounded-full bg-white/[0.02] border border-white/10 hover:border-white/20 text-white text-xs font-light tracking-wide transition duration-300 flex items-center gap-1.5 cursor-pointer"
                >
                  Invite
                </button>
                <button 
                  onClick={() => setActiveTab("notifications")}
                  className="relative p-2.5 rounded-full bg-white/[0.02] border border-white/10 hover:border-white/20 text-[#857C91] hover:text-white transition duration-300 flex items-center justify-center cursor-pointer focus:outline-none"
                  title="View Notifications"
                >
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold font-mono flex items-center justify-center animate-pulse shadow-md">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Header profile details widget */}
              <button 
                onClick={() => setActiveTab("settings")}
                className="flex items-center gap-3 border-l border-white/5 pl-4 text-left hover:bg-white/[0.03] p-1 rounded-2xl cursor-pointer transition focus:outline-none"
                title="View settings"
              >
                <div className="relative">
                  {dbProfile?.avatarUrl && !dbProfile.avatarUrl.includes("dicebear") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      src={dbProfile.avatarUrl} 
                      className="w-8 h-8 rounded-full object-cover border border-[#F2C1A3]/30" 
                      alt={userName} 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1b2e] to-[#0e0f17] border border-[#F2C1A3]/30 flex items-center justify-center text-xs text-[#F2C1A3] font-serif font-semibold">
                      {userName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {/* Glowing online status indicator badge */}
                  <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0e0f17]" />
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none gap-1">
                  <span className="text-xs text-white font-medium hover:text-[#F8CCAA] transition">{userName}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-[1px] rounded-full bg-[#F2C1A3]/[0.08] border border-[#F2C1A3]/20 text-[7px] font-medium text-[#F2C1A3] tracking-wide">
                      {userRole}
                    </span>
                    {userClassification && userClassification !== userRole && userClassification !== "Student" && (
                      <span className="inline-flex items-center px-1.5 py-[1px] rounded-full bg-[#CD9FA0]/[0.08] border border-[#CD9FA0]/20 text-[7px] font-medium text-[#CD9FA0] tracking-wide">
                        {userClassification}
                      </span>
                    )}
                  </div>
                </div>
              </button>

            </div>
          </header>

          {/* ========================================================= */}
          {/* SWITCHABLE PANELS RENDERING CONTAINER                     */}
          {/* ========================================================= */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {/* 1. OVERVIEW VIEW */}
                {activeTab === "overview" && (
                  <AnimatePresence mode="wait">
                    {loadingWorkspaces || loadingTasks ? (
                      <motion.div
                        key="dashboard-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <DashboardSkeleton />
                      </motion.div>
                    ) : dbWorkspaces.length === 0 ? (
                      <motion.div
                        key="empty-state"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="w-full h-full flex flex-col justify-center items-center"
                      >
                        <EmptyWorkspaceState onCreateClick={() => setIsCreateWorkspaceModalOpen(true)} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="dashboard-overview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <DashboardOverview
                          cards={cards}
                          displayStats={displayStats}
                          realHeatmapData={realHeatmapData}
                          tasks={tasks}
                          completedTasksCount={completedTasksCount}
                          totalTasksCount={totalTasksCount}
                          sprintPct={sprintPct}
                          gitCommits={gitCommits}
                          gitPRs={gitPRs}
                          gitIssues={gitIssues}
                          gitSyncPct={gitSyncPct}
                          strokeDashoffset={strokeDashoffset}
                          realInsights={realInsights}
                          notifications={notifications}
                          setActiveTab={setActiveTab}
                          githubConnected={githubConnected}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}



                {/* 3. TASKS PANEL KANBAN BOARD */}
                {activeTab === "tasks" && (
                  <div className="flex flex-col gap-6 text-left">
                    
                    {/* Live Collaborative Analytics Header Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111221]/50 border border-white/5 p-4 rounded-3xl backdrop-blur-md">
                      <div className="flex flex-col gap-1 p-2">
                        <span className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Board Task Completion</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-white text-xl font-semibold">
                            {tasks.length > 0
                              ? Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100)
                              : 0}%
                          </span>
                          <span className="text-[#857C91] text-[10px]">
                            ({tasks.filter((t) => t.status === "completed").length}/{tasks.length})
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-2">
                        <span className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Active Workload</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-white text-xl font-semibold">
                            {tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}
                          </span>
                          <span className="text-[#857C91] text-[10px]">estimated hours</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-2">
                        <span className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Due-Date Overdue Dials</span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-semibold ${
                            tasks.filter((t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length > 0
                              ? "text-red-400 animate-pulse"
                              : "text-white"
                          }`}>
                            {tasks.filter((t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length}
                          </span>
                          <span className="text-[#857C91] text-[10px]">tasks backlog</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-2">
                        <span className="text-[#857C91] text-[9px] uppercase font-mono tracking-wider">Total Telemetry Index</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[#F2C1A3] text-xl font-semibold">
                            {tasks.reduce((sum, t) => sum + (t.telemetry?.[0]?.contributionScore || 0), 0).toFixed(1)}
                          </span>
                          <span className="text-[#857C91] text-[10px]">points synced</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Tasks Database</span>
                        <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">Interactive Kanban Board</h2>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={loadWorkspaceData}
                          disabled={loadingTasks}
                          className="p-2.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-[#857C91] hover:text-white transition cursor-pointer disabled:opacity-50"
                          title="Refresh tasks"
                        >
                          <RefreshCw size={14} className={loadingTasks ? "animate-spin" : ""} />
                        </button>

                        <button 
                          onClick={() => setShowAddTaskModal(true)}
                          className="px-5 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold tracking-wide transition flex items-center gap-1.5 shadow-lg cursor-pointer"
                        >
                          <Plus size={14} strokeWidth={2.5} /> Add Task Card
                        </button>
                      </div>
                    </div>

                    {loadingTasks && tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center gap-3 mt-6 border border-white/5 rounded-3xl bg-[#111221]/20">
                        <Loader2 size={32} className="animate-spin text-[#F2C1A3]" />
                        <span className="text-[#857C91] text-xs font-light font-mono">Querying Supabase collaborative database...</span>
                      </div>
                    ) : (
                      /* Draggable Kanban columns layout with generous min-width and horizontal scroll */
                      <div className="flex gap-4 mt-6 overflow-x-auto pb-4 items-start scrollbar-thin scrollbar-thumb-white/10">
                        
                        {[
                          { key: "backlog", label: "Backlog", color: "bg-[#857C91]" },
                          { key: "todo", label: "Todo", color: "bg-[#CD9FA0]" },
                          { key: "in_progress", label: "In Progress", color: "bg-[#F2C1A3]" },
                          { key: "review", label: "Review", color: "bg-amber-400" },
                          { key: "completed", label: "Completed", color: "bg-emerald-400" },
                        ].map((column) => {
                          const colTasks = tasks.filter((t) => t.status === column.key);
                          return (
                            <div 
                              key={column.key}
                              className="p-4 rounded-3xl bg-[#111221]/60 border border-white/5 flex flex-col gap-4 min-h-[480px] flex-1 min-w-[280px] max-w-[340px]"
                            >
                              
                              {/* Column Header */}
                              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <span className="text-white text-xs font-semibold flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${column.color}`} />
                                  {column.label}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[9px] font-mono font-bold">
                                  {colTasks.length}
                                </span>
                              </div>

                              {/* Task Cards list */}
                              <div className="flex flex-col gap-3 flex-1">
                                {colTasks.map((task) => {
                                  const isOverdue = task.status !== "completed" && task.dueDate && new Date(task.dueDate) < new Date();
                                  return (
                                    <motion.div 
                                      layout
                                      key={task.id}
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowTaskDetailDrawer(true);
                                      }}
                                      className={`p-3.5 rounded-2xl bg-[#141523]/80 border transition duration-300 flex flex-col gap-3 group text-left relative cursor-pointer ${
                                        isOverdue 
                                          ? "border-red-500/20 hover:border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.05)]" 
                                          : "border-white/5 hover:border-[#F2C1A3]/25"
                                      }`}
                                    >
                                      {/* Delete Card Button */}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTask(task.id);
                                        }}
                                        className="absolute top-3.5 right-3.5 p-1 rounded bg-white/5 border border-white/5 text-[#857C91] hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                        title="Delete task card"
                                      >
                                        <Trash2 size={10} />
                                      </button>

                                      <div className="flex flex-col gap-1.5 pr-6">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                            {task.labels ? task.labels.split(",")[0] : "Task"}
                                          </span>
                                          {task.repository && (
                                            <span className="text-[8px] font-mono text-[#F2C1A3]/75 bg-[#F2C1A3]/5 px-1.5 py-0.5 rounded border border-[#F2C1A3]/10 truncate max-w-[130px]">
                                              {task.repository.name}
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="text-white text-xs font-semibold leading-snug group-hover:text-[#F8CCAA] transition break-words">{task.title}</h4>
                                      </div>

                                      {/* Meta Row: Assignee + Priority Badge */}
                                      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2.5 mt-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <div className="w-5 h-5 rounded-full bg-[#CD9FA0]/25 text-[#CD9FA0] border border-white/10 flex items-center justify-center text-[7px] font-bold font-mono shrink-0" title={task.assignee?.fullName || "Unassigned"}>
                                            {(task.assignee?.fullName || "UN").substring(0, 2).toUpperCase()}
                                          </div>
                                          <span className="text-[#857C91] text-[10px] font-light truncate max-w-[110px]">
                                            {task.assignee?.fullName || "Unassigned"}
                                          </span>
                                        </div>
                                        
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold capitalize tracking-wide whitespace-nowrap ${
                                          task.priority === "urgent" 
                                            ? "bg-red-500/15 text-red-300 border border-red-500/30" 
                                            : task.priority === "high"
                                            ? "bg-[#F2C1A3]/15 text-[#F2C1A3] border border-[#F2C1A3]/30"
                                            : task.priority === "medium"
                                            ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                                            : "bg-[#857C91]/15 text-[#857C91] border border-[#857C91]/20"
                                        }`}>
                                          {task.priority}
                                        </span>
                                      </div>

                                      {/* Column Shifters Controls */}
                                      <div className="flex items-center justify-between gap-1 border-t border-white/5 pt-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1 min-w-0">
                                          {(task.telemetry?.[0]?.contributionScore ?? 0) > 0 && (
                                            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 truncate" title="Synced telemetry contribution score">
                                              Score: {task.telemetry?.[0]?.contributionScore}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {column.key !== "backlog" && (
                                            <button 
                                              onClick={() => {
                                                const statuses = ["backlog", "todo", "in_progress", "review", "completed"];
                                                const prevIdx = statuses.indexOf(column.key) - 1;
                                                handleMoveTask(task.id, statuses[prevIdx]);
                                              }}
                                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] text-white/70 hover:text-[#F2C1A3] transition cursor-pointer"
                                              title="Shift left"
                                            >
                                              ←
                                            </button>
                                          )}
                                          {column.key !== "completed" && (
                                            <button 
                                              onClick={() => {
                                                const statuses = ["backlog", "todo", "in_progress", "review", "completed"];
                                                const nextIdx = statuses.indexOf(column.key) + 1;
                                                handleMoveTask(task.id, statuses[nextIdx]);
                                              }}
                                              className="px-2 py-1 rounded bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] text-[9px] font-semibold hover:bg-[#F2C1A3]/25 transition cursor-pointer"
                                              title="Shift right"
                                            >
                                              →
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                    </motion.div>
                                  );
                                })}

                                {colTasks.length === 0 && (
                                  <div className="flex-1 rounded-2xl border border-dashed border-white/5 flex items-center justify-center p-6 text-center">
                                    <span className="text-[#857C91] text-[10px] font-light">No tasks in column</span>
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })}

                      </div>
                    )}
                  </div>
                )}

                {/* 4. GITHUB ANALYTICS PANEL VIEW */}
                {activeTab === "github" && (
                  <div className="flex flex-col gap-6 text-left max-w-4xl w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Indisputable Telemetry</span>
                        <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">GitHub Projects</h2>
                      </div>
                      
                      {githubConnected && (
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => setShowDisconnectConfirmModal(true)}
                            className="px-4 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 text-xs font-medium tracking-wide transition flex items-center gap-1.5 cursor-pointer focus:outline-none"
                            title="Disconnect GitHub OAuth connection and delete all bridged metadata"
                          >
                            <Trash2 size={13} /> Revoke GitHub
                          </button>
                          <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-5 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold tracking-wide transition flex items-center gap-1.5 shadow-lg cursor-pointer focus:outline-none"
                          >
                            <Plus size={14} strokeWidth={2.5} /> Bridge New Repository
                          </button>
                        </div>
                      )}
                    </div>

                    {!githubConnected ? (
                      <div className="p-8 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col items-center justify-center text-center gap-6 mt-4 max-w-xl self-center">
                        <div className="p-4 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]">
                          <Github size={36} />
                        </div>
                        <div className="flex flex-col gap-2">
                          <h3 className="text-lg font-semibold text-white font-serif">Connect GitHub Workspace</h3>
                          <p className="text-xs text-[#857C91] leading-relaxed max-w-sm">
                            Unlock automatic, secure commit auditing, active peer parity evaluations, and mathematical fairness analytics by bridging your GitHub repository profile.
                          </p>
                        </div>
                        <button 
                          onClick={handleConnectGitHub}
                          className="px-6 py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold tracking-wide transition shadow-lg cursor-pointer"
                        >
                          Bridge GitHub Account
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <GitHubWaveTracker
                          repositories={linkedRepositories}
                          userId={user?.uid || ""}
                          onSyncCompleted={loadLinkedRepos}
                          onSelectRepo={(repo) => {
                            setSelectedRepoForDrawer(repo);
                            setIsDrawerOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 5. TEAM ANALYTICS PANEL VIEW */}
                {activeTab === "analytics" && (() => {
                  if (loadingAnalytics) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 w-full h-full max-w-4xl mx-auto">
                        <Loader2 className="w-8 h-8 text-[#F2C1A3] animate-spin mx-auto opacity-80" />
                        <h2 className="text-xl font-serif text-white tracking-wide">Compiling Telemetry Matrix</h2>
                        <p className="text-xs font-mono text-[#857C91] max-w-md mx-auto">
                          Synchronizing with GitHub events, computing Jain&apos;s Fairness Index, and processing workspace velocity...
                        </p>
                      </div>
                    );
                  }

                  if (!analyticsData || (analyticsData.totalCommits === 0 && analyticsData.activeContributors === 0)) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 w-full h-full max-w-4xl mx-auto border border-white/5 rounded-3xl bg-[#141523]/30">
                        <TrendingUp className="w-10 h-10 text-white/20 mx-auto" strokeWidth={1} />
                        <h2 className="text-xl font-serif text-white tracking-wide">Awaiting Team Telemetry</h2>
                        <p className="text-xs font-mono text-[#857C91] max-w-md mx-auto leading-relaxed">
                          There is no active contribution data to display. Please link a repository and ensure your workspace has active tasks and commits to generate dynamic parity insights.
                        </p>
                        <button
                          onClick={handleSyncWorkspaceAnalytics}
                          disabled={syncingAnalytics}
                          className="mt-4 px-6 py-2.5 rounded-full bg-white/5 border border-white/5 text-xs text-white hover:text-[#F2C1A3] hover:border-[#F2C1A3]/20 hover:bg-white/[0.08] transition flex items-center gap-2 cursor-pointer"
                        >
                          <RefreshCw size={13} className={syncingAnalytics ? "animate-spin text-[#F2C1A3]" : ""} />
                          {syncingAnalytics ? "Syncing GitHub..." : "Sync Live Workspace Telemetry"}
                        </button>
                      </div>
                    );
                  }

                  const data = analyticsData;
                  const colors = ["#F2C1A3", "#F8CCAA", "#CD9FA0", "#857C91"];

                  return (
                    <div className="flex flex-col gap-6 text-left max-w-4xl w-full">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Real-Time Team Intelligence</span>
                          <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">Collaborative Wave Parity</h2>
                        </div>
                        
                        {/* Live Telemetry Synchronizer Button */}
                        <button
                          disabled={syncingAnalytics || loadingAnalytics}
                          onClick={handleSyncWorkspaceAnalytics}
                          className="px-5 py-2.5 rounded-full bg-white/5 border border-white/5 text-xs text-white hover:text-[#F2C1A3] hover:border-[#F2C1A3]/20 hover:bg-white/[0.08] transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
                        >
                          <RefreshCw size={13} className={(syncingAnalytics || loadingAnalytics) ? "animate-spin text-[#F2C1A3]" : ""} />
                          {syncingAnalytics ? "Syncing GitHub..." : "Sync Live Workspace Telemetry"}
                        </button>
                      </div>

                      {/* Filter Controls Bar */}
                      <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/30 flex flex-wrap gap-4 items-center">
                        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                          <label htmlFor="repo-filter-select" className="text-[#857C91] text-[8px] uppercase font-mono">Active Repository</label>
                          <select
                            id="repo-filter-select"
                            title="Active Repository"
                            value={analyticsFilterRepo}
                            onChange={(e) => setAnalyticsFilterRepo(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#F2C1A3]"
                          >
                            <option value="all">All Repositories</option>
                            {repositories.map((r: Repository) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                          <label htmlFor="member-filter-select" className="text-[#857C91] text-[8px] uppercase font-mono">Team Member</label>
                          <select
                            id="member-filter-select"
                            title="Team Member"
                            value={analyticsFilterMember}
                            onChange={(e) => setAnalyticsFilterMember(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#F2C1A3]"
                          >
                            <option value="all">All Members</option>
                            {collaborators.map((c: Collaborator) => (
                              <option key={c.id} value={c.id}>{c.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                          <label htmlFor="date-filter-select" className="text-[#857C91] text-[8px] uppercase font-mono">Telemetry Window</label>
                          <select
                            id="date-filter-select"
                            title="Telemetry Window"
                            value={analyticsFilterDate}
                            onChange={(e) => setAnalyticsFilterDate(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#F2C1A3]"
                          >
                            <option value="all">All Time</option>
                            <option value="7d">Past 7 Days</option>
                            <option value="30d">Past 30 Days</option>
                          </select>
                        </div>
                      </div>

                      {/* Grid of Key Statistics Dials */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between h-24">
                          <span className="text-[#857C91] text-[9px] font-mono uppercase">Audited Commits</span>
                          <span className="text-2xl font-serif text-white font-light">{data.totalCommits}</span>
                          <span className="text-[8px] text-emerald-400 font-mono">100% PERSISTENT WAVE</span>
                        </div>

                        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between h-24">
                          <span className="text-[#857C91] text-[9px] font-mono uppercase">Contributors</span>
                          <span className="text-2xl font-serif text-white font-light">{data.activeContributors}</span>
                          <span className="text-[8px] text-[#F2C1A3] font-mono">ACTIVE INDISPUTABLE PEERS</span>
                        </div>

                        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between h-24">
                          <span className="text-[#857C91] text-[9px] font-mono uppercase">Sprint Completion</span>
                          <span className="text-2xl font-serif text-[#F2C1A3] font-light">{data.sprintCompletionPct}%</span>
                          <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                            <div
                              className="bg-[#F2C1A3] h-full rounded"
                              style={{ width: `${data.sprintCompletionPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between h-24">
                          <span className="text-[#857C91] text-[9px] font-mono uppercase">Parity Index</span>
                          <span className={`text-2xl font-serif font-light ${data.fairnessScore >= 80 ? "text-emerald-400" : "text-[#F2C1A3]"}`}>
                            {data.fairnessScore}%
                          </span>
                          <span className="text-[8px] text-[#857C91] font-mono uppercase">JAIN&apos;S FAIRNESS COEFFICIENT</span>
                        </div>
                      </div>

                      {/* AI-Powered Peer Parity Insights Panel */}
                      <div className="p-5 rounded-3xl border border-white/5 bg-gradient-to-r from-[#141523]/80 to-transparent flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F2C1A3] animate-pulse" />
                          <span className="text-[10px] uppercase tracking-widest text-[#F2C1A3] font-mono">AI Parity Assessor Insights</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#857C91] leading-relaxed">
                          {data.insights.map((insight: string, idx: number) => (
                            <div key={idx} className="flex gap-2 items-start bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                              <span className="text-[#F2C1A3] font-mono">0{idx + 1}.</span>
                              <span>{insight}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 10 Advanced Charts Dashboard Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">

                          {/* Chart 1: Sprint Velocity Area Graph (8 cols) */}
                          <div className="md:col-span-8 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">Sprint Velocity & Code Additions</span>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={data.contributorStats}>
                                <defs>
                                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F2C1A3" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#F2C1A3" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="fullName" stroke="#857C91" fontSize={8} />
                                <YAxis stroke="#857C91" fontSize={8} />
                                <Tooltip contentStyle={{ backgroundColor: "#111221", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} labelStyle={{ color: "white" }} />
                                <Area type="monotone" dataKey="contributionScore" name="Contribution Impact" stroke="#F2C1A3" fillOpacity={1} fill="url(#colorScore)" />
                                <Area type="monotone" dataKey="linesAdded" name="LOC Volume" stroke="#CD9FA0" fillOpacity={0} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Chart 2: Contribution Fairness Donut Chart (4 cols) */}
                        <div className="md:col-span-4 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">Git Share Donut</span>
                          <div className="h-56 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data.contributorStats}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={5}
                                  dataKey="commits"
                                  nameKey="fullName"
                                >
                                  {data.contributorStats.map((entry: ContributorStat, index: number) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#111221", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute flex flex-col items-center justify-center">
                              <span className="text-xl font-serif text-white font-light">{data.totalCommits}</span>
                              <span className="text-[7px] text-[#857C91] font-mono uppercase">Commits</span>
                            </div>
                          </div>
                        </div>

                        {/* Chart 3: Commit Frequency Timeline (6 cols) */}
                        <div className="md:col-span-6 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">Past 7 Days Commit Waves</span>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={data.commitTimeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="#857C91" fontSize={8} />
                                <YAxis stroke="#857C91" fontSize={8} />
                                <Tooltip contentStyle={{ backgroundColor: "#111221", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                                <Line type="monotone" dataKey="commits" stroke="#F8CCAA" strokeWidth={2} dot={{ fill: "#F2C1A3" }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Chart 4: Team Workload Radar Chart (6 cols) */}
                        <div className="md:col-span-6 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">Peer Contribution Radar</span>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.contributorStats}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis dataKey="fullName" stroke="#857C91" fontSize={8} />
                                <PolarRadiusAxis stroke="rgba(255,255,255,0.1)" />
                                <Radar name="Commit Impact" dataKey="commits" stroke="#F2C1A3" fill="#F2C1A3" fillOpacity={0.2} />
                                <Radar name="PR Wave" dataKey="pullRequests" stroke="#CD9FA0" fill="#CD9FA0" fillOpacity={0.2} />
                                <Legend wrapperStyle={{ fontSize: "8px" }} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Chart 5: PR Merge Efficiency & Issues Chart (6 cols) */}
                        <div className="md:col-span-6 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">PR & Issue Parity Balance</span>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.contributorStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="fullName" stroke="#857C91" fontSize={8} />
                                <YAxis stroke="#857C91" fontSize={8} />
                                <Tooltip contentStyle={{ backgroundColor: "#111221", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                                <Bar dataKey="pullRequests" name="Pull Requests" fill="#F2C1A3" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="issuesClosed" name="Issues Closed" fill="#CD9FA0" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="tasks" name="Active Tasks" fill="#F8CCAA" radius={[4, 4, 0, 0]} />
                                <Legend wrapperStyle={{ fontSize: "8px" }} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Chart 6: Meeting speaking/participation time chart (6 cols) */}
                        <div className="md:col-span-6 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">Scheduler speaking participation</span>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.meetingInsights && data.meetingInsights.length > 0 ? data.meetingInsights : [{ name: "No meetings", attendance: 0, speaking: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="#857C91" fontSize={8} />
                                <YAxis stroke="#857C91" fontSize={8} />
                                <Tooltip contentStyle={{ backgroundColor: "#111221", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                                <Bar dataKey="speaking" name="Speaking Share (%)" fill="#F8CCAA" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="attendance" name="Attendance Score (%)" fill="#857C91" radius={[4, 4, 0, 0]} />
                                <Legend wrapperStyle={{ fontSize: "8px" }} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Leaderboard Scorecard (12 cols) */}
                        <div className="md:col-span-12 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                          <span className="text-xs text-white font-serif font-light">Collaborator Leaderboard & Contribution Impact</span>
                          
                          <div className="flex flex-col gap-2.5">
                            {data.contributorStats.map((c: ContributorStat, i: number) => (
                              <div
                                key={c.id || i}
                                className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between gap-4 hover:bg-[#141523]/60 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/30 text-[#F2C1A3] flex items-center justify-center font-mono text-xs font-bold">
                                    {i + 1}
                                  </div>
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs text-white font-medium">{c.fullName}</span>
                                    <span className="text-[9px] text-[#857C91] font-mono">@{c.githubUsername}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6">
                                  <div className="flex flex-col items-end font-mono">
                                    <span className="text-[9px] text-[#857C91] uppercase">Commits</span>
                                    <span className="text-xs text-white">{c.commits}</span>
                                  </div>

                                  <div className="flex flex-col items-end font-mono">
                                    <span className="text-[9px] text-[#857C91] uppercase">PRs</span>
                                    <span className="text-xs text-white">{c.pullRequests}</span>
                                  </div>

                                  <div className="flex flex-col items-end font-mono">
                                    <span className="text-[9px] text-[#857C91] uppercase">LOC Changed</span>
                                    <span className="text-xs text-emerald-400">+{c.linesAdded} / -{c.linesDeleted}</span>
                                  </div>

                                  <div className="flex flex-col items-end font-mono">
                                    <span className="text-[9px] text-[#857C91] uppercase">Impact Score</span>
                                    <span className="text-xs text-[#F2C1A3] font-bold">{c.contributionScore}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* 6. MEETINGS PANEL VIEW */}
                {activeTab === "meetings" && (
                  <MeetingsPanel 
                    workspaceId={currentWorkspaceId}
                    user={user ? { uid: user.uid, displayName: userName, email: user.email } : null}
                    collaborators={collaborators}
                  />
                )}

                {/* 7. REPORTS PANEL VIEW */}
                {activeTab === "reports" && (
                  <ReportsPanel 
                    workspaceId={currentWorkspaceId}
                    workspaceName={currentWorkspace}
                    user={user}
                    collaborators={collaborators}
                  />
                )}

                {/* 8. TEAM PANEL VIEW */}
                {activeTab === "team" && (
                  <TeamPanel 
                    workspaceId={currentWorkspaceId}
                    workspaceName={currentWorkspace}
                    user={user}
                    onWorkspaceChanged={(id, name) => {
                      setCurrentWorkspaceId(id);
                      setCurrentWorkspace(name);
                    }}
                  />
                )}

                {/* 9. AI INSIGHTS VIEW */}
                {activeTab === "ai-insights" && (
                  <AIInsightsPanel 
                    user={user}
                    workspaceId={currentWorkspaceId}
                  />
                )}

                {/* 10. NOTIFICATIONS HUB PANEL VIEW */}
                {activeTab === "notifications" && (
                  <NotificationsPanel 
                    workspaceId={currentWorkspaceId}
                    user={user}
                  />
                )}

                {activeTab === "settings" && (
                  <SettingsPanel 
                    user={user}
                    onProfileUpdate={loadDbProfile}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </main>
      </div>

      {/* ========================================================= */}
      {/* DIALOGS, MODALS, AND HELPER OVERLAYS                      */}
      {/* ========================================================= */}

      {/* 1. Add Task Popup Dialog - 7 Fields Form */}
      <AnimatePresence>
        {showAddTaskModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-[#141525] border border-white/10 shadow-2xl relative text-left flex flex-col gap-4 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close modal"
                aria-label="Close modal"
              >
                <X size={12} />
              </button>

              <h4 className="text-white text-base font-serif font-light border-b border-white/5 pb-2">Add New Task Card</h4>
              
              <form onSubmit={handleAddTask} className="flex flex-col gap-4 w-full">
                
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-title" className="text-[#857C91] text-[10px] uppercase font-mono">Task Title *</label>
                  <input 
                    id="task-title"
                    type="text" 
                    placeholder="Enter card objective" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    title="Task Title"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-desc" className="text-[#857C91] text-[10px] uppercase font-mono">Description</label>
                  <textarea 
                    id="task-desc"
                    placeholder="Provide details about this task" 
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    title="Task Description"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="task-priority" className="text-[#857C91] text-[10px] uppercase font-mono">Priority</label>
                    <select 
                      id="task-priority"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      title="Task Priority"
                      className="bg-[#12131e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#857C91] focus:border-[#F2C1A3] outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="task-labels" className="text-[#857C91] text-[10px] uppercase font-mono">Labels / Tags</label>
                    <input 
                      id="task-labels"
                      type="text" 
                      placeholder="e.g. Design, Backend" 
                      value={newTaskLabels}
                      onChange={(e) => setNewTaskLabels(e.target.value)}
                      title="Category Labels"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="task-est" className="text-[#857C91] text-[10px] uppercase font-mono">Estimated Hours</label>
                    <input 
                      id="task-est"
                      type="number" 
                      placeholder="0" 
                      value={newTaskEstimatedHours || ""}
                      onChange={(e) => setNewTaskEstimatedHours(parseInt(e.target.value) || 0)}
                      title="Estimated Hours"
                      min="0"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="task-due" className="text-[#857C91] text-[10px] uppercase font-mono">Due Date</label>
                    <input 
                      id="task-due"
                      type="date" 
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      title="Due Date"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-[#857C91] outline-none focus:border-[#F2C1A3] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="task-assignee" className="text-[#857C91] text-[10px] uppercase font-mono">Assignee</label>
                    <select 
                      id="task-assignee"
                      value={newTaskAssigneeId}
                      onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                      title="Task Assignee"
                      className="bg-[#12131e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#857C91] focus:border-[#F2C1A3] outline-none"
                    >
                      <option value="">Unassigned</option>
                      {collaborators.map((c) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="task-repo" className="text-[#857C91] text-[10px] uppercase font-mono">Link GitHub Repository</label>
                    <select 
                      id="task-repo"
                      value={newTaskRepositoryId}
                      onChange={(e) => setNewTaskRepositoryId(e.target.value)}
                      title="Link GitHub Repository"
                      className="bg-[#12131e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#857C91] focus:border-[#F2C1A3] outline-none"
                    >
                      <option value="">No repository link</option>
                      {repositories.map((r) => (
                        <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg mt-2 cursor-pointer">
                  Deploy Task Card
                </button>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand-New Interactive Slide-out Task Details Drawer Overlay */}
      <AnimatePresence>
        {showTaskDetailDrawer && selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTaskDetailDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-[#111221]/95 border-l border-white/10 shadow-2xl backdrop-blur-lg flex flex-col z-10 text-left"
            >
              {/* Header section */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold capitalize ${
                    selectedTask.priority === "urgent" 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                      : selectedTask.priority === "high"
                      ? "bg-[#F2C1A3]/10 text-[#F2C1A3] border border-[#F2C1A3]/20"
                      : "bg-[#857C91]/15 text-[#857C91] border border-[#857C91]/20"
                  }`}>
                    {selectedTask.priority}
                  </span>
                  <span className="text-[10px] font-mono text-[#857C91] uppercase tracking-wide">
                    Task Details
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleSyncTelemetry(selectedTask.id)}
                    disabled={syncingTaskTelemetryId === selectedTask.id}
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-[#857C91] hover:text-white text-[10px] font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={10} className={syncingTaskTelemetryId === selectedTask.id ? "animate-spin text-[#F2C1A3]" : ""} />
                    {syncingTaskTelemetryId === selectedTask.id ? "Syncing..." : "Sync Git telemetry"}
                  </button>

                  <button
                    onClick={() => setShowTaskDetailDrawer(false)}
                    className="p-1.5 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                    title="Close drawer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Main content - Dual columns split */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* 1. Primary Title and Description */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-serif text-white font-normal leading-tight">
                    {selectedTask.title}
                  </h3>
                  <p className="text-xs text-[#857C91] font-light leading-relaxed bg-white/[0.01] p-3.5 rounded-xl border border-white/5">
                    {selectedTask.description || "No description provided."}
                  </p>
                </div>

                {/* 2. Key-Value Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#141523]/50 p-4 rounded-2xl border border-white/5 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-[#857C91] uppercase">Assignee</span>
                    <span className="text-white font-medium">{selectedTask.assignee?.fullName || "Unassigned"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-[#857C91] uppercase">Status</span>
                    <span className="text-[#F2C1A3] font-medium capitalize">{selectedTask.status.replace("_", " ")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-[#857C91] uppercase">Estimate</span>
                    <span className="text-white font-medium">{selectedTask.estimatedHours || 0} Hours</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-[#857C91] uppercase">Due Date</span>
                    <span className="text-white font-medium">
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None"}
                    </span>
                  </div>
                </div>

                {/* 3. Live GitHub Telemetry Widget */}
                <div className="p-4 rounded-2xl border border-[#F2C1A3]/10 bg-[#F2C1A3]/[0.02] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#F2C1A3]/5 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Github size={12} className="text-[#F2C1A3]" />
                      GitHub Parity metrics
                    </div>
                    <span className="text-[8px] font-mono text-[#F2C1A3] uppercase bg-[#F2C1A3]/10 px-1.5 py-0.5 rounded">
                      Live Telemetry
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-black/20 p-2.5 rounded-xl flex flex-col gap-0.5 border border-white/5">
                      <span className="text-[14px] text-white font-mono font-bold">
                        {selectedTask.telemetry?.[0]?.commitCount || 0}
                      </span>
                      <span className="text-[8px] text-[#857C91] uppercase">Commits</span>
                    </div>

                    <div className="bg-black/20 p-2.5 rounded-xl flex flex-col gap-0.5 border border-white/5">
                      <span className="text-[14px] text-white font-mono font-bold">
                        {selectedTask.telemetry?.[0]?.pullRequestCount || 0}
                      </span>
                      <span className="text-[8px] text-[#857C91] uppercase">PR Links</span>
                    </div>

                    <div className="bg-black/20 p-2.5 rounded-xl flex flex-col gap-0.5 border border-white/5">
                      <span className="text-[14px] text-white font-mono font-bold">
                        {selectedTask.telemetry?.[0]?.linesChanged || 0}
                      </span>
                      <span className="text-[8px] text-[#857C91] uppercase">Lines Δ</span>
                    </div>

                    <div className="bg-[#F2C1A3]/5 p-2.5 rounded-xl flex flex-col gap-0.5 border border-[#F2C1A3]/10">
                      <span className="text-[14px] text-[#F2C1A3] font-mono font-bold">
                        {(selectedTask.telemetry?.[0]?.contributionScore || 0).toFixed(1)}
                      </span>
                      <span className="text-[8px] text-[#F2C1A3] uppercase font-semibold">Score</span>
                    </div>
                  </div>

                  {selectedTask.repository && (
                    <div className="text-[9px] text-[#857C91] flex items-center justify-between mt-1 px-1">
                      <span>Linked Repository: <b className="text-white">{selectedTask.repository.owner}/{selectedTask.repository.name}</b></span>
                      <span>Last sync: {selectedTask.telemetry?.[0]?.syncedAt ? new Date(selectedTask.telemetry[0].syncedAt).toLocaleTimeString() : "Never"}</span>
                    </div>
                  )}
                </div>

                {/* 4. Collaborative Comments Thread section */}
                <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-[#F2C1A3]" />
                    Collaborative Feedback ({selectedTask.comments?.length || 0})
                  </h4>

                  {/* Comment list timeline */}
                  <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                      selectedTask.comments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-3 text-xs leading-normal">
                          <div className="w-6 h-6 rounded-full bg-[#CD9FA0]/30 text-[#CD9FA0] border border-white/5 flex items-center justify-center text-[8px] font-mono font-bold shrink-0">
                            {comment.user?.fullName?.substring(0, 2).toUpperCase() || "KN"}
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium">{comment.user?.fullName || "Collaborator"}</span>
                              <span className="text-[#857C91] text-[8px] font-mono">
                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[#857C91] font-light text-[11px] mt-0.5">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#857C91] text-[10px] font-light italic pl-1">No comments posted yet. Start the synchronization!</span>
                    )}
                  </div>

                  {/* Write Comment Box */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Input feedback message..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      title="Write comment feedback"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                    />
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!commentInput.trim() || !user?.uid) return;
                        const res = await addTaskComment(selectedTask.id, user.uid, commentInput);
                        if (res.success && res.comment) {
                          const fullComment = {
                            ...res.comment,
                            user: {
                              id: user.uid,
                              fullName: userName
                            }
                          };
                          const updatedComments = [fullComment, ...(selectedTask.comments || [])];
                          const updatedActivities = [
                            {
                              id: `act_${crypto.randomUUID()}`,
                              actionType: "comment",
                              metadata: `Added comment: "${commentInput.substring(0, 20)}..."`,
                              createdAt: new Date().toISOString(),
                              user: { fullName: userName }
                            },
                            ...(selectedTask.activities || [])
                          ];
                          const updated = {
                            ...selectedTask,
                            comments: updatedComments,
                            activities: updatedActivities
                          } as Task;
                          setSelectedTask(updated);
                          setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t));
                          setCommentInput("");
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition cursor-pointer"
                    >
                      Post
                    </button>
                  </div>
                </div>

                {/* 5. Chronological Audit History */}
                <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <History size={12} className="text-[#F2C1A3]" />
                    Audit Activity Logs
                  </h4>

                  <div className="flex flex-col gap-2.5 max-h-[150px] overflow-y-auto pr-1 text-[10px]">
                    {selectedTask.activities && selectedTask.activities.length > 0 ? (
                      selectedTask.activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-2.5 border-l border-white/5 pl-3 py-1 relative">
                          <span className="absolute -left-[3.5px] top-2.5 w-1.5 h-1.5 rounded-full bg-[#F2C1A3]" />
                          <div className="flex flex-col leading-snug">
                            <span className="text-white/80">{activity.metadata}</span>
                            <span className="text-[#857C91] text-[8px] font-mono mt-0.5">
                              by {activity.user?.fullName || "System"} • {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#857C91] text-[10px] font-light italic pl-1">No activities registered yet.</span>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Institutional Helpline Contacts popup modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      {/* Workspace Creator Modal */}
      <WorkspaceInitializer
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        userId={user?.uid || ""}
        onWorkspaceCreated={async (id, name) => {
          if (user?.uid) {
            const fresh = await fetchUserWorkspaces(user.uid);
            if (fresh.success && fresh.workspaces) {
              setDbWorkspaces(fresh.workspaces);
            }
          }
          setCurrentWorkspaceId(id);
          setCurrentWorkspace(name);
        }}
      />

      {/* 3. GitHub repository import dialog */}
      <RepositoryImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        userId={user?.uid || ""}
        onLinkedSuccess={loadLinkedRepos}
      />

      {/* 4. Repository detailed telemetry analytics drawer */}
      {selectedRepoForDrawer && (
        <RepositoryAnalyticsDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedRepoForDrawer(null);
          }}
          repoId={selectedRepoForDrawer.id}
          repoName={selectedRepoForDrawer.name}
          repoOwner={selectedRepoForDrawer.owner}
          userId={user?.uid || ""}
          onSyncTriggered={loadLinkedRepos}
        />
      )}

      {/* 5. GitHub Disconnection Confirmation Modal */}
      <AnimatePresence>
        {showDisconnectConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDisconnectingGit && setShowDisconnectConfirmModal(false)}
              className="absolute inset-0 bg-[#0e0f17]/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Body Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md p-6 rounded-3xl border border-red-500/30 bg-[#12131e]/90 shadow-2xl backdrop-blur-xl z-10 text-left flex flex-col gap-5"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <Github size={20} />
                </div>
                <h3 className="text-white text-lg font-serif font-light">Disconnect GitHub Integration?</h3>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-relaxed text-[#857C91] font-light">
                <p>
                  You are about to sever the OAuth integration link between ContriTrack and your linked GitHub workspace.
                </p>
                <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-300 font-mono text-[10px] flex flex-col gap-1.5">
                  <span className="font-bold uppercase tracking-wider text-red-400">⚠️ Irreversible Telemetry Purge:</span>
                  <span>• Deletes all synced commits, pull requests, and audit logs.</span>
                  <span>• Cascades deletion to all imported repositories and telemetry records.</span>
                  <span>• Re-calculates and resets all dashboard peer contribution scores immediately.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  disabled={isDisconnectingGit}
                  onClick={() => setShowDisconnectConfirmModal(false)}
                  className="px-4 py-2 rounded-full border border-white/10 hover:border-white/20 text-white text-xs font-light tracking-wide transition cursor-pointer disabled:opacity-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDisconnectingGit}
                  onClick={handleDisconnectGitHub}
                  className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold tracking-wide transition shadow-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50 focus:outline-none"
                >
                  {isDisconnectingGit ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Purging...
                    </>
                  ) : (
                    "Confirm Disconnection"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Session Sign Out Confirmation Modal */}
      <AnimatePresence>
        {showSignOutConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutConfirmModal(false)}
              className="absolute inset-0 bg-[#0e0f17]/90 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Body Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md p-6 rounded-3xl border border-white/10 bg-[#12131e]/90 shadow-2xl backdrop-blur-xl z-10 text-left flex flex-col gap-5"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="p-2.5 rounded-xl bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]">
                  <LogOut size={20} />
                </div>
                <h3 className="text-white text-lg font-serif font-light">Confirm Sign Out?</h3>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-relaxed text-[#857C91] font-light">
                <p>
                  Are you sure you want to end your active ContriTrack workspace session?
                </p>
                <p>
                  You will be securely logged out of your account, and will need to authenticate again to view contribution scores, peer telemetry, and schedule workspace meetings.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirmModal(false)}
                  className="px-4 py-2 rounded-full border border-white/10 hover:border-white/20 text-white text-xs font-light tracking-wide transition cursor-pointer focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutConfirmModal(false);
                    void handleLogout();
                  }}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#CD9FA0] to-[#F2C1A3] hover:from-[#F2C1A3] hover:to-[#F8CCAA] text-[#12131e] text-xs font-bold tracking-wide transition shadow-lg cursor-pointer flex items-center gap-1.5 focus:outline-none"
                >
                  Confirm Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REAL-TIME NOTIFICATION TOAST ALERT OVERLAY */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-[#141523]/90 border border-[#F2C1A3]/30 backdrop-blur-xl shadow-2xl flex items-center gap-3 max-w-sm cursor-pointer"
            onClick={() => {
              setActiveTab("notifications");
              setActiveToast(null);
            }}
          >
            <div className="p-2.5 rounded-xl bg-[#F2C1A3]/10 text-[#F2C1A3] border border-[#F2C1A3]/20">
              <Bell size={18} />
            </div>
            <div className="flex flex-col text-left flex-1 min-w-0">
              <span className="text-xs font-semibold text-white truncate font-serif">{activeToast.title}</span>
              <span className="text-[10px] text-[#857C91] truncate mt-0.5">{activeToast.message}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="p-1 rounded-full hover:bg-white/10 text-[#857C91] hover:text-white transition"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
