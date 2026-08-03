"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp, 
  Sliders, 
  Zap, 
  UserMinus
} from "lucide-react";
import { 
  generateOrGetWorkspaceAIInsights, 
  autoRedistributeWorkspaceTasks,
  CollaboratorTelemetry,
  OverloadedMember,
  FreeRiderFlag
} from "@/app/actions/ai-actions";
import { 
  AIInsight, 
  UserContributionAnalytics, 
  BurnoutSignal, 
  ProductivityForecast, 
  TeamParityAnalysis 
} from "@prisma/client";

interface AIInsightsPanelProps {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null;
  workspaceId: string;
}

export default function AIInsightsPanel({ user, workspaceId }: AIInsightsPanelProps) {
  const userId = user?.uid || "";
  const userName = user?.displayName || user?.email?.split("@")[0] || "Collaborator";

  // Data state
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [analytics, setAnalytics] = useState<UserContributionAnalytics | null>(null);
  const [burnout, setBurnout] = useState<BurnoutSignal | null>(null);
  const [forecast, setForecast] = useState<ProductivityForecast | null>(null);
  const [parity, setParity] = useState<TeamParityAnalysis | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorTelemetry[]>([]);

  // Rate Limiting alerts
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);

  // Sync state message
  const [syncStatus, setSyncStatus] = useState<"synchronized" | "loading" | "error">("synchronized");
  const [redistributeStatus, setRedistributeStatus] = useState<string | null>(null);

  // 1. Fetch live telemetry from PostgreSQL via server actions
  const fetchTelemetry = useCallback(async (isManualRefresh = false) => {
    if (!workspaceId || !userId) return;
    setSyncStatus("loading");
    if (!isManualRefresh) setLoading(true);
    
    try {
      const res = await generateOrGetWorkspaceAIInsights(workspaceId, userId);
      
      if (res.rateLimited) {
        setRateLimitActive(true);
        setRateLimitTimer(res.rateLimitRemaining || 45);
        setSyncStatus("synchronized");
        setLoading(false);
        return;
      }

      if (res.success) {
        setInsights(res.insights || []);
        setAnalytics(res.analytics);
        setBurnout(res.burnout);
        setForecast(res.forecast);
        setParity(res.parity);
        setCollaborators(res.collaborators || []);
        setSyncStatus("synchronized");
        setRateLimitActive(false);
      } else {
        setSyncStatus("error");
      }
    } catch (e) {
      console.error(e);
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId]);

  // Initial load and WebSocket simulation/polling
  useEffect(() => {
    let active = true;
    const runInitialFetch = async () => {
      if (active) {
        await fetchTelemetry();
      }
    };
    void runInitialFetch();
    
    // Simulating WebSocket database updates every 12 seconds for realtime telemetry syncing
    const interval = setInterval(() => {
      startTransition(() => {
        if (active) {
          void fetchTelemetry();
        }
      });
    }, 12000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchTelemetry]);

  // Rate limiting countdown
  useEffect(() => {
    if (rateLimitActive && rateLimitTimer > 0) {
      const timer = setInterval(() => {
        setRateLimitTimer((prev) => {
          if (prev <= 1) {
            setRateLimitActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitActive, rateLimitTimer]);

  // 2. Auto-Redistribute Tasks action trigger
  const handleAutoRedistribute = async () => {
    if (!workspaceId || !userId) return;
    setRedistributeStatus("Processing auto-workload parity redistribution...");
    
    try {
      const res = await autoRedistributeWorkspaceTasks(workspaceId, userId);
      if (res.success) {
        setRedistributeStatus(res.message);
        // Refresh telemetry immediately
        setTimeout(() => {
          fetchTelemetry(true);
          setRedistributeStatus(null);
        }, 3000);
      } else {
        setRedistributeStatus(`⚠️ ${res.message}`);
        setTimeout(() => setRedistributeStatus(null), 5000);
      }
    } catch (error) {
      console.error(error);
      setRedistributeStatus("⚠️ Workload redistribution failed to sync.");
      setTimeout(() => setRedistributeStatus(null), 4000);
    }
  };

  // Parsing JSON states
  const overloadedList: OverloadedMember[] = parity?.overloadedMembers ? JSON.parse(parity.overloadedMembers) : [];
  const freeRiderList: FreeRiderFlag[] = parity?.freeRiderFlags ? JSON.parse(parity.freeRiderFlags) : [];
  const delaysList: string[] = forecast?.estimatedDelays ? JSON.parse(forecast.estimatedDelays) : [];
  const recsFeed: string[] = forecast?.aiRecommendations ? JSON.parse(forecast.aiRecommendations) : [];

  // Greet personal user depending on time of day
  const [timeGreeting] = useState<string>(() => {
    if (typeof window === "undefined") return "Good evening";
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return "Good morning";
    if (hours >= 12 && hours < 18) return "Good afternoon";
    return "Good evening";
  });

  const getGreetingTime = () => timeGreeting;

  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-5xl">
      {/* 1. Header with Personalized Welcome and Synchronizer Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#F2C1A3] flex items-center gap-1.5">
            <Cpu size={10} className="text-[#F2C1A3] animate-pulse" />
            Workspace Telemetry Engine
          </span>
          <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">
            {getGreetingTime()}, {userName} <span className="text-[#F2C1A3]">👋</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Synchronized status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-[10px] font-mono text-[#857C91]">
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === "loading" ? "bg-[#F2C1A3] animate-ping" : 
              syncStatus === "error" ? "bg-red-500" : "bg-green-500"
            }`} />
            <span className="uppercase">{syncStatus === "loading" ? "Syncing..." : syncStatus === "error" ? "Sync Warning" : "Live Telemetry Synced"}</span>
          </div>

          <button
            onClick={() => fetchTelemetry(true)}
            disabled={loading || rateLimitActive}
            className="p-2.5 rounded-full bg-white/[0.03] border border-white/10 hover:border-[#F2C1A3]/30 text-white hover:text-[#F2C1A3] transition cursor-pointer disabled:opacity-40"
            title="Force refresh database telemetry"
          >
            <RefreshCw size={12} className={syncStatus === "loading" ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Rate limit warning toast */}
      <AnimatePresence>
        {rateLimitActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs font-light flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>Strict AI refresh limits applied: Maximum 3 queries per minute to maintain high analytical accuracy.</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-amber-200">Cooling down: {rateLimitTimer}s</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main loading spinner */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw size={28} className="text-[#F2C1A3] animate-spin" />
          <span className="text-xs font-mono text-[#857C91] tracking-widest uppercase">Fetching server activity telemetry...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* ================= COLUMN 1 ================= */}
          <div className="flex flex-col gap-6 md:col-span-2">
            
            {/* 1. Burnout & Stress Telemetry */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-5 relative overflow-hidden group hover:border-[#F2C1A3]/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2C1A3]/[0.01] rounded-full blur-2xl group-hover:bg-[#F2C1A3]/[0.03] transition-all" />
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider">Burnout Diagnostics</span>
                  <h3 className="text-white text-base font-serif font-light">Burnout Risk & Stress Meter</h3>
                </div>
                <Activity size={16} className="text-[#F2C1A3]" />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
                {/* SVG Radial Gauge */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="40" 
                      stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="transparent" 
                    />
                    <motion.circle 
                      cx="50" cy="50" r="40" 
                      stroke="#F2C1A3" strokeWidth="8" fill="transparent" 
                      strokeDasharray="251.2"
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 - (251.2 * (analytics?.burnoutScore || 0)) / 100 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-white font-mono">{Math.round(analytics?.burnoutScore || 0)}%</span>
                    <span className="text-[8px] text-[#857C91] uppercase tracking-widest font-mono">Stress Index</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4 w-full text-xs font-light">
                  <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-1">
                    <span className="text-[#857C91] text-[9px] uppercase font-mono">Missed Deadlines</span>
                    <span className={`font-bold ${(burnout?.missedDeadlines ?? 0) > 0 ? "text-amber-400" : "text-white"}`}>
                      {burnout?.missedDeadlines || 0} tasks
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-1">
                    <span className="text-[#857C91] text-[9px] uppercase font-mono">Late Night Activity</span>
                    <span className={`font-bold ${burnout?.overtimeDetected ? "text-amber-400" : "text-white"}`}>
                      {burnout?.overtimeDetected ? "Spike Detected" : "Normal"}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-1 col-span-2">
                    <span className="text-[#857C91] text-[9px] uppercase font-mono">Burnout Diagnostic Status</span>
                    <span className={`font-bold font-serif text-sm ${
                      (analytics?.burnoutScore || 0) > 70 ? "text-red-400 animate-pulse" : 
                      (analytics?.burnoutScore || 0) > 40 ? "text-amber-300" : "text-green-400"
                    }`}>
                      {(analytics?.burnoutScore || 0) > 70 ? "Critical Workload Alarms Triggered" : 
                       (analytics?.burnoutScore || 0) > 40 ? "Elevated Stress Parameters" : "Optimal Workspace Telemetry"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Team Load Parity & Workload Redistribution Engine */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-5 hover:border-[#F2C1A3]/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider">Parity Balancer</span>
                  <h3 className="text-white text-base font-serif font-light">Team Effort Parity & Load Distribution</h3>
                </div>
                <Sliders size={16} className="text-[#F2C1A3]" />
              </div>

              {/* Workload redistribution visual map */}
              <div className="flex flex-col gap-4 py-2">
                <div className="flex justify-between items-center text-xs text-[#857C91] font-mono">
                  <span>Balance Score: <strong className="text-white">{Math.round(parity?.workloadBalanceScore || 100)}/100</strong></span>
                  <span className="uppercase text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#F2C1A3]">
                    {overloadedList.length > 0 ? "Imbalance Detected" : "Workloads Balanced"}
                  </span>
                </div>

                <div className="w-full bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-[9px] text-[#857C91] uppercase font-mono tracking-wider">Task Allocation Ratio</span>
                  
                  {/* Dynamic SVG Bars illustrating workload distribution */}
                  {collaborators.map((c, i) => {
                    const taskCount = c.openTasksCount || 0;
                    const maxTasks = Math.max(...collaborators.map(m => m.openTasksCount || 0), 1);
                    const pct = (taskCount / maxTasks) * 100;
                    
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-20 text-[10px] text-white truncate font-light text-left">{c.fullName}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-[#F2C1A3]/60 to-[#F2C1A3] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <span className="w-8 text-[10px] font-mono text-white text-right">{taskCount} open</span>
                      </div>
                    );
                  })}
                </div>

                {/* redistribution action card */}
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-white text-xs font-serif font-light">Auto-Redistribute Workloads</span>
                    <p className="text-[10px] text-[#857C91] leading-relaxed">
                      {overloadedList.length > 0 
                        ? `AI recommends shifting 1 upcoming task from overloaded member ${overloadedList[0].fullName} to under-utilized collaborators.`
                        : "Task effort is balanced. No reassignments needed at this stage."}
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleAutoRedistribute}
                    disabled={overloadedList.length === 0 || redistributeStatus !== null}
                    className="px-4 py-2 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] disabled:bg-white/5 text-[#12131e] disabled:text-[#857C91] text-[10px] font-bold tracking-wider uppercase transition disabled:cursor-not-allowed shrink-0"
                  >
                    Redistribute Tasks
                  </button>
                </div>

                <AnimatePresence>
                  {redistributeStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.01] text-[10px] font-mono text-[#F2C1A3]"
                    >
                      {redistributeStatus}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

          </div>

          {/* ================= COLUMN 2 ================= */}
          <div className="flex flex-col gap-6 col-span-1">
            
            {/* 3. Free-Rider Diagnostics */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-5 hover:border-[#F2C1A3]/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider">Contribution Fairness</span>
                  <h3 className="text-white text-base font-serif font-light">Free-Rider Diagnostics</h3>
                </div>
                <UserMinus size={16} className="text-[#F2C1A3]" />
              </div>

              <div className="flex flex-col gap-3 py-1">
                {freeRiderList.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-2 items-center text-center">
                    <CheckCircle2 size={24} className="text-green-400" />
                    <span className="text-[11px] text-white font-light">All Members Contributing</span>
                    <p className="text-[9px] text-[#857C91]">Every collaborator has recorded active commits or assigned task tasks inside the sprint scope.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <span className="text-[9px] font-mono text-amber-300 uppercase tracking-widest">Active Flags Raised</span>
                    {freeRiderList.map((fr: FreeRiderFlag, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 flex flex-col gap-1.5 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white font-medium">{fr.fullName}</span>
                          <span className="text-[8px] font-mono text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-500/10">Inactivity Flag</span>
                        </div>
                        <p className="text-[9px] text-amber-100 font-light">
                          Logged 0 active repository commits or task completions. Immediate workload reviews recommended to maintain fairness score.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Productivity Forecasting */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-5 hover:border-[#F2C1A3]/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider">Predictive Engine</span>
                  <h3 className="text-white text-base font-serif font-light">Sprint Velocity Forecast</h3>
                </div>
                <TrendingUp size={16} className="text-[#F2C1A3]" />
              </div>

              <div className="flex flex-col gap-4 py-1">
                {/* SVG Curve chart */}
                <div className="h-20 w-full relative flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path 
                      d="M0,25 Q25,12 50,18 T100,5" 
                      fill="none" 
                      stroke="rgba(242, 193, 163, 0.15)" 
                      strokeWidth="2" 
                    />
                    <motion.path 
                      d="M0,25 Q25,12 50,18 T100,5" 
                      fill="none" 
                      stroke="#F2C1A3" 
                      strokeWidth="2.5" 
                      strokeDasharray="150"
                      initial={{ strokeDashoffset: 150 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                    <circle cx="100" cy="5" r="2.5" fill="#F2C1A3" />
                  </svg>
                  <div className="absolute top-1 right-2 text-right">
                    <span className="text-xs font-bold text-[#F2C1A3] font-mono block">
                      {Math.round(forecast?.predictedCompletion || 85)}%
                    </span>
                    <span className="text-[8px] text-[#857C91] uppercase font-mono tracking-widest">Completion Prob</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 font-light text-xs">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[#857C91] text-[9px] uppercase font-mono">Sprint Velocity</span>
                    <span className="text-white font-mono">{Math.round(forecast?.sprintVelocity || 80)}%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[#857C91] text-[9px] uppercase font-mono">Estimated Delays</span>
                    <span className="text-amber-300 font-mono text-[10px]">
                      {delaysList.length > 0 ? `${delaysList.length} members flagged` : "None predicted"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Adaptive AI Recommendation Feed */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-5 hover:border-[#F2C1A3]/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider">Insight Stream</span>
                  <h3 className="text-white text-base font-serif font-light">Adaptive Recommendations</h3>
                </div>
                <Zap size={16} className="text-[#F2C1A3]" />
              </div>

              <div className="flex flex-col gap-3 py-1">
                {recsFeed.length === 0 ? (
                  <span className="text-[10px] text-[#857C91] font-light">Telemetry engine gathering initial recommendation data...</span>
                ) : (
                  recsFeed.map((rec: string, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 text-xs font-light text-[#857C91] text-left leading-relaxed flex items-start gap-2.5">
                      <Zap size={12} className="text-[#F2C1A3] shrink-0 mt-0.5 animate-pulse" />
                      <span>{rec}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
          
        </div>
      )}

      {/* 2. Unified Telemetry Insights Stream */}
      <div className="flex flex-col gap-4 mt-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#857C91] text-left">Realtime Recommendations Feed</span>
        
        {insights.length === 0 && !loading ? (
          <div className="p-8 rounded-3xl border border-white/5 bg-[#141523]/45 text-center text-xs font-light text-[#857C91]">
            No critical active alerts or recommendations registered for this workspace. Good job!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins, idx) => (
              <motion.div
                key={ins.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-5 rounded-3xl border text-left flex gap-4 ${
                  ins.severity === "critical" ? "border-red-500/25 bg-red-500/[0.02]" :
                  ins.severity === "warning" ? "border-amber-500/20 bg-amber-500/[0.01]" :
                  "border-white/5 bg-white/[0.01]"
                }`}
              >
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase text-[#F2C1A3]">{ins.insightType}</span>
                    <span className="text-[9px] font-mono text-[#857C91]">Confidence: {Math.round((ins.confidenceScore || 0.8) * 100)}%</span>
                  </div>
                  <h4 className="text-white text-sm font-serif font-light">{ins.title}</h4>
                  <p className="text-[11px] text-[#857C91] leading-relaxed font-light">{ins.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
