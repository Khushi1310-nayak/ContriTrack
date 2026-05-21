"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Github, 
  List, 
  Activity, 
  Calendar, 
  FileText, 
  Shield 
} from "lucide-react";

const features = [
  {
    icon: Github,
    title: "GitHub Integration",
    desc: "Automatically track commits, pull requests, issues, and code contributions.",
    color: "#F2C1A3",
    bgClass: "bg-[#F2C1A3]"
  },
  {
    icon: List,
    title: "Task Management",
    desc: "Assign tasks, set deadlines, and track progress with a beautiful Kanban board.",
    color: "#F8CCAA",
    bgClass: "bg-[#F8CCAA]"
  },
  {
    icon: Activity,
    title: "Contribution Tracking",
    desc: "Smart algorithm calculates fair contribution percentage for every team member.",
    color: "#CD9FA0",
    bgClass: "bg-[#CD9FA0]"
  },
  {
    icon: Calendar,
    title: "Meeting Logs",
    desc: "Log meetings, track attendance, add notes, and manage action items easily.",
    color: "#857C91",
    bgClass: "bg-[#857C91]"
  },
  {
    icon: FileText,
    title: "Proof Reports & PDF Export",
    desc: "Generate detailed reports and export professional PDFs in one click.",
    color: "#F2C1A3",
    bgClass: "bg-[#F2C1A3]"
  },
  {
    icon: Shield,
    title: "Professor Dashboard",
    desc: "Professors can analyze team activity, detect issues, and review contributions.",
    color: "#F8CCAA",
    bgClass: "bg-[#F8CCAA]"
  }
];

const colorClasses: Record<string, { text: string; border: string; glow: string }> = {
  "#F2C1A3": { 
    text: "text-[#F2C1A3]", 
    border: "group-hover:border-[#F2C1A3]/30",
    glow: "bg-[#F2C1A3]/10" 
  },
  "#F8CCAA": { 
    text: "text-[#F8CCAA]", 
    border: "group-hover:border-[#F8CCAA]/30",
    glow: "bg-[#F8CCAA]/10" 
  },
  "#CD9FA0": { 
    text: "text-[#CD9FA0]", 
    border: "group-hover:border-[#CD9FA0]/30",
    glow: "bg-[#CD9FA0]/10" 
  },
  "#857C91": { 
    text: "text-[#857C91]", 
    border: "group-hover:border-[#857C91]/30",
    glow: "bg-[#857C91]/10" 
  }
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const }
  }
};

export default function BentoGrid() {
  return (
    <section id="features" className="relative w-full max-w-7xl mx-auto px-6 py-12 md:py-24 text-center">
      {/* Soft floating background glow elements */}
      <div className="absolute top-1/4 -left-20 -z-10 h-[350px] w-[350px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 -z-10 h-[350px] w-[350px] rounded-full bg-[#CD9FA0] opacity-[0.03] blur-[110px] pointer-events-none" />

      {/* Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs font-light text-[#857C91] mb-5 cursor-default hover:bg-white/[0.04] hover:text-white transition duration-300"
      >
        Powerful features for every team
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl md:text-5xl font-normal text-white mb-16 tracking-tight leading-tight max-w-2xl mx-auto font-serif"
      >
        Everything you need to{" "}
        <span className="text-[#F2C1A3] italic font-serif">build</span>,{" "}
        <span className="text-[#F8CCAA] font-serif">track</span>, and{" "}
        <span className="text-[#CD9FA0] italic font-serif">prove.</span>
      </motion.h2>

      {/* Bento Grid layout */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left"
      >
        {features.map((feature, idx) => {
          const IconComponent = feature.icon;
          const config = colorClasses[feature.color] || {
            text: "text-white",
            border: "group-hover:border-white/20",
            glow: "bg-white/5"
          };

          return (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`relative p-6 md:p-8 rounded-2xl border border-white/5 bg-[#171825]/45 hover:bg-[#1c1d2e]/65 shadow-xl backdrop-blur-md transition-all duration-500 overflow-hidden group cursor-default ${config.border}`}
            >
              {/* Background glowing sweep */}
              <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700 blur-[30px] pointer-events-none ${feature.bgClass}/20`} />

              {/* Glowing Corner subtle light */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-transparent to-white/[0.01] pointer-events-none`} />

              {/* Floating Icon Container */}
              <div 
                className={`inline-flex items-center justify-center p-3 rounded-xl bg-white/[0.01] border border-white/5 mb-6 group-hover:scale-110 group-hover:bg-white/[0.03] transition-all duration-300 shadow-inner ${config.text}`}
              >
                <IconComponent 
                  size={20} 
                  className="transition-transform duration-500 group-hover:rotate-6 group-hover:animate-bounce-slow"
                />
              </div>

              {/* Card Title */}
              <h3 className="text-white text-base md:text-lg font-medium mb-3 group-hover:text-[#F2C1A3] transition-colors duration-300">
                {feature.title}
              </h3>

              {/* Card Description */}
              <p className="text-[#857C91] text-sm font-light leading-relaxed group-hover:text-white/80 transition duration-300">
                {feature.desc}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
