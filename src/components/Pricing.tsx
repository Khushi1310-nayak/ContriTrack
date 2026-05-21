"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, Award, ShieldCheck } from "lucide-react";
import ContactModal from "./ContactModal";

export default function Pricing() {
  const router = useRouter();
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleFreeSignup = () => {
    router.push("/auth?mode=signup");
  };

  const plans = [
    {
      name: "Free Plan",
      price: "$0",
      period: "forever for students",
      badge: "Fully Loaded",
      desc: "Fully featured contribution tracker to make group projects fair, transparent, and certified.",
      features: [
        "Unlimited active projects",
        "GitHub repository integration",
        "Advanced contribution analytics",
        "AI contribution insights & summaries",
        "Team productivity timeline metrics",
        "Professor-ready certified reports",
        "Standard Task Kanban tracking"
      ],
      buttonText: "Get Started for Free",
      onClick: handleFreeSignup,
      buttonClass: "bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] btn-glow font-bold",
      accentColor: "#F2C1A3",
      isPopular: true
    },
    {
      name: "Institution",
      price: "Custom",
      period: "tailored for departments",
      desc: "Complete classroom portals for academic departments and universities.",
      features: [
        "Department-wide university dashboard",
        "Classroom roster auto-management",
        "Deep professor telemetry metrics",
        "Cross-team comparison matrices",
        "Custom SLA & department support"
      ],
      buttonText: "Contact Institution",
      onClick: () => setIsContactOpen(true),
      buttonClass: "bg-white/[0.02] border border-white/10 hover:border-white/20 text-white hover:bg-white/[0.04]",
      accentColor: "#CD9FA0",
      isPopular: false
    }
  ];

  const accentStyles: Record<string, { bg: string; text: string; bgLight: string }> = {
    "#F2C1A3": {
      bg: "bg-[#F2C1A3]",
      text: "text-[#F2C1A3]",
      bgLight: "bg-[#F2C1A3]/15"
    },
    "#CD9FA0": {
      bg: "bg-[#CD9FA0]",
      text: "text-[#CD9FA0]",
      bgLight: "bg-[#CD9FA0]/15"
    }
  };

  return (
    <section id="pricing" className="relative w-full max-w-7xl mx-auto px-6 py-20 md:py-32 overflow-hidden text-center select-none">
      
      {/* Background ambient sunset glowing rings */}
      <div className="absolute top-1/4 right-[15%] -z-10 h-[450px] w-[450px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-[5%] -z-10 h-[400px] w-[400px] rounded-full bg-[#CD9FA0] opacity-[0.02] blur-[120px] pointer-events-none" />

      {/* Pricing Header */}
      <div className="max-w-3xl mx-auto mb-12 md:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs font-light text-[#857C91] mb-5 cursor-default hover:bg-white/[0.04] hover:text-white transition duration-300"
        >
          Simple pricing models
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-3xl md:text-5xl font-normal text-white mb-6 tracking-tight leading-tight font-serif"
        >
          Simple Pricing For Student Teams
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-[#857C91] text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto"
        >
          ContriTrack is dedicated to making collaboration fair, transparent, and completely free for student project teams.
        </motion.p>
      </div>

      {/* Simplified 2-Column Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch max-w-4xl mx-auto">
        {plans.map((plan, idx) => {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              whileHover={{ y: -8, scale: plan.isPopular ? 1.02 : 1.01 }}
              className={`relative p-8 rounded-3xl border flex flex-col justify-between backdrop-blur-md transition-all duration-500 overflow-hidden text-left group cursor-default ${
                plan.isPopular 
                  ? "border-[#F2C1A3]/30 bg-[#191a2a]/65 shadow-[0_0_50px_rgba(242,193,163,0.06)] md:scale-105 md:z-10" 
                  : "border-white/5 bg-[#141523]/45 hover:bg-[#181928]/60 shadow-xl"
              }`}
            >
              {/* Popular glow indicators */}
              {plan.isPopular && (
                <>
                  <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[#F2C1A3]/10 blur-2xl pointer-events-none" />
                  <div className="absolute top-4 right-4 z-20 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/25 text-[10px] text-[#F2C1A3] font-mono uppercase tracking-widest font-semibold">
                    <Sparkles size={10} />
                    {plan.badge}
                  </div>
                </>
              )}

              {/* Decorative Corner Glow */}
              <div 
                className={`absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-700 blur-[40px] pointer-events-none ${accentStyles[plan.accentColor]?.bg || "bg-white"}`}
              />

              {/* Top Details */}
              <div className="flex flex-col gap-4">
                <span className="text-[#857C91] text-xs font-mono uppercase tracking-widest block font-medium">
                  {plan.name}
                </span>

                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl md:text-5xl font-serif text-white tracking-tight font-normal">
                      {plan.price}
                    </span>
                    <span className="text-[#857C91] text-xs font-light">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <p className="text-[#857C91] text-xs md:text-sm font-light leading-relaxed mt-1">
                  {plan.desc}
                </p>

                <div className="h-[1px] w-full bg-white/5 my-6" />

                {/* Features Checklist */}
                <div className="flex flex-col gap-3.5">
                  {plan.features.map((feature, fIdx) => {
                    const styles = accentStyles[plan.accentColor] || accentStyles["#F2C1A3"];
                    return (
                      <div key={fIdx} className="flex items-start gap-3 text-xs md:text-sm">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${styles.bgLight}`}>
                          <Check size={10} className={styles.text} />
                        </div>
                        <span className="text-white/80 font-light group-hover:text-white transition duration-300">
                          {feature}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions Button */}
              <div className="mt-8">
                <button
                  onClick={plan.onClick}
                  className={`w-full py-3.5 rounded-full text-xs font-semibold tracking-wide transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${plan.buttonClass}`}
                >
                  {plan.buttonText}
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Trust checkmarks under cards */}
      <div className="flex items-center justify-center gap-6 mt-16 text-[#857C91] text-xs font-light">
        <div className="flex items-center gap-1.5">
          <Award size={13} className="text-[#F2C1A3]" />
          <span>100% Free for Students</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-[#CD9FA0]" />
          <span>No Credit Card Required</span>
        </div>
      </div>

      {/* Small Compact Luxury Institution Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </section>
  );
}
