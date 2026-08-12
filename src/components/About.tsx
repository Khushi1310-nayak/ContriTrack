"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { Eye, Shield, Users, Award, TrendingUp, Sparkles } from "lucide-react";

// Ticking counter helper component using Framer Motion animate mechanics
function AnimatedCounter({ value, suffix = "", duration = 2.0 }: { value: number; suffix?: string; duration?: number }) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(elementRef, { once: true, margin: "-80px" });

  useEffect(() => {
    if (isInView && elementRef.current) {
      const node = elementRef.current;
      const controls = animate(0, value, {
        duration: duration,
        ease: "easeOut",
        onUpdate(latest) {
          node.textContent = Math.round(latest).toLocaleString() + suffix;
        }
      });
      return () => controls.stop();
    }
  }, [isInView, value, suffix, duration]);

  return (
    <span ref={elementRef} className="text-3xl md:text-5xl font-normal text-white font-serif tracking-tight">
      0{suffix}
    </span>
  );
}

const missionCards = [
  {
    icon: Eye,
    title: "Transparency",
    desc: "Complete visibility for everyone. Every code sync, task transition, and calendar checkmark is fully logged and open to team review.",
    textClass: "text-[#F2C1A3]",
    glowClass: "bg-[#F2C1A3]/20"
  },
  {
    icon: Shield,
    title: "Accountability",
    desc: "Define roles and own tasks. Our deep GitHub sync tracks real pacing records to guarantee credits mirror real contributions.",
    textClass: "text-[#F8CCAA]",
    glowClass: "bg-[#F8CCAA]/20"
  },
  {
    icon: Users,
    title: "Collaboration",
    desc: "Break down unequal work silos. Simplify academic teamwork with responsive Kanban columns and shared project workspaces.",
    textClass: "text-[#CD9FA0]",
    glowClass: "bg-[#CD9FA0]/20"
  },
  {
    icon: Award,
    title: "Academic Integrity",
    desc: "Prove individual output and work volume with professional certified portfolios, protecting and backing up your grading reviews.",
    textClass: "text-[#857C91]",
    glowClass: "bg-[#857C91]/20"
  }
];

export default function About() {
  return (
    <section id="about" className="relative w-full max-w-7xl mx-auto px-6 py-20 md:py-32 overflow-hidden">
      
      {/* Background ambient sunset glowing rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-[#CD9FA0] opacity-[0.02] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-4 right-12 -z-10 h-[300px] w-[300px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[110px] pointer-events-none" />

      {/* Main Section Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-24">
        
        {/* Left Side: Cinematic Copy */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-left items-start">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs font-light text-[#857C91] cursor-default hover:bg-white/[0.04] hover:text-white transition duration-300"
          >
            Built for fair collaboration
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl font-normal text-white tracking-tight leading-tight font-serif"
          >
            Fair Collaboration,<br />
            <span className="text-[#F2C1A3] italic font-serif">Made Effortless.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#F8CCAA] text-sm font-medium tracking-wide"
          >
            ContriTrack transforms chaotic group projects into transparent teamwork.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[#857C91] text-xs md:text-sm font-light leading-relaxed max-w-xl"
          >
            ContriTrack was created to solve one of the biggest frustrations in college life: unequal contribution in team projects. 
            Our platform combines GitHub analytics, task management, contribution tracking, and professional reporting into one elegant collaborative experience.
          </motion.p>
        </div>

        {/* Right Side: Animated Dashboard Graphic Frame */}
        <div className="lg:col-span-6 flex justify-center items-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring" }}
            className="relative aspect-[16/10] w-full max-w-md rounded-2xl border border-white/5 bg-[#171825]/45 hover:bg-[#1b1c2d]/65 shadow-2xl p-5 overflow-hidden flex flex-col justify-between group cursor-default"
          >
            {/* Top browser indicator circles */}
            <div className="flex gap-1.5 items-center mb-4">
              <span className="w-2 h-2 rounded-full bg-red-400/20 group-hover:bg-red-400/40 transition"></span>
              <span className="w-2 h-2 rounded-full bg-yellow-400/20 group-hover:bg-yellow-400/40 transition"></span>
              <span className="w-2 h-2 rounded-full bg-green-400/20 group-hover:bg-green-400/40 transition"></span>
            </div>

            {/* Glowing gradient backdrops */}
            <div className="absolute -bottom-12 -right-12 h-28 w-28 rounded-full bg-[#CD9FA0]/5 blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

            {/* Mini active dashboard preview listing */}
            <div className="flex flex-col gap-2.5 text-left flex-grow justify-center w-full max-w-xs mx-auto">
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col gap-1 text-[10px]">
                <span className="text-[#857C91] uppercase tracking-wider font-mono">Academic Collaboration platform</span>
                <span className="text-white font-serif text-sm mt-0.5 leading-none">CapStone Project Group 4</span>
              </div>

              <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#F2C1A3]/25 flex items-center justify-center text-[#F2C1A3]">
                    <TrendingUp size={10} />
                  </div>
                  <span className="text-[10px] text-white">Project Contribution Balance</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Verified Perfect</span>
              </div>
            </div>

            {/* Certified evidence check mark footer */}
            <div className="mt-4 flex items-center gap-2 text-[9px] text-[#857C91] border-t border-white/5 pt-3">
              <Sparkles size={11} className="text-[#F2C1A3] animate-pulse" />
              <span>ContriTrack Fair-Play Algorithm active.</span>
            </div>
          </motion.div>
        </div>

      </div>

      {/* 3. STATS TICKERS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 items-center bg-[#171825]/45 border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-md mb-24">
        {[
          { label: "Tasks Tracked", value: 10000, suffix: "+" },
          { label: "Student Teams", value: 500, suffix: "+" },
          { label: "Report Accuracy", value: 98, suffix: "%" },
          { label: "Accountability Gain", value: 95, suffix: "%" }
        ].map((stat, sIdx) => (
          <div key={sIdx} className="flex flex-col gap-1 md:gap-2 text-center md:text-left md:pl-4 md:border-l md:first:border-l-0 border-white/5">
            <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            <span className="text-[#B5ACBE] text-[10px] md:text-xs font-mono uppercase tracking-wider font-medium">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* 4. MISSION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {missionCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className={`relative p-6 rounded-2xl border border-white/5 bg-[#171825]/40 hover:bg-[#1a1b2d]/60 shadow-xl backdrop-blur-md transition-all duration-500 overflow-hidden flex flex-col items-start text-left group cursor-default hover:border-white/10`}
            >
              {/* Corner Glowing Aura */}
              <div className={`absolute -top-16 -right-16 h-32 w-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700 blur-[25px] pointer-events-none ${card.glowClass}`} />

              {/* Icon */}
              <div 
                className={`inline-flex items-center justify-center p-2.5 rounded-xl bg-white/[0.01] border border-white/5 mb-5 group-hover:scale-110 group-hover:bg-white/[0.03] transition-all duration-300 ${card.textClass}`}
              >
                <IconComponent size={18} className="group-hover:rotate-3 transition duration-300" />
              </div>

              {/* Title */}
              <h3 className="text-white text-base font-medium mb-2.5 group-hover:text-[#F2C1A3] transition-colors duration-300">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-[#857C91] text-xs leading-relaxed font-light group-hover:text-white/80 transition duration-300">
                {card.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
      
    </section>
  );
}
