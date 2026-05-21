"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Play, 
  ArrowRight, 
  Check, 
  Github, 
  Zap, 
  FileText 
} from "lucide-react";
import SnowEffect from "@/components/SnowEffect";
import Navbar from "@/components/Navbar";
import DashboardMockup from "@/components/DashboardMockup";
import Timeline from "@/components/Timeline";
import BentoGrid from "@/components/BentoGrid";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import DemoModal from "@/components/DemoModal";
import Pricing from "@/components/Pricing";
import About from "@/components/About";
import Blog from "@/components/Blog";

export default function Home() {
  const [activeModal, setActiveModal] = React.useState<string | null>(null);

  return (
    <div className="relative min-h-screen w-full bg-[#12131e] overflow-hidden flex flex-col justify-between">
      
      {/* 1. Snow Effect Canvas */}
      <SnowEffect />

      {/* 2. Floating Ambient Glow Elements (Cinematic sunset) */}
      <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] rounded-full bg-[#CD9FA0] opacity-[0.08] blur-[150px] animate-pulse-gentle pointer-events-none" />
      <div className="absolute top-[15%] right-[5%] w-[600px] h-[600px] rounded-full bg-[#F2C1A3] opacity-[0.06] blur-[180px] animate-pulse-gentle delay-2s pointer-events-none" />
      <div className="absolute top-[45%] left-[-10%] w-[450px] h-[450px] rounded-full bg-[#525871] opacity-[0.1] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#F8CCAA] opacity-[0.06] blur-[160px] animate-pulse-gentle delay-4s pointer-events-none" />

      {/* 3. Transparent Blurred Sticky Navbar */}
      <Navbar hide={activeModal !== null} />

      <main className="flex-grow z-20">
        
        {/* ================= HERO SECTION ================= */}
        <section id="hero" className="relative min-h-screen pt-32 pb-16 flex items-center justify-center">
          
          {/* Layered Snowy Mountains Background (Vector SVG) */}
          <div className="absolute bottom-0 left-0 right-0 w-full h-[400px] pointer-events-none overflow-hidden z-0 select-none opacity-45">
            <svg 
              className="absolute bottom-0 w-full h-[320px] text-[#525871]/15" 
              viewBox="0 0 1440 320" 
              preserveAspectRatio="none" 
              fill="currentColor"
            >
              <path d="M0,288 L180,180 L360,260 L540,140 L720,240 L900,110 L1080,210 L1260,100 L1440,220 L1440,320 L0,320 Z"></path>
            </svg>
            <svg 
              className="absolute bottom-0 w-full h-[240px] text-[#857C91]/15" 
              viewBox="0 0 1440 240" 
              preserveAspectRatio="none" 
              fill="currentColor"
            >
              <path d="M0,190 L120,130 L260,180 L400,100 L560,160 L720,90 L900,150 L1060,95 L1200,160 L1350,110 L1440,170 L1440,240 L0,240 Z"></path>
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Side Content */}
            <div className="lg:col-span-6 text-left flex flex-col gap-6">
              
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center self-start gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-light text-[#F2C1A3]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F2C1A3] animate-pulse"></span>
                ✨ For Students. For Teams. For Fairness.
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-normal text-white tracking-tight leading-[1.1] font-serif"
              >
                Because group projects deserve{" "}
                <span className="text-[#F2C1A3] font-serif italic text-glow-peach block mt-2 sm:inline sm:mt-0">
                  accountability.
                </span>
              </motion.h1>

              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-[#857C91] text-base md:text-lg font-light leading-relaxed max-w-xl"
              >
                ContriTrack helps teams track contributions, manage tasks, log meetings, and generate proof of work — all in one place.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 mt-2"
              >
                <a
                  href="/auth?mode=signup"
                  className="px-7 py-3.5 rounded-full text-xs font-medium text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] flex items-center gap-2 btn-glow"
                >
                  Create Your First Project
                  <ArrowRight size={14} />
                </a>

                <button
                  onClick={() => setActiveModal("demo")}
                  className="px-7 py-3.5 rounded-full text-xs font-medium text-[#f3f4f6] bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 transition flex items-center gap-2 backdrop-blur-md cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full bg-[#CD9FA0]/20 flex items-center justify-center text-[#CD9FA0]">
                    <Play size={10} fill="currentColor" className="ml-0.5" />
                  </span>
                  See How It Works
                </button>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 border-t border-white/5 pt-6 text-[#857C91] text-xs font-light"
              >
                <div className="flex items-center gap-2 hover:text-white transition duration-200">
                  <Github size={14} className="text-[#F2C1A3]" />
                  <span>GitHub Integration</span>
                </div>
                <div className="flex items-center gap-2 hover:text-white transition duration-200">
                  <Zap size={14} className="text-[#F8CCAA]" />
                  <span>Real-time Tracking</span>
                </div>
                <div className="flex items-center gap-2 hover:text-white transition duration-200">
                  <FileText size={14} className="text-[#CD9FA0]" />
                  <span>Smart Reports</span>
                </div>
              </motion.div>
            </div>

            {/* Right Side Visual - Dashboard Mockup */}
            <div className="lg:col-span-6 w-full">
              <DashboardMockup />
            </div>

          </div>
        </section>

        {/* ================= BENTO GRID FEATURES ================= */}
        <BentoGrid />

        {/* ================= CONNECTED TIMELINE WORKFLOW ================= */}
        <Timeline />

        {/* ================= PREMIUM STUDENT PRICING ================= */}
        <Pricing />

        {/* ================= ABOUT & MISSION GRID ================= */}
        <About />

        {/* ================= EDITORIAL BLOG PREVIEWS ================= */}
        <Blog />

        {/* ================= PANORAMIC STUDENT TESTIMONIAL ================= */}
        <Testimonials />

        {/* ================= FINAL CTA SECTION ================= */}
        <section className="relative w-full max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
          
          {/* Glowing central Sunset Circle behind text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-72 w-72 rounded-full bg-gradient-to-r from-[#F2C1A3] to-[#CD9FA0] opacity-[0.08] blur-[100px] pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass-card rounded-3xl p-8 md:p-14 relative overflow-hidden"
          >
            {/* Background grids */}
            <div className="absolute inset-0 dot-grid opacity-[0.04] pointer-events-none" />

            <h2 className="text-3xl md:text-5xl font-normal text-white mb-4 tracking-tight font-serif leading-tight">
              Ready to bring transparency<br />to your team?
            </h2>
            
            <p className="text-[#857C91] text-sm md:text-base font-light mb-8 max-w-md mx-auto leading-relaxed">
              Join thousands of students making group projects fair, transparent, and completely stress-free.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/auth?mode=signup"
                className="w-full sm:w-auto px-8 py-4 rounded-full text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] flex items-center justify-center gap-2 btn-glow"
              >
                Get Started for Free
                <ArrowRight size={14} />
              </a>

              <a
                href="#features"
                className="w-full sm:w-auto px-8 py-4 rounded-full text-xs font-medium text-[#f3f4f6] bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 transition flex items-center justify-center gap-2 backdrop-blur-md"
              >
                Explore Features
              </a>
            </div>

            {/* Trust checkmarks */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-8 text-[#857C91] text-xs font-light">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#CD9FA0]/15 flex items-center justify-center text-[#CD9FA0]">
                  <Check size={10} />
                </div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#F2C1A3]/15 flex items-center justify-center text-[#F2C1A3]">
                  <Check size={10} />
                </div>
                <span>Free forever for students</span>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* 4. Minimal Luxury Footer */}
      <Footer activeModal={activeModal} setActiveModal={setActiveModal} />

      {/* 5. Interactive Cinematic Walkthrough Demo Modal */}
      <DemoModal isOpen={activeModal === "demo"} onClose={() => setActiveModal(null)} />

    </div>
  );
}
