"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  hide?: boolean;
}

export default function Navbar({ hide = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const router = useRouter();

  const navItems = [
    { label: "Features", id: "features" },
    { label: "How It Works", id: "how-it-works" },
    { label: "Pricing", id: "pricing" },
    { label: "About", id: "about" },
    { label: "Blog", id: "blog" }
  ];

  // Scroll detection for blurred background bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver scroll spy active section logic
  useEffect(() => {
    const sections = ["hero", "features", "how-it-works", "pricing", "about", "blog"];
    const observerOptions = {
      root: null,
      rootMargin: "-30% 0px -50% 0px", // Triggers when section occupies vertical mid-window
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Smooth scroll handler with offsets for fixed navigation heights
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    // Smooth scroll to top for hero logo click
    if (id === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const yOffset = -75; // accounts for navbar heights
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: hide ? -80 : 0, opacity: hide ? 0 : 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          hide ? "pointer-events-none" : ""
        } ${
          scrolled 
            ? "py-3 bg-[#12131e]/75 backdrop-blur-md border-b border-white/5 shadow-lg" 
            : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo brand */}
          <a 
            href="#hero" 
            onClick={(e) => handleScrollTo(e, "hero")} 
            className="flex items-center gap-2 group"
          >
            {/* Enterprise Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-horizontal.svg" alt="ContriTrack Logo" width={160} height={24} className="h-6 w-auto" />
          </a>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleScrollTo(e, item.id)}
                  className={`relative text-sm py-1 font-light tracking-wide transition duration-300 ${
                    isActive ? "text-white font-medium" : "text-[#857C91] hover:text-white"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] shadow-[0_0_8px_rgba(242,193,163,0.45)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => router.push("/auth")}
              className="text-sm text-[#857C91] hover:text-white transition duration-200 font-light cursor-pointer focus:outline-none"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/auth")}
              className="relative px-5 py-2 text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] rounded-full btn-glow transition duration-300 cursor-pointer focus:outline-none"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-[#857C91] hover:text-white transition z-50 relative"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Fullscreen Mobile Glassmorphic Overlay Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-[#12131e]/98 backdrop-blur-2xl md:hidden flex flex-col justify-center items-center px-8 py-20 gap-8 shadow-2xl"
          >
            <div className="flex flex-col gap-6 w-full text-center">
              {navItems.map((item, idx) => {
                const isActive = activeSection === item.id;
                return (
                  <motion.a
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleScrollTo(e, item.id)}
                    className={`text-xl font-light tracking-wide py-1 relative block ${
                      isActive ? "text-[#F2C1A3] font-medium" : "text-[#857C91] hover:text-white"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-[45%] right-[45%] h-[2px] bg-[#F2C1A3] shadow-md" />
                    )}
                  </motion.a>
                );
              })}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex flex-col gap-4 w-full max-w-xs mt-8 border-t border-white/5 pt-8"
            >
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/auth");
                }}
                className="text-center text-sm text-[#857C91] hover:text-white transition py-2 font-light cursor-pointer focus:outline-none"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/auth");
                }}
                className="text-center px-5 py-3.5 text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] rounded-full shadow-lg btn-glow cursor-pointer focus:outline-none"
              >
                Get Started
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
