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
  Lock,
  Shield
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
}

const steps: StepItem[] = [
  {
    icon: Users,
    step: "01",
    title: "Create Team Workspace",
    subtitle: "Assemble teams & define roles",
    desc: "Define member responsibilities, configure collaboration channels, and establish active contribution baselines in a beautiful glassmorphic academic workspace.",
    color: "#F2C1A3",
    glow: "rgba(242, 193, 163, 0.08)",
    visual: "workspace"
  },
  {
    icon: Github,
    step: "02",
    title: "Connect GitHub Instantly",
    subtitle: "Automatic code telemetry tracking",
    desc: "Sync repositories securely via OAuth. ContriTrack compiles commits, branches, pull requests, and code lines automatically with zero manual entry.",
    color: "#F8CCAA",
    glow: "rgba(248, 204, 170, 0.08)",
    visual: "github"
  },
  {
    icon: List,
    step: "03",
    title: "Assign & Track Tasks",
    subtitle: "Synchronized Kanban workflows",
    desc: "Create task cards, delegate features, and schedule deadlines on interactive Kanban columns that link developer activity logs directly to task statuses.",
    color: "#CD9FA0",
    glow: "rgba(205, 159, 160, 0.08)",
    visual: "tasks"
  },
  {
    icon: Activity,
    step: "04",
    title: "Monitor Contribution Balance",
    subtitle: "Live team performance metrics",
    desc: "Examine active contribution scores, radial completion meters, and leaderboards. Make sure credits are distributed transparently and fairly.",
    color: "#857C91",
    glow: "rgba(133, 124, 145, 0.08)",
    visual: "metrics"
  },
  {
    icon: FileText,
    step: "05",
    title: "Export Professor-Ready PDF",
    subtitle: "One-click certified audit reports",
    desc: "Generate professional collaboration logs containing GitHub heatmaps, Kanban checklists, and grading insights verified for institutional review.",
    color: "#F2C1A3",
    glow: "rgba(242, 193, 163, 0.08)",
    visual: "reports"
  }
];

const stepColorStyles: Record<string, { text: string; bg: string; border: string; borderPulse: string; borderRing: string }> = {
  "#F2C1A3": {
    text: "text-[#F2C1A3]",
    bg: "bg-[#F2C1A3]",
    border: "border-[#F2C1A3]",
    borderPulse: "border-[#F2C1A3]/40",
    borderRing: "border-[#F2C1A3]/20"
  },
  "#F8CCAA": {
    text: "text-[#F8CCAA]",
    bg: "bg-[#F8CCAA]",
    border: "border-[#F8CCAA]",
    borderPulse: "border-[#F8CCAA]/40",
    borderRing: "border-[#F8CCAA]/20"
  },
  "#CD9FA0": {
    text: "text-[#CD9FA0]",
    bg: "bg-[#CD9FA0]",
    border: "border-[#CD9FA0]",
    borderPulse: "border-[#CD9FA0]/40",
    borderRing: "border-[#CD9FA0]/20"
  },
  "#857C91": {
    text: "text-[#857C91]",
    bg: "bg-[#857C91]",
    border: "border-[#857C91]",
    borderPulse: "border-[#857C91]/40",
    borderRing: "border-[#857C91]/20"
  }
};

function renderStepVisual(step: StepItem) {
  if (step.visual === "workspace") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
        <div className="flex justify-between items-center text-[8px] font-mono text-[#857C91] border-b border-white/5 pb-1">
          <span>Workspace</span>
          <span className="text-[#F2C1A3]">active</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { name: "Aanya", role: "Team Lead", icon: "A", bg: "border-[#F2C1A3]/20" },
            { name: "Rohan", role: "Developer", icon: "R", bg: "border-white/5" },
            { name: "Kabir", role: "Analyst", icon: "K", bg: "border-white/5" }
          ].map((user, uIdx) => (
            <div key={uIdx} className={`flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border ${user.bg} text-[9px]`}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-[8px] font-serif">
                  {user.icon}
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-white font-medium">{user.name}</span>
                  <span className="text-[#857C91] text-[7px] font-light mt-0.5">{user.role}</span>
                </div>
              </div>
              <span className="text-[7px] font-mono text-[#857C91]">Active</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.visual === "github") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-xs mx-auto text-left">
        <div className="flex items-center gap-2 bg-white/[0.01] border border-white/5 px-2.5 py-1.5 rounded-lg text-[9px] text-white">
          <Github size={12} className="text-[#F8CCAA]" />
          <span className="font-mono">repo: cs101/project-dashboard</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[7px] font-mono text-[#857C91]">
            <span>Commits Wave Activity</span>
            <span>last 7 days</span>
          </div>
          <div className="grid grid-cols-10 gap-1 justify-center">
            {[...Array(10)].map((_, gridIdx) => {
              const fillClass = 
                gridIdx % 3 === 0 ? "bg-[#F8CCAA]" : 
                gridIdx % 2 === 0 ? "bg-[#CD9FA0]" : 
                "bg-[#525871]/20";
              return (
                <div key={gridIdx} className={`w-2.5 h-2.5 rounded-[1.5px] ${fillClass}`} />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (step.visual === "tasks") {
    return (
      <div className="flex flex-col gap-2 w-full max-w-xs mx-auto text-left">
        <span className="text-[8px] font-mono text-[#857C91] uppercase tracking-wider">Kanban Sprint Board</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-white/5 rounded-lg p-2 bg-white/[0.01]">
            <span className="text-[7px] font-mono text-[#857C91] uppercase block mb-1">In Progress</span>
            <div className="p-1.5 rounded bg-white/5 text-[8px] text-white font-light">
              Verify OAuth Sync
            </div>
          </div>
          <div className="border border-emerald-400/10 rounded-lg p-2 bg-emerald-400/[0.01]">
            <span className="text-[7px] font-mono text-[#857C91] uppercase block mb-1">Completed</span>
            <div className="p-1.5 rounded bg-[#12131e] border border-emerald-400/20 text-[8px] text-white font-medium flex items-center justify-between">
              <span>Database Index</span>
              <Check size={8} className="text-emerald-400 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step.visual === "metrics") {
    return (
      <div className="flex items-center gap-4 w-full max-w-xs mx-auto text-left">
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.02)" strokeWidth="4" fill="transparent" />
            <circle cx="32" cy="32" r="26" stroke="#CD9FA0" strokeWidth="4" fill="transparent" strokeDasharray={163} strokeDashoffset={163 - (163 * 68) / 100} />
          </svg>
          <span className="absolute text-[10px] text-white font-serif font-semibold">68%</span>
        </div>
        <div className="flex-grow flex flex-col gap-1">
          <span className="text-[9px] text-[#CD9FA0] font-mono uppercase tracking-wider">Metrics</span>
          <span className="text-[10px] text-white font-semibold leading-none">Kabir (Analyst)</span>
          <span className="text-[8px] text-[#857C91] font-light leading-relaxed">Score holds verified GitHub check sum telemetry logs.</span>
        </div>
      </div>
    );
  }

  if (step.visual === "reports") {
    return (
      <div className="flex flex-col gap-2 w-full max-w-xs mx-auto text-left relative">
        <div className="h-10 w-full relative flex items-end justify-center">
          <div className="absolute w-24 h-12 rounded border border-white/5 bg-[#12131e]/90 rotate-[-6deg] translate-y-1 opacity-45" />
          <div className="absolute w-24 h-12 rounded border border-[#F2C1A3]/20 bg-[#12131e] flex flex-col justify-between p-1.5 shadow-xl">
            <span className="text-[5px] text-[#F2C1A3] font-serif">Certified Evidence Export</span>
            <div className="flex justify-between items-center text-[4px] text-[#857C91]">
              <span>CS-101 Team 4</span>
              <Lock size={4} />
            </div>
          </div>
        </div>
        <div className="bg-white/[0.01] border border-white/5 rounded-lg p-2 flex items-center justify-between text-[8px]">
          <span className="text-[#857C91] font-light">professor_audit_log.pdf</span>
          <span className="text-[#F2C1A3] font-medium flex items-center gap-0.5">
            <Shield size={8} /> certified
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export default function Timeline() {
  return (
    <section id="how-it-works" className="relative w-full max-w-7xl mx-auto px-6 py-20 md:py-32 overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-[#CD9FA0] opacity-[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 h-[400px] w-[400px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[130px] pointer-events-none" />

      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-20 md:mb-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs font-light text-[#857C91] mb-5 cursor-default hover:bg-white/[0.04] hover:text-white transition duration-300"
        >
          Cinematic workflow mechanics
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-3xl md:text-5xl font-normal text-white mb-6 tracking-tight leading-tight font-serif"
        >
          How ContriTrack Works
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-[#857C91] text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto"
        >
          From team creation to contribution proof, every step is beautifully tracked.
        </motion.p>
      </div>

      {/* Vertical Timeline Structure */}
      <div className="relative mt-12 w-full">
        
        {/* Connection track line down center (Desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-[1px] bg-white/5 z-0" />
        
        {/* Connection line fill effect */}
        <motion.div 
          className="hidden md:block absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-[1px] bg-gradient-to-b from-[#F2C1A3] via-[#CD9FA0] to-[#F8CCAA] origin-top z-0"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />

        {/* Steps Loop */}
        <div className="flex flex-col gap-16 md:gap-24 w-full">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            const isEven = idx % 2 === 0;
            const colors = stepColorStyles[step.color] || stepColorStyles["#F2C1A3"];

            return (
              <div 
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-0 items-center w-full relative z-10"
              >
                {/* Horizontal Connector Arm Left (Desktop) */}
                <div className="hidden md:block absolute right-1/2 top-1/2 -translate-y-1/2 h-[1px] w-20 bg-gradient-to-l from-[#F2C1A3]/50 via-[#CD9FA0]/30 to-transparent z-10 pointer-events-none" />
                
                {/* Horizontal Connector Arm Right (Desktop) */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-y-1/2 h-[1px] w-20 bg-gradient-to-r from-[#F2C1A3]/50 via-[#CD9FA0]/30 to-transparent z-10 pointer-events-none" />

                {/* 1. LEFT COLUMN (Text on even, Visual on odd) */}
                <div className={`col-span-1 md:col-span-5 flex flex-col justify-center ${
                  isEven 
                    ? "md:order-1 md:pr-14 text-left md:text-right items-start md:items-end" 
                    : "md:order-1 md:pr-14 items-center justify-center"
                }`}>
                  {isEven ? (
                    <div className="flex flex-col gap-3 text-left md:text-right items-start md:items-end">
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className={`font-mono text-xs font-semibold tracking-widest ${colors.text}`}
                      >
                        STEP {step.step}
                      </motion.span>

                      <motion.h3 
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-light text-white font-serif tracking-tight"
                      >
                        {step.title}
                      </motion.h3>

                      <motion.span 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15 }}
                        className="text-[#F8CCAA] text-xs font-medium tracking-wide"
                      >
                        {step.subtitle}
                      </motion.span>

                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-[#857C91] text-xs md:text-sm font-light leading-relaxed max-w-sm"
                      >
                        {step.desc}
                      </motion.p>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, x: -30, scale: 0.95 }}
                      whileInView={{ opacity: 1, x: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", damping: 20 }}
                      className="w-full max-w-md aspect-[16/10] rounded-xl border border-white/5 bg-[#171825]/45 hover:bg-[#1a1b2d]/65 shadow-2xl p-4 md:p-5 flex flex-col justify-center overflow-hidden relative group/mock"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover/mock:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-white/[0.005] to-white/[0.01]" />
                      <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full opacity-[0.03] group-hover/mock:opacity-[0.08] transition-opacity duration-700 blur-2xl pointer-events-none ${colors.bg}`} />
                      
                      {renderStepVisual(step)}
                    </motion.div>
                  )}
                </div>

                {/* 2. CENTRAL BULB NODE */}
                <div className="col-span-1 md:col-span-2 relative z-20 flex items-center justify-center py-4 md:py-0">
                  <div className="relative">
                    <div 
                      className={`absolute inset-[-6px] rounded-full opacity-60 border-[1.5px] animate-pulse blur-sm ${colors.borderPulse}`}
                    />
                    
                    <motion.div 
                      initial={{ scale: 0.6, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-[#171825] border border-white/10 text-white shadow-xl relative"
                    >
                      <div 
                        className={`absolute inset-[4px] rounded-full bg-white/[0.02] border ${colors.borderRing}`}
                      />
                      <IconComponent size={14} className={colors.text} />
                    </motion.div>
                  </div>
                </div>

                {/* 3. RIGHT COLUMN (Visual on even, Text on odd) */}
                <div className={`col-span-1 md:col-span-5 flex flex-col justify-center ${
                  isEven 
                    ? "md:order-3 md:pl-14 items-center justify-center" 
                    : "md:order-3 md:pl-14 text-left items-start"
                }`}>
                  {isEven ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 30, scale: 0.95 }}
                      whileInView={{ opacity: 1, x: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", damping: 20 }}
                      className="w-full max-w-md aspect-[16/10] rounded-xl border border-white/5 bg-[#171825]/45 hover:bg-[#1a1b2d]/65 shadow-2xl p-4 md:p-5 flex flex-col justify-center overflow-hidden relative group/mock"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover/mock:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-white/[0.005] to-white/[0.01]" />
                      <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full opacity-[0.03] group-hover/mock:opacity-[0.08] transition-opacity duration-700 blur-2xl pointer-events-none ${colors.bg}`} />
                      
                      {renderStepVisual(step)}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col gap-3 text-left items-start">
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className={`font-mono text-xs font-semibold tracking-widest ${colors.text}`}
                      >
                        STEP {step.step}
                      </motion.span>

                      <motion.h3 
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-light text-white font-serif tracking-tight"
                      >
                        {step.title}
                      </motion.h3>

                      <motion.span 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15 }}
                        className="text-[#F8CCAA] text-xs font-medium tracking-wide"
                      >
                        {step.subtitle}
                      </motion.span>

                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-[#857C91] text-xs md:text-sm font-light leading-relaxed max-w-sm"
                      >
                        {step.desc}
                      </motion.p>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
