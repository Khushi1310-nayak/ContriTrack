"use client";

import React from "react";
import { Heart } from "lucide-react";
import FooterModals from "./FooterModals";

interface FooterProps {
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
}

export default function Footer({ activeModal, setActiveModal }: FooterProps) {

  return (
    <footer className="w-full border-t border-white/5 bg-[#12131e]/50 mt-20 relative z-30 select-none">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-12">
          {/* Logo & Info */}
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-horizontal.svg" alt="ContriTrack Logo" width={160} height={24} className="h-6 w-auto" />
            </div>
            <p className="text-[#857C91] text-xs font-light leading-relaxed max-w-[200px]">
              Making group collaboration accountable, fair, and evidence-backed for modern college teams.
            </p>
          </div>

          {/* Product pillars */}
          <div className="flex flex-col gap-3 text-left">
            <span className="text-white text-xs font-medium uppercase tracking-wider">Product</span>
            <div className="flex flex-col gap-2.5 text-xs text-[#857C91] font-light items-start">
              <button 
                onClick={() => setActiveModal("features")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                Features
              </button>
              <button 
                onClick={() => setActiveModal("how-it-works")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                How It Works
              </button>
              <button 
                onClick={() => setActiveModal("pricing")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                Pricing
              </button>
              <button 
                onClick={() => setActiveModal("api")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                Developer API
              </button>
            </div>
          </div>

          {/* Company pillars */}
          <div className="flex flex-col gap-3 text-left">
            <span className="text-white text-xs font-medium uppercase tracking-wider">Company</span>
            <div className="flex flex-col gap-2.5 text-xs text-[#857C91] font-light items-start">
              <button 
                onClick={() => setActiveModal("about")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                About Us
              </button>
              <button 
                onClick={() => setActiveModal("careers")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                Careers
              </button>
              <button 
                onClick={() => setActiveModal("privacy")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setActiveModal("terms")} 
                className="hover:text-[#F2C1A3] transition cursor-pointer text-left hover:translate-x-1 duration-300"
              >
                Terms of Service
              </button>
            </div>
          </div>

          {/* Socials & integrations */}
          <div className="flex flex-col gap-4 text-left">
            <span className="text-white text-xs font-medium uppercase tracking-wider">Connect</span>
            <div className="flex items-center gap-4 text-[#857C91]">
              <a 
                href="https://github.com/Khushi1310-nayak" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-emerald-400/20 hover:text-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.25)] duration-300 hover:scale-105"
                aria-label="GitHub Profile"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a 
                href="https://www.linkedin.com/in/manisa-nayak-185bb5378/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-[#F2C1A3]/20 hover:text-[#F2C1A3] hover:shadow-[0_0_20px_rgba(242,193,163,0.25)] duration-300 hover:scale-105"
                aria-label="LinkedIn Profile"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom footer divider & copy */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#857C91] font-light">
          <span>
            © {new Date().getFullYear()} ContriTrack. All rights reserved.
          </span>
          <div className="flex items-center gap-1">
            <span>Designed with</span>
            <Heart size={10} className="text-[#CD9FA0] fill-[#CD9FA0] animate-pulse" />
            <span>for academic integrity.</span>
          </div>
        </div>
      </div>

      {/* Render interactive modal manager */}
      <FooterModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </footer>
  );
}
