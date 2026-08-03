"use client";

import React, { useState, useEffect, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Check, 
  Trash2, 
  Send, 
  Settings,
  Loader2,
  Calendar,
  Layers,
  Github
} from "lucide-react";
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  deleteNotification,
  addNotificationReply,
  savePushSubscription,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  deleteAllNotifications
} from "@/app/actions/notification-actions";

interface TeammateReply {
  id: string;
  senderName: string;
  senderId: string;
  message: string;
  createdAt: string | Date;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: string;
  actionUrl: string | null;
  createdAt: string | Date;
  senderId?: string | null;
  replies?: TeammateReply[];
}

interface NotificationsPanelProps {
  workspaceId: string;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
}

export default function NotificationsPanel({ workspaceId, user }: NotificationsPanelProps) {
  // Inbox states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");

  // Interactive replies states
  const [replyInputs, setReplyInputs] = useState<{ [notificationId: string]: string }>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Preference states
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    browserEnabled: true,
    mobileEnabled: true,
    emailEnabled: true,
    meetingAlerts: true,
    taskAlerts: true,
    teammateMentions: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load notifications from database
  const loadNotifications = React.useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const res = await fetchNotifications(user.uid, {
      unreadOnly,
      priority: priorityFilter,
      type: typeFilter,
      workspaceId: workspaceFilter === "current" ? workspaceId : undefined
    });

    if (res.success && res.notifications) {
      const fresh = res.notifications as unknown as NotificationItem[];
      setNotifications(prev => {
        const previousUnread = prev.filter(n => !n.isRead).length;
        const currentUnread = fresh.filter(n => !n.isRead).length;
        if (prev.length > 0 && currentUnread > previousUnread) {
          playLuxuryChime();
        }
        return fresh;
      });
    }
    setLoading(false);
  }, [user, unreadOnly, priorityFilter, typeFilter, workspaceId, workspaceFilter]);

  useEffect(() => {
    if (!user?.uid) return;
    
    startTransition(() => { void loadNotifications(); });

    // 10-second real-time polling so notifications appear in the exact minute
    const interval = setInterval(() => {
      void loadNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  // Handle push subscription requests
  const handleEnablePush = async () => {
    if (!user?.uid) return;
    const uid = user.uid;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported on this browser/device.");
      return;
    }

    try {
      // Wait for registration ready with a 5-second timeout fallback to prevent UI hanging
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout waiting for Service Worker ready state")), 5000)
      );
      const registration = await Promise.race([readyPromise, timeoutPromise]);
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Notification permissions denied.");
        return;
      }

      // Convert VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert("VAPID Public Key not loaded. Check environment configurations.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      // Extract keys
      const keys = subscription.toJSON();
      if (!keys.endpoint || !keys.keys?.p256dh || !keys.keys?.auth) {
        throw new Error("Invalid subscription object generated.");
      }

      // Save push subscription to Prisma PostgreSQL database
      const saveRes = await savePushSubscription({
        userId: uid,
        endpoint: keys.endpoint,
        p256dh: keys.keys.p256dh,
        auth: keys.keys.auth,
        deviceType: /Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop"
      });

      if (saveRes.success) {
        alert("Browser Web Push successfully activated! Real-time alerts are now bridges.");
      } else {
        alert("Failed to bridge subscription keys: " + saveRes.error);
      }
    } catch (err) {
      console.error("Push registration failed:", err);
      alert("Failed to subscribe device to telemetry feeds: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Load preferences
  useEffect(() => {
    async function loadPrefs() {
      if (!user?.uid) return;
      const res = await fetchNotificationPreferences(user.uid);
      if (res.success && res.preferences) {
        setPrefs({
          browserEnabled: res.preferences.browserEnabled,
          mobileEnabled: res.preferences.mobileEnabled,
          emailEnabled: res.preferences.emailEnabled,
          meetingAlerts: res.preferences.meetingAlerts,
          taskAlerts: res.preferences.taskAlerts,
          teammateMentions: res.preferences.teammateMentions
        });
      }
    }
    if (user?.uid) {
      startTransition(() => { void loadPrefs(); });
    }
  }, [user]);

  // Save Preferences
  const handleSavePrefs = async () => {
    if (!user?.uid) return;
    setSavingPrefs(true);
    const res = await updateNotificationPreferences(user.uid, prefs);
    if (res.success) {
      setShowPrefs(false);
    } else {
      alert("Failed to save changes: " + res.error);
    }
    setSavingPrefs(false);
  };

  // Action dispatches
  const handleMarkRead = async (id: string) => {
    // Optimistic UI updates
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationRead(id);
  };

  const handleMarkAllReadLocal = async () => {
    if (!user?.uid) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await markAllNotificationsRead(user.uid);
  };

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteNotification(id);
  };

  const handleDeleteAllLocal = async () => {
    if (!user?.uid) return;
    if (!confirm("Are you sure you want to permanently empty your notification inbox?")) return;
    setNotifications([]);
    await deleteAllNotifications(user.uid, workspaceFilter === "current" ? workspaceId : undefined);
  };

  // Direct teammate replies trigger
  const handleSendReply = async (notificationId: string) => {
    const replyText = replyInputs[notificationId];
    if (!replyText?.trim() || !user?.uid) return;

    setReplyingToId(notificationId);
    const target = notifications.find(n => n.id === notificationId);
    const receiverId = target?.senderId || user.uid;

    const res = await addNotificationReply({
      notificationId,
      senderId: user.uid,
      senderName: user.displayName || "Khushi Nayak",
      receiverId,
      message: replyText.trim()
    });

    if (res.success && res.reply) {
      playLuxuryChime();
      // Append reply locally
      setNotifications(prev => prev.map(n => {
        if (n.id === notificationId) {
          const originalReplies = n.replies || [];
          return {
            ...n,
            replies: [...originalReplies, res.reply as unknown as TeammateReply]
          };
        }
        return n;
      }));

      // Reset reply inputs
      setReplyInputs(prev => ({ ...prev, [notificationId]: "" }));
    } else {
      alert("Failed to send reply to teammate.");
    }
    setReplyingToId(null);
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "task": return <Layers size={14} className="text-[#F2C1A3]" />;
      case "github": return <Github size={14} className="text-white" />;
      case "meeting": return <Calendar size={14} className="text-[#CD9FA0]" />;
      default: return <Bell size={14} className="text-amber-400" />;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "medium": return "bg-[#F2C1A3]/25 text-[#F2C1A3] border border-[#F2C1A3]/30";
      default: return "bg-white/5 text-[#857C91] border border-white/5";
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl w-full">
      {/* Header section layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Team Sync Updates</span>
          <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">Notification Center</h2>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleMarkAllReadLocal}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#F2C1A3] cursor-pointer"
          >
            Mark all read
          </button>
          <button 
            onClick={handleDeleteAllLocal}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-mono text-red-400 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 size={12} />
            Empty fully
          </button>
          <button 
            onClick={handleEnablePush}
            className="px-4 py-2 rounded-xl bg-[#F2C1A3]/10 hover:bg-[#F2C1A3]/20 border border-[#F2C1A3]/20 text-xs font-mono text-[#F2C1A3] flex items-center gap-1.5 cursor-pointer"
          >
            Enable Push
          </button>
          <button 
            onClick={() => setShowPrefs(!showPrefs)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#857C91] hover:text-white transition cursor-pointer"
            title="Settings Preferences"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Preferences Form Modal */}
      <AnimatePresence>
        {showPrefs && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col gap-5 text-left overflow-hidden"
          >
            <h4 className="text-white text-sm font-serif font-light border-b border-white/5 pb-2">Sync Channels Preferences</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={prefs.browserEnabled} 
                  onChange={e => setPrefs(prev => ({ ...prev, browserEnabled: e.target.checked }))}
                  className="rounded border-white/10 bg-[#12131e]" 
                />
                <div className="flex flex-col">
                  <span className="text-white text-xs">Browser Push</span>
                  <span className="text-[#857C91] text-[9px]">Desktop notifications</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={prefs.mobileEnabled} 
                  onChange={e => setPrefs(prev => ({ ...prev, mobileEnabled: e.target.checked }))}
                  className="rounded border-white/10 bg-[#12131e]" 
                />
                <div className="flex flex-col">
                  <span className="text-white text-xs">Mobile Sync</span>
                  <span className="text-[#857C91] text-[9px]">Phone/Tablet alerts</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={prefs.emailEnabled} 
                  onChange={e => setPrefs(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                  className="rounded border-white/10 bg-[#12131e]" 
                />
                <div className="flex flex-col">
                  <span className="text-white text-xs">Email Alerts</span>
                  <span className="text-[#857C91] text-[9px]">Gmail digests</span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={prefs.meetingAlerts} 
                  onChange={e => setPrefs(prev => ({ ...prev, meetingAlerts: e.target.checked }))}
                  className="rounded border-white/10 bg-[#12131e]" 
                />
                <span className="text-white text-xs">Meeting Invites</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={prefs.taskAlerts} 
                  onChange={e => setPrefs(prev => ({ ...prev, taskAlerts: e.target.checked }))}
                  className="rounded border-white/10 bg-[#12131e]" 
                />
                <span className="text-white text-xs">Kanban Tasks</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={prefs.teammateMentions} 
                  onChange={e => setPrefs(prev => ({ ...prev, teammateMentions: e.target.checked }))}
                  className="rounded border-white/10 bg-[#12131e]" 
                />
                <span className="text-white text-xs">Teammate Mentions</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setShowPrefs(false)} 
                className="px-3 py-1.5 rounded-lg bg-white/5 text-[#857C91] text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePrefs} 
                className="px-4 py-1.5 rounded-lg bg-[#F2C1A3] text-[#12131e] text-xs font-bold cursor-pointer flex items-center gap-1"
                disabled={savingPrefs}
              >
                {savingPrefs && <Loader2 size={12} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Realtime Filters Row */}
      <div className="flex flex-wrap items-center gap-3 bg-[#111221]/50 border border-white/5 p-3 rounded-2xl">
        <button 
          onClick={() => {
            setUnreadOnly(!unreadOnly);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs transition font-mono ${unreadOnly ? "bg-[#F2C1A3] text-[#12131e] font-bold" : "text-[#857C91] hover:text-white"}`}
        >
          Unread Only
        </button>

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#857C91] uppercase">Workspace:</span>
          <select 
            value={workspaceFilter} 
            onChange={e => setWorkspaceFilter(e.target.value)}
            className="bg-[#12131e] border border-white/5 rounded-xl px-2 py-1 text-xs text-[#857C91] outline-none"
            aria-label="Filter by Workspace"
          >
            <option value="all">All Workspaces</option>
            <option value="current">Current Workspace Only</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#857C91] uppercase">Priority:</span>
          <select 
            value={priorityFilter} 
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-[#12131e] border border-white/5 rounded-xl px-2 py-1 text-xs text-[#857C91] outline-none"
            aria-label="Filter by Priority"
          >
            <option value="all">All</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#857C91] uppercase">Category:</span>
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-[#12131e] border border-white/5 rounded-xl px-2 py-1 text-xs text-[#857C91] outline-none"
            aria-label="Filter by Category"
          >
            <option value="all">All</option>
            <option value="task">Tasks</option>
            <option value="github">GitHub Telemetry</option>
            <option value="meeting">Meetings</option>
            <option value="system">System Alerts</option>
          </select>
        </div>
      </div>

      {/* Notifications Inbox Stack */}
      <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4 mt-2 min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
            <Loader2 size={32} className="animate-spin text-[#F2C1A3]" />
            <span className="text-[#857C91] text-xs font-mono font-light">Querying persistent notification ledger...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/[0.01] border border-white/5 flex items-center justify-center text-[#857C91]">
              <Bell size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-white text-sm font-serif">Inbox is 100% synchronized</span>
              <span className="text-[#857C91] text-xs font-light">All collaborative commits, tasks, and meetings are up to date.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {notifications.map((note) => {
                return (
                  <motion.div 
                    layout
                    key={note.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`p-5 rounded-2xl border flex flex-col gap-4 transition duration-300 relative overflow-hidden group ${
                      note.isRead 
                        ? "bg-white/[0.005] border-white/5 hover:border-white/10" 
                        : "bg-[#F2C1A3]/5 border-[#F2C1A3]/20 hover:border-[#F2C1A3]/30 shadow-[0_0_15px_rgba(242,193,163,0.03)]"
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {/* Type Icon Badge */}
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/10 shrink-0">
                          {getCategoryIcon(note.type)}
                        </div>

                        <div className="flex flex-col leading-snug text-left">
                          <span className={`text-xs ${note.isRead ? "text-white/60 font-light" : "text-white font-medium"}`}>
                            {note.title}
                          </span>
                          <span className="text-white/80 text-xs font-light mt-1">{note.message}</span>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[#857C91] text-[9px] font-mono">
                              {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[8px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded ${getPriorityStyle(note.priority)}`}>
                              {note.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Top action row */}
                      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                        {!note.isRead && (
                          <button 
                            onClick={() => handleMarkRead(note.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#F2C1A3]/25 text-[#857C91] hover:text-[#F2C1A3] transition cursor-pointer"
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(note.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-[#857C91] hover:text-red-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Replies threaded list */}
                    {note.replies && note.replies.length > 0 && (
                      <div className="pl-12 flex flex-col gap-2.5 border-t border-white/5 pt-3">
                        {note.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2.5 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                            <div className="w-5 h-5 rounded-full bg-[#CD9FA0]/20 flex items-center justify-center text-[8px] font-mono font-bold text-[#CD9FA0]">
                              {reply.senderName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col text-left leading-normal">
                              <span className="text-[10px] text-white font-medium">{reply.senderName}</span>
                              <span className="text-white/70 text-xs font-light mt-0.5">{reply.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive threaded reply input */}
                    <div className="pl-12 flex items-center gap-2 mt-2">
                      <input 
                        type="text" 
                        placeholder="Reply directly to teammate..." 
                        value={replyInputs[note.id] || ""}
                        onChange={e => setReplyInputs(prev => ({ ...prev, [note.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSendReply(note.id);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                        title="Teammate direct reply"
                      />
                      <button 
                        onClick={() => handleSendReply(note.id)}
                        className="p-2 rounded-xl bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] transition cursor-pointer flex items-center justify-center shrink-0"
                        title="Submit reply"
                        disabled={replyingToId === note.id}
                      >
                        {replyingToId === note.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} strokeWidth={2.5} />
                        )}
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export function playLuxuryChime() {
  if (typeof window === "undefined") return;
  const AudioCtxClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return;
  try {
    const ctx = new AudioCtxClass();
    
    // Primary soft bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6 shimmer
    
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Shimmer backing harmonic tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1760, ctx.currentTime); // A6
    
    gain2.gain.setValueAtTime(0.03, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("AudioContext playback blocked / uninitialized:", e);
  }
}
