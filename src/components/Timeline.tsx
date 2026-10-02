"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Github, 
  List, 
  Activity, 
  FileText,
  Check,
  ShieldCheck,
  GitBranch,
  GitCommit,
  Sparkles,
  ArrowRight,
  Clock,
  Flame
} from "lucide-react";

interface StepItem {
  icon: React.ElementType;
  step: string;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
  glow: string;
  visual: string;
  badge: string;
}

const steps: StepItem[] = [
  {
    icon: Users,
    step: "01",
    title: "Create Team Workspace",
    subtitle: "Assemble teams & define roles",
    desc: "Define member responsibilities, configure collaboration channels, and establish active contribution baselines in a beautiful glassmorphic academic workspace.",
    color: "#F2C1A3",
    glow: "rgba(242, 193, 163, 0.15)",
    visual: "workspace",
    badge: "Step 01 · Setup"
  },
  {
    icon: Github,
    step: "02",
    title: "Connect GitHub Instantly",
    subtitle: "Automatic code telemetry tracking",
    desc: "Sync repositories securely via OAuth. ContriTrack compiles commits, branches, pull requests, and code lines automatically with zero manual entry.",
    color: "#F8CCAA",
    glow: "rgba(248, 204, 170, 0.15)",
    visual: "github",
    badge: "Step 02 · Telemetry"
  },
  {
    icon: List,
    step: "03",
    title: "Assign & Track Tasks",
    subtitle: "Synchronized Kanban workflows",
    desc: "Create task cards, delegate features, and schedule deadlines on interactive Kanban columns that link developer activity logs directly to task statuses.",
    color: "#CD9FA0",
    glow: "rgba(205, 159, 160, 0.15)",
    visual: "tasks",
    badge: "Step 03 · Execution"
  },
  {
    icon: Activity,
    step: "04",
    title: "Monitor Contribution Balance",
    subtitle: "Live team performance metrics",
    desc: "Examine active contribution scores, radial completion meters, and leaderboards. Make sure credits are distributed transparently and fairly.",
    color: "#857C91",
    glow: "rgba(133, 124, 145, 0.15)",
    visual: "metrics",
    badge: "Step 04 · Parity Analysis"
  },
  {
    icon: FileText,
    step: "05",
    title: "Export Professor-Ready PDF",
    subtitle: "One-click certified audit reports",
    desc: "Generate professional collaboration logs containing GitHub heatmaps, Kanban checklists, and grading insights verified for institutional review.",
    color: "#F2C1A3",
    glow: "rgba(242, 193, 163, 0.15)",
    visual: "reports",
    badge: "Step 05 · Verification"
  }
];

const stepColorMap: Record<string, { 
  text: string; 
  bg: string; 
  border: string; 
  glowBorder: string;
  pillBg: string;
  shadow: string;
}> = {
  "#F2C1A3": {
    text: "text-[#F2C1A3]",
    bg: "bg-[#F2C1A3]",
    border: "border-[#F2C1A3]/30",
    glowBorder: "border-[#F2C1A3]/60",
    pillBg: "bg-[#F2C1A3]/10",
    shadow: "shadow-[0_0_25px_rgba(242,193,163,0.2)]"
  },
  "#F8CCAA": {
    text: "text-[#F8CCAA]",
    bg: "bg-[#F8CCAA]",
    border: "border-[#F8CCAA]/30",
    glowBorder: "border-[#F8CCAA]/60",
    pillBg: "bg-[#F8CCAA]/10",
    shadow: "shadow-[0_0_25px_rgba(248,204,170,0.2)]"
  },
  "#CD9FA0": {
    text: "text-[#CD9FA0]",
    bg: "bg-[#CD9FA0]",
    border: "border-[#CD9FA0]/30",
    glowBorder: "border-[#CD9FA0]/60",
    pillBg: "bg-[#CD9FA0]/10",
    shadow: "shadow-[0_0_25px_rgba(205,159,160,0.2)]"
  },
  "#857C91": {
    text: "text-[#857C91]",
    bg: "bg-[#857C91]",
    border: "border-[#857C91]/30",
    glowBorder: "border-[#857C91]/60",
    pillBg: "bg-[#857C91]/10",
    shadow: "shadow-[0_0_25px_rgba(133,124,145,0.2)]"
  }
};

/* -------------------------------------------------------------
   VISUAL CARDS: Beautiful, crisp, glassmorphic interactive cards
-------------------------------------------------------------- */
function renderStepVisual(step: StepItem) {
  if (step.visual === "workspace") {
    return (
      <div className="flex flex-col gap-3 w-full text-left">
        {/* Card Header */}
        <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wide text-white/90 font-medium">CS101 Workspace #4</span>
          </div>
          <span className="text-[10px] font-mono text-[#F2C1A3] bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 px-2 py-0.5 rounded-full">
            Active Sprint
          </span>
        </div>

        {/* Member Rows */}
        <div className="flex flex-col gap-2 pt-1">
          {[
            { name: "Aanya S.", role: "Team Lead", status: "Reviewing Sprint", tag: "Lead", color: "bg-[#F2C1A3]/20 text-[#F2C1A3] border-[#F2C1A3]/30" },
            { name: "Rohan V.", role: "Core Developer", status: "Pushed 4 commits", tag: "Code", color: "bg-[#F8CCAA]/20 text-[#F8CCAA] border-[#F8CCAA]/30" },
            { name: "Kabir M.", role: "Data Analyst", status: "Verified Metrics", tag: "Audit", color: "bg-[#CD9FA0]/20 text-[#CD9FA0] border-[#CD9FA0]/30" }
          ].map((user, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-white text-[11px] font-semibold">
                  {user.name[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-medium leading-tight">{user.name}</span>
                  <span className="text-[#857C91] text-[10px] font-light mt-0.5">{user.status}</span>
                </div>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${user.color}`}>
                {user.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.visual === "github") {
    return (
      <div className="flex flex-col gap-3 w-full text-left">
        {/* Repo Header */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Github size={15} className="text-[#F8CCAA]" />
            <span className="text-xs font-mono text-white/90 font-medium">team/contritrack-core</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F8CCAA] bg-[#F8CCAA]/10 px-2 py-0.5 rounded-md border border-[#F8CCAA]/20">
            <GitBranch size={10} />
            <span>main</span>
          </div>
        </div>

        {/* Commit Heatmap Grid */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#857C91]">
            <span className="flex items-center gap-1.5 text-white/80">
              <GitCommit size={11} className="text-[#F8CCAA]" />
              Commit Velocity
            </span>
            <span className="text-emerald-400 font-semibold">+4,280 / -340</span>
          </div>

          <div className="grid grid-cols-12 gap-1.5 pt-1">
            {[...Array(24)].map((_, i) => {
              const opacity = i % 5 === 0 ? "bg-[#F8CCAA] shadow-[0_0_8px_rgba(248,204,170,0.5)]" : 
                              i % 3 === 0 ? "bg-[#CD9FA0] opacity-80" : 
                              i % 2 === 0 ? "bg-[#F2C1A3] opacity-40" : 
                              "bg-white/[0.05]";
              return (
                <div 
                  key={i} 
                  className={`h-3 rounded-[3px] transition-transform hover:scale-125 duration-150 ${opacity}`}
                  title={`Day activity block ${i + 1}`}
                />
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-[#857C91] pt-1 border-t border-white/[0.04]">
            <span>Synced 12 seconds ago</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Check size={9} /> Verified SHA-256
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (step.visual === "tasks") {
    return (
      <div className="flex flex-col gap-3 w-full text-left">
        {/* Sprint Status Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-white/[0.08]">
          <span className="text-white/80 font-medium flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#CD9FA0]" />
            Sprint 4 Kanban Board
          </span>
          <span className="text-[#CD9FA0] font-semibold">80% Done</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "80%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#F2C1A3] via-[#CD9FA0] to-emerald-400 rounded-full"
          />
        </div>

        {/* Task Cards */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CD9FA0]" />
              <span className="text-xs text-white/90 font-medium">Supabase Auth & Session Refresh</span>
            </div>
            <span className="text-[9px] font-mono text-[#CD9FA0] bg-[#CD9FA0]/10 px-2 py-0.5 rounded-md border border-[#CD9FA0]/20">
              In Progress
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-400/[0.02] border border-emerald-400/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Check size={10} />
              </div>
              <span className="text-xs text-white/90 font-medium">Database Indexing & Caching Layer</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
              Completed
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (step.visual === "metrics") {
    return (
      <div className="flex flex-col gap-3 w-full text-left">
        {/* Metrics Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <span className="text-xs font-mono text-white/90 font-medium flex items-center gap-1.5">
            <Flame size={13} className="text-[#857C91]" />
            Team Parity & Fairness Index
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
            Jain&apos;s Score: 94%
          </span>
        </div>

        {/* Dual Gauge & Breakdown */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          {/* Radial meter */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="transparent" />
              <motion.circle 
                cx="32" 
                cy="32" 
                r="26" 
                stroke="#CD9FA0" 
                strokeWidth="4" 
                fill="transparent" 
                strokeDasharray={163} 
                initial={{ strokeDashoffset: 163 }}
                whileInView={{ strokeDashoffset: 163 - (163 * 94) / 100 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-white font-serif font-bold">94%</span>
            </div>
          </div>

          {/* Member contribution bars */}
          <div className="flex-1 flex flex-col gap-2">
            {[
              { name: "Aanya", percent: "34%", color: "bg-[#F2C1A3]" },
              { name: "Rohan", percent: "33%", color: "bg-[#F8CCAA]" },
              { name: "Kabir", percent: "33%", color: "bg-[#CD9FA0]" }
            ].map((m, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-white/70">{m.name}</span>
                  <span className="text-white font-medium">{m.percent}</span>
                </div>
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: m.percent }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-[#857C91]">
          <span className="flex items-center gap-1 text-[#857C91]">
            <Clock size={10} /> 0 late-night fatigue alerts
          </span>
          <span className="text-emerald-400">Equal Contribution</span>
        </div>
      </div>
    );
  }

  if (step.visual === "reports") {
    return (
      <div className="flex flex-col gap-3 w-full text-left">
        {/* Document Seal Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-[#F2C1A3]/10 via-[#CD9FA0]/5 to-transparent border border-[#F2C1A3]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F2C1A3]/20 border border-[#F2C1A3]/40 flex items-center justify-center text-[#F2C1A3]">
              <ShieldCheck size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-serif font-semibold text-white">Certified Audit Dossier</span>
              <span className="text-[10px] font-mono text-[#F2C1A3]">Institutional Grade PDF</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/10">
            v2.4 Certified
          </span>
        </div>

        {/* Audit Details */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2 text-[10px] font-mono">
          <div className="flex justify-between text-white/70 pb-1.5 border-b border-white/[0.04]">
            <span>Audit Checksum</span>
            <span className="text-white font-mono">0x9F4B...72A1</span>
          </div>
          <div className="flex justify-between text-white/70 pb-1.5 border-b border-white/[0.04]">
            <span>Git Integrity Hash</span>
            <span className="text-emerald-400 font-mono">100% Verified</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Evaluation Target</span>
            <span className="text-[#F2C1A3]">Professor Evaluation</span>
          </div>
        </div>

        {/* Download action button */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#F2C1A3]/40 hover:bg-white/[0.06] transition-all cursor-pointer group/btn">
          <span className="text-xs text-white/90 font-medium pl-1">Download certified_report.pdf</span>
          <div className="w-6 h-6 rounded-lg bg-[#F2C1A3]/20 flex items-center justify-center text-[#F2C1A3] group-hover/btn:translate-x-0.5 transition-transform">
            <ArrowRight size={12} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function Timeline() {
  return (
    <section id="how-it-works" className="relative w-full max-w-7xl mx-auto px-6 py-24 md:py-36 overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-[#CD9FA0] opacity-[0.03] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 -z-10 h-[500px] w-[500px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[140px] pointer-events-none" />

      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-20 md:mb-32">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono tracking-wider text-[#F2C1A3] mb-5 cursor-default hover:bg-white/[0.06] transition duration-300"
        >
          <Sparkles size={12} />
          <span>Cinematic Workflow Mechanics</span>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-5xl lg:text-6xl font-normal text-white mb-6 tracking-tight leading-tight font-serif"
        >
          How ContriTrack Works
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#857C91] text-sm md:text-base lg:text-lg font-light leading-relaxed max-w-2xl mx-auto"
        >
          From workspace creation to certified grading dossiers, every phase of student collaboration is tracked with mathematical precision.
        </motion.p>
      </div>

      {/* =========================================================================
          DESKTOP TIMELINE (Visible on md and up): Absolutely centered spine with
          dedicated left and right columns that NEVER overlap.
      ========================================================================= */}
      <div className="hidden md:block relative w-full mt-10">
        
        {/* Central Spine Line (Continuous) */}
        <div className="absolute left-1/2 top-8 bottom-12 -translate-x-1/2 w-[2px] bg-white/[0.06] z-0" />
        
        {/* Animated Glowing Spine Fill */}
        <motion.div 
          className="absolute left-1/2 top-8 bottom-12 -translate-x-1/2 w-[2px] bg-gradient-to-b from-[#F2C1A3] via-[#CD9FA0] to-[#F8CCAA] origin-top z-0"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />

        {/* Steps Container */}
        <div className="flex flex-col gap-28 lg:gap-36 w-full relative z-10">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            const isEven = idx % 2 === 0;
            const colors = stepColorMap[step.color] || stepColorMap["#F2C1A3"];

            return (
              <div 
                key={idx}
                className="w-full relative flex items-center justify-between"
              >
                {/* 1. LEFT HALF (Width 50%, right-aligned with generous padding from center spine) */}
                <div className="w-1/2 pr-16 lg:pr-20 flex justify-end">
                  {isEven ? (
                    /* EVEN: Text on Left */
                    <motion.div 
                      initial={{ opacity: 0, x: -35 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "200px 0px" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col items-end text-right max-w-md"
                    >
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase font-semibold px-2.5 py-1 rounded-full ${colors.pillBg} ${colors.text} border ${colors.border} mb-3`}>
                        {step.badge}
                      </span>
                      <h3 className="text-2xl lg:text-3xl font-normal text-white font-serif tracking-tight mb-2">
                        {step.title}
                      </h3>
                      <span className="text-[#F8CCAA] text-xs lg:text-sm font-medium tracking-wide mb-3">
                        {step.subtitle}
                      </span>
                      <p className="text-[#857C91] text-xs lg:text-sm font-light leading-relaxed">
                        {step.desc}
                      </p>
                    </motion.div>
                  ) : (
                    /* ODD: Visual Card on Left */
                    <motion.div 
                      initial={{ opacity: 0, x: -35, scale: 0.96 }}
                      whileInView={{ opacity: 1, x: 0, scale: 1 }}
                      viewport={{ once: true, margin: "200px 0px" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className={`w-full max-w-md rounded-2xl border ${colors.border} hover:${colors.glowBorder} bg-[#161726]/80 backdrop-blur-xl shadow-2xl p-5 lg:p-6 transition-all duration-300 relative group/card`}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                      <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none ${colors.bg}`} />
                      {renderStepVisual(step)}
                    </motion.div>
                  )}
                </div>

                {/* 2. CENTER NODE: Anchor exactly at 50% */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    
                    {/* Concentric Halo Radar Effect */}
                    <div className={`absolute -inset-3 rounded-full opacity-40 animate-ping border ${colors.border}`} />
                    <div className={`absolute -inset-1.5 rounded-full opacity-60 border ${colors.border}`} />

                    {/* Main Circle Node */}
                    <motion.div 
                      initial={{ scale: 0.7, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={`w-12 h-12 rounded-full bg-[#12131e] border-2 ${colors.border} flex items-center justify-center text-white ${colors.shadow} relative z-10`}
                    >
                      <IconComponent size={18} className={colors.text} />
                    </motion.div>

                    {/* Subtle Horizontal Connector to the Card */}
                    {isEven ? (
                      /* Connect to Right Card */
                      <div className={`hidden lg:block absolute left-full top-1/2 -translate-y-1/2 w-16 h-[2px] bg-gradient-to-r from-[#F2C1A3]/80 to-transparent pointer-events-none`} />
                    ) : (
                      /* Connect to Left Card */
                      <div className={`hidden lg:block absolute right-full top-1/2 -translate-y-1/2 w-16 h-[2px] bg-gradient-to-l from-[#F2C1A3]/80 to-transparent pointer-events-none`} />
                    )}
                  </div>
                </div>

                {/* 3. RIGHT HALF (Width 50%, left-aligned with generous padding from center spine) */}
                <div className="w-1/2 pl-16 lg:pl-20 flex justify-start">
                  {isEven ? (
                    /* EVEN: Visual Card on Right */
                    <motion.div 
                      initial={{ opacity: 0, x: 35, scale: 0.96 }}
                      whileInView={{ opacity: 1, x: 0, scale: 1 }}
                      viewport={{ once: true, margin: "200px 0px" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className={`w-full max-w-md rounded-2xl border ${colors.border} hover:${colors.glowBorder} bg-[#161726]/80 backdrop-blur-xl shadow-2xl p-5 lg:p-6 transition-all duration-300 relative group/card`}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none ${colors.bg}`} />
                      {renderStepVisual(step)}
                    </motion.div>
                  ) : (
                    /* ODD: Text on Right */
                    <motion.div 
                      initial={{ opacity: 0, x: 35 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "200px 0px" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col items-start text-left max-w-md"
                    >
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase font-semibold px-2.5 py-1 rounded-full ${colors.pillBg} ${colors.text} border ${colors.border} mb-3`}>
                        {step.badge}
                      </span>
                      <h3 className="text-2xl lg:text-3xl font-normal text-white font-serif tracking-tight mb-2">
                        {step.title}
                      </h3>
                      <span className="text-[#F8CCAA] text-xs lg:text-sm font-medium tracking-wide mb-3">
                        {step.subtitle}
                      </span>
                      <p className="text-[#857C91] text-xs lg:text-sm font-light leading-relaxed">
                        {step.desc}
                      </p>
                    </motion.div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          MOBILE TIMELINE (Visible on < md): Clean vertical line on the left,
          all nodes and cards neatly stacked with zero overlapping.
      ========================================================================= */}
      <div className="md:hidden relative w-full mt-6 pl-4">
        
        {/* Left vertical spine */}
        <div className="absolute left-[26px] top-6 bottom-8 w-[2px] bg-white/[0.08]" />
        
        <div className="flex flex-col gap-12 w-full">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            const colors = stepColorMap[step.color] || stepColorMap["#F2C1A3"];

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
                className="relative flex items-start gap-4"
              >
                {/* Node on the spine */}
                <div className="relative z-10 shrink-0">
                  <div className={`w-9 h-9 rounded-full bg-[#12131e] border-2 ${colors.border} flex items-center justify-center text-white ${colors.shadow}`}>
                    <IconComponent size={14} className={colors.text} />
                  </div>
                </div>

                {/* Step Content & Card */}
                <div className="flex-1 flex flex-col gap-3 pt-0.5">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${colors.pillBg} ${colors.text} border ${colors.border} w-fit`}>
                      {step.badge}
                    </span>
                    <h3 className="text-xl font-normal text-white font-serif tracking-tight mt-1">
                      {step.title}
                    </h3>
                    <span className="text-[#F8CCAA] text-xs font-medium">
                      {step.subtitle}
                    </span>
                    <p className="text-[#857C91] text-xs font-light leading-relaxed mt-0.5">
                      {step.desc}
                    </p>
                  </div>

                  {/* Card Container */}
                  <div className={`w-full rounded-xl border ${colors.border} bg-[#161726]/80 backdrop-blur-md p-4 shadow-xl relative overflow-hidden mt-1`}>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                    {renderStepVisual(step)}
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>

      </div>

    </section>
  );
}
