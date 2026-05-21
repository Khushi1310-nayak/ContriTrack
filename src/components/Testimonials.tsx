"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import FilmModal from "./FilmModal";

export default function Testimonials() {
  const [isFilmOpen, setIsFilmOpen] = useState(false);

  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-[#181926]/95 via-[#232030]/85 to-[#1b1c2b]/95 p-8 md:p-12 lg:p-14 shadow-2xl flex flex-col lg:flex-row items-center gap-10 md:gap-12"
      >
        {/* Cinematic Sunset Backdrop Glows */}
        <div className="absolute top-0 right-0 -z-10 h-full w-2/3 bg-gradient-to-l from-[#CD9FA0]/15 via-[#F2C1A3]/5 to-transparent blur-3xl pointer-events-none" />
        
        {/* Dotted Grid Overlay */}
        <div className="absolute inset-0 dot-grid opacity-[0.03] pointer-events-none" />

        {/* Left Column: Quote + Trust Rating */}
        <div className="w-full lg:w-3/5 text-left flex flex-col justify-between relative">
          {/* Quote Mark */}
          <span className="text-[#CD9FA0] opacity-25 text-7xl md:text-8xl font-serif absolute -top-8 md:-top-10 -left-2 select-none pointer-events-none">
            “
          </span>
          
          <div className="relative z-10 pt-4 mb-8">
            <h3 className="text-xl md:text-2xl lg:text-3xl font-light text-white leading-relaxed font-serif tracking-wide">
              &quot;ContriTrack made our final year project stress-free and completely transparent. No more last-minute drama!&quot;
            </h3>
          </div>

          {/* Student details + Stars */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 mt-auto">
            {/* Avatars */}
            <div className="flex -space-x-2.5">
              <div className="w-10 h-10 rounded-full border border-[#1b1c2b] bg-[#F2C1A3] text-[#12131e] font-semibold text-xs flex items-center justify-center shadow-md">AS</div>
              <div className="w-10 h-10 rounded-full border border-[#1b1c2b] bg-[#F8CCAA] text-[#12131e] font-semibold text-xs flex items-center justify-center shadow-md">RM</div>
              <div className="w-10 h-10 rounded-full border border-[#1b1c2b] bg-[#CD9FA0] text-[#12131e] font-semibold text-xs flex items-center justify-center shadow-md">IV</div>
            </div>
            
            {/* Rating text */}
            <div>
              <span className="text-white text-xs font-medium block">Loved by 1,200+ students</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex text-[#F2C1A3]">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      fill={i < 4 ? "currentColor" : "none"} 
                      className="stroke-[#F2C1A3]"
                    />
                  ))}
                </div>
                <span className="text-[#857C91] text-xs font-light">4.9/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Panoramic Play Banner Mockup */}
        <div className="w-full lg:w-2/5 flex justify-center">
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setIsFilmOpen(true)}
            className="relative aspect-video w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 group cursor-pointer shadow-xl flex items-center justify-center bg-gradient-to-br from-[#CD9FA0]/30 to-[#12131e]"
          >
            {/* Cinematic generated preview image backdrop */}
            <img 
              src="/contritrack_film_preview.png" 
              alt="ContriTrack Film Cinematic Preview" 
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-700 pointer-events-none"
            />

            {/* Orange/Peach Radial Glow behind Play Button */}
            <div className="absolute h-20 w-20 rounded-full bg-[#F2C1A3] opacity-20 blur-xl group-hover:scale-125 transition duration-500 pointer-events-none" />

            {/* Play Button */}
            <div className="relative w-14 h-14 rounded-full flex items-center justify-center bg-[#F2C1A3] text-[#12131e] group-hover:bg-[#F8CCAA] transition duration-300 shadow-lg z-10">
              <Play size={18} fill="currentColor" className="ml-1" />
            </div>

            {/* Video Preview Footer text overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#12131e]/90 to-transparent text-center z-10">
              <span className="text-[#857C91] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">ContriTrack Film</span>
              <p className="text-white text-xs font-light">
                Watch how ContriTrack transforms teamwork
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <FilmModal isOpen={isFilmOpen} onClose={() => setIsFilmOpen(false)} />
    </section>
  );
}
