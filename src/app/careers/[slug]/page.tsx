/* eslint-disable react-hooks/incompatible-library */
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MapPin,
  DollarSign,
  Layers,
  CheckCircle2,
  ArrowRight,
  X,
  Upload,
  Award,
  Zap,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  AlertTriangle,
  User,
  GraduationCap,
  Link2,
  HelpCircle,
  FileCheck,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getJobRoleBySlugAction, JobRoleMetadata } from "@/app/actions/career-actions";
import { createJobApplicationAction } from "@/app/actions/application-actions";

// Form Validation Schema using Zod
const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address format."),
  phone: z.string().min(5, "Valid phone number is required."),
  country: z.string().min(2, "Country is required."),
  university: z.string().min(2, "University is required."),
  degree: z.string().min(2, "Degree is required."),
  gradYear: z.string().min(4, "Graduation year is required."),
  experienceLevel: z.enum(["student", "fresher", "experienced"]),
  github: z.string().url("Invalid GitHub URL format.").optional().or(z.literal("")),
  linkedin: z.string().url("Invalid LinkedIn URL format.").optional().or(z.literal("")),
  portfolio: z.string().url("Invalid Portfolio URL format.").optional().or(z.literal("")),
  resumeUrl: z.string().url("Please upload your resume to proceed."),
  whyJoin: z.string().min(20, "Please describe why you wish to join (min 20 characters)."),
  bestProject: z.string().min(20, "Please describe the best project you built (min 20 characters)."),
  techStrengths: z.string().min(10, "Please list your core tech strengths."),
  collabExp: z.string().min(20, "Please describe your teamwork experience (min 20 characters)."),
  availability: z.string().min(5, "Please clarify your availability.")
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Academic Info", icon: GraduationCap },
  { id: 3, label: "Profiles & Links", icon: Link2 },
  { id: 4, label: "Skills Matrix", icon: Award },
  { id: 5, label: "Role Questions", icon: HelpCircle },
  { id: 6, label: "Resume Upload", icon: Upload },
  { id: 7, label: "Final Review", icon: FileCheck },
  { id: 8, label: "Submit Success", icon: ShieldCheck }
];

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [job, setJob] = useState<JobRoleMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [track, setTrack] = useState<"fresher" | "experienced">("fresher");
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Fullscreen ATS Form States
  const [isApplyOpen, setIsApplyOpen] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [honeypot, setHoneypot] = useState<string>("");

  // Resume uploading telemetry states
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submit operations
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-step selected skills (Step 4 interactive badges selector)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize unified high-performance React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      country: "",
      university: "",
      degree: "",
      gradYear: "",
      experienceLevel: "fresher",
      github: "",
      linkedin: "",
      portfolio: "",
      resumeUrl: "",
      whyJoin: "",
      bestProject: "",
      techStrengths: "",
      collabExp: "",
      availability: ""
    }
  });

  const formValues = watch();

  // Watch experience track slider transitions
  useEffect(() => {
    setValue("experienceLevel", track);
  }, [track, setValue]);

  // Handle live skills synchronization to field
  useEffect(() => {
    setValue("techStrengths", selectedSkills.join(", "));
  }, [selectedSkills, setValue]);

  // Track page scroll depth progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch job config on load
  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    getJobRoleBySlugAction(slug).then((res) => {
      if (res) {
        setJob(res);
        if (res.level === "experienced") {
          setTrack("experienced");
        }
      }
      setIsLoading(false);
    });
  }, [slug]);

  // Parse active track details
  const trackData = useMemo(() => {
    if (!job) return null;
    try {
      const rawString = track === "fresher" ? job.fresherRequirements : job.experiencedRequirements;
      return JSON.parse(rawString);
    } catch (e) {
      console.error("Failed to parse dynamic track parameters:", e);
      return {
        overview: "Join our active scaling workspaces.",
        responsibilities: ["Develop responsive workspace modules."],
        requirements: ["Understanding of database schemas."],
        salaryRange: "$90,000 - $130,000 USD",
        interviewRounds: ["Technical screening", "Portfolio audit"]
      };
    }
  }, [job, track]);

  // Perform secure client-side resume upload to server gateway
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState("uploading");
    setUploadProgress(15);
    setUploadFileName(file.name);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate a beautiful incremental progress effect
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 150);

      const response = await fetch("/api/recruitment/upload", {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const res = await response.json();

      if (response.ok && res.success) {
        setUploadState("success");
        setValue("resumeUrl", res.resumeUrl);
        // Clear errors if any
        trigger("resumeUrl");
      } else {
        setUploadState("error");
        setUploadError(res.error || "File upload rejected.");
        setValue("resumeUrl", "");
      }
    } catch {
      setUploadState("error");
      setUploadError("Network conflict while uploading resume file.");
      setValue("resumeUrl", "");
    }
  };

  const triggerUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetResumeUpload = () => {
    setUploadState("idle");
    setUploadProgress(0);
    setUploadFileName(null);
    setUploadError(null);
    setValue("resumeUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate step boundary inputs before advancing
  const handleNextStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];

    if (activeStep === 1) {
      fieldsToValidate = ["fullName", "email", "phone", "country"];
    } else if (activeStep === 2) {
      fieldsToValidate = ["university", "degree", "gradYear"];
    } else if (activeStep === 3) {
      fieldsToValidate = ["github", "linkedin", "portfolio"];
    } else if (activeStep === 4) {
      fieldsToValidate = ["techStrengths"];
    } else if (activeStep === 5) {
      fieldsToValidate = ["whyJoin", "bestProject", "collabExp", "availability"];
    } else if (activeStep === 6) {
      fieldsToValidate = ["resumeUrl"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setActiveStep(prev => prev + 1);
    }
  };

  // Handle final submission in the wizard
  const onSubmit = async (values: FormValues) => {
    if (!job) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await createJobApplicationAction({
        ...values,
        roleId: job.id,
        roleTitle: job.title,
        honeypot // Honeypot field
      });

      if (response.success) {
        setActiveStep(8); // Advanced to success splash step
      } else {
        setErrorMessage(response.error || "Failed to persist application registry.");
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#12131e] text-white flex items-center justify-center font-mono text-xs">
        <Loader2 className="animate-spin text-[#CD9FA0] mr-2" size={16} />
        <span>Configuring live ContriTrack hiring configurations...</span>
      </div>
    );
  }

  if (!job || !trackData) {
    return (
      <div className="min-h-screen bg-[#12131e] text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-serif text-white">Path configuration not found</h2>
        <p className="text-xs text-[#8e94a0]">The requested job role slug does not exist or has been closed.</p>
        <Link href="/careers" className="text-xs font-mono text-[#F2C1A3] hover:underline">
          ← Return to Careers list
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#12131e] via-[#16182c] to-[#12131e] text-white relative overflow-hidden font-sans pb-24 selection:bg-[#CD9FA0]/25 selection:text-[#F8CCAA]">

      {/* Scroll indicator */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-[#F2C1A3] z-50 transition-all duration-100 pointer-events-none"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Visual background atmospheric lights */}
      <div className="absolute top-[-200px] right-[-100px] w-[800px] h-[800px] rounded-full bg-[#F2C1A3]/[0.05] blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-200px] w-[800px] h-[800px] rounded-full bg-[#CD9FA0]/[0.04] blur-[220px] pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#12131e]/85 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-end gap-[3px] h-6 w-6 rounded-lg bg-[#F8CCAA]/10 border border-[#F8CCAA]/20 p-1.5 justify-center">
              <span className="w-[3px] h-1.5 bg-[#CD9FA0] rounded-full"></span>
              <span className="w-[3px] h-3.5 bg-[#F2C1A3] rounded-full"></span>
              <span className="w-[3px] h-2.5 bg-[#F8CCAA] rounded-full"></span>
            </div>
            <span className="font-semibold text-white tracking-wider text-sm font-serif">
              Contri<span className="text-[#F2C1A3]">Track</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/40">
            <Link href="/careers" className="hover:text-white transition">Careers Portal</Link>
            <ChevronRight size={10} />
            <span className="text-[#F8CCAA]">{job.title} Details</span>
          </div>
        </div>
        <Link
          href="/careers"
          className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-xs font-mono text-[#8e94a0] hover:text-white transition-all"
        >
          ← Back to Board
        </Link>
      </header>

      {/* DETAILS HERO */}
      <section className="relative pt-16 pb-10 px-6 max-w-5xl mx-auto text-left">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-[#F2C1A3] uppercase tracking-wider">
              {job.department}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Hiring Channel
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-serif text-white font-light tracking-tight mt-1 leading-tight text-glow-white">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 font-mono mt-2 pt-4 border-t border-white/[0.06] w-full">
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-[#CD9FA0]" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-[#CD9FA0]" />
              <span>{job.remoteType}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={12} className="text-[#CD9FA0]" />
              <span>{trackData.salaryRange}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT WITH STICKY ACTION CARD */}
      <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

        {/* Left specifications list */}
        <div className="lg:col-span-8 flex flex-col gap-8 text-left">

          {/* TRACK SWITCHER */}
          <div className="p-5 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#CD9FA0] tracking-wider flex items-center gap-1">
                <Layers size={11} className="text-[#F2C1A3]" />
                Select Experience Track
              </span>
              <span className="text-[9px] font-mono text-[#F8CCAA] bg-[#F2C1A3]/10 px-2 py-0.5 rounded border border-[#F2C1A3]/20">
                Saves parameters dynamically
              </span>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#131424]/65 border border-white/[0.08] relative">
              <button
                onClick={() => setTrack("fresher")}
                className={`py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer relative z-10 ${track === "fresher" ? "text-[#12131e] font-bold" : "text-white/40 hover:text-white"
                  }`}
              >
                🎓 Fresher Track (Entry)
              </button>
              <button
                onClick={() => setTrack("experienced")}
                className={`py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer relative z-10 ${track === "experienced" ? "text-[#12131e] font-bold" : "text-white/40 hover:text-white"
                  }`}
              >
                💼 Experienced Track (Pro)
              </button>

              <motion.div
                className="absolute top-1 bottom-1 rounded-lg bg-[#CD9FA0] shadow-[0_0_10px_rgba(205,159,160,0.4)]"
                animate={{
                  left: track === "fresher" ? "4px" : "50%",
                  right: track === "fresher" ? "50%" : "4px"
                }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
              />
            </div>
          </div>

          {/* Overview */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-serif text-white font-light border-b border-white/5 pb-2">Role Overview</h2>
            <p className="text-slate-300 text-xs font-light leading-relaxed">{job.description}</p>
            <p className="text-slate-300 text-xs font-light leading-relaxed italic border-l-2 border-[#CD9FA0] pl-4 py-1">
              {trackData.overview}
            </p>
          </div>

          {/* Key Responsibilities */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-serif text-white font-light border-b border-white/5 pb-2">Key Responsibilities</h2>
            <ul className="flex flex-col gap-3">
              {trackData.responsibilities.map((resp: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-xs font-light leading-relaxed text-slate-300">
                  <CheckCircle2 size={14} className="text-[#CD9FA0] shrink-0 mt-0.5" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-serif text-white font-light border-b border-white/5 pb-2">Track Core Requirements</h2>
            <ul className="flex flex-col gap-3">
              {trackData.requirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-xs font-light leading-relaxed text-slate-300">
                  <Award size={14} className="text-[#F2C1A3] shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Growth & Roadmap */}
          <div className="p-6 rounded-3xl border border-white/[0.06] bg-[#CD9FA0]/[0.005] hover:bg-[#CD9FA0]/[0.015] transition flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#F2C1A3]">
              <Zap size={15} />
              <h3 className="text-white font-serif font-light text-sm">
                {track === "fresher" ? "🎓 Career Progression Roadmap" : "💼 Leadership Development Tracks"}
              </h3>
            </div>

            <p className="text-[11px] text-[#8e94a0] leading-relaxed">
              {track === "fresher"
                ? "Our Entry path guides junior contributors through deep architecture frameworks, pair-programming setups, and GitHub hooks validations. Expect a structured review index scaling after 6 months."
                : "Professional tracks scale into design direction ownership. Take responsibility over platform sub-systems, run technical audit meetings, represent core platforms at CS panels, and direct student contributors."
              }
            </p>

            <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[9px] text-[#CD9FA0]">
              <div className="p-3 rounded-xl bg-[#131424]/60 border border-white/[0.06] text-center flex flex-col gap-1">
                <span>STAGE 01</span>
                <span className="text-white">Onboarding</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131424]/60 border border-white/[0.06] text-center flex flex-col gap-1">
                <span>STAGE 02</span>
                <span className="text-white">Sync Velocity</span>
              </div>
              <div className="p-3 rounded-xl bg-[#131424]/60 border border-white/[0.06] text-center flex flex-col gap-1">
                <span>STAGE 03</span>
                <span className="text-white">Lead Scope</span>
              </div>
            </div>
          </div>

          {/* Growth Card */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-serif text-white font-light border-b border-white/5 pb-2">Benefits & Growth</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#1b1c2b]/30 flex flex-col gap-1">
                <span className="text-white font-serif font-semibold">Async Work Freedom</span>
                <span>Work when you are most productive. We prioritize specifications over direct sync hours.</span>
              </div>
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#1b1c2b]/30 flex flex-col gap-1">
                <span className="text-white font-serif font-semibold">Relational Database Lab</span>
                <span>Practical sandbox access. Test real-world Postgres clusters, Docker builds, and Firebase configurations.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action card */}
        <aside className="lg:col-span-4 sticky top-24 max-h-[85vh] flex flex-col gap-6 text-left">
          <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl shadow-[0_15px_45px_rgba(0,0,0,0.4)] flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#CD9FA0]/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
              <span className="text-[9px] font-mono text-slate-300 uppercase tracking-wider">Salary Range expectation</span>
              <h3 className="text-xl font-serif text-white font-light flex items-center gap-1.5 text-glow-peach">
                <DollarSign size={16} className="text-[#F2C1A3]" />
                {trackData.salaryRange}
              </h3>
            </div>

            <div className="flex flex-col gap-3 font-mono text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-[#8e94a0]">Location:</span>
                <span className="text-white">{job.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e94a0]">Active Track:</span>
                <span className="text-[#F2C1A3] uppercase font-semibold">{track}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
              <span className="text-[9px] font-mono text-slate-300 uppercase tracking-wider">Target Tech Stack</span>
              <div className="flex flex-wrap gap-1.5">
                {job.technologies.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-[#131424] border border-white/10 text-[9.5px] font-mono text-[#F8CCAA]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* ACTION BUTTON TRIGGER */}
            <button
              onClick={() => {
                setIsApplyOpen(true);
                setActiveStep(1);
              }}
              className="w-full py-3 mt-2 rounded-2xl bg-[#CD9FA0] hover:bg-[#dcb0b1] text-[#12131e] font-semibold text-xs tracking-wider transition-all duration-300 shadow-xl flex items-center justify-center gap-1.5 cursor-pointer border border-[#CD9FA0]/30 shadow-[#CD9FA0]/10"
            >
              <span>Apply For This Position</span>
              <ArrowRight size={13} />
            </button>

            <span className="text-[9.5px] font-mono text-slate-400 text-center leading-normal">
              ⚡ Safe transactional uploads. Connected securely to PostgreSQL clusters.
            </span>
          </div>
        </aside>

      </section>

      {/* FULLSCREEN ENTERPRISE ATS RECRUITMENT MULTI-STEP EXPERIENCE OVERLAY */}
      <AnimatePresence>
        {isApplyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#12131e]/98 backdrop-blur-md overflow-y-auto px-6 py-10 flex flex-col items-center justify-start text-left"
          >

            {/* Visual Lights */}
            <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-[#CD9FA0]/[0.025] blur-[220px] pointer-events-none" />

            {/* WIZARD CONTAINER */}
            <div className="w-full max-w-4xl flex flex-col gap-8 relative z-10">

              {/* UPPER HEADER BAR */}
              <div className="flex items-center justify-between border-b border-white/5 pb-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8.5px] font-mono text-[#F2C1A3]">
                      CONTRITRACK ATS
                    </span>
                    <span className="text-[10px] text-[#8e94a0] font-mono">/ {job.title} APPLICATION</span>
                  </div>
                  <h2 className="text-xl font-serif text-white font-light mt-1">
                    Recruitment Gateway: Join as <span className="text-[#F2C1A3]">{job.title}</span>
                  </h2>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to abandon your active application? Your drafting details will be cleared.")) {
                      setIsApplyOpen(false);
                      setActiveStep(1);
                      resetResumeUpload();
                    }
                  }}
                  className="p-2.5 rounded-full border border-white/10 hover:border-white/20 text-[#8e94a0] hover:text-white transition cursor-pointer"
                  title="Abandon Application Draft"
                >
                  <X size={15} />
                </button>
              </div>

              {/* TIMELINE HORIZONTAL STEP PROGRESS */}
              {activeStep < 8 && (
                <div className="w-full grid grid-cols-7 gap-1 md:gap-3 bg-[#1b1c2b]/85 border border-white/[0.08] p-4 rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.2)]">
                  {STEPS.slice(0, 7).map((s) => {
                    const StepIcon = s.icon;
                    const isActive = s.id === activeStep;
                    const isCompleted = s.id < activeStep;

                    return (
                      <div key={s.id} className="flex flex-col items-center gap-1.5 text-center relative">
                        <div
                          className={`w-7 h-7 md:w-8 md:h-8 rounded-full border flex items-center justify-center transition-all ${isActive
                              ? "bg-[#CD9FA0] border-[#CD9FA0] text-[#12131e] shadow-[0_0_15px_rgba(205,159,160,0.3)]"
                              : isCompleted
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-white/[0.01] border-white/5 text-white/30"
                            }`}
                        >
                          <StepIcon size={12} className={isActive ? "animate-pulse" : ""} />
                        </div>
                        <span className={`text-[8.5px] md:text-[9.5px] font-mono uppercase tracking-wider hidden sm:block ${isActive ? "text-[#F8CCAA] font-bold" : isCompleted ? "text-emerald-400" : "text-white/30"
                          }`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SUBMISSION PROCESS BLOCK */}
              <form onSubmit={handleSubmit(onSubmit)} className="w-full">

                {/* Honeypot hidden input */}
                <input
                  type="text"
                  name="honeypot"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  title="Do not fill this field if you are a human"
                />

                <AnimatePresence mode="wait">

                  {/* STEP 1: Personal Info */}
                  {activeStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <User size={16} className="text-[#CD9FA0]" />
                        <span>Step 1: Contact Details & Identity</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Full Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Khushi Nayak"
                            {...register("fullName")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.fullName && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.fullName.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Email Address *</label>
                          <input
                            type="email"
                            placeholder="e.g. khushinayak127@gmail.com"
                            {...register("email")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.email && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.email.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Phone Number *</label>
                          <input
                            type="text"
                            placeholder="e.g. +91 7077780027"
                            {...register("phone")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.phone && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.phone.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Country *</label>
                          <input
                            type="text"
                            placeholder="e.g. India"
                            {...register("country")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.country && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.country.message}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Academic Info */}
                  {activeStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <GraduationCap size={16} className="text-[#CD9FA0]" />
                        <span>Step 2: Educational Context</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">University / Institution *</label>
                          <input
                            type="text"
                            placeholder="e.g. Indian Institute of Technology"
                            {...register("university")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.university && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.university.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Degree / Major *</label>
                          <input
                            type="text"
                            placeholder="e.g. B.Tech Computer Science"
                            {...register("degree")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.degree && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.degree.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Graduation Year *</label>
                          <input
                            type="text"
                            placeholder="e.g. 2026"
                            {...register("gradYear")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.gradYear && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.gradYear.message}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Professional Links */}
                  {activeStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <Link2 size={16} className="text-[#CD9FA0]" />
                        <span>Step 3: Portfolios & Engineering Networks</span>
                      </h3>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">GitHub Profile URL</label>
                          <input
                            type="url"
                            placeholder="https://github.com/yourusername"
                            {...register("github")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.github && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.github.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">LinkedIn Profile URL</label>
                          <input
                            type="url"
                            placeholder="https://linkedin.com/in/yourprofile"
                            {...register("linkedin")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.linkedin && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.linkedin.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Personal Portfolio / Website URL</label>
                          <input
                            type="url"
                            placeholder="https://yourportfolio.com"
                            {...register("portfolio")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.portfolio && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.portfolio.message}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Experience & Skills Matrix */}
                  {activeStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <Award size={16} className="text-[#CD9FA0]" />
                        <span>Step 4: Technology & Skillset Matrix</span>
                      </h3>

                      <div className="flex flex-col gap-4">
                        <span className="font-mono text-[#CD9FA0] text-[10px] uppercase font-semibold">Select Target Skills *</span>

                        <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-[#131424]/60 border border-white/10">
                          {[
                            "Next.js", "React", "TypeScript", "PostgreSQL", "Prisma",
                            "Firebase", "Framer Motion", "Tailwind CSS", "Node.js",
                            "Docker", "AWS", "Git & GitHub Hooks", "GraphQL", "REST APIs"
                          ].map((skill) => {
                            const isSelected = selectedSkills.includes(skill);

                            return (
                              <button
                                type="button"
                                key={skill}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedSkills(prev => prev.filter(s => s !== skill));
                                  } else {
                                    setSelectedSkills(prev => [...prev, skill]);
                                  }
                                }}
                                className={`px-3.5 py-2 rounded-full text-xs font-mono tracking-wider transition-all border cursor-pointer ${isSelected
                                    ? "bg-[#CD9FA0]/20 text-[#F8CCAA] font-semibold border-[#CD9FA0]/70 shadow-[0_0_12px_rgba(205,159,160,0.25)]"
                                    : "bg-[#131424]/60 text-white/70 border-white/10 hover:text-white hover:bg-[#131424]/90"
                                  }`}
                              >
                                {isSelected ? "✓ " : "+ "} {skill}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Add Custom Skills (Comma Separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. WebRTC, Redis, Python"
                            value={formValues.techStrengths}
                            onChange={(e) => {
                              setValue("techStrengths", e.target.value);
                              trigger("techStrengths");
                            }}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.techStrengths && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.techStrengths.message}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5: Role Questions */}
                  {activeStep === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <HelpCircle size={16} className="text-[#CD9FA0]" />
                        <span>Step 5: Operational Review Questions</span>
                      </h3>

                      <div className="flex flex-col gap-5 text-xs">
                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Why are you excited to join ContriTrack? *</label>
                          <textarea
                            rows={3}
                            placeholder="Describe what inspires you about building fair git contribution telemetry engines..."
                            {...register("whyJoin")}
                            className="p-4 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300 resize-none"
                          />
                          {errors.whyJoin && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.whyJoin.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Describe the best application project you ever engineered *</label>
                          <textarea
                            rows={3}
                            placeholder="Details regarding your technical challenges, databases used, and deployment frameworks..."
                            {...register("bestProject")}
                            className="p-4 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300 resize-none"
                          />
                          {errors.bestProject && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.bestProject.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Describe a team collaboration environment you excelled in *</label>
                          <textarea
                            rows={3}
                            placeholder="Explain how you handled conflicts, peer coordination, or async milestone deadlines..."
                            {...register("collabExp")}
                            className="p-4 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300 resize-none"
                          />
                          {errors.collabExp && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.collabExp.message}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">What is your availability scope? (Weekly hours / starting notice) *</label>
                          <input
                            type="text"
                            placeholder="e.g. 20 hours per week, starting immediately"
                            {...register("availability")}
                            className="px-4 py-3 rounded-xl bg-[#131424]/85 hover:bg-[#131424] border border-white/15 text-xs text-white focus:outline-none focus:border-[#CD9FA0] focus:ring-2 focus:ring-[#CD9FA0]/20 focus:bg-[#131424] placeholder-slate-400/60 transition-all duration-300"
                          />
                          {errors.availability && (
                            <span className="text-[10px] text-red-400 font-mono">⚠️ {errors.availability.message}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 6: Resume Upload */}
                  {activeStep === 6 && (
                    <motion.div
                      key="step6"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <Upload size={16} className="text-[#CD9FA0]" />
                        <span>Step 6: Secure Resume Payload Upload</span>
                      </h3>

                      <div className="flex flex-col gap-4 text-xs">
                        <span className="font-mono text-slate-300 text-[10px] uppercase tracking-wider font-medium">Upload PDF or DOCX Resume (Max 5MB) *</span>

                        {/* Hidden native input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleResumeUpload}
                          accept=".pdf,.docx,.doc"
                          title="Upload your resume file"
                          className="hidden"
                        />

                        {uploadState === "idle" && (
                          <div
                            onClick={triggerUploadClick}
                            className="p-12 rounded-3xl border-2 border-dashed border-white/15 hover:border-[#CD9FA0] bg-[#131424]/40 hover:bg-[#131424]/65 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#CD9FA0]">
                              <Upload size={20} />
                            </div>
                            <span className="text-xs font-semibold text-white">Click to select and upload your resume</span>
                            <span className="text-[10px] text-slate-300">PDF, DOCX and DOC file formats up to 5MB are accepted</span>
                          </div>
                        )}

                        {uploadState === "uploading" && (
                          <div className="p-10 rounded-3xl border border-white/5 bg-black/20 text-center flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-[#F2C1A3]" size={28} />
                            <div className="flex flex-col gap-1 w-full max-w-xs">
                              <span className="text-xs text-white">Uploading &quot;{uploadFileName}&quot;...</span>
                              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                                <motion.div
                                  className="h-full bg-[#CD9FA0]"
                                  style={{ width: `${uploadProgress}%` }}
                                  transition={{ duration: 0.1 }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-[#8e94a0] mt-1">{uploadProgress}% Complete</span>
                            </div>
                          </div>
                        )}

                        {uploadState === "success" && (
                          <div className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.03] text-center flex flex-col items-center gap-4 relative overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <CheckCircle2 size={20} />
                            </div>
                            <div className="flex flex-col gap-1 w-full max-w-md">
                              <span className="text-xs text-white font-medium">Resume Uploaded Successfully!</span>
                              <span className="text-[11px] text-[#8e94a0] truncate font-mono mt-1">&quot;{uploadFileName}&quot;</span>
                            </div>

                            {/* Resume review link */}
                            <div className="flex items-center gap-4 mt-2 justify-center">
                              <a
                                href={formValues.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-1.5 rounded-full bg-[#131424] border border-white/10 text-[10.5px] font-mono text-[#F8CCAA] hover:text-white transition"
                              >
                                View File PDF
                              </a>
                              <button
                                type="button"
                                onClick={resetResumeUpload}
                                className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10.5px] font-mono text-red-400 hover:bg-red-500/25 transition cursor-pointer"
                              >
                                Delete & Replace
                              </button>
                            </div>
                          </div>
                        )}

                        {uploadState === "error" && (
                          <div className="p-8 rounded-3xl border border-red-500/20 bg-red-500/[0.03] text-center flex flex-col items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                              <AlertTriangle size={20} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-white font-medium">Upload Pipeline Failed</span>
                              <p className="text-[11px] text-red-400 mt-1">{uploadError || "Verification mismatch."}</p>
                            </div>
                            <button
                              type="button"
                              onClick={resetResumeUpload}
                              className="px-5 py-2 rounded-xl bg-[#131424] border border-white/10 hover:bg-[#131424]/80 text-xs font-mono text-[#F2C1A3] transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              <span>Retry Upload</span>
                            </button>
                          </div>
                        )}

                        {errors.resumeUrl && (
                          <span className="text-[10px] text-red-400 font-mono text-center">⚠️ {errors.resumeUrl.message}</span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 7: Final Review */}
                  {activeStep === 7 && (
                    <motion.div
                      key="step7"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 md:p-8 rounded-3xl border border-white/[0.08] bg-[#1b1c2b]/85 backdrop-blur-xl flex flex-col gap-6 shadow-[0_10px_35px_rgba(0,0,0,0.35)]"
                    >
                      <h3 className="text-base font-serif text-white font-light flex items-center gap-2 border-b border-white/5 pb-3">
                        <FileCheck size={16} className="text-[#CD9FA0]" />
                        <span>Step 7: Deep Audit & Verification Check</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        
                        {/* Section 1: Contact Details */}
                        <div className="p-4 rounded-2xl bg-[#131424]/60 border border-white/10 flex flex-col gap-2 hover:border-[#CD9FA0]/40 hover:bg-[#1f213a]/55 transition-all duration-300">
                          <h4 className="font-mono text-[#CD9FA0] text-[9.5px] uppercase tracking-wider">1. Contact Identity</h4>
                          <p className="text-white"><strong>Name:</strong> {formValues.fullName}</p>
                          <p className="text-white"><strong>Email:</strong> {formValues.email}</p>
                          <p className="text-white"><strong>Phone:</strong> {formValues.phone}</p>
                          <p className="text-white"><strong>Country:</strong> {formValues.country}</p>
                        </div>

                        {/* Section 2: Education */}
                        <div className="p-4 rounded-2xl bg-[#131424]/60 border border-white/10 flex flex-col gap-2 hover:border-[#CD9FA0]/40 hover:bg-[#1f213a]/55 transition-all duration-300">
                          <h4 className="font-mono text-[#CD9FA0] text-[9.5px] uppercase tracking-wider">2. Education & Tier</h4>
                          <p className="text-white"><strong>University:</strong> {formValues.university}</p>
                          <p className="text-white"><strong>Degree:</strong> {formValues.degree}</p>
                          <p className="text-white"><strong>Grad Year:</strong> {formValues.gradYear}</p>
                          <p className="text-white"><strong>Track Preference:</strong> {formValues.experienceLevel.toUpperCase()}</p>
                        </div>

                        {/* Section 3: Links */}
                        <div className="p-4 rounded-2xl bg-[#131424]/60 border border-white/10 flex flex-col gap-2 md:col-span-2 hover:border-[#CD9FA0]/40 hover:bg-[#1f213a]/55 transition-all duration-300">
                          <h4 className="font-mono text-[#CD9FA0] text-[9.5px] uppercase tracking-wider">3. Portfolio and Networks</h4>
                          <p className="text-white"><strong>GitHub:</strong> <span className="font-mono text-white/80">{formValues.github || "Not Provided"}</span></p>
                          <p className="text-white"><strong>LinkedIn:</strong> <span className="font-mono text-white/80">{formValues.linkedin || "Not Provided"}</span></p>
                          <p className="text-white"><strong>Portfolio:</strong> <span className="font-mono text-white/80">{formValues.portfolio || "Not Provided"}</span></p>
                        </div>

                        {/* Section 4: Resume File & Skills */}
                        <div className="p-4 rounded-2xl bg-[#131424]/60 border border-white/10 flex flex-col gap-2 md:col-span-2 hover:border-[#CD9FA0]/40 hover:bg-[#1f213a]/55 transition-all duration-300">
                          <h4 className="font-mono text-[#CD9FA0] text-[9.5px] uppercase tracking-wider">4. Resume File & Tech Strengths</h4>
                          <p className="text-white truncate"><strong>Resume Link:</strong> <a href={formValues.resumeUrl} target="_blank" rel="noreferrer" className="text-[#F2C1A3] hover:underline font-mono">{formValues.resumeUrl}</a></p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <strong>Skills:</strong>
                            {selectedSkills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[9px] font-mono text-white">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Section 5: Answers */}
                        <div className="p-4 rounded-2xl bg-[#131424]/60 border border-white/10 flex flex-col gap-3 md:col-span-2 hover:border-[#CD9FA0]/40 hover:bg-[#1f213a]/55 transition-all duration-300">
                          <h4 className="font-mono text-[#CD9FA0] text-[9.5px] uppercase tracking-wider border-b border-white/5 pb-1">5. Answers & Goals</h4>
                          <div>
                            <p className="text-slate-400 font-mono text-[9px] font-semibold">WHY CONTRITRACK:</p>
                            <p className="text-white mt-0.5">{formValues.whyJoin}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-mono text-[9px] font-semibold">BEST PROJECT CONSTRUCTED:</p>
                            <p className="text-white mt-0.5">{formValues.bestProject}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-mono text-[9px] font-semibold">AVAILABILITY SCOPE:</p>
                            <p className="text-white mt-0.5">{formValues.availability}</p>
                          </div>
                        </div>

                      </div>

                      {/* Error panel */}
                      {errorMessage && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          ⚠️ {errorMessage}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 8: Success Splash */}
                  {activeStep === 8 && (
                    <motion.div
                      key="step8"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-8 md:p-12 rounded-3xl border border-emerald-500/20 bg-[#1b1c2b]/95 text-center flex flex-col items-center gap-6 max-w-xl mx-auto shadow-2xl relative overflow-hidden"
                    >
                      {/* Floating dynamic glow */}
                      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-emerald-500/[0.03] rounded-full blur-2xl" />

                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <ShieldCheck size={32} className="animate-bounce" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                          Application Confirmed (100%)
                        </span>
                        <h3 className="text-2xl font-serif text-white font-light">
                          Welcome to the Pipeline, {formValues.fullName}!
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed mt-2 max-w-md mx-auto">
                          We have registered your details in the postgres database under the <strong>{job.title}</strong> track.
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                          An automated confirmation has been sent to <strong>{formValues.email}</strong>. Our system has also dispatched your developer profile directly to the recruitment board.
                        </p>
                      </div>

                      <div className="w-full p-4 rounded-2xl bg-[#131424]/70 border border-white/[0.08] text-[9.5px] font-mono text-[#8e94a0] flex flex-col gap-1.5 text-left mt-3">
                        <div className="flex justify-between">
                          <span>Database table:</span>
                          <span className="text-white">&quot;JobApplication&quot;</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Review flow:</span>
                          <span className="text-white">Admin Queue Reconciled</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsApplyOpen(false);
                          setActiveStep(1);
                          resetResumeUpload();
                          router.push("/careers");
                        }}
                        className="mt-4 px-8 py-3 rounded-full bg-[#CD9FA0] hover:bg-[#dcb0b1] text-[#12131e] font-semibold text-xs tracking-wider transition cursor-pointer"
                      >
                        Return to Job Board
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* BOTTOM BACK/NEXT BAR BUTTON CONTROLS */}
                {activeStep < 8 && (
                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/5">
                    <button
                      type="button"
                      disabled={activeStep === 1}
                      onClick={() => setActiveStep(prev => prev - 1)}
                      className={`px-5 py-2.5 rounded-full border text-xs font-semibold font-mono tracking-wider transition flex items-center gap-1.5 ${activeStep === 1
                          ? "border-white/5 text-white/10 cursor-not-allowed"
                          : "border-white/10 hover:border-white/20 text-[#8e94a0] hover:text-white cursor-pointer"
                        }`}
                    >
                      <ArrowLeft size={13} />
                      <span>Previous Step</span>
                    </button>

                    {activeStep === 7 ? (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-full bg-[#CD9FA0] hover:bg-[#dcb0b1] text-[#12131e] font-bold text-xs tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-[#CD9FA0]/10 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Persisting Details...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Application</span>
                            <Send size={13} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-[#F2C1A3] font-bold text-xs tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Continue Pipeline</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                )}

              </form>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
