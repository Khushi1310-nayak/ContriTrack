"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Copy, Check, X, PhoneCall, Sparkles } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState(false);
  const phoneNumber = "+91 7077780027";
  const rawPhoneNumber = "917077780027";

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber.replace(/\s+/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0c0d15]/65 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="w-full max-w-[290px] bg-[#161726]/95 border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden text-center cursor-default z-10"
          >
            {/* Glowing Sunset Ring background */}
            <div className="absolute top-[-30px] right-[-30px] h-24 w-24 rounded-full bg-[#CD9FA0]/15 blur-xl pointer-events-none" />
            <div className="absolute bottom-[-30px] left-[-30px] h-20 w-20 rounded-full bg-[#F2C1A3]/8 blur-lg pointer-events-none" />

            {/* Header Close button */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              title="Close"
              className="absolute top-3.5 right-3.5 text-[#857C91] hover:text-white transition duration-300 cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Icon */}
            <div className="mx-auto w-10 h-10 rounded-full bg-[#CD9FA0]/15 border border-[#CD9FA0]/30 flex items-center justify-center text-[#CD9FA0] mb-3">
              <PhoneCall size={16} />
            </div>

            {/* Content text */}
            <h3 className="text-white text-sm font-serif font-medium tracking-tight mb-1">
              Student Support
            </h3>
            
            <p className="text-[#857C91] text-[11px] font-light mb-4">
              Get direct help and academic coordinator query support.
            </p>

            {/* Large glowing phone number display */}
            <div className="bg-[#1e1f32]/65 border border-white/5 rounded-xl py-2 px-3 flex items-center justify-between mb-4 hover:border-[#CD9FA0]/20 transition duration-300 relative group">
              <div className="flex items-center gap-2">
                <Phone size={10} className="text-[#CD9FA0]" />
                <span className="text-white font-mono text-xs font-semibold tracking-wide">
                  {phoneNumber}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="text-[#857C91] hover:text-white transition relative flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <span className="text-[9px] font-mono text-emerald-400 font-medium">Copied</span>
                ) : null}
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              </button>
            </div>

            {/* Call and WhatsApp Action buttons */}
            <div className="flex flex-col gap-2 mb-3">
              {/* WhatsApp direct chat */}
              <a
                href={`https://wa.me/${rawPhoneNumber}?text=Hello%20Student%20Support,%20I%20need%20assistance.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl text-xs font-semibold text-[#f3f4f6] bg-[#10b981]/10 border border-[#10b981]/25 hover:bg-[#10b981]/20 transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.05)] cursor-pointer"
              >
                {/* Custom WhatsApp SVG path */}
                <svg className="w-3.5 h-3.5 fill-current text-[#10b981]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.062 5.286 5.348 0 11.824 0c3.14 0 6.092 1.224 8.312 3.447 2.22 2.224 3.44 5.178 3.438 8.318-.004 6.554-5.29 11.84-11.766 11.84h-.003c-2.008-.002-3.98-.521-5.734-1.508L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.451 5.405.002 9.8-4.394 9.802-9.8.001-2.618-1.017-5.08-2.868-6.93C16.456 2.016 13.993.998 11.374.998c-5.408 0-9.803 4.394-9.806 9.8-.001 1.733.456 3.424 1.322 4.908L1.83 21.054l5.485-1.428-.668-.418z" />
                </svg>
                <span>WhatsApp Chat</span>
              </a>

              {/* Direct call link */}
              <a
                href={`tel:${rawPhoneNumber}`}
                className="w-full py-2 rounded-xl text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] hover:opacity-95 transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(242,193,163,0.15)] cursor-pointer"
              >
                <Phone size={11} />
                <span>Call Support</span>
              </a>
            </div>

            {/* Sub note details */}
            <div className="flex items-center justify-center gap-1 text-[9px] text-[#857C91] font-light">
              <Sparkles size={9} className="text-[#CD9FA0] animate-pulse" />
              <span>Direct access to academic integration co-ordinator.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
