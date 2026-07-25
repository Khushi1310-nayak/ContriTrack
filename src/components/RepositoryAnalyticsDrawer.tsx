import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Star, GitFork, GitBranch, AlertCircle, ShieldAlert, Sparkles, CheckCircle2, History, GitPullRequest, Flame, Milestone } from "lucide-react";
import { fetchRepositoryAnalyticsDetails, triggerRepositorySync } from "@/app/actions/github-actions";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface MemberAnalytics {
  username: string;
  commitShare: number;
  codeChangeShare: number;
  fairness: number;
  burnout: number;
  activeDays: number;
  prMergeTimeAvg?: number;
  reviewQualityScore?: number;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  additions: number;
  deletions: number;
  time: string;
}

interface PR {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
}

interface Issue {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
}

interface RepositoryAnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  repoName: string;
  repoOwner: string;
  userId: string;
  onSyncTriggered: () => void;
}

const COLORS = ["#F2C1A3", "#CD9FA0", "#857C91", "#38bdf8", "#34d399", "#a78bfa"];

export function RepositoryAnalyticsDrawer({
  isOpen,
  onClose,
  repoId,
  repoName,
  repoOwner,
  userId,
  onSyncTriggered
}: RepositoryAnalyticsDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<{
    cicdPassRate?: number;
    commits: Commit[];
    prs: PR[];
    issues: Issue[];
    analytics: MemberAnalytics[];
  } | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "commits" | "prs" | "issues">("overview");

  useEffect(() => {
    if (isOpen) {
      loadDetails();
    }
  }, [isOpen, repoId]);

  const loadDetails = async () => {
    setLoading(true);
    setError("");
    const res = await fetchRepositoryAnalyticsDetails(repoId);
    if (res.success && res.commits) {
      setData({
        cicdPassRate: res.cicdPassRate,
        commits: res.commits,
        prs: res.prs || [],
        issues: res.issues || [],
        analytics: res.analytics as MemberAnalytics[] || []
      });
    } else {
      setError(res.error || "Failed to load detailed repository analytics logs.");
    }
    setLoading(false);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const res = await triggerRepositorySync(repoId, userId);
    if (res.success) {
      await loadDetails();
      onSyncTriggered();
    } else {
      setError(res.error || "Failed to finalize telemetry sync.");
    }
    setSyncing(false);
  };

  const pieData = data?.analytics.map((item, idx) => ({
    name: item.username,
    value: item.commitShare || 1,
  })) || [];

  const barData = data?.analytics.map((item) => ({
    name: item.username,
    "Lines Modified (%)": item.codeChangeShare,
    "Burnout Load Index": item.burnout,
    "Active Coding Days": item.activeDays
  })) || [];

  const fairnessScore = data?.analytics[0]?.fairness ?? 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#06070a]/70 backdrop-blur-sm"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl h-full border-l border-white/10 bg-[#0e0f17] shadow-2xl flex flex-col z-10"
          >
            {/* Header Controls */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[#857C91] text-xs font-mono">{repoOwner} /</span>
                  <h3 className="text-lg font-semibold text-white font-serif tracking-tight">{repoName}</h3>
                </div>
                <span className="text-[10px] text-[#F2C1A3] font-mono uppercase tracking-widest mt-1">Telemetry Dashboard & AI Parity Audit</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={syncing}
                  onClick={handleManualSync}
                  className="p-2.5 rounded-full border border-white/5 bg-white/[0.02] text-[#857C91] hover:text-white hover:bg-white/5 transition disabled:opacity-40"
                  title="Force telemetry sync"
                >
                  <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-full border border-white/5 bg-white/[0.02] text-[#857C91] hover:text-white hover:bg-white/5 transition"
                  title="Close panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="m-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-left">
                {error}
              </div>
            )}

            {/* Scrollable Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-[#F2C1A3] animate-spin" />
                  <span className="text-xs text-[#857C91] font-mono tracking-widest uppercase">Analyzing Git Wave Telemetries...</span>
                </div>
              ) : !data ? (
                <div className="h-[60vh] flex items-center justify-center text-[#857C91] text-xs">
                  Telemetry logs unavailable for this repository.
                </div>
              ) : (
                <>
                  {/* Category tabs */}
                  <div className="flex border-b border-white/5 pb-1">
                    {(["overview", "commits", "prs", "issues"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-[10px] font-mono uppercase tracking-wider transition border-b-2 -mb-0.5 ${
                          activeTab === tab 
                            ? "border-[#F2C1A3] text-white font-bold" 
                            : "border-transparent text-[#857C91] hover:text-white"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* 1. OVERVIEW GRAPHICS PANEL */}
                  {activeTab === "overview" && (
                    <div className="space-y-6 text-left">
                      
                      {/* Parity, Burnout, & CI/CD Gauges */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Parity Card */}
                        <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2C1A3]/5 rounded-bl-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between">
                            <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">AI peer parity score</span>
                            <Sparkles size={14} className="text-[#F2C1A3]" />
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-serif font-light ${
                              fairnessScore >= 80 ? "text-emerald-400" : fairnessScore >= 60 ? "text-[#F2C1A3]" : "text-[#CD9FA0]"
                            }`}>
                              {fairnessScore}%
                            </span>
                            <span className="text-[10px] text-[#857C91] uppercase tracking-wide">
                              {fairnessScore >= 85 ? "Optimal Fairness" : fairnessScore >= 65 ? "Moderate Parity" : "Imbalance alert"}
                            </span>
                          </div>

                          <p className="text-[10px] font-sans text-[#857C91] leading-relaxed">
                            {fairnessScore >= 85 
                              ? "Task allocation is exceptionally uniform across contributors. Collaborative velocity is balanced." 
                              : fairnessScore >= 65 
                              ? "Minor differences detected in individual sprint commits. Parity limits remain within healthy levels." 
                              : "Severe workload imbalance detected! Certain members are carrying the sprint. Immediate task realignment recommended."
                            }
                          </p>
                        </div>

                        {/* Imbalance check */}
                        <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">Active burnout risks</span>
                            <Flame size={14} className="text-[#CD9FA0]" />
                          </div>

                          {data.analytics.some((a) => a.burnout >= 75) ? (
                            <div className="flex items-center gap-2 text-[#CD9FA0]">
                              <ShieldAlert size={16} />
                              <span className="text-xs font-semibold">High Load Warning Triggered</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-400">
                              <CheckCircle2 size={16} />
                              <span className="text-xs font-semibold">Zero Burnout Detected</span>
                            </div>
                          )}

                          <p className="text-[10px] font-sans text-[#857C91] leading-relaxed">
                            Peer load analysis flags members who carry excessive workloads relative to their team peers, preventing sprint crashes.
                          </p>
                        </div>

                        {/* CI/CD Health check */}
                        <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">CI/CD Pipeline Health</span>
                            <Milestone size={14} className="text-[#38bdf8]" />
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-serif font-light ${
                              (data.cicdPassRate || 0) >= 90 ? "text-emerald-400" : (data.cicdPassRate || 0) >= 70 ? "text-[#38bdf8]" : "text-[#CD9FA0]"
                            }`}>
                              {data.cicdPassRate}%
                            </span>
                            <span className="text-[10px] text-[#857C91] uppercase tracking-wide">
                              Pass Rate
                            </span>
                          </div>

                          <p className="text-[10px] font-sans text-[#857C91] leading-relaxed">
                            Tracks the success rate of automated workflow runs on the default branch.
                          </p>
                        </div>

                      </div>

                      {/* Commit share distribution pie chart */}
                      <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                        <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">Commit Share Breakdown</span>
                        
                        <div className="h-44 w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#111221", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", color: "white", fontSize: "10px" }}
                                formatter={(value: any) => [`${value}%`, "Commit Share"]}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Legends */}
                          <div className="flex flex-col gap-1.5 text-xs text-white pl-4 border-l border-white/5 pr-4 shrink-0 max-w-[180px]">
                            {data.analytics.map((collab, idx) => (
                              <div key={idx} className="flex items-center gap-2 truncate">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="font-mono text-[10px] truncate">{collab.username}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Workload shares bar chart */}
                      <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                        <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">Lines & Workload Metrics</span>
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <XAxis dataKey="name" stroke="#857C91" fontSize={8} tickLine={false} />
                              <YAxis stroke="#857C91" fontSize={8} tickLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#111221", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", color: "white", fontSize: "10px" }}
                              />
                              <Legend wrapperStyle={{ fontSize: "8px", fontFamily: "monospace" }} />
                              <Bar dataKey="Lines Modified (%)" fill="#F2C1A3" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Burnout Load Index" fill="#CD9FA0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Rank leaderboard lists */}
                      <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
                        <span className="text-[#857C91] text-[10px] font-mono uppercase tracking-wider">Contributor Rank Audit</span>
                        <div className="flex flex-col gap-3">
                          {data.analytics.map((collab, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.01] border border-white/5">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-[#F2C1A3] font-bold">#0{idx + 1}</span>
                                <span className="text-white text-xs font-semibold font-mono">{collab.username}</span>
                              </div>
                              <div className="flex items-center gap-5">
                                <div className="flex flex-col text-right">
                                  <span className="text-[#857C91] text-[8px] font-mono uppercase">Commits</span>
                                  <span className="text-white text-xs font-mono font-medium">{collab.commitShare}%</span>
                                </div>
                                <div className="flex flex-col text-right hidden sm:flex">
                                  <span className="text-[#857C91] text-[8px] font-mono uppercase">PR Merge (Avg)</span>
                                  <span className="text-white text-xs font-mono font-medium">{collab.prMergeTimeAvg || 0}h</span>
                                </div>
                                <div className="flex flex-col text-right hidden sm:flex">
                                  <span className="text-[#857C91] text-[8px] font-mono uppercase">Review Quality</span>
                                  <span className="text-white text-xs font-mono font-medium">{collab.reviewQualityScore || 0}/100</span>
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="text-[#857C91] text-[8px] font-mono uppercase">Active Days</span>
                                  <span className="text-white text-xs font-mono font-medium">{collab.activeDays}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="text-[#857C91] text-[8px] font-mono uppercase">Burnout</span>
                                  <span className={`text-xs font-mono font-bold ${collab.burnout >= 75 ? "text-red-400" : "text-[#857C91]"}`}>{collab.burnout}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* 2. COMMITS Timeline LIST */}
                  {activeTab === "commits" && (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-2 pb-2">
                        <History size={14} className="text-[#F2C1A3]" />
                        <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Recent Telemetry Commit Logs</span>
                      </div>
                      <div className="flex flex-col gap-3.5 relative pl-4 border-l border-white/5">
                        {data.commits.map((commit, idx) => (
                          <div key={idx} className="relative flex flex-col gap-1.5 p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition">
                            <span className="absolute top-1/2 -left-6 -translate-y-1/2 w-2 h-2 rounded-full bg-[#CD9FA0]" />
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-white font-semibold leading-snug">{commit.message}</span>
                              <span className="px-2 py-0.5 rounded bg-[#CD9FA0]/10 text-[#CD9FA0] border border-[#CD9FA0]/20 font-mono text-[8px] font-bold">
                                {commit.sha}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-[#857C91] mt-1 font-mono">
                              <span>Authored by {commit.author}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-emerald-400">+{commit.additions}</span>
                                <span className="text-red-400">-{commit.deletions}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. PULL REQUESTS */}
                  {activeTab === "prs" && (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-2 pb-2">
                        <GitPullRequest size={14} className="text-[#F2C1A3]" />
                        <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Synced PR Ledgers</span>
                      </div>

                      {data.prs.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[#857C91]">No pull requests tracked inside repository.</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {data.prs.map((pr, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
                              <div className="flex items-center gap-3 text-left">
                                <span className="text-[#857C91] text-xs font-mono">#{pr.number}</span>
                                <div className="flex flex-col leading-snug">
                                  <span className="text-white text-xs font-semibold">{pr.title}</span>
                                  <span className="text-[#857C91] text-[9px] font-mono mt-0.5">Created by {pr.author}</span>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                                pr.state === "merged" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                pr.state === "open" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {pr.state}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. ISSUES LIST */}
                  {activeTab === "issues" && (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-2 pb-2">
                        <Milestone size={14} className="text-[#F2C1A3]" />
                        <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Synced Tracked Issues</span>
                      </div>

                      {data.issues.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[#857C91]">No active or closed issues tracked.</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {data.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
                              <div className="flex items-center gap-3 text-left">
                                <span className="text-[#857C91] text-xs font-mono">#{issue.number}</span>
                                <div className="flex flex-col leading-snug">
                                  <span className="text-white text-xs font-semibold">{issue.title}</span>
                                  <span className="text-[#857C91] text-[9px] font-mono mt-0.5">Logged by {issue.author}</span>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                                issue.state === "open" ? "bg-[#F2C1A3]/10 text-[#F2C1A3] border border-[#F2C1A3]/20" :
                                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}>
                                {issue.state}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
