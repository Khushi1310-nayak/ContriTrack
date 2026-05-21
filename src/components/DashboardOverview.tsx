"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, Check, Users, ShieldCheck, Github, Layers, Sparkles, 
  ArrowRight, Plus, Calendar, Settings, Play 
} from "lucide-react";

interface StatsCard {
  title: string;
  val: string;
  sub: string;
  icon: React.ComponentType<any>;
  accent: string;
}

interface ContributorStat {
  name: string;
  pct: number;
  col: string;
}

interface AIInsight {
  title: string;
  desc: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
}

interface ActivityNote {
  id: string;
  text: string;
  time: string;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: string | null | Date;
  labels?: string;
}

interface DashboardOverviewProps {
  cards: StatsCard[];
  displayStats: ContributorStat[];
  realHeatmapData: number[][];
  tasks: Task[];
  completedTasksCount: number;
  totalTasksCount: number;
  sprintPct: number;
  gitCommits: number;
  gitPRs: number;
  gitIssues: number;
  gitSyncPct: number;
  strokeDashoffset: number;
  realInsights: AIInsight[];
  notifications: ActivityNote[];
  setActiveTab: (tab: string) => void;
  githubConnected: boolean;
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardOverview({
  cards,
  displayStats,
  realHeatmapData,
  tasks,
  completedTasksCount,
  totalTasksCount,
  sprintPct,
  gitCommits,
  gitPRs,
  gitIssues,
  gitSyncPct,
  strokeDashoffset,
  realInsights,
  notifications,
  setActiveTab,
  githubConnected
}: DashboardOverviewProps) {
  
  // A workspace is newly initialized if it has no tasks AND no linked git commits
  const isFreshWorkspace = totalTasksCount === 0 && gitCommits === 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      
      {/* Top Stats Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {cards.map((card, cIdx) => {
          const Icon = card.icon;
          const isAwaiting = card.val.includes("Awaiting") || card.val.includes("No active");
          return (
            <div 
              key={cIdx}
              className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between group hover:border-white/10 transition-all duration-300 relative overflow-hidden"
            >
              {/* Soft card hover accent line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F2C1A3]/0 group-hover:via-[#F2C1A3]/10 to-transparent transition-all duration-500" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#857C91] text-xs font-mono uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.accent} flex items-center justify-center shrink-0`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className={`font-sans text-white font-bold tracking-tight transition-all ${isAwaiting ? "text-[11px] uppercase leading-relaxed text-[#857C91] font-mono tracking-widest" : "text-3xl md:text-4xl"}`}>
                  {card.val}
                </span>
                <span className="text-[10px] text-[#F2C1A3]/75 font-mono flex items-center gap-1">
                  <TrendingUp size={10} /> {card.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conditional rendering based on initialization state */}
      {isFreshWorkspace ? (
        /* Fresh Workspace Onboarding Helper Guides */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6"
        >
          {/* Header Banner */}
          <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/20 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#F2C1A3]/5 blur-3xl pointer-events-none" />
            <div className="flex flex-col gap-1 relative z-10">
              <div className="flex items-center gap-2 text-[#F2C1A3]">
                <Sparkles size={14} className="animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Workspace Initialized</span>
              </div>
              <h3 className="text-white text-base md:text-lg font-serif font-light mt-0.5">Let&apos;s configure your telemetry dashboard</h3>
              <p className="text-[#857C91] text-xs font-light max-w-xl">
                Bridge your workspace to external platforms, set up team roles, and build your initial backlog to start tracking live parity indexes.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 relative z-10">
              <span className="text-[10px] font-mono text-[#857C91]">PROGRESS: 0/4 STEPS</span>
              <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-0 bg-[#F2C1A3] rounded-full" />
              </div>
            </div>
          </div>

          {/* Grid of Onboarding Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Step 1: Connect GitHub */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-sm flex flex-col justify-between items-start text-left hover:border-white/10 transition group h-60">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:text-[#F2C1A3] group-hover:border-[#F2C1A3]/25 transition duration-300">
                  <Github size={18} />
                </div>
                <h4 className="text-white text-sm font-serif font-medium mt-1">Connect GitHub</h4>
                <p className="text-[#857C91] text-[11px] font-light leading-relaxed">
                  Bridge your active repository to sync engineering commits, pull requests, and file telemetry.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("projects")}
                className="text-[11px] font-mono text-[#F2C1A3] flex items-center gap-1 hover:underline cursor-pointer group-hover:gap-1.5 transition-all mt-4"
              >
                <span>Link Repository</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Step 2: Create First Task */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-sm flex flex-col justify-between items-start text-left hover:border-white/10 transition group h-60">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:text-[#F8CCAA] group-hover:border-[#F8CCAA]/25 transition duration-300">
                  <Plus size={18} />
                </div>
                <h4 className="text-white text-sm font-serif font-medium mt-1">Create First Task</h4>
                <p className="text-[#857C91] text-[11px] font-light leading-relaxed">
                  Establish deliverables and backlog requirements in the Kanban board to track active sprints.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("tasks")}
                className="text-[11px] font-mono text-[#F8CCAA] flex items-center gap-1 hover:underline cursor-pointer group-hover:gap-1.5 transition-all mt-4"
              >
                <span>Add Task</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Step 3: Invite Team Members */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-sm flex flex-col justify-between items-start text-left hover:border-white/10 transition group h-60">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:text-[#CD9FA0] group-hover:border-[#CD9FA0]/25 transition duration-300">
                  <Users size={18} />
                </div>
                <h4 className="text-white text-sm font-serif font-medium mt-1">Invite Team Members</h4>
                <p className="text-[#857C91] text-[11px] font-light leading-relaxed">
                  Add collaborators to enable peer contribution indexes and advanced team parity metrics.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("team")}
                className="text-[11px] font-mono text-[#CD9FA0] flex items-center gap-1 hover:underline cursor-pointer group-hover:gap-1.5 transition-all mt-4"
              >
                <span>Go to Roster</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Step 4: Setup Sprint */}
            <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-sm flex flex-col justify-between items-start text-left hover:border-white/10 transition group h-60">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:text-[#F2C1A3] group-hover:border-[#F2C1A3]/25 transition duration-300">
                  <Calendar size={18} />
                </div>
                <h4 className="text-white text-sm font-serif font-medium mt-1">Setup Sprint</h4>
                <p className="text-[#857C91] text-[11px] font-light leading-relaxed">
                  Schedule reviews, planning, and standup meetings to calculate real speaker/collaboration times.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("meetings")}
                className="text-[11px] font-mono text-[#F2C1A3] flex items-center gap-1 hover:underline cursor-pointer group-hover:gap-1.5 transition-all mt-4"
              >
                <span>Schedule Meeting</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Full Dashboard Overview widgets */
        <div className="flex flex-col gap-6 md:gap-8">
          
          {/* Middle Charts Grid section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
            
            {/* Left Block: Contribution Overview (8 Columns) */}
            <div className="col-span-1 lg:col-span-8 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left min-h-[350px]">
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#F2C1A3] uppercase tracking-widest block font-semibold mb-0.5">Contribution Overview</span>
                  <h3 className="text-white text-base font-serif font-light">Individual Student Contribution</h3>
                </div>
              </div>

              {displayStats.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-3xl bg-[#111221]/10 gap-3 min-h-[200px]">
                  <Users size={28} className="text-[#CD9FA0]" />
                  <h4 className="text-white text-xs font-serif font-light">No Collaborator Telemetry Registered</h4>
                  <p className="text-[10px] text-[#857C91] max-w-sm leading-relaxed">
                    Bridge your active GitHub repository or invite workspace collaborators on the team panel to populate peer parity scores.
                  </p>
                </div>
              ) : (
                <div className="flex items-end justify-between gap-3 h-48 md:h-56 mt-4">
                  {displayStats.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group relative">
                      
                      {/* Hover percentage marker */}
                      <div className="opacity-0 group-hover:opacity-100 py-1 px-2 rounded bg-[#1b1c2b] border border-white/10 text-[9px] font-mono text-white transition-opacity duration-300 absolute -translate-y-20 shadow-lg z-10 whitespace-nowrap">
                        {item.pct}% Parity
                      </div>

                      {/* Glowing height bar */}
                      <div 
                        className={`w-full rounded-t-xl transition-all duration-700 relative ${item.col} shadow-[0_0_15px_rgba(242,193,163,0.02)] group-hover:shadow-[0_0_20px_rgba(242,193,163,0.1)]`}
                        style={{ height: `${Math.max(15, item.pct)}%` }}
                      />

                      {/* Avatar and name */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="w-6 h-6 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center text-[8px] font-bold text-white group-hover:border-[#F2C1A3] transition">
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[#857C91] text-[9px] font-light group-hover:text-white transition">{item.name}</span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Block: Heatmap Activity Grid (4 Columns) */}
            <div className="col-span-1 lg:col-span-4 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#CD9FA0] uppercase tracking-widest block font-semibold mb-0.5">Activity Heatmap</span>
                  <h3 className="text-white text-base font-serif font-light">Contribution Spots</h3>
                </div>
              </div>

              {/* Heatmap calendar grid */}
              <div className="flex flex-col gap-2.5 mt-2">
                <div className="flex justify-between items-center gap-1 text-[9px] text-[#857C91] font-mono">
                  <span>12 AM</span>
                  <span>8 AM</span>
                  <span>4 PM</span>
                  <span>8 PM</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {realHeatmapData.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1 items-center justify-between">
                      <span className="text-[8px] font-mono text-[#857C91] w-3">{days[rowIdx]}</span>
                      <div className="flex-1 flex gap-1 justify-between">
                        {row.map((val, valIdx) => {
                          let bg = "bg-white/[0.02] border border-white/5";
                          if (val === 1) bg = "bg-[#CD9FA0]/20 border border-[#CD9FA0]/10";
                          if (val === 2) bg = "bg-[#CD9FA0]/40 border border-[#CD9FA0]/20";
                          if (val === 3) bg = "bg-[#F2C1A3]/60 border border-[#F2C1A3]/30";
                          if (val === 4) bg = "bg-[#F2C1A3] border border-white/10 shadow-[0_0_8px_rgba(242,193,163,0.3)]";
                          return (
                            <div 
                              key={valIdx} 
                              className={`flex-1 aspect-square rounded-sm transition duration-300 hover:scale-125 cursor-default ${bg}`}
                              title={`Activity volume: ${val}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-3 text-[9px] text-[#857C91] font-mono">
                  <span>Low</span>
                  <div className="w-2 h-2 rounded bg-white/[0.02] border border-white/5" />
                  <div className="w-2 h-2 rounded bg-[#CD9FA0]/30" />
                  <div className="w-2 h-2 rounded bg-[#F2C1A3]/60" />
                  <div className="w-2 h-2 rounded bg-[#F2C1A3]" />
                  <span>High</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Tasks, Git Gauge, and Sprint grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
            
            {/* Left Upcoming Tasks block (5 columns) */}
            <div className="col-span-1 lg:col-span-5 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h3 className="text-white text-sm font-serif font-light">Upcoming Tasks</h3>
                <button onClick={() => setActiveTab("tasks")} className="text-[10px] text-[#F2C1A3] font-mono hover:underline">View All</button>
              </div>

              <div className="flex flex-col gap-3 my-2">
                {tasks.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-[#857C91] text-xs font-light">
                    No pending tasks in this sprint
                  </div>
                ) : (
                  tasks.slice(0, 3).map((task) => (
                    <div 
                      key={task.id}
                      className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[9px] text-[#857C91] group-hover:border-[#F2C1A3] transition">
                          <Check size={8} className="opacity-0 group-hover:opacity-100 text-[#F2C1A3] transition" />
                        </div>
                        <div className="flex flex-col items-start leading-snug">
                          <span className="text-xs text-white font-medium group-hover:text-[#F8CCAA] transition">{task.title}</span>
                          <span className="text-[9px] text-[#857C91] font-mono font-light mt-0.5">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"} • {task.labels || "Task"}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${
                        task.priority === "urgent" || task.priority === "high"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : "bg-[#CD9FA0]/15 text-[#CD9FA0] border border-[#CD9FA0]/20"
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Center GitHub sync progress block (4 columns) */}
            <div className="col-span-1 lg:col-span-4 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h3 className="text-white text-sm font-serif font-light">GitHub Overview</h3>
              </div>

              <div className="grid grid-cols-12 gap-4 items-center my-2">
                <div className="col-span-7 flex flex-col gap-3 text-xs font-light">
                  <div className="flex justify-between items-center pr-2">
                    <span className="text-[#857C91] flex items-center gap-1.5"><Github size={11} /> Commits</span>
                    <span className="text-white font-mono font-medium">{gitCommits}</span>
                  </div>
                  <div className="flex justify-between items-center pr-2">
                    <span className="text-[#857C91] flex items-center gap-1.5"><Layers size={11} /> Pull Requests</span>
                    <span className="text-white font-mono font-medium">{gitPRs}</span>
                  </div>
                  <div className="flex justify-between items-center pr-2">
                    <span className="text-[#857C91] flex items-center gap-1.5"><Check size={11} /> Issues Closed</span>
                    <span className="text-white font-mono font-medium">{gitIssues}</span>
                  </div>
                </div>

                {/* Custom SVG radial sync gauge */}
                <div className="col-span-5 flex flex-col items-center justify-center relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-white/5 fill-transparent" strokeWidth="4" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      className="stroke-[#F2C1A3] fill-transparent transition-all duration-1000" 
                      strokeWidth="4" 
                      strokeDasharray="213" 
                      strokeDashoffset={strokeDashoffset} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center leading-none mt-1">
                    <span className="text-white font-serif text-sm font-semibold">{gitSyncPct}%</span>
                    <span className="text-[#857C91] text-[6px] font-mono mt-0.5 uppercase tracking-widest">Sync</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-[9px] text-[#F8CCAA] font-mono font-light">
                <ShieldCheck size={12} className="text-[#F2C1A3]" />
                <span>All repositories synced in real-time</span>
              </div>
            </div>

            {/* Right Sprint Checklist Block (3 columns) */}
            <div className="col-span-1 lg:col-span-3 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h3 className="text-white text-sm font-serif font-light">Sprint Progress</h3>
                <span className="text-[#CD9FA0] text-[9px] font-mono uppercase font-bold">Active Sprint</span>
              </div>

              <div className="flex flex-col gap-2 my-2">
                <div className="flex justify-between items-center text-[10px] text-[#857C91]">
                  <span>Velocity completed</span>
                  <span className="text-white font-mono font-semibold">{sprintPct}%</span>
                </div>
                
                {/* Progress slider bar */}
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#CD9FA0] to-[#F2C1A3] rounded-full transition-all duration-500" 
                    style={{ width: `${sprintPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col leading-tight">
                    <span className="text-white font-mono font-semibold text-sm">{totalTasksCount}</span>
                    <span className="text-[#857C91] text-[8px] uppercase tracking-wider mt-0.5">Total Tasks</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col leading-tight">
                    <span className="text-[#F2C1A3] font-mono font-semibold text-sm">{completedTasksCount}</span>
                    <span className="text-[#857C91] text-[8px] uppercase tracking-wider mt-0.5">Completed</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* AI Insights & Activities Row layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
            
            {/* AI insights sidebar widget (6 columns) */}
            <div className="col-span-1 lg:col-span-6 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <span className="text-[10px] font-mono text-[#F2C1A3] uppercase tracking-widest block font-semibold">AI Insights (Beta)</span>
                <button onClick={() => setActiveTab("ai-insights")} className="text-[9px] text-[#CD9FA0] font-mono uppercase tracking-widest hover:underline">View Details</button>
              </div>

              <div className="flex flex-col gap-3 my-2">
                {realInsights.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-[#857C91] text-xs font-light">
                    Awaiting more tracking activity to generate insights
                  </div>
                ) : (
                  realInsights.map((insight, inIdx) => {
                    const InsIcon = insight.icon;
                    return (
                      <div key={inIdx} className={`p-3.5 rounded-2xl ${insight.bg} border border-white/5 flex items-start gap-3`}>
                        <div className={`p-2 rounded-xl bg-white/[0.02] border border-white/10 ${insight.color} shrink-0`}>
                          <InsIcon size={12} />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${insight.color}`}>{insight.title}</span>
                          <span className="text-white/80 text-xs font-light mt-0.5">{insight.desc}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent activities widget log (6 columns) */}
            <div className="col-span-1 lg:col-span-6 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 backdrop-blur-md flex flex-col justify-between text-left">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <h3 className="text-white text-sm font-serif font-light">Team Activity</h3>
                <button onClick={() => setActiveTab("notifications")} className="text-[10px] text-[#F2C1A3] font-mono hover:underline">See All</button>
              </div>

              <div className="flex flex-col gap-3 my-2">
                {notifications.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-[#857C91] text-xs font-light">
                    No recent team activity logs
                  </div>
                ) : (
                  notifications.slice(0, 3).map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#CD9FA0]/20 flex items-center justify-center text-[8px] text-[#CD9FA0] font-mono font-bold">
                          {note.text.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs text-white/80 font-light truncate max-w-[280px]">{note.text}</span>
                      </div>
                      <span className="text-[9px] text-[#857C91] font-mono">{note.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
