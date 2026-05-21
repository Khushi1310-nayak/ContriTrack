"use client";

import React from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";

interface EmptyWorkspaceStateProps {
  onCreateClick: () => void;
}

export default function EmptyWorkspaceState({ onCreateClick }: EmptyWorkspaceStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative select-none min-h-[70vh]">
      
      {/* Decorative Glowing Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#F2C1A3]/5 blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#CD9FA0]/3 blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 70, damping: 15 }}
        className="max-w-md p-8 md:p-10 rounded-3xl bg-[#111221]/50 border border-white/5 backdrop-blur-md relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
      >
        {/* Subtle top edge highlighting */}
        <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[#F2C1A3]/20 to-transparent" />

        {/* Center Premium Telemetry Node Graphic */}
        <div className="mb-8 relative flex justify-center">
          
          {/* Animated concentric rings */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute inset-0 w-24 h-24 mx-auto rounded-full border border-[#F2C1A3]/10 pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1.1, 0.95, 1.1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="absolute inset-0 w-32 h-32 mx-auto rounded-full border border-[#CD9FA0]/5 pointer-events-none -top-4"
          />

          {/* Central Logo Container */}
          <div className="w-16 h-16 rounded-2xl bg-[#161726] border border-white/10 flex items-center justify-center relative shadow-[0_10px_25px_rgba(0,0,0,0.5)] group hover:border-[#F2C1A3]/20 transition-all duration-500">
            {/* Sparkle background glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#F2C1A3]/5 to-[#CD9FA0]/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Custom Premium Developer Ecosystem / Telemetry Node SVG Icon */}
            <svg 
              className="w-8 h-8 text-[#F2C1A3]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.25"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Outer frame */}
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              {/* Telemetry nodes */}
              <circle cx="8" cy="9" r="1.5" className="fill-current text-[#CD9FA0]" />
              <circle cx="16" cy="15" r="1.5" className="fill-current text-[#F2C1A3]" />
              {/* Network connection line */}
              <path d="M9.5 10.5l5 3.5" />
              {/* Brackets representing code */}
              <path d="M6 14h2M16 8h2" />
            </svg>
          </div>
        </div>

        {/* Text Details */}
        <h2 className="text-white text-xl md:text-2xl font-serif font-light mb-3 tracking-tight">
          No Active Workspace Found
        </h2>
        
        <p className="text-[#857C91] text-xs font-light leading-relaxed mb-8 max-w-sm mx-auto">
          Create your first collaborative workspace to start tracking contributions, tasks, telemetry, and engineering activity.
        </p>

        {/* Large Premium CTA Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateClick}
          className="w-full py-3.5 rounded-2xl text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] hover:opacity-95 transition-all shadow-[0_10px_30px_rgba(242,193,163,0.15)] flex items-center justify-center gap-2 cursor-pointer group"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Create New Workspace</span>
          <Sparkles size={12} className="text-[#12131e]/70" />
        </motion.button>
      </motion.div>
    </div>
  );
}
