"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Github, 
  Check, 
  Lock, 
  Shield, 
  Activity, 
  List, 
  Calendar, 
  FileText, 
  Layers, 
  Users, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Key, 
  Database, 
  Sparkles 
} from "lucide-react";
import { useRouter } from "next/navigation";
import ContactModal from "./ContactModal";
import { ShieldCheck } from "lucide-react";
import ApiModalContent from "./ApiModalContent";

interface FooterModalsProps {
  activeModal: string | null;
  onClose: () => void;
}

export default function FooterModals({ activeModal, onClose }: FooterModalsProps) {
  // Prevent scrolling on underlying page when modal is active
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal]);

  // Escape key event listener to close active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Accordion state for Terms of Service
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const router = useRouter();
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleFreeSignup = () => {
    onClose();
    router.push("/auth?mode=signup");
  };

  const toggleAccordion = (idx: number) => {
    setActiveAccordion(activeAccordion === idx ? null : idx);
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case "features":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-light">Capabilities</span>
              <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
                Everything You Need To <span className="text-[#F2C1A3] italic">Track</span> Team Accountability
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                {
                  icon: Github,
                  title: "GitHub Contribution Tracking",
                  desc: "Automatically track commits, pull requests, issues, and code contributions.",
                  color: "text-[#F2C1A3]",
                  bg: "group-hover:bg-[#F2C1A3]/5"
                },
                {
                  icon: List,
                  title: "Smart Task Assignment",
                  desc: "Assign tasks, set deadlines, and track progress with a beautiful Kanban board.",
                  color: "text-[#F8CCAA]",
                  bg: "group-hover:bg-[#F8CCAA]/5"
                },
                {
                  icon: Activity,
                  title: "Contribution Percentage Engine",
                  desc: "Smart algorithm calculates fair contribution percentage for every team member.",
                  color: "text-[#CD9FA0]",
                  bg: "group-hover:bg-[#CD9FA0]/5"
                },
                {
                  icon: Calendar,
                  title: "Meeting Logs & Attendance",
                  desc: "Log meetings, track attendance, add notes, and manage action items easily.",
                  color: "text-[#857C91]",
                  bg: "group-hover:bg-[#857C91]/5"
                },
                {
                  icon: Sparkles,
                  title: "AI Contribution Insights",
                  desc: "Get automated assistance summarizing who did what with real work metrics.",
                  color: "text-[#F2C1A3]",
                  bg: "group-hover:bg-[#F2C1A3]/5"
                },
                {
                  icon: Shield,
                  title: "Professor Monitoring Dashboard",
                  desc: "Professors can analyze team activity, detect issues, and review contributions.",
                  color: "text-[#F8CCAA]",
                  bg: "group-hover:bg-[#F8CCAA]/5"
                },
                {
                  icon: FileText,
                  title: "Professional PDF Reports",
                  desc: "Generate detailed, audited evidence reports and export professional PDFs in one click.",
                  color: "text-[#F2C1A3]",
                  bg: "group-hover:bg-[#F2C1A3]/5"
                },
                {
                  icon: Layers,
                  title: "Team Collaboration Analytics",
                  desc: "Visualize group dynamics and overall project pace on real-time interactive charts.",
                  color: "text-[#CD9FA0]",
                  bg: "group-hover:bg-[#CD9FA0]/5"
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition duration-300 flex items-start gap-4 group cursor-default"
                  >
                    <div className={`p-2.5 rounded-xl bg-white/[0.02] border border-white/5 transition duration-300 ${item.bg}`}>
                      <Icon size={18} className={item.color} />
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-white text-sm font-medium group-hover:text-[#F2C1A3] transition">
                        {item.title}
                      </span>
                      <span className="text-[#857C91] text-xs font-light leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#f5cca8] text-[#12131e] text-xs font-medium tracking-wide transition duration-300 shadow-lg hover:shadow-[#F2C1A3]/10"
              >
                Explore Full Platform
              </button>
            </div>
          </div>
        );

      case "how-it-works":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#F8CCAA] font-light">Workflow</span>
              <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
                How <span className="text-[#F8CCAA] italic">ContriTrack</span> Works
              </h2>
            </div>

            <div className="relative pl-10 md:pl-12 mt-6 flex flex-col gap-8">
              {/* Vertical Connector Line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-[1.5px] bg-gradient-to-b from-[#F2C1A3]/40 via-[#CD9FA0]/40 to-[#857C91]/10 z-0" />

              {[
                {
                  step: "1",
                  title: "Create Your Team",
                  desc: "Invite your project members and set up your workspace.",
                  icon: Users,
                  color: "border-[#F2C1A3]/30 text-[#F2C1A3]"
                },
                {
                  step: "2",
                  title: "Connect GitHub",
                  desc: "Sync repositories and track real coding contributions.",
                  icon: Github,
                  color: "border-[#F8CCAA]/30 text-[#F8CCAA]"
                },
                {
                  step: "3",
                  title: "Assign Tasks",
                  desc: "Distribute responsibilities with deadlines and priorities.",
                  icon: List,
                  color: "border-[#CD9FA0]/30 text-[#CD9FA0]"
                },
                {
                  step: "4",
                  title: "Monitor Progress",
                  desc: "Track commits, meetings, and project activity in real time.",
                  icon: Activity,
                  color: "border-[#857C91]/30 text-[#857C91]"
                },
                {
                  step: "5",
                  title: "Export Reports",
                  desc: "Generate professor-ready contribution reports instantly.",
                  icon: FileText,
                  color: "border-[#F2C1A3]/30 text-[#F2C1A3]"
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                    className="relative flex gap-6 text-left group cursor-default"
                  >
                    {/* Node circle */}
                    <div className="absolute left-[-42px] top-1 z-10 w-[22px] h-[22px] rounded-full bg-[#12131e] border-2 border-white/15 flex items-center justify-center text-[10px] font-semibold text-white group-hover:border-[#F2C1A3] transition duration-300">
                      {item.step}
                    </div>

                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 group-hover:border-white/10 transition duration-300 flex-1 flex gap-4 items-center">
                      <div className={`p-2.5 rounded-xl bg-white/[0.02] border ${item.color} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white text-sm font-medium group-hover:text-[#F8CCAA] transition">
                          {item.title}
                        </span>
                        <span className="text-[#857C91] text-xs font-light">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#F8CCAA] hover:bg-[#fad8bb] text-[#12131e] text-xs font-medium tracking-wide transition duration-300 shadow-lg hover:shadow-[#F8CCAA]/10"
              >
                Start Your First Project
              </button>
            </div>
          </div>
        );

      case "pricing": {
        const plans = [
          {
            title: "Free Plan",
            price: "$0",
            period: "forever for students",
            features: [
              "Unlimited active projects",
              "GitHub repository integration",
              "Advanced contribution analytics",
              "AI contribution insights & summaries",
              "Team productivity timeline metrics",
              "Professor-ready certified reports",
              "Standard Task Kanban tracking"
            ],
            button: "Get Started for Free",
            onClick: handleFreeSignup,
            recommended: true,
            color: "border-[#F2C1A3]/30 bg-[#F2C1A3]/[0.01]",
            glow: "shadow-[0_0_30px_rgba(242,193,163,0.06)]"
          },
          {
            title: "Institution",
            price: "Custom",
            period: "tailored for departments",
            features: [
              "Department-wide university dashboard",
              "Classroom roster auto-management",
              "Deep professor telemetry metrics",
              "Cross-team comparison matrices",
              "Custom SLA & department support"
            ],
            button: "Contact Us",
            onClick: () => setIsContactOpen(true),
            recommended: false,
            color: "border-white/5 bg-[#141523]/45",
            glow: ""
          }
        ];

        return (
          <div className="flex flex-col gap-6 select-none relative">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#CD9FA0] font-light">Plans</span>
              <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
                Simple Pricing For <span className="text-[#CD9FA0] italic">Student</span> Teams
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-2xl mx-auto w-full">
              {plans.map((tier, idx) => (
                <div 
                  key={idx}
                  className={`p-6 rounded-2xl border flex flex-col justify-between relative group hover:scale-[1.02] transition-all duration-300 text-left ${tier.color} ${tier.glow}`}
                >
                  {tier.recommended && (
                    <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-[#F2C1A3] text-[#12131e] font-semibold">
                      Fully Loaded
                    </span>
                  )}
                  <div>
                    <h3 className="text-white text-base font-medium mb-1">{tier.title}</h3>
                    <div className="flex flex-col gap-0.5 mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl md:text-3xl font-serif text-white">{tier.price}</span>
                        <span className="text-[#857C91] text-xs font-light">/ {tier.period}</span>
                      </div>
                    </div>
 
                    <ul className="flex flex-col gap-3 mb-6">
                      {tier.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-[11px] text-[#857C91] font-light leading-snug">
                          <Check size={11} className="text-[#F2C1A3] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
 
                  <button
                    onClick={tier.onClick}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-300 cursor-pointer ${
                      tier.recommended 
                        ? "bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] btn-glow font-bold"
                        : "bg-white/[0.02] border border-white/10 hover:border-white/20 text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {tier.button}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-[#857C91] text-[10px] font-light italic">
              <div className="flex items-center gap-1">
                <Award size={12} className="text-[#CD9FA0]" />
                <span>100% Free for students</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <div className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-[#F2C1A3]" />
                <span>No credit card required</span>
              </div>
            </div>

            {/* Render Small Contact Modal inside CASE */}
            <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
          </div>
        );
      }

      case "api":
        return <ApiModalContent onClose={onClose} />;

      case "about":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-light">Identity</span>
              <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
                Our <span className="text-[#F2C1A3] italic">Mission</span> & Core Vision
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-4 text-left">
              <div className="flex flex-col gap-4 text-sm font-light text-[#857C91] leading-relaxed">
                <p>
                  ContriTrack was built to solve one of the biggest frustrations in college life: <strong className="text-white font-normal">group projects without accountability</strong>.
                </p>
                <p>
                  We believe academic and startup collaboration should be transparent, fair, and evidence-backed. 
                </p>
                <p>
                  Our platform integrates automatically with coding history, task status changes, and meeting agendas to trace work contribution parameters cleanly. This builds evidence vectors that reassure team members and professors alike.
                </p>
              </div>

              {/* Graphic container with spin glow */}
              <div className="h-60 rounded-3xl bg-white/[0.01] border border-white/5 relative flex items-center justify-center overflow-hidden shadow-inner">
                {/* Background soft glowing blur */}
                <div className="absolute h-32 w-32 rounded-full bg-[#F2C1A3] opacity-[0.08] blur-3xl pointer-events-none" />
                
                {/* Infinite rotating ring logo mockup */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                  className="relative h-28 w-28 rounded-full border border-dashed border-[#F2C1A3]/30 flex items-center justify-center"
                >
                  <div className="absolute h-20 w-20 rounded-full border border-dashed border-[#CD9FA0]/30 flex items-center justify-center" />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="absolute h-8 w-8 rounded-full bg-gradient-to-tr from-[#F2C1A3] to-[#CD9FA0] opacity-40 blur-sm" 
                  />
                </motion.div>
                
                <div className="absolute flex flex-col items-center gap-1">
                  <span className="font-serif text-white font-medium text-sm">ContriTrack</span>
                  <span className="text-[#857C91] text-[9px] tracking-widest uppercase">Est. 2026</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#fad8bb] text-[#12131e] text-xs font-medium tracking-wide transition duration-300"
              >
                Join the Movement
              </button>
            </div>
          </div>
        );

      case "careers":
        return (
          <div className="flex flex-col gap-6 max-h-[85vh]">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#CD9FA0] font-light">Join Our Movement</span>
              <h2 className="text-2xl md:text-3xl font-light text-white font-serif tracking-tight leading-tight">
                Build The Future Of <span className="text-[#CD9FA0] italic">Academic</span> Collaboration
              </h2>
            </div>
            
            <p className="text-[#857C91] text-xs font-light text-left leading-relaxed">
              We’re developing scalable platforms to make teammate efforts fully accountable, fair, and transparent. Audit our open recruitment channels below. Click on any track to view comprehensive details.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {[
                {
                  role: "Frontend Engineer",
                  slug: "frontend-engineer",
                  type: "Full-Time / Remote",
                  desc: "Create immersive next-generation UI layouts utilizing Next.js Turbopack, Framer Motion, and Tailwind CSS grids.",
                  tag: "Engineering",
                  status: "Hiring Now",
                  tech: "Next.js • Motion"
                },
                {
                  role: "Backend Engineer",
                  slug: "backend-engineer",
                  type: "Full-Time / Remote",
                  desc: "Architect API gateways, postgres connection pools, cryptographic webhooks, and rate limiters.",
                  tag: "Engineering",
                  status: "Hiring Now",
                  tech: "Node.js • Prisma"
                },
                {
                  role: "Full Stack Engineer",
                  slug: "full-stack-engineer",
                  type: "Full-Time / Hybrid",
                  desc: "Orchestrate vertical product flows bridging Next.js frontend pages with Prisma PostgreSQL entities.",
                  tag: "Engineering",
                  status: "Hiring",
                  tech: "TypeScript • PG"
                },
                {
                  role: "Cloud Computing Engineer",
                  slug: "cloud-computing-engineer",
                  type: "Full-Time / Remote",
                  desc: "Configure high-performance EC2, S3, IAM profiles, and provision Terraform architectures.",
                  tag: "Infrastructure",
                  status: "1 Spot",
                  tech: "AWS • Terraform"
                },
                {
                  role: "AI/ML Engineer",
                  slug: "ai-ml-engineer",
                  type: "Full-Time / Hybrid",
                  desc: "Integrate large language model vectors, analyze git repository anomalies, and build reports.",
                  tag: "Engineering",
                  status: "Hiring",
                  tech: "Python • OpenAI"
                },
                {
                  role: "DevOps Engineer",
                  slug: "devops-engineer",
                  type: "Full-Time / Remote",
                  desc: "Scale automated continuous deployment pipelines using Docker, GitHub Actions, and Linux nodes.",
                  tag: "Infrastructure",
                  status: "Hiring",
                  tech: "Docker • Actions"
                },
                {
                  role: "UI/UX Designer",
                  slug: "ui-ux-designer",
                  type: "Full-Time / Remote",
                  desc: "Design gorgeous layout paired guidelines, champagne visual glows, and micro-interactions.",
                  tag: "Design",
                  status: "Hiring Now",
                  tech: "Figma • Prototypes"
                },
                {
                  role: "Product Designer",
                  slug: "product-designer",
                  type: "Full-Time / Remote",
                  desc: "Translate qualitative academic feedback into pixel-perfect mockups and spatial UX grids.",
                  tag: "Design",
                  status: "Hiring",
                  tech: "Figma • Grids"
                },
                {
                  role: "Developer Relations",
                  slug: "developer-relations",
                  type: "Full-Time / Hybrid",
                  desc: "Evangelize peer contribution accountability to university engineering clubs and CS hackathons.",
                  tag: "Outreach",
                  status: "2 Spots",
                  tech: "Community • Tech"
                },
                {
                  role: "Technical Program Coordinator",
                  slug: "technical-program-coordinator",
                  type: "Full-Time / Remote",
                  desc: "Coordinate sprint backlogs, log retro actions, and align async milestone pipelines.",
                  tag: "Operations",
                  status: "Hiring",
                  tech: "Agile • Kanban"
                }
              ].map((pos, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ y: -3, scale: 1.01 }}
                  onClick={() => {
                    onClose();
                    router.push(`/careers/${pos.slug}`);
                  }}
                  className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-[#CD9FA0]/30 hover:bg-[#CD9FA0]/[0.02] hover:shadow-[0_0_20px_rgba(205,159,160,0.05)] transition-all duration-300 flex flex-col gap-1 text-left cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-white text-xs font-semibold group-hover:text-[#CD9FA0] transition">
                      {pos.role}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-mono text-[#857C91] shrink-0">
                      {pos.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[#CD9FA0] text-[9px] font-light font-mono">{pos.type}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 text-[8px] font-mono uppercase tracking-wider">{pos.status}</span>
                  </div>
                  <p className="text-[#857C91] text-[10.5px] font-light leading-relaxed mt-1 line-clamp-2">
                    {pos.desc}
                  </p>
                  
                  {/* Hover visual tech overlay */}
                  <div className="mt-2 pt-2 border-t border-white/[0.03] flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-mono text-white/50 group-hover:text-[#CD9FA0]/80 transition">
                      {pos.tech}
                    </span>
                    <span className="text-[9px] text-[#CD9FA0] font-mono flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Details →
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] font-mono text-[#857C91]">
                ⚡ 10 Open Positions Globally
              </span>
              <button 
                onClick={() => {
                  onClose();
                  router.push("/careers");
                }}
                className="px-5 py-2 rounded-full bg-[#CD9FA0] hover:bg-[#dcb0b1] text-[#12131e] text-[11px] font-semibold tracking-wide transition duration-300 shadow-lg"
              >
                Join Our Team
              </button>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-light">Security</span>
              <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
                Privacy <span className="text-[#F2C1A3] italic">First</span> Philosophy
              </h2>
            </div>
            
            <p className="text-[#857C91] text-sm font-light text-left leading-relaxed">
              Academic data integrity and trust are the foundations of ContriTrack. We implement structural protocols to keep your work securely yours.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                {
                  icon: Shield,
                  title: "Data Protection",
                  desc: "All network communication is strictly encrypted over HTTPS using secure TLS protocols."
                },
                {
                  icon: Lock,
                  title: "GitHub OAuth Security",
                  desc: "We only request read-only access to verify contribution hooks. Your source code files are never cloned or written."
                },
                {
                  icon: Key,
                  title: "Local Encryption",
                  desc: "All session keys and credentials are encrypted on the browser layer with strict security standards."
                },
                {
                  icon: Database,
                  title: "User Ownership",
                  desc: "We store metadata calculations only. We never sell your personal information or university work. Your data belongs to you."
                }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition duration-300 flex items-start gap-4 text-left cursor-default"
                  >
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-[#F2C1A3] shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-white text-xs font-semibold">{card.title}</span>
                      <span className="text-[#857C91] text-xs font-light leading-relaxed">{card.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 text-xs text-[#857C91] font-light">
              <span>Your academic data always belongs to you.</span>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#fad8bb] text-[#12131e] text-xs font-medium tracking-wide transition duration-300"
              >
                Close View
              </button>
            </div>
          </div>
        );

      case "terms":
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[#F8CCAA] font-light">Agreement</span>
              <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
                Terms & <span className="text-[#F8CCAA] italic">Usage</span> Guidelines
              </h2>
            </div>

            <p className="text-[#857C91] text-sm font-light text-left leading-relaxed">
              Please review our basic platform rules to keep the academic accountability ecosystem transparent, clean, and fair.
            </p>

            {/* Accordion List */}
            <div className="flex flex-col gap-3 mt-4 text-left">
              {[
                {
                  title: "1. Fair Platform Usage",
                  content: "ContriTrack is built to facilitate honest, collaborative work. Manipulation or spoofing of stats (such as automated script commits or fake tasks) is strictly prohibited and can result in account termination."
                },
                {
                  title: "2. User Responsibilities",
                  content: "Users are responsible for maintaining the privacy of their workspaces and ensuring group invitation links are not leaked to external parties."
                },
                {
                  title: "3. GitHub Integration Limitations",
                  content: "GitHub sync relies on the GitHub public API. Any downtime or service disruption on GitHub's end may temporarily affect telemetry sync speeds."
                },
                {
                  title: "4. Data Handling",
                  content: "We process raw telemetry logs for coding commits solely to calculate analytical contributions. We store metadata only."
                },
                {
                  title: "5. Platform Availability",
                  content: "We strive to maintain 99.9% uptime, but reserve the right to perform scheduled system upgrades during low-traffic periods."
                }
              ].map((item, idx) => {
                const isOpen = activeAccordion === idx;
                return (
                  <div 
                    key={idx}
                    className="rounded-2xl border border-white/5 overflow-hidden transition-all duration-300"
                  >
                    <button
                      onClick={() => toggleAccordion(idx)}
                      className="w-full px-5 py-4 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between text-white text-xs font-medium transition duration-300"
                    >
                      <span>{item.title}</span>
                      {isOpen ? (
                        <ChevronUp size={14} className="text-[#F8CCAA]" />
                      ) : (
                        <ChevronDown size={14} className="text-[#857C91]" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-5 pb-5 pt-1 text-xs text-[#857C91] leading-relaxed font-light border-t border-white/[0.02]">
                            {item.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#F8CCAA] hover:bg-[#fad8bb] text-[#12131e] text-xs font-medium tracking-wide transition duration-300 shadow-lg"
              >
                Accept Terms
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-[#12131e]/80 backdrop-blur-xl flex justify-center items-start md:items-center p-4 md:p-10"
          onClick={onClose}
        >
          {/* Animated Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl my-auto glass-card rounded-3xl p-6 md:p-10 border border-white/10 bg-[#12131e]/90 shadow-[0_0_50px_rgba(242,193,163,0.06)] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.02] border border-white/5 hover:border-white/10 text-[#857C91] hover:text-white transition duration-300 shadow-inner group"
              aria-label="Close modal"
            >
              <X size={18} className="group-hover:rotate-90 transition duration-300" />
            </button>

            {/* Modal Content */}
            {renderModalContent()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
