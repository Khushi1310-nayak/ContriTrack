"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  GitPullRequest, 
  BrainCircuit, 
  Zap, 
  ShieldCheck, 
  Search, 
  Users, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  Globe, 
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { fetchAcademicHubsAction, AcademicHubMetadata } from "@/app/actions/academic-hub-actions";
import { useAuth } from "@/context/AuthContext";

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  GitPullRequest,
  BrainCircuit,
  Zap,
  ShieldCheck
};

export default function HubsDirectoryPage() {
  const { user } = useAuth();
  const [hubs, setHubs] = useState<AcademicHubMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("All");

  useEffect(() => {
    setIsLoading(true);
    fetchAcademicHubsAction(user?.uid).then((res) => {
      setHubs(res);
      setIsLoading(false);
    });
  }, [user]);

  const filteredHubs = useMemo(() => {
    return hubs.filter(h => {
      const matchesSearch = 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.institution.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === "All" || h.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [hubs, searchQuery, selectedType]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#12131e] via-[#16182c] to-[#12131e] text-white relative overflow-hidden font-sans pb-24 selection:bg-[#CD9FA0]/25 selection:text-[#F8CCAA]">
      
      {/* Background Visual Glows */}
      <div className="absolute top-0 left-[50%] -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-[#CD9FA0]/[0.08] blur-[150px] pointer-events-none" />
      <div className="absolute top-[-250px] right-[-100px] w-[900px] h-[900px] rounded-full bg-[#F2C1A3]/[0.07] blur-[200px] pointer-events-none" />

      {/* HEADER */}
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
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <Link href="/docs" className="hover:text-white transition">Developer Docs</Link>
            <Link href="/careers" className="hover:text-white transition">Careers</Link>
            <span className="text-[#F2C1A3]">Academic Hubs</span>
          </nav>
        </div>
        <Link 
          href="/dashboard"
          className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs font-mono text-[#8e94a0] hover:text-white transition-all"
        >
          ← Open Workspace
        </Link>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-12 px-6 max-w-6xl mx-auto text-center flex flex-col items-center gap-5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#CD9FA0]/30 bg-[#CD9FA0]/[0.04] text-xs text-[#F2C1A3] font-mono"
        >
          <Sparkles size={12} className="animate-pulse text-[#F2C1A3]" />
          <span>5 LIVE ACADEMIC HUBS NETWORK</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif text-white font-light tracking-tight max-w-3xl leading-tight"
        >
          Institutional Workspaces Built for <span className="text-[#F2C1A3] italic">Academic Parity</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-300 text-sm md:text-base font-light max-w-2xl leading-relaxed"
        >
          Connect your team workspaces directly to certified university hubs. Track thesis milestones, audit group workload fairness, and stream live GitHub telemetry.
        </motion.p>
      </section>

      {/* FILTER SEARCH BAR */}
      <section className="max-w-6xl mx-auto px-6 mb-10">
        <div className="p-5 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:max-w-md flex items-center">
            <Search size={14} className="absolute left-4 text-[#F2C1A3]" />
            <input
              type="text"
              placeholder="Search academic hubs, institutions, research..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#131424]/85 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#CD9FA0] mr-1">Filter:</span>
            {["All", "capstone", "open_source", "ai_research", "hackathon", "faculty_oversight"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  selectedType === t 
                    ? "bg-[#CD9FA0]/20 text-[#F8CCAA] border border-[#CD9FA0]/70 font-semibold" 
                    : "bg-[#131424]/50 text-white/70 border border-white/10 hover:text-white"
                }`}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5 HUBS GRID */}
      <section className="max-w-6xl mx-auto px-6">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#CD9FA0] border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-[#8e94a0]">Loading Live Academic Hubs...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHubs.map((hub) => {
              const IconComp = ICON_MAP[hub.icon] || GraduationCap;

              return (
                <motion.div
                  key={hub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`p-7 rounded-3xl border border-white/[0.08] bg-gradient-to-b ${hub.bannerGradient} backdrop-blur-xl flex flex-col justify-between gap-6 hover:border-[#CD9FA0]/40 transition-all duration-300 group shadow-xl`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 text-[#F2C1A3] group-hover:scale-105 transition-transform">
                        <IconComp size={22} />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#F8CCAA]">
                        {hub.institution}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-serif font-light text-white group-hover:text-[#F2C1A3] transition-colors">
                        {hub.name}
                      </h3>
                      <p className="text-xs text-slate-300 font-light mt-2 leading-relaxed">
                        {hub.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-mono text-[#8e94a0]">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-[#F2C1A3]" />
                        <span>{hub.memberCount} Members</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers size={12} className="text-[#F2C1A3]" />
                        <span>{hub.projectCount} Projects</span>
                      </div>
                    </div>

                    <Link
                      href={`/hubs/${hub.slug}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-[#CD9FA0]/20 border border-white/10 hover:border-[#CD9FA0]/50 text-xs font-mono text-white group-hover:text-[#F8CCAA] transition-all"
                    >
                      <span>Explore Hub</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
