"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowLeft, Share2, Check, Sparkles, Heart } from "lucide-react";

// Realistic blog articles database
const articles = [
  {
    id: "free-riding",
    category: "Collaboration",
    title: "How To Prevent Free-Riding In Group Projects",
    excerpt: "Free-riding is the biggest headache in student teams. Discover how structured workflows and transparent task tracking can inspire full-team participation.",
    date: "May 12, 2026",
    readTime: "6 min read",
    author: "Manisa Nayak",
    authorTitle: "Co-Founder, ContriTrack",
    bgClass: "from-[#F2C1A3]/20 to-transparent",
    accent: "#F2C1A3",
    content: [
      {
        heading: "1. The Free-Rider Dilemma in College",
        text: "Almost every college student has experienced it: the dreaded group project where one or two members carry the entire workload while others receive the same grade for doing nothing. Sociologists call this the 'free-rider effect,' a social phenomenon where individuals exert less effort when working in a collective group than when held individually accountable."
      },
      {
        heading: "2. The Psychology of Social Loafing",
        text: "When team contributions are pooled together without distinction, individual accountability dissolves. Without clear traceability, motivation drops, leading to unequal participation. To prevent this, we must shift group work from a collective pool of unassigned labor into highly traceable, modular task ownership."
      },
      {
        heading: "3. Establishing Traceable Task Ownership",
        text: "The most effective counter-measure is transparent task tracking. By breaking down group milestones into granular task cards on a Kanban board, every responsibility is assigned a single owner, complete with clear deadlines and checkable steps. When every task has a face, social loafing naturally evaporates."
      },
      {
        heading: "4. Integrating Automatic Code Telemetry",
        text: "Words can be debated, but evidence cannot. Integrating tools like GitHub allows groups to automatically capture code telemetry. Rather than relying on subjective peer reviews, git commits and pull request records offer objective, indisputable evidence of individual effort, leading to verified contribution parity."
      }
    ]
  },
  {
    id: "github-tracking",
    category: "Integrations",
    title: "Using GitHub To Track Team Contributions",
    excerpt: "Stop collecting manual commit lists. Learn how to securely bridge GitHub telemetry directly with academic grading dashboards.",
    date: "May 8, 2026",
    readTime: "8 min read",
    author: "Khushi Nayak",
    authorTitle: "Tech Lead, ContriTrack",
    bgClass: "from-[#F8CCAA]/20 to-transparent",
    accent: "#F8CCAA",
    content: [
      {
        heading: "1. Moving Past Manual Logs",
        text: "For years, college professors have asked students to submit weekly self-reports or manual timesheets to prove their project contributions. These logs are notoriously inaccurate, heavily subject to bias, and frustratingly tedious. The future of academic integrity lies in automated, secure telemetry sync."
      },
      {
        heading: "2. The Power of Git Telemetry",
        text: "Git is more than a version control tool; it is a ledger of digital progress. Every commit holds a timestamp, author name, and cryptographic hash showing exactly what lines were added, edited, or removed. Bridging this data with collaborative dashboards gives professors an authentic timeline of team progression."
      },
      {
        heading: "3. Protecting Privacy via OAuth Connects",
        text: "Integrating student repositories requires secure authentication. Using secure OAuth sync gateways ensures that only specific metadata (commit counts, pull requests, files modified) is parsed for analytics, keeping private code safe and maintaining absolute compliance with student privacy guidelines."
      },
      {
        heading: "4. Balancing Code and Non-Code Work",
        text: "It is critical to remember that contribution is not solely about lines of code. Academic collaboration dashboards must balance GitHub telemetry with task checklists, meeting logs, and report writing, ensuring that analysts, researchers, and project coordinators are evaluated as fairly as developers."
      }
    ]
  },
  {
    id: "productivity-systems",
    category: "Productivity",
    title: "5 Productivity Systems For Student Developers",
    excerpt: "From Pomodoro stacks to Kanban boards, explore the ultimate productivity setups tailored to balance demanding college projects.",
    date: "May 4, 2026",
    readTime: "5 min read",
    author: "Kabir Sen",
    authorTitle: "UX Researcher",
    bgClass: "from-[#CD9FA0]/20 to-transparent",
    accent: "#CD9FA0",
    content: [
      {
        heading: "1. The Chaotic Student Schedule",
        text: "Balancing multiple university classes, homework sets, exams, and massive team capstone projects can feel like spinning plates on a windy deck. For student developers, traditional corporate productivity frameworks rarely fit. We need robust, fast-adapting systems that fit academic workflows."
      },
      {
        heading: "2. The Time-Blocked Pomodoro Stack",
        text: "Time blocking involves dividing your day into distinct blocks dedicated strictly to one task. When paired with the Pomodoro technique (25 minutes of deep focus followed by 5 minutes of rest), time blocking protects you from context-switching, allowing you to dive into complex coding files without fatigue."
      },
      {
        heading: "3. Interactive Visual Kanban Columns",
        text: "Working in teams requires visual alignment. Utilizing glassmorphic Kanban columns partitioned into 'To Do', 'In Progress', and 'Done' ensures that developers never duplicate efforts. It provides a visual scoreboard that keeps team momentum high and provides dopamine hits as cards move right."
      },
      {
        heading: "4. Single-Source-Of-Truth Repositories",
        text: "Clutter kills speed. Keeping meeting notes, API draft plans, calendar checkpoints, and developer tasks pooled inside a single collaborative dashboard saves minutes that accumulate into hours. Keep your tooling clean, unified, and tightly integrated."
      }
    ]
  },
  {
    id: "accountability-velocity",
    category: "Research",
    title: "Why Accountability Improves Team Performance",
    excerpt: "When students understand their efforts are visible and authenticated, team velocity increases, stress declines, and final project grades climb.",
    date: "April 28, 2026",
    readTime: "7 min read",
    author: "Dr. Evelyn Carter",
    authorTitle: "Professor of Software Engineering",
    bgClass: "from-[#F2C1A3]/20 to-transparent",
    accent: "#F2C1A3",
    content: [
      {
        heading: "1. The Psychology of Accountability",
        text: "Accountability is often misunderstood as surveillance or control. In professional software development, accountability is actually the cornerstone of trust. In university courses, when students know their efforts are authenticated, social loafing declines by over 90%."
      },
      {
        heading: "2. Reducing Interpersonal Stress",
        text: "The biggest source of stress in student teams is not the technical difficulty of the project, but the interpersonal anxiety surrounding unequal work. When contribution telemetry is handled automatically by an impartial system, resentment disappears, replaced by healthy, active collaboration."
      },
      {
        heading: "3. Increasing Coding Velocity",
        text: "Clear expectations breed momentum. When developers see active git waves and contribution progress wheels updating live, it creates a gamified collaboration effect. Commits become more regular, pull request feedback loops tighten, and coding velocity spikes."
      },
      {
        heading: "4. The Path to Fair Academic Evaluation",
        text: "Traditional peer reviews are notoriously unreliable—often turning into popularity contests or silent pacts to give everyone high marks. Objective, certified audit logs allow professors to issue personalized grades that represent actual work volume, rewarding high performers fairly."
      }
    ]
  }
];

const accentClasses: Record<string, { text: string; bg: string; border: string; borderLight: string; borderUltraLight: string; bgUltraLight: string; bgSoft: string }> = {
  "#F2C1A3": {
    text: "text-[#F2C1A3]",
    bg: "bg-[#F2C1A3]",
    border: "border-[#F2C1A3]",
    borderLight: "border-[#F2C1A3]/25",
    borderUltraLight: "border-[#F2C1A3]/20",
    bgUltraLight: "bg-[#F2C1A3]/08",
    bgSoft: "bg-[#F2C1A3]/05"
  },
  "#F8CCAA": {
    text: "text-[#F8CCAA]",
    bg: "bg-[#F8CCAA]",
    border: "border-[#F8CCAA]",
    borderLight: "border-[#F8CCAA]/25",
    borderUltraLight: "border-[#F8CCAA]/20",
    bgUltraLight: "bg-[#F8CCAA]/08",
    bgSoft: "bg-[#F8CCAA]/05"
  },
  "#CD9FA0": {
    text: "text-[#CD9FA0]",
    bg: "bg-[#CD9FA0]",
    border: "border-[#CD9FA0]",
    borderLight: "border-[#CD9FA0]/25",
    borderUltraLight: "border-[#CD9FA0]/20",
    bgUltraLight: "bg-[#CD9FA0]/08",
    bgSoft: "bg-[#CD9FA0]/05"
  },
  "#857C91": {
    text: "text-[#857C91]",
    bg: "bg-[#857C91]",
    border: "border-[#857C91]",
    borderLight: "border-[#857C91]/25",
    borderUltraLight: "border-[#857C91]/20",
    bgUltraLight: "bg-[#857C91]/08",
    bgSoft: "bg-[#857C91]/05"
  }
};

export default function Blog() {
  const [activeArticle, setActiveArticle] = useState<typeof articles[0] | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const articleScrollRef = useRef<HTMLDivElement>(null);

  // Monitor reading scroll progress inside the overlay viewport
  const handleScroll = () => {
    if (articleScrollRef.current) {
      const element = articleScrollRef.current;
      const totalHeight = element.scrollHeight - element.clientHeight;
      if (totalHeight > 0) {
        const progress = (element.scrollTop / totalHeight) * 100;
        setReadingProgress(progress);
      }
    }
  };

  // Keyboard Escape listener to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveArticle(null);
        setReadingProgress(0);
      }
    };
    if (activeArticle) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeArticle]);

  // Handle URL Copy Share trigger
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Smooth scroll inside article sections
  const scrollToSection = (idx: number) => {
    const el = document.getElementById(`article-sec-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section id="blog" className="relative w-full max-w-7xl mx-auto px-6 py-20 md:py-32 overflow-hidden">
      
      {/* Background ambient sunset glowing rings */}
      <div className="absolute top-1/3 left-1/4 -z-10 h-[450px] w-[450px] rounded-full bg-[#CD9FA0] opacity-[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-[10%] -z-10 h-[400px] w-[400px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[120px] pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-xs font-light text-[#857C91] mb-5 cursor-default hover:bg-white/[0.04] hover:text-white transition duration-300"
        >
          Editorial Insights & Publications
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-3xl md:text-5xl font-normal text-white mb-6 tracking-tight leading-tight font-serif"
        >
          Insights, Productivity & Teamwork
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-[#857C91] text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto"
        >
          Explore articles on collaboration, GitHub workflows, productivity, and academic success.
        </motion.p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
        {articles.map((art, idx) => {
          const classes = accentClasses[art.accent] || accentClasses["#F2C1A3"];
          return (
            <motion.div
              key={art.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              whileHover={{ y: -6 }}
              onClick={() => {
                setActiveArticle(art);
                setReadingProgress(0);
                setLiked(false);
              }}
              className="relative p-6 rounded-3xl border border-white/5 bg-[#141523]/45 hover:bg-[#181928]/60 shadow-xl backdrop-blur-md transition-all duration-500 overflow-hidden flex flex-col justify-between group cursor-pointer"
            >
              {/* Corner Glow background sweep */}
              <div 
                className={`absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-[0.01] group-hover:opacity-[0.06] transition-opacity duration-700 blur-[30px] pointer-events-none ${classes.bg}`} 
              />

              {/* Tag and Read time info */}
              <div className="flex justify-between items-center mb-6">
                <span 
                  className={`px-3 py-1 rounded-full text-[10px] uppercase font-mono tracking-widest font-semibold border ${classes.borderLight} ${classes.text} ${classes.bgUltraLight}`}
                >
                  {art.category}
                </span>
                <span className="text-[#857C91] text-xs font-mono font-light flex items-center gap-1.5">
                  <Clock size={11} /> {art.readTime}
                </span>
              </div>

              {/* Title and Excerpt */}
              <div className="flex flex-col gap-3 text-left">
                <h3 className="text-xl md:text-2xl font-light text-white font-serif tracking-tight leading-snug group-hover:text-[#F2C1A3] transition-colors duration-300">
                  {art.title}
                </h3>
                <p className="text-[#857C91] text-xs md:text-sm font-light leading-relaxed group-hover:text-white/80 transition duration-300">
                  {art.excerpt}
                </p>
              </div>

              {/* Footer and Author credentials */}
              <div className="flex items-center justify-between border-t border-white/5 pt-5 mt-6">
                <div className="flex items-center gap-2.5">
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-serif font-semibold border ${classes.borderUltraLight} ${classes.bgSoft}`}
                  >
                    {art.author[0]}
                  </div>
                  <div className="flex flex-col items-start leading-none gap-0.5">
                    <span className="text-[11px] font-medium text-white">{art.author}</span>
                    <span className="text-[9px] text-[#857C91] font-light">{art.date}</span>
                  </div>
                </div>
                
                <span className="text-xs text-[#F2C1A3] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Read Article →
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FULLSCREEN ARTICLE IN-PAGE READING PORTAL OVERLAY */}
      <AnimatePresence>
        {activeArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 bg-[#12131e]/98 backdrop-blur-3xl overflow-hidden flex flex-col"
          >
            {/* Top active scroll progress bar */}
            <div className="h-[3px] w-full bg-white/5 relative z-50">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#F2C1A3] via-[#CD9FA0] to-[#F8CCAA] shadow-[0_0_8px_rgba(242,193,163,0.6)]"
                style={{ width: `${readingProgress}%` } as React.CSSProperties}
              />
            </div>

            {/* Sticky Floating Reader Header Row */}
            <div className="w-full py-4 px-6 md:px-12 border-b border-white/5 bg-[#12131e]/80 backdrop-blur-md flex items-center justify-between z-40">
              <button
                onClick={() => {
                  setActiveArticle(null);
                  setReadingProgress(0);
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#857C91] hover:text-white transition duration-300 py-1.5 px-3.5 rounded-full bg-white/[0.01] border border-white/5 hover:border-white/15 cursor-pointer"
              >
                <ArrowLeft size={12} /> Close Reading
              </button>

              <span className="hidden sm:inline text-xs font-serif font-light text-[#857C91]/75 max-w-[280px] truncate">
                Reading: {activeArticle.title}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`p-2 rounded-full border transition duration-300 cursor-pointer ${
                    liked 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                      : "bg-white/[0.01] border-white/5 hover:border-white/15 text-[#857C91] hover:text-white"
                  }`}
                  aria-label="Like article"
                >
                  <Heart size={14} className={liked ? "fill-rose-400" : ""} />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-full bg-white/[0.01] border border-white/5 hover:border-white/15 text-[#857C91] hover:text-white transition duration-300 cursor-pointer"
                  aria-label="Share article link"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                </button>
              </div>
            </div>

            {/* Scrollable Article Body Containment */}
            <div 
              ref={articleScrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-12 md:py-20 select-text"
            >
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative items-start">
                
                {/* COLUMN 1: STICKY INDEX TABLE OF CONTENTS (25%) */}
                <div className="hidden lg:block lg:col-span-3 sticky top-6 text-left border-r border-white/5 pr-6 min-h-[250px]">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#857C91] font-semibold block mb-6">
                    Table of Contents
                  </span>
                  <div className="flex flex-col gap-4">
                    {activeArticle.content.map((sec, secIdx) => (
                      <button
                        key={secIdx}
                        onClick={() => scrollToSection(secIdx)}
                        className="text-xs font-light text-left text-[#857C91] hover:text-[#F2C1A3] transition duration-250 leading-relaxed block cursor-pointer group"
                      >
                        <span className="font-mono text-[#F2C1A3]/40 group-hover:text-[#F2C1A3] mr-1.5">
                          0{secIdx + 1}.
                        </span>
                        {sec.heading.substring(3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* COLUMN 2: ARTICLE BODY CONTENT (65%) */}
                <div className="col-span-1 lg:col-span-9 max-w-2xl mx-auto text-left flex flex-col gap-8 md:gap-10">
                  
                  {/* Article header details */}
                  <div className="flex flex-col gap-5 border-b border-white/5 pb-8">
                    <span 
                      className={`self-start px-3.5 py-1 rounded-full text-[10px] uppercase font-mono tracking-widest font-semibold border ${accentClasses[activeArticle.accent]?.borderLight || "border-white/10"} ${accentClasses[activeArticle.accent]?.text || "text-white"} ${accentClasses[activeArticle.accent]?.bgUltraLight || "bg-white/5"}`}
                    >
                      {activeArticle.category}
                    </span>

                    <h1 className="text-3xl md:text-5xl font-light text-white font-serif tracking-tight leading-[1.2]">
                      {activeArticle.title}
                    </h1>

                    {/* Author bar */}
                    <div className="flex items-center gap-3.5 mt-2">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-serif font-semibold border ${accentClasses[activeArticle.accent]?.borderLight || "border-white/10"} ${accentClasses[activeArticle.accent]?.bgSoft || "bg-white/5"}`}
                      >
                        {activeArticle.author[0]}
                      </div>
                      <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-xs font-semibold text-white">{activeArticle.author}</span>
                        <span className="text-[10px] text-[#857C91] font-light">{activeArticle.authorTitle}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-4 text-[10px] font-mono text-[#857C91]">
                        <span>{activeArticle.date}</span>
                        <span>•</span>
                        <span>{activeArticle.readTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic sections mapping */}
                  <div className="flex flex-col gap-8 text-[#857C91] text-sm md:text-base font-light leading-relaxed tracking-wide">
                    {activeArticle.content.map((section, idx) => (
                      <div 
                        key={idx} 
                        id={`article-sec-${idx}`}
                        className="flex flex-col gap-3 scroll-mt-24"
                      >
                        <h2 className="text-xl font-serif text-white font-normal tracking-tight mt-4">
                          {section.heading}
                        </h2>
                        <p>{section.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Elite Quote Block */}
                  <div className="relative border-l border-[#F2C1A3] bg-white/[0.01] rounded-r-xl p-5 md:p-6 my-4">
                    <Sparkles size={14} className="text-[#F2C1A3] absolute top-3 right-4 opacity-55" />
                    <p className="text-white italic text-sm font-serif leading-relaxed pr-6">
                      {"\"At ContriTrack, we believe that academic software engineering shouldn't be about subjective reviews. It should be a fair, transparent reflection of real, authenticated coding telemetry.\""}
                    </p>
                    <span className="text-[10px] font-mono text-[#857C91] uppercase tracking-wider block mt-3 text-right">
                      — Team ContriTrack
                    </span>
                  </div>

                  {/* Back button under article */}
                  <div className="border-t border-white/5 pt-8 mt-6 text-center">
                    <button
                      onClick={() => {
                        setActiveArticle(null);
                        setReadingProgress(0);
                      }}
                      className="px-6 py-3 rounded-full text-xs font-semibold text-white bg-white/[0.01] border border-white/5 hover:border-white/15 transition flex items-center gap-2 mx-auto cursor-pointer"
                    >
                      <ArrowLeft size={12} /> Back to Publications
                    </button>
                  </div>

                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </section>
  );
}
