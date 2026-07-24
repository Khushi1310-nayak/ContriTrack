"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1b1c2b]">
      {/* Decorative background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F2C1A3]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#CD9FA0]/5 rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="relative flex items-center justify-center w-20 h-20">
          <motion.div 
            className="absolute inset-0 border border-[#F2C1A3]/20 rounded-2xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, ease: "linear", repeat: Infinity }}
          />
          <motion.div 
            className="absolute inset-2 border border-[#CD9FA0]/30 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, ease: "linear", repeat: Infinity }}
          />
          <Loader2 size={32} className="text-[#F2C1A3] animate-spin" />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h2 className="text-white text-xl font-serif font-light tracking-wide">
            ContriTrack
          </h2>
          <span className="text-[#857C91] text-xs font-mono uppercase tracking-widest">
            Loading Workspace...
          </span>
        </div>
      </motion.div>
    </div>
  );
}
