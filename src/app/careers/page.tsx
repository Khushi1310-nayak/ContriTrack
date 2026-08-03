"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  MapPin, 
  Clock, 
  Briefcase, 
  DollarSign, 
  Sparkles, 
  ArrowUpRight, 
  Users, 
  Layers, 
  Terminal,
  Activity,
  Zap,
  Globe,
  Info
} from "lucide-react";
import Link from "next/link";
import { getJobRolesAction, JobRoleMetadata } from "@/app/actions/career-actions";

export default function CareersPage() {
  const [jobRoles, setJobRoles] = useState<JobRoleMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedRemote, setSelectedRemote] = useState<boolean>(false);

  // Keyboard shortcut query focus listener (Cmd+F / / focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("job-search");
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch live open jobs from the database (or auto-seeded list)
  useEffect(() => {
    Promise.resolve().then(() => {
      setIsLoading(true);
    });
    getJobRolesAction().then((res) => {
      setJobRoles(res);
      setIsLoading(false);
    });
  }, []);

  // Unique departments for filter list
  const departments = useMemo(() => {
    const depts = new Set<string>();
    jobRoles.forEach(j => depts.add(j.department));
    return ["All", ...Array.from(depts)];
  }, [jobRoles]);

  // Unique levels
  const levels = ["All", "fresher", "experienced", "hybrid"];

  // Filtered job list
  const filteredJobs = useMemo(() => {
    return jobRoles.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.technologies.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDept = selectedDept === "All" || job.department === selectedDept;
      const matchesLevel = selectedLevel === "All" || job.level === selectedLevel;
      const matchesRemote = !selectedRemote || job.location.toLowerCase().includes("remote");

      return matchesSearch && matchesDept && matchesLevel && matchesRemote;
    });
  }, [jobRoles, searchQuery, selectedDept, selectedLevel, selectedRemote]);

  // Framer motion animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#12131e] via-[#16182c] to-[#12131e] text-white relative overflow-hidden font-sans pb-24 selection:bg-[#CD9FA0]/25 selection:text-[#F8CCAA]">
      
      {/* Cinematic champagne/rose visual glows */}
      <div className="absolute top-0 left-[50%] -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-[#CD9FA0]/[0.08] blur-[150px] pointer-events-none" />
      <div className="absolute top-[-250px] right-[-100px] w-[900px] h-[900px] rounded-full bg-[#F2C1A3]/[0.07] blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-200px] w-[900px] h-[900px] rounded-full bg-[#CD9FA0]/[0.05] blur-[240px] pointer-events-none" />
      <div className="absolute top-[30%] left-[25%] w-[600px] h-[600px] rounded-full bg-[#CD9FA0]/[0.04] blur-[180px] pointer-events-none" />

      {/* Floating starry particles background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.04),rgba(255,255,255,0))]" />

      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#12131e]/85 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
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
          <nav className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-widest text-white/50">
            <Link href="/" className="hover:text-white transition">Platform</Link>
            <Link href="/docs" className="hover:text-white transition">Developer Docs</Link>
            <span className="text-[#F2C1A3]">Careers Portal</span>
          </nav>
        </div>
        <Link 
          href="/"
          className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs font-mono text-[#8e94a0] hover:text-white transition-all"
        >
          ← Return Landing Page
        </Link>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-16 px-6 max-w-6xl mx-auto text-center flex flex-col items-center gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#CD9FA0]/20 bg-[#CD9FA0]/[0.03] text-xs text-[#F2C1A3] font-mono"
        >
          <Sparkles size={12} className="animate-pulse" />
          <span>JOIN THE FUTURE OF ACADEMIC COLLABORATION</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif text-white font-light tracking-tight max-w-3xl leading-tight"
        >
          Build tools that make peer work <span className="text-[#F2C1A3] italic">accountable</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-300 text-sm md:text-base font-light max-w-xl leading-relaxed"
        >
          We are constructing an open platform to solve free-ridership, track real-time git metrics fairly, and foster authentic collaboration in engineering teams globally.
        </motion.p>

        {/* Dynamic Recruiting Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mt-8 pt-8 border-t border-white/[0.06]"
        >
          {[
            { value: "10", label: "Open Positions", icon: Briefcase, href: undefined },
            { value: "100%", label: "Remote Eligible", icon: Globe, href: undefined },
            { value: "5+", label: "Academic Hubs", icon: Users, href: "/hubs" },
            { value: "Prisma", label: "Relational DB ready", icon: Layers, href: undefined }
          ].map((stat, idx) => {
            const cardContent = (
              <div key={idx} className="p-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] hover:border-[#CD9FA0]/40 transition-all text-center flex flex-col gap-1 cursor-pointer group">
                <div className="flex items-center justify-center gap-1.5 text-[#F2C1A3]">
                  <stat.icon size={13} />
                  <span className="text-xl font-serif font-light group-hover:text-[#F8CCAA]">{stat.value}</span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8e94a0] group-hover:text-white">{stat.label}</span>
              </div>
            );

            return stat.href ? (
              <Link key={idx} href={stat.href}>
                {cardContent}
              </Link>
            ) : cardContent;
          })}
        </motion.div>
      </section>

      {/* FILTER & SEARCH PANEL */}
      <section className="max-w-6xl mx-auto px-6 mb-10">
        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col gap-4">
          
          {/* Search bar & Remote switch */}
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="relative w-full md:max-w-md flex items-center">
              <Search size={14} className="absolute left-4 text-[#F2C1A3]" />
              <input
                id="job-search"
                type="text"
                placeholder="Search jobs, tech, stack... (Press Ctrl+F)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white placeholder-slate-400/80 focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424]/95 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-300"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedRemote}
                  onChange={(e) => setSelectedRemote(e.target.checked)}
                  className="rounded bg-[#131424]/60 border-white/20 text-[#CD9FA0] focus:ring-0 focus:ring-offset-0 focus:outline-none w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-300 font-mono uppercase tracking-wider">Remote Only</span>
              </label>

              <div className="text-[10px] font-mono text-slate-300">
                Showing {filteredJobs.length} of {jobRoles.length} positions
              </div>
            </div>
          </div>

          {/* Department and Level tab layout selectors */}
          <div className="flex flex-col gap-3 pt-3 border-t border-white/[0.06]">
            
            {/* Department filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#CD9FA0] mr-2">Dept:</span>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    selectedDept === dept 
                      ? "bg-[#CD9FA0]/20 text-[#F8CCAA] font-semibold border border-[#CD9FA0]/70 shadow-[0_0_15px_rgba(205,159,160,0.3)]" 
                      : "bg-[#131424]/50 text-white/70 border border-white/10 hover:text-white hover:bg-[#131424]/90"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Level filters */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#CD9FA0] mr-2">Track:</span>
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    selectedLevel === lvl 
                      ? "bg-[#CD9FA0]/20 text-[#F8CCAA] font-semibold border border-[#CD9FA0]/70 shadow-[0_0_15px_rgba(205,159,160,0.3)]" 
                      : "bg-[#131424]/50 text-white/70 border border-white/10 hover:text-white hover:bg-[#131424]/90"
                  }`}
                >
                  {lvl === "All" ? "All Tracks" : lvl}
                </button>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* JOBS BENTO GRID */}
      <section className="max-w-6xl mx-auto px-6">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num} className="p-6 rounded-3xl border border-white/[0.06] bg-[#1b1c2b]/30 h-[220px] animate-pulse flex flex-col gap-4">
                  <div className="w-1/3 h-4 bg-white/5 rounded" />
                  <div className="w-2/3 h-6 bg-white/5 rounded" />
                  <div className="w-full h-12 bg-white/5 rounded" />
                  <div className="w-1/2 h-4 bg-white/5 rounded mt-auto" />
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 text-center rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/40 max-w-xl mx-auto flex flex-col items-center gap-4"
            >
              <Info className="text-[#CD9FA0]" size={28} />
              <h3 className="text-white font-serif font-light text-lg">No matching career paths</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We couldn&apos;t identify any open slots matching your selected filter query. Try modifying your search bounds or clear the active departments.
              </p>
              <button
                onClick={() => {
                  setSelectedDept("All");
                  setSelectedLevel("All");
                  setSelectedRemote(false);
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-mono text-[#F2C1A3] hover:text-[#F8CCAA] hover:underline transition"
              >
                Reset All Filters
              </button>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.01 }}
                  className="p-6 rounded-3xl border border-white/[0.08] hover:border-[#CD9FA0]/60 bg-[#1b1c2b]/60 backdrop-blur-md hover:bg-[#1f213a]/70 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(205,159,160,0.08)] transition-all duration-300 flex flex-col justify-between h-[280px] text-left group relative overflow-hidden"
                >
                  {/* Glassmorphic border hover accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#CD9FA0]/[0.02] rounded-full blur-xl pointer-events-none group-hover:bg-[#CD9FA0]/[0.1] transition-colors duration-500" />
                  
                  <div className="flex flex-col gap-2">
                    {/* Urgency and dept badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8.5px] font-mono text-slate-300">
                        {job.department}
                      </span>
                      <span className="text-[8.5px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Hiring
                      </span>
                    </div>

                    <h3 className="text-base font-serif font-light text-white group-hover:text-[#F2C1A3] transition mt-1.5">
                      {job.title}
                    </h3>

                    {/* Stats strip */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-300 font-mono mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-[#CD9FA0]" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-[#CD9FA0]" />
                        <span>{job.remoteType}</span>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs font-light leading-relaxed mt-2.5 line-clamp-3">
                      {job.description}
                    </p>
                  </div>

                  {/* Footer tech badges and dynamic redirect trigger */}
                  <div className="border-t border-white/[0.06] pt-3 mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      {job.technologies.slice(0, 3).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[#131424] border border-white/5 text-[8.5px] font-mono text-slate-400">
                          {t}
                        </span>
                      ))}
                      {job.technologies.length > 3 && (
                        <span className="text-[8.5px] text-[#8e94a0] font-mono">
                          +{job.technologies.length - 3}
                        </span>
                      )}
                    </div>

                    <Link 
                      href={`/careers/${job.slug}`}
                      className="flex items-center gap-0.5 text-xs text-[#F2C1A3] font-mono group-hover:translate-x-0.5 transition-transform shrink-0"
                    >
                      <span>Explore</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  </div>

                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* LIFE AT CONTRITRACK BONUS GRID */}
      <section className="max-w-6xl mx-auto px-6 mt-28 border-t border-white/[0.06] pt-20">
        <div className="text-center mb-12 flex flex-col items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-[#CD9FA0] font-mono">Engineering Philosophy</span>
          <h2 className="text-2xl md:text-4xl font-serif text-white font-light">Why work with us?</h2>
          <p className="text-[#8e94a0] text-xs font-light max-w-md leading-relaxed mt-1">
            We prioritize async collaboration, mathematical integrity, code aesthetics, and student-first innovations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            {
              title: "Async Collaboration",
              desc: "Write specs over scheduling synchronizations. We operate on a highly flexible async roadmap tailored to accommodate student and coordinator schedules globally.",
              icon: Clock
            },
            {
              title: "Product Mission",
              desc: "Constructing academic frameworks that fairly credit developers and eliminate peer work free-ridership using transparent GitHub hooks and telemetry engines.",
              icon: Zap
            },
            {
              title: "Student Innovation",
              desc: "Provide resources directly targeting educational research fields. Build high-end component interfaces, reports engines, and automated sync systems.",
              icon: Users
            }
          ].map((block, idx) => (
            <div key={idx} className="p-6 rounded-3xl border border-white/[0.06] bg-[#1b1c2b]/30 flex flex-col gap-3 hover:border-white/10 hover:bg-[#1b1c2b]/55 transition duration-300">
              <div className="w-8 h-8 rounded-full bg-[#CD9FA0]/10 flex items-center justify-center text-[#F2C1A3]">
                <block.icon size={15} />
              </div>
              <h3 className="text-white font-serif font-light text-sm mt-1">{block.title}</h3>
              <p className="text-[#8e94a0] text-[11.5px] font-light leading-relaxed">{block.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER BRIDGES */}
      <footer className="max-w-6xl mx-auto px-6 mt-28 pt-8 border-t border-white/[0.06] text-center flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-[10px] font-mono text-[#8e94a0]">
          © {new Date().getFullYear()} ContriTrack Developer ecosystem. Backed by Relational Database Mappings.
        </span>
        <div className="flex items-center gap-6 text-[10px] font-mono text-[#8e94a0]">
          <Link href="/docs" className="hover:text-white transition">Platform Docs</Link>
          <span className="text-white/20">|</span>
          <Link href="/" className="hover:text-white transition">Platform Home</Link>
        </div>
      </footer>

    </div>
  );
}
