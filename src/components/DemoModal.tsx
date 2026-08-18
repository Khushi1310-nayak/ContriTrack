"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Check, 
  Github, 
  Users, 
  Calendar, 
  FileText, 
  Activity, 
  Clock, 
  Lock, 
  Shield 
} from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 6;

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent scroll behind when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Slides controller logic
  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
    setProgress(0);
  };

  const selectSlide = (idx: number) => {
    setCurrentSlide(idx);
    setProgress(0);
  };

  // Timer progression controller (10-second slide timing)
  useEffect(() => {
    if (!isOpen || !isPlaying || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 100; // ms
    const step = (interval / 10000) * 100; // 10s total

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, isHovered, currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Slide content schemas
  const slides = [
    {
      icon: Users,
      badge: "Step 01",
      badgeColor: "text-[#F2C1A3] bg-[#F2C1A3]/10 border-[#F2C1A3]/20",
      title: "Create Your Team Workspace",
      subtitle: "Start collaborative projects with organized workspaces built for transparency.",
      desc: "Assemble teams instantly. Define member roles, configure project repositories, and establish real accountability parameters within a premium academic collaborative space.",
      buttonText: "Setup Workspace"
    },
    {
      icon: Github,
      badge: "Step 02",
      badgeColor: "text-[#F8CCAA] bg-[#F8CCAA]/10 border-[#F8CCAA]/20",
      title: "Connect GitHub Instantly",
      subtitle: "Track commits, pull requests, and contribution activity automatically.",
      desc: "No manual logs required. Sync public or private repositories via secure OAuth, compiling absolute coding telemetry curves and active contribution wave maps.",
      buttonText: "Authorize Repository"
    },
    {
      icon: Clock,
      badge: "Step 03",
      badgeColor: "text-[#CD9FA0] bg-[#CD9FA0]/10 border-[#CD9FA0]/20",
      title: "Assign & Track Tasks",
      subtitle: "Organize responsibilities with beautiful Kanban workflows.",
      desc: "Draft features, assign deadlines, and trace execution pipelines on glassmorphism Kanban columns that synchronize instantly with developer activity logs.",
      buttonText: "Create First Task"
    },
    {
      icon: Activity,
      badge: "Step 04",
      badgeColor: "text-[#857C91] bg-[#857C91]/10 border-[#857C91]/20",
      title: "Monitor Team Contributions",
      subtitle: "Visualize exactly who contributed and how much.",
      desc: "Deep contribution percentages and leaderboard matrices showing real project pace. Keep track of fair performance with state-of-the-art interactive SVG radar curves.",
      buttonText: "Check Performance"
    },
    {
      icon: Calendar,
      badge: "Step 05",
      badgeColor: "text-[#F2C1A3] bg-[#F2C1A3]/10 border-[#F2C1A3]/20",
      title: "Log Meetings & Decisions",
      subtitle: "Keep attendance, meeting notes, and action items beautifully organized.",
      desc: "Log meeting minutes, assign tasks, trace attendance indices, and compile robust checklist arrays that confirm project progress to institutional stakeholders.",
      buttonText: "Schedule Log"
    },
    {
      icon: FileText,
      badge: "Step 06",
      badgeColor: "text-[#F8CCAA] bg-[#F8CCAA]/10 border-[#F8CCAA]/20",
      title: "Export Professor-Ready Reports",
      subtitle: "Generate elegant PDF reports with contribution proof and analytics.",
      desc: "Compile one-click evidence audit portfolios containing GitHub heatmaps, timeline metrics, task tallies, and grading suggestions certified for professor review.",
      buttonText: "Export Certified PDF"
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#12131e]/85 backdrop-blur-2xl flex justify-center items-start md:items-center p-4 md:p-8 select-none">
        
        {/* Soft Ambient Cinematic Background Gradients */}
        <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-[#CD9FA0]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] rounded-full bg-[#F2C1A3]/5 blur-[140px] pointer-events-none" />

        {/* Dynamic Snowflake Particle Layers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {[
            { left: "left-[12%]", delay: 0, duration: 12, x: [0, 15, 0] },
            { left: "left-[28%]", delay: 1.5, duration: 18, x: [0, -25, 0] },
            { left: "left-[45%]", delay: 3, duration: 14, x: [0, 20, 0] },
            { left: "left-[62%]", delay: 4.5, duration: 22, x: [0, -15, 0] },
            { left: "left-[78%]", delay: 6, duration: 11, x: [0, 30, 0] },
            { left: "left-[90%]", delay: 7.5, duration: 16, x: [0, -10, 0] },
            { left: "left-[5%]", delay: 9, duration: 20, x: [0, 25, 0] },
            { left: "left-[53%]", delay: 10.5, duration: 15, x: [0, -20, 0] }
          ].map((particle, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full bg-white -top-2 ${particle.left}`}
              animate={{
                top: "105%",
                x: particle.x
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: "linear",
                delay: particle.delay
              }}
            />
          ))}
        </div>

        {/* Modal Outer Containment */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl my-auto glass-card rounded-3xl p-5 md:p-8 border border-white/10 bg-[#12131e]/90 shadow-[0_0_80px_rgba(242,193,163,0.08)] overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/[0.02] border border-white/5 hover:border-white/15 text-[#857C91] hover:text-white transition duration-300 shadow-inner group"
            aria-label="Close modal"
          >
            <X size={16} className="group-hover:rotate-90 transition duration-300" />
          </button>

          {/* Side-by-Side Slideshow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center min-h-[460px]">
            
            {/* LEFT PANEL: Clean Typography and Steps (40%) */}
            <div className="md:col-span-5 flex flex-col gap-6 text-left relative z-10">
              
              <div className="flex flex-col gap-3">
                {/* Active Slide Step Badge */}
                <motion.div 
                  key={`badge-${currentSlide}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`self-start px-3 py-0.5 rounded-full border text-[9px] uppercase tracking-widest font-semibold ${slides[currentSlide].badgeColor}`}
                >
                  {slides[currentSlide].badge}
                </motion.div>

                {/* Sliding Title Elements */}
                <div className="overflow-hidden min-h-[64px] flex items-end">
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={`title-${currentSlide}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="text-2xl md:text-3xl font-light text-white font-serif tracking-tight leading-[1.2]"
                    >
                      {slides[currentSlide].title.split(" ").map((word, wIdx) => {
                        const isItalic = word.toLowerCase() === "workspace" || word.toLowerCase() === "instantly" || word.toLowerCase() === "tasks" || word.toLowerCase() === "contributions" || word.toLowerCase() === "decisions" || word.toLowerCase() === "reports";
                        return (
                          <React.Fragment key={wIdx}>
                            {isItalic ? (
                              <span className="text-[#F2C1A3] italic">{word}</span>
                            ) : (
                              <span>{word}</span>
                            )}{" "}
                          </React.Fragment>
                        );
                      })}
                    </motion.h2>
                  </AnimatePresence>
                </div>
              </div>

              {/* Slide Details */}
              <div className="min-h-[140px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`desc-${currentSlide}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-3"
                  >
                    <span className="text-[#F8CCAA] text-xs font-medium tracking-wide">
                      {slides[currentSlide].subtitle}
                    </span>
                    <p className="text-[#857C91] text-xs leading-relaxed font-light">
                      {slides[currentSlide].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Sub-slide CTA Action button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="self-start mt-4 px-5 py-2.5 rounded-full bg-white/[0.02] border border-white/10 hover:border-white/20 text-[#F2C1A3] hover:text-white text-[11px] font-medium tracking-wide transition duration-300 flex items-center gap-2"
                >
                  <Sparkles size={11} className="text-[#F2C1A3]" />
                  {slides[currentSlide].buttonText}
                </motion.button>
              </div>

            </div>

            {/* RIGHT PANEL: Immersive Visual Dashboard Screen Mockup (60%) */}
            <div 
              className="md:col-span-7 relative flex items-center justify-center cursor-pointer group/screen"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleNext}
            >
              {/* Screen Mockup frame */}
              <div className="relative aspect-[16/10] w-full rounded-2xl border border-white/10 bg-[#12131e]/90 shadow-2xl overflow-hidden flex flex-col z-10 transition duration-300 group-hover/screen:border-white/15">
                
                {/* Browser top header */}
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[10px] text-[#857C91] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 group-hover/screen:bg-red-500/40 transition"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 group-hover/screen:bg-yellow-500/40 transition"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/20 group-hover/screen:bg-green-500/40 transition"></span>
                  </div>
                  <div className="px-3 py-0.5 rounded bg-white/[0.02] border border-white/5 text-[9px] text-[#857C91]/65 max-w-[200px] truncate">
                    contritrack.com/workspace/cs101-team-4
                  </div>
                  <div className="w-10"></div>
                </div>

                {/* Dashboard Screen Viewports */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-center relative overflow-hidden bg-gradient-to-b from-white/[0.01] to-transparent">
                  
                  {/* Swipe gesture container */}
                  <motion.div
                    key={`visual-${currentSlide}`}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -50) handleNext();
                      else if (info.offset.x > 50) handlePrev();
                    }}
                    className="w-full h-full flex items-center justify-center active:cursor-grabbing"
                  >
                    
                    {/* SLIDE 1 VIEWPORT: TEAM WORKSPACE */}
                    {currentSlide === 0 && (
                      <div className="w-full max-w-sm flex flex-col gap-4">
                        <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-xl p-3">
                          <span className="text-[10px] uppercase tracking-wider text-[#857C91] font-mono">Team Workspace</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-[9px] text-emerald-400">CS-101 Team 4</span>
                        </div>

                        {/* Staggered user listings */}
                        <div className="flex flex-col gap-2">
                          {[
                            { name: "Aanya", role: "Team Lead", status: "Active", bg: "border-[#F2C1A3]/30", col: "text-[#F2C1A3]" },
                            { name: "Rohan", role: "Developer", status: "Active", bg: "border-[#F8CCAA]/10", col: "text-[#F8CCAA]" },
                            { name: "Kabir", role: "Analyst", status: "Pending", bg: "border-white/5", col: "text-[#857C91]" }
                          ].map((member, mIdx) => (
                            <motion.div 
                              key={mIdx}
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: mIdx * 0.15, duration: 0.4 }}
                              className={`flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border ${member.bg}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-6 h-6 rounded-full bg-white/5 border ${member.bg} flex items-center justify-center text-[10px] font-serif text-white`}>
                                  {member.name[0]}
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-[11px] font-medium text-white">{member.name}</span>
                                  <span className="text-[9px] text-[#857C91] font-light">{member.role}</span>
                                </div>
                              </div>
                              <span className={`text-[9px] font-mono ${member.col}`}>{member.status}</span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Floating Invite Card */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.6, type: "spring", damping: 15 }}
                          className="absolute -bottom-1 right-2 p-3 rounded-xl border border-[#F2C1A3]/30 bg-[#12131e] shadow-[0_0_20px_rgba(242,193,163,0.1)] flex items-center gap-2.5"
                        >
                          <div className="w-5 h-5 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 flex items-center justify-center text-[#F2C1A3]">
                            <Check size={10} />
                          </div>
                          <span className="text-[10px] text-white">Sent invite to <strong className="text-[#F2C1A3]">Manisa</strong></span>
                        </motion.div>
                      </div>
                    )}

                    {/* SLIDE 2 VIEWPORT: GITHUB INSTANT CONNECT */}
                    {currentSlide === 1 && (
                      <div className="w-full max-w-sm flex flex-col gap-4">
                        {/* Synced logos */}
                        <div className="flex items-center justify-center gap-6 py-2">
                          <motion.div 
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-white shadow-lg"
                          >
                            <Github size={24} className="text-[#F8CCAA]" />
                          </motion.div>
                          
                          {/* Sync dynamic arrow path */}
                          <div className="flex-1 max-w-[80px] h-0.5 border-t border-dashed border-white/20 relative">
                            <motion.div 
                              animate={{ x: [0, 80, 0] }}
                              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                              className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-[#F2C1A3] blur-[1px]"
                            />
                          </div>

                          <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-white shadow-lg">
                            <Activity size={20} className="text-[#F2C1A3] animate-pulse" />
                          </div>
                        </div>

                        {/* Git Telemetry Card with Animated Heatmap */}
                        <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-2.5">
                          <div className="flex justify-between items-center text-[9px] font-mono text-[#857C91]">
                            <span>Repo: main/frontend</span>
                            <span className="text-emerald-400">● Synced</span>
                          </div>

                          {/* 7x15 Heatmap Grid with dynamic wave lighting */}
                          <div className="grid grid-cols-12 gap-1.5 justify-center py-1">
                            {[...Array(36)].map((_, index) => {
                              const opacityClass = 
                                index % 6 === 0 ? "bg-[#F2C1A3]/80" :
                                index % 4 === 0 ? "bg-[#F8CCAA]/60" :
                                index % 3 === 0 ? "bg-[#CD9FA0]/40" :
                                "bg-[#525871]/10";
                              return (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0.1 }}
                                  animate={{ opacity: [0.1, 1, 0.1] }}
                                  transition={{ 
                                    repeat: Infinity, 
                                    duration: 3, 
                                    delay: (index % 12) * 0.15,
                                    ease: "easeInOut"
                                  }}
                                  className={`w-2.5 h-2.5 rounded-sm ${opacityClass}`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* SVG Drawing Graph */}
                        <div className="h-14 w-full relative border-t border-white/5 pt-1">
                          <svg className="w-full h-full" viewBox="0 0 320 50">
                            <motion.path
                              d="M0,45 Q30,10 60,30 T120,15 T180,40 T240,10 T300,35"
                              fill="none"
                              stroke="url(#sunset-gradient)"
                              strokeWidth="2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 2, ease: "easeOut" }}
                            />
                            <defs>
                              <linearGradient id="sunset-gradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#F2C1A3" />
                                <stop offset="50%" stopColor="#CD9FA0" />
                                <stop offset="100%" stopColor="#F8CCAA" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* SLIDE 3 VIEWPORT: KANBAN TASK SLIDE */}
                    {currentSlide === 2 && (
                      <div className="w-full h-full flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-[#857C91]">
                          <span>Board: Sprint 2 Tasks</span>
                          <span className="text-[#F2C1A3]">Progress: 66%</span>
                        </div>

                        {/* Kanban three columns */}
                        <div className="grid grid-cols-3 gap-3 flex-1">
                          {[
                            { name: "To Do", card: null, border: "border-white/5" },
                            { name: "In Progress", card: null, border: "border-white/5" },
                            { name: "Done", card: "OAuth Sync Gateway", border: "border-emerald-400/20 bg-emerald-400/[0.01]" }
                          ].map((col, cIdx) => (
                            <div 
                              key={cIdx} 
                              className={`rounded-xl border p-2.5 flex flex-col gap-2 relative bg-white/[0.01] ${col.border}`}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-[#857C91] font-mono text-left block mb-1">
                                {col.name}
                              </span>

                              {/* Static tasks */}
                              {cIdx === 0 && (
                                <div className="p-2 rounded bg-white/[0.02] border border-white/5 text-[9px] text-[#857C91]/80 text-left font-light leading-relaxed">
                                  Format Report CSS
                                </div>
                              )}

                              {cIdx === 1 && (
                                <div className="p-2 rounded bg-white/[0.02] border border-white/5 text-[9px] text-[#857C91]/80 text-left font-light leading-relaxed">
                                  Meeting Log 4 Update
                                </div>
                              )}

                              {/* Moving task card */}
                              {col.card && (
                                <motion.div
                                  initial={{ x: -100, y: -20, opacity: 0 }}
                                  animate={{ x: 0, y: 0, opacity: 1 }}
                                  transition={{ type: "spring", damping: 15, delay: 0.4 }}
                                  className="p-2.5 rounded bg-[#12131e] border border-emerald-400/30 text-[9px] text-white text-left font-medium flex flex-col gap-1 shadow-md"
                                >
                                  <span>{col.card}</span>
                                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/5">
                                    <span className="text-[7px] text-[#857C91] font-mono">Assigned: Aanya</span>
                                    <span className="text-[8px] text-emerald-400 flex items-center gap-0.5">
                                      <Check size={8} /> Completed
                                    </span>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Radial completion ripple effect */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.4, 2] }}
                          transition={{ delay: 0.9, duration: 1.2 }}
                          className="absolute right-[50px] bottom-[40px] w-24 h-24 rounded-full bg-emerald-400/25 blur-md pointer-events-none"
                        />
                      </div>
                    )}

                    {/* SLIDE 4 VIEWPORT: MONITOR TEAM CONTRIBUTIONS */}
                    {currentSlide === 3 && (
                      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        
                        {/* Circular progress meter */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* SVG circular track and glowing path */}
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="transparent" />
                              <motion.circle 
                                cx="48" 
                                cy="48" 
                                r="38" 
                                stroke="#F2C1A3" 
                                strokeWidth="6" 
                                fill="transparent"
                                strokeDasharray={238}
                                initial={{ strokeDashoffset: 238 }}
                                animate={{ strokeDashoffset: 238 - (238 * 78) / 100 }}
                                transition={{ duration: 1.8, ease: "easeOut" }}
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <motion.span 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg font-serif text-white"
                              >
                                78%
                              </motion.span>
                              <span className="text-[7px] tracking-widest text-[#857C91] uppercase">Activity</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-white font-medium">Aanya (Team Lead)</span>
                        </div>

                        {/* Leaderboard panel */}
                        <div className="flex flex-col gap-2">
                          {[
                            { name: "Aanya", percent: "42%", task: "18 Done", score: "score-98", barW: "w-[42%]", col: "bg-[#F2C1A3]" },
                            { name: "Rohan", percent: "35%", task: "14 Done", score: "score-85", barW: "w-[35%]", col: "bg-[#F8CCAA]" },
                            { name: "Kabir", percent: "23%", task: "9 Done", score: "score-74", barW: "w-[23%]", col: "bg-[#CD9FA0]" }
                          ].map((row, rIdx) => (
                            <motion.div
                              key={rIdx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: rIdx * 0.15, duration: 0.4 }}
                              className="p-2 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-1.5 text-left"
                            >
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-white font-medium">{row.name}</span>
                                <span className="text-[#F2C1A3] font-mono font-medium">{row.percent}</span>
                              </div>
                              {/* Slide Progress Fill */}
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: row.percent }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className={`h-full rounded-full ${row.col}`}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-[#857C91]">
                                <span>{row.task}</span>
                                <span>Score: {row.percent}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                      </div>
                    )}

                    {/* SLIDE 5 VIEWPORT: LOG MEETINGS & NOTES */}
                    {currentSlide === 4 && (
                      <div className="w-full max-w-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-[#857C91] border-b border-white/5 pb-2">
                          <span>Log: Sprint 2 Review</span>
                          <span>May 18, 2026</span>
                        </div>

                        {/* Meeting notes content typing */}
                        <div className="flex flex-col gap-2.5 text-left">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-[#F8CCAA]">Meeting Agenda: API integration & reports layout</span>
                            <span className="text-[9px] text-[#857C91] leading-relaxed font-light">Lead: Rohan | Attendance: 100% (3/3 present)</span>
                          </div>

                          {/* Staggered text bullets */}
                          <div className="flex flex-col gap-1.5 pl-2 border-l border-white/5">
                            {[
                              "Verified GitHub repository secure sync hooks",
                              "Agreed on database indexing for commit spikes",
                              "Designed certified PDF report generation layout"
                            ].map((bullet, bIdx) => (
                              <motion.div
                                key={bIdx}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: bIdx * 0.25, duration: 0.4 }}
                                className="flex items-start gap-1.5 text-[9px] text-[#857C91] font-light leading-relaxed"
                              >
                                <span className="text-[#F2C1A3] mt-0.5">•</span>
                                <span>{bullet}</span>
                              </motion.div>
                            ))}
                          </div>

                          {/* Action Items checklist checking off */}
                          <div className="flex gap-2.5 mt-1">
                            {[
                              { label: "Verify OAuth", done: true },
                              { label: "Sync Kanban", done: true },
                              { label: "Export PDF", done: false }
                            ].map((chk, kIdx) => (
                              <div key={kIdx} className="flex items-center gap-1 bg-white/[0.01] border border-white/5 px-2 py-1 rounded">
                                <motion.div 
                                  animate={{ 
                                    backgroundColor: chk.done ? "rgba(242,193,163,0.15)" : "rgba(255,255,255,0.01)",
                                    borderColor: chk.done ? "#F2C1A3" : "rgba(255,255,255,0.1)"
                                  }}
                                  className="w-3 h-3 rounded border flex items-center justify-center shrink-0"
                                >
                                  {chk.done && <Check size={8} className="text-[#F2C1A3]" />}
                                </motion.div>
                                <span className="text-[8px] text-white/80">{chk.label}</span>
                              </div>
                            ))}
                          </div>

                        </div>
                      </div>
                    )}

                    {/* SLIDE 6 VIEWPORT: EXPORT CERTIFIED REPORTS */}
                    {currentSlide === 5 && (
                      <div className="w-full max-w-sm flex flex-col gap-4 relative">
                        
                        {/* Stacking mock paper report pages */}
                        <div className="relative h-28 w-full flex justify-center items-end py-1">
                          
                          {/* Back page */}
                          <motion.div 
                            initial={{ y: 20, rotate: -6, opacity: 0 }}
                            animate={{ y: 0, rotate: -6, opacity: 0.4 }}
                            transition={{ delay: 0.3 }}
                            className="absolute w-36 h-24 rounded-lg bg-[#12131e] border border-white/10 shadow-lg text-[6px] p-2 flex flex-col gap-1"
                          >
                            <div className="h-1.5 w-10 bg-white/10 rounded" />
                            <div className="h-1 w-20 bg-white/5 rounded" />
                            <div className="h-1 w-16 bg-white/5 rounded" />
                          </motion.div>

                          {/* Middle page */}
                          <motion.div 
                            initial={{ y: 20, rotate: 6, opacity: 0 }}
                            animate={{ y: 0, rotate: 6, opacity: 0.6 }}
                            transition={{ delay: 0.15 }}
                            className="absolute w-36 h-24 rounded-lg bg-[#12131e] border border-white/10 shadow-lg text-[6px] p-2 flex flex-col gap-1"
                          >
                            <div className="h-1.5 w-12 bg-white/10 rounded" />
                            <div className="h-1 w-24 bg-white/5 rounded" />
                            <div className="h-1 w-12 bg-white/5 rounded" />
                          </motion.div>

                          {/* Front active report page */}
                          <motion.div 
                            initial={{ y: 20, rotate: 0, opacity: 0 }}
                            animate={{ y: 0, rotate: 0, opacity: 1 }}
                            className="absolute w-36 h-24 rounded-lg bg-[#12131e] border border-[#F2C1A3]/30 shadow-2xl text-[6px] p-2.5 flex flex-col justify-between"
                          >
                            <div className="flex flex-col gap-1 text-left">
                              <span className="text-[7px] text-[#F2C1A3] font-serif font-semibold">ContriTrack Certified Audit</span>
                              <div className="h-[1px] w-full bg-white/5 my-1" />
                              <span className="text-[6px] text-white">Project: Team Collaboration Platform</span>
                              <span className="text-[5px] text-[#857C91]">Aanya: 42% | Rohan: 35% | Kabir: 23%</span>
                            </div>
                            <div className="flex justify-between items-center text-[5px] text-[#F2C1A3]">
                              <span>Evidence: Verified</span>
                              <Lock size={6} className="text-[#F2C1A3]" />
                            </div>
                          </motion.div>

                        </div>

                        {/* Export Certified progress bar loading */}
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                          <div className="flex justify-between items-center text-[8px] text-[#857C91] font-mono">
                            <span>Generating evidence report...</span>
                            <span className="text-[#F2C1A3] font-medium">100% Done</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 1.5, ease: "easeInOut" }}
                              className="h-full rounded-full bg-gradient-to-r from-[#F2C1A3] via-[#CD9FA0] to-[#F8CCAA]"
                            />
                          </div>
                        </div>

                        {/* Certified stamp floating overlay */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8, type: "spring", damping: 10 }}
                          className="absolute inset-0 m-auto w-40 h-20 rounded-2xl border border-[#F2C1A3] bg-[#12131e]/95 flex flex-col items-center justify-center gap-1 shadow-2xl z-20 pointer-events-none"
                        >
                          <div className="p-1 rounded bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]">
                            <Shield size={12} className="animate-pulse" />
                          </div>
                          <span className="text-[10px] text-white font-medium font-serif">Certified Evidence Exported</span>
                          <span className="text-[8px] text-[#F8CCAA] tracking-wide font-light">Built for fair collaboration.</span>
                        </motion.div>

                      </div>
                    )}

                  </motion.div>

                </div>

              </div>

              {/* Decorative Apple Window reflection overlays */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/[0.01] to-white/[0.05] pointer-events-none z-20" />
            </div>

          </div>

          {/* BOTTOM NAVIGATION: Slide Dots, Manual arrows, Play/Pause Indicator */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mt-6 pt-5 border-t border-white/5">
            
            {/* Play/Pause state and manual next/prev button pills */}
            <div className="flex items-center gap-3">
              {/* Play/Pause pill toggles */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full bg-white/[0.01] border border-white/5 hover:border-white/10 hover:bg-white/[0.02] text-[#857C91] hover:text-white transition duration-300"
                aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-full bg-white/[0.01] border border-white/5 hover:border-white/15 hover:bg-white/[0.02] text-[#857C91] hover:text-white transition duration-300 hover:scale-105"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <span className="text-[10px] font-mono text-[#857C91]">
                  {(currentSlide + 1).toString().padStart(2, "0")} / {TOTAL_SLIDES.toString().padStart(2, "0")}
                </span>

                <button
                  onClick={handleNext}
                  className="p-2 rounded-full bg-white/[0.01] border border-white/5 hover:border-white/15 hover:bg-white/[0.02] text-[#857C91] hover:text-white transition duration-300 hover:scale-105"
                  aria-label="Next slide"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Slider progress dots indicators */}
            <div className="flex items-center gap-2.5">
              {slides.map((_, idx) => {
                const isActive = currentSlide === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => selectSlide(idx)}
                    className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 text-left bg-white/10 ${
                      isActive ? "w-[45px]" : "w-[8px]"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    {isActive && (
                      <motion.div 
                        className="h-full bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] rounded-full"
                        animate={{
                          width: `${progress}%`
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Autoplay Pause Alert Notice */}
            <div className="text-[9px] text-[#857C91]/65 font-light tracking-wide min-h-[14px]">
              {isHovered && isPlaying ? (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[#F2C1A3] italic"
                >
                  Autoplay paused (hovering visual)
                </motion.span>
              ) : (
                <span>Click visual or press Arrow keys to navigate</span>
              )}
            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
