"use client";
"use no memo";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Building, 
  Github, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  ShieldCheck, 
  Clock,
  RotateCcw,
  Trash2,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

import { 
  LoginSchema, 
  SignUpSchema, 
  ForgotPasswordSchema, 
  LoginInput, 
  SignUpInput, 
  ForgotPasswordInput 
} from "@/lib/validations";

type AuthMode = "login" | "signup" | "forgot" | "verify" | "success" | "backup";

export default function AuthPage() {
  const { 
    user, 
    login, 
    signUp, 
    loginWithGoogle, 
    loginWithGitHub, 
    logout,
    resetPassword, 
    resendVerification, 
    checkEmailVerifiedStatus,
    isArchived,
    archiveEmail,
    archiveDeletedAt,
    archiveRecoverableUntil,
    restoreArchivedAccount,
    startFresh
  } = useAuth();

  const router = useRouter();

  // Auth panel state machine
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [verifyCountdown, setVerifyCountdown] = useState(60);
  const [canResend, setCanResend] = useState(true);

  // Read URL query parameters to toggle direct login/signup views (avoiding SSR build de-optimizations)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryMode = params.get("mode");
      if (
        queryMode === "login" ||
        queryMode === "signup" ||
        queryMode === "forgot" ||
        queryMode === "verify" ||
        queryMode === "success"
      ) {
        // Defer state update to avoid synchronous cascading render warning
        setTimeout(() => {
          setMode(queryMode as AuthMode);
        }, 0);
      }
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zod login controller
  const { 
    register: registerLogin, 
    handleSubmit: handleLoginSubmit, 
    formState: { errors: loginErrors },
    reset: resetLoginForm
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema)
  });

  // Zod signup controller
  const { 
    register: registerSignUp, 
    handleSubmit: handleSignUpSubmit, 
    control: controlSignUp,
    formState: { errors: signUpErrors },
    reset: resetSignUpForm
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema)
  });

  // Zod forgot password controller
  const { 
    register: registerForgot, 
    handleSubmit: handleForgotSubmit, 
    formState: { errors: forgotErrors },
    reset: resetForgotForm
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema)
  });

  // Dynamic Password strength observer values using useWatch to satisfy React Compiler memoization compatibility
  const signUpPassword = useWatch({ control: controlSignUp, name: "password" }) || "";
  const signUpConfirmPassword = useWatch({ control: controlSignUp, name: "confirmPassword" }) || "";

  // Password strength checklist rules
  const checks = {
    length: signUpPassword.length >= 8,
    upper: /[A-Z]/.test(signUpPassword),
    lower: /[a-z]/.test(signUpPassword),
    number: /[0-9]/.test(signUpPassword),
    special: /[^A-Za-z0-9]/.test(signUpPassword)
  };

  // Password match indicator
  const passwordsMatch = signUpPassword.length >= 8 && signUpPassword === signUpConfirmPassword;

  // Strength score calculator
  const calculateStrength = () => {
    let score = 0;
    if (checks.length) score++;
    if (checks.upper) score++;
    if (checks.lower) score++;
    if (checks.number) score++;
    if (checks.special) score++;
    return score;
  };

  const strengthScore = calculateStrength();
  const strengthLabels = ["Weak", "Weak", "Moderate", "Strong", "Extremely Secure"];
  const strengthColors = ["bg-[#CD9FA0]", "bg-[#CD9FA0]", "bg-[#F2C1A3]", "bg-[#F8CCAA]", "bg-emerald-500"];

  // Background Snowfall particle canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Array<{ x: number; y: number; r: number; d: number; speed: number }> = [];
    const maxParticles = 65;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.2 + 0.8,
        d: Math.random() * maxParticles,
        speed: Math.random() * 0.4 + 0.15
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(248, 204, 170, 0.12)"; // Snowflakes glow in dawn color
      ctx.beginPath();
      
      for (let i = 0; i < maxParticles; i++) {
        const p = particles[i];
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);

        // Slow cinematic diagonal floating movement
        p.y += p.speed;
        p.x += Math.sin(p.d) * 0.25;

        if (p.y > height) {
          particles[i] = {
            x: Math.random() * width,
            y: -10,
            r: p.r,
            d: p.d,
            speed: p.speed
          };
        }
      }
      ctx.fill();
      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Email verification countdown timer
  useEffect(() => {
    if (mode === "verify" && !canResend) {
      const timer = setInterval(() => {
        setVerifyCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, canResend]);

  // Dynamic Verification poll monitoring
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (mode === "verify") {
      pollInterval = setInterval(async () => {
        const isVerified = await checkEmailVerifiedStatus();
        if (isVerified) {
          clearInterval(pollInterval);
          setMode("success");
        }
      }, 3500);
    }
    return () => clearInterval(pollInterval);
  }, [mode, checkEmailVerifiedStatus]);

  // Navigate to Success state if already verified upon landing
  useEffect(() => {
    if (user && user.emailVerified && mode !== "success") {
      router.push("/dashboard"); // Redirect directly to team dashboard workspace
    }
  }, [user, mode, router]);

  // Trigger login workflow
  const onLoginSubmit = async (data: LoginInput) => {
    setFormLoading(true);
    setAuthError(null);
    try {
      await login(data.email, data.password);
      
      // Check if email verification is completed
      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        setMode("verify");
      } else {
        setMode("backup");
      }
    } catch (e: unknown) {
      console.error(e);
      const err = e as { code?: string; message?: string };
      if (err.code === "auth/invalid-credential") {
        setAuthError("The email address or password you entered is incorrect.");
      } else if (err.code === "auth/user-not-found") {
        setAuthError("No account exists with this email address.");
      } else {
        setAuthError(err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Trigger signup workflow
  const onSignUpSubmit = async (data: SignUpInput) => {
    setFormLoading(true);
    setAuthError(null);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Registration processing timed out. Please check your connection and try again.")), 15000)
      );

      await Promise.race([
        signUp({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          university: data.university,
          githubUsername: data.githubUsername
        }),
        timeoutPromise
      ]);

      setMode("verify");
    } catch (e: unknown) {
      console.error("Registration submission error:", e);
      const err = e as { code?: string; message?: string };
      if (err.code === "auth/email-already-in-use") {
        setAuthError("An account already exists with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setAuthError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Password is too weak. Please use at least 8 characters.");
      } else {
        setAuthError(err.message || "Sign up failed. Please try again later.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Trigger forgot password flow
  const onForgotSubmit = async (data: ForgotPasswordInput) => {
    setFormLoading(true);
    setAuthError(null);
    try {
      await resetPassword(data.email);
      setMode("success");
    } catch (e: unknown) {
      console.error(e);
      const err = e as { code?: string; message?: string };
      if (err.code === "auth/user-not-found") {
        setAuthError("No account was found with this email address.");
      } else {
        setAuthError(err.message || "Failed to send reset link. Please check your network.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Resend verification click logic
  const handleResendClick = async () => {
    if (!canResend) return;
    try {
      await resendVerification();
      setCanResend(false);
      setVerifyCountdown(60);
    } catch (err) {
      console.error(err);
      setAuthError("Failed to trigger verification mail. Please refresh and try again.");
    }
  };

  // Trigger Google Authentication popups
  const handleGoogleAuth = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      setMode("success");
    } catch (e: unknown) {
      console.error(e);
      const err = e as { code?: string; message?: string };
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "Google Authentication failed. Please try again.");
      }
    }
  };

  // Trigger GitHub Authentication popups
  const handleGitHubAuth = async () => {
    setAuthError(null);
    try {
      await loginWithGitHub();
      setMode("success");
    } catch (e: unknown) {
      console.error(e);
      const err = e as { code?: string; message?: string };
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message || "GitHub Authentication failed. Please verify your token.");
      }
    }
  };

  // Clear form resets on toggle mode
  const switchMode = (newMode: AuthMode) => {
    setAuthError(null);
    resetLoginForm();
    resetSignUpForm();
    resetForgotForm();
    setMode(newMode);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-[#11121d] relative overflow-hidden font-sans select-none">
      
      {/* Heavy Backlight Ambient Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#CD9FA0]/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-[#F2C1A3]/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#525871]/10 blur-[180px] pointer-events-none" />

      {/* Floating Canvas Snowfall Backdrop */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Main Luxury Container Card */}
      <div className="relative w-full max-w-6xl min-h-[720px] rounded-[32px] border border-[#525871]/30 bg-[#161725]/60 backdrop-blur-2xl shadow-3xl flex flex-col lg:flex-row overflow-hidden z-10">
        
        {/* ==============================================
            LEFT COL: CINEMATIC DASHBOARD VISUAL SHOWCASE
            ============================================== */}
        <div className="relative w-full lg:w-[48%] bg-gradient-to-br from-[#1b1d2e] via-[#161726] to-[#121320] p-8 md:p-12 flex flex-col justify-between overflow-hidden border-r border-[#525871]/20">
          
          {/* Accent lighting for left showcase */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#F8CCAA]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#CD9FA0]/10 blur-3xl" />

          {/* Logo Segment */}
          <div className="relative flex items-center gap-3 z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-horizontal.svg" alt="ContriTrack Logo" width={180} height={28} className="h-7 w-auto" />
          </div>

          {/* Hologram / Dashboard Visual mockup */}
          <div className="relative my-8 py-4 flex items-center justify-center z-10">
            {/* Ambient circular base glowing effect */}
            <div className="absolute -bottom-8 w-64 h-8 bg-gradient-to-r from-[#CD9FA0] via-[#F2C1A3] to-[#F8CCAA] blur-xl opacity-30 rounded-full" />

            {/* Glowing 3D-angled Dashboard frame */}
            <div className="relative w-full max-w-[400px] rounded-2xl border border-[#CD9FA0]/30 bg-gradient-to-br from-[#525871]/35 to-[#161725]/85 p-5 shadow-2xl backdrop-blur-md transform hover:scale-[1.02] transition-transform duration-700">
              
              {/* Header inside visual card */}
              <div className="flex items-center justify-between mb-4 border-b border-[#525871]/20 pb-3">
                <div>
                  <span className="text-xs font-sans uppercase tracking-widest text-[#857C91]">
                    Metric Overview
                  </span>
                  <h4 className="text-sm font-serif text-[#F8CCAA] tracking-wide mt-0.5">
                    Team Contribution
                  </h4>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#CD9FA0]/20 border border-[#CD9FA0]/40 text-xs font-serif text-[#F2C1A3] shadow-md shadow-[#CD9FA0]/10">
                  87% score
                </div>
              </div>

              {/* Glowing SVG Chart lines mimicking GitHub metrics */}
              <div className="w-full h-24 relative mb-5 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="5" x2="100" y2="5" stroke="#525871" strokeWidth="0.1" strokeDasharray="2,2" />
                  <line x1="0" y1="15" x2="100" y2="15" stroke="#525871" strokeWidth="0.1" strokeDasharray="2,2" />
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#525871" strokeWidth="0.1" strokeDasharray="2,2" />

                  {/* Gradient Area under curve */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F2C1A3" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#CD9FA0" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M 0 30 L 0 20 Q 15 8 30 18 T 60 10 T 85 24 Q 92.5 12 100 8 L 100 30 Z" 
                    fill="url(#chartGrad)" 
                  />

                  {/* Top Curve Line */}
                  <path 
                    d="M 0 20 Q 15 8 30 18 T 60 10 T 85 24 Q 92.5 12 100 8" 
                    fill="none" 
                    stroke="url(#lineGrad)" 
                    strokeWidth="1.2" 
                    strokeLinecap="round"
                  />
                  
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#CD9FA0" />
                    <stop offset="50%" stopColor="#F2C1A3" />
                    <stop offset="100%" stopColor="#F8CCAA" />
                  </linearGradient>

                  {/* Dynamic point dots */}
                  <circle cx="30" cy="18" r="1.5" fill="#F2C1A3" className="animate-ping" />
                  <circle cx="30" cy="18" r="1" fill="#F2C1A3" />
                  <circle cx="60" cy="10" r="1" fill="#F8CCAA" />
                  <circle cx="100" cy="8" r="1.2" fill="#CD9FA0" />
                </svg>
              </div>

              {/* Contributors Checklist */}
              <div className="space-y-2.5">
                {[
                  { name: "Aanya Sharma", percent: 83, tasks: 32, avatar: "A" },
                  { name: "Rohan Mehta", percent: 67, tasks: 26, avatar: "R" },
                  { name: "Ishita Verma", percent: 71, tasks: 28, avatar: "I" },
                  { name: "Kunal Singh", percent: 62, tasks: 21, avatar: "K" }
                ].map((member, mIdx) => (
                  <div key={mIdx} className="flex items-center justify-between p-2 rounded-xl bg-[#525871]/15 border border-[#525871]/10 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#857C91]/30 border border-[#857C91]/40 flex items-center justify-center font-serif text-[10px] text-[#F8CCAA]">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="font-serif text-[#F8CCAA] tracking-wide">{member.name}</p>
                        <p className="text-[10px] text-[#857C91]">{member.tasks} tasks completed</p>
                      </div>
                    </div>
                    <span className="font-serif text-[#F2C1A3]">{member.percent}% cont.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heading Text and Highlights */}
          <div className="relative space-y-8 z-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif text-[#F8CCAA] tracking-wide leading-tight mb-3">
                Welcome back to <br />
                <span className="bg-gradient-to-r from-[#CD9FA0] via-[#F2C1A3] to-[#F8CCAA] bg-clip-text text-transparent italic">
                  transparent collaboration.
                </span>
              </h2>
              <p className="text-sm font-sans text-[#857C91] leading-relaxed max-w-sm tracking-wide">
                Track teamwork, contributions, and project accountability beautifully.
              </p>
            </div>

            {/* Curated list grids */}
            <div className="space-y-4 pt-2 border-t border-[#525871]/20">
              {[
                { 
                  title: "Real-time Tracking", 
                  desc: "Track commits, PRs & tasks.", 
                  icon: TrendingUp 
                },
                { 
                  title: "Smart Analytics", 
                  desc: "AI insights for fair evaluation.", 
                  icon: Layers 
                },
                { 
                  title: "Proof & Reports", 
                  desc: "Export professor-ready reports.", 
                  icon: ShieldCheck 
                }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#525871]/20 border border-[#525871]/30 flex items-center justify-center text-[#F2C1A3] shrink-0 mt-0.5 shadow-md shadow-[#11121d]/30">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif text-[#F8CCAA] tracking-wider uppercase">
                        {item.title}
                      </h4>
                      <p className="text-xs font-sans text-[#857C91] mt-0.5 tracking-wide">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==============================================
            RIGHT COL: GLASSMORPHIC AUTH PANEL & FORMS
            ============================================== */}
        <div className="relative w-full lg:w-[52%] p-8 md:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto max-h-[100vh] lg:max-h-none">
          
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-72 h-72 rounded-full bg-[#CD9FA0]/5 blur-3xl" />

          {isArchived ? (
            <motion.div
              key="recovery-interstitial"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col justify-between h-full"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-serif mb-6">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Archived Account Detected</span>
                </div>
                
                <h3 className="text-3xl font-serif text-[#F8CCAA] tracking-wide mb-3">
                  Restore or Start Fresh?
                </h3>
                
                <p className="text-sm font-sans text-[#857C91] leading-relaxed mb-6 text-left">
                  You initiated account deletion for <span className="text-[#F2C1A3] font-semibold">{archiveEmail}</span>. All your historical records, workspaces, and telemetry are preserved in our secure vault during the 30-day grace period.
                </p>

                <div className="space-y-4 p-5 rounded-2xl bg-[#525871]/10 border border-[#525871]/20">
                  <div className="flex items-center justify-between text-xs border-b border-[#525871]/20 pb-3">
                    <span className="text-[#857C91] font-sans">Deletion Requested</span>
                    <span className="text-white font-serif">{archiveDeletedAt ? new Date(archiveDeletedAt).toLocaleDateString() : "Pending"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#857C91] font-sans">Grace Window Expires</span>
                    <span className="text-amber-400 font-serif font-semibold">{archiveRecoverableUntil ? new Date(archiveRecoverableUntil).toLocaleDateString() : "Pending"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <button
                  type="button"
                  onClick={restoreArchivedAccount}
                  className="w-full relative py-4 rounded-xl font-serif text-sm tracking-wider uppercase font-semibold text-white shadow-xl shadow-emerald-500/10 border border-emerald-500/20 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 overflow-hidden group hover:opacity-95 active:scale-[0.99] transition-all"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-sweep pointer-events-none" />
                  <div className="flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin-reverse" />
                    <span>Restore Previous Account</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={startFresh}
                  className="w-full py-4 rounded-xl font-serif text-sm tracking-wider uppercase font-semibold text-[#857C91] border border-[#525871]/30 hover:border-red-500/40 hover:text-red-400 bg-transparent hover:bg-red-950/10 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Erase & Start Fresh</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 rounded-xl font-sans text-xs tracking-wider text-[#857C91] hover:text-white transition-all focus:outline-none"
                >
                  Cancel and Sign Out
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Form Header Segment */}
          <div className="mb-6">
            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.div
                  key="login-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-[#F8CCAA] tracking-wide mb-1">
                    Log in to your account
                  </h3>
                  <p className="text-sm font-sans text-[#857C91] tracking-wide">
                    Enter your credentials to continue
                  </p>
                </motion.div>
              )}
              {mode === "signup" && (
                <motion.div
                  key="signup-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-[#F8CCAA] tracking-wide mb-1">
                    Create your account
                  </h3>
                  <p className="text-sm font-sans text-[#857C91] tracking-wide">
                    Fill in your details to get started
                  </p>
                </motion.div>
              )}
              {mode === "forgot" && (
                <motion.div
                  key="forgot-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-[#F8CCAA] tracking-wide mb-1">
                    Reset your password
                  </h3>
                  <p className="text-sm font-sans text-[#857C91] tracking-wide">
                    We will send recovery instructions to your email
                  </p>
                </motion.div>
              )}
              {mode === "verify" && (
                <motion.div
                  key="verify-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-[#F8CCAA] tracking-wide mb-1">
                    Confirm your email
                  </h3>
                  <p className="text-sm font-sans text-[#857C91] tracking-wide">
                    Check your inbox to secure your profile
                  </p>
                </motion.div>
              )}
              {mode === "success" && (
                <motion.div
                  key="success-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-[#F8CCAA] tracking-wide mb-1">
                    Authentication Success
                  </h3>
                  <p className="text-sm font-sans text-[#857C91] tracking-wide">
                    Workspace successfully calibrated
                  </p>
                </motion.div>
              )}
              {mode === "backup" && (
                <motion.div
                  key="backup-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-[#F8CCAA] tracking-wide mb-1">
                    Welcome Back!
                  </h3>
                  <p className="text-sm font-sans text-[#857C91] tracking-wide">
                    Would you like to backup your data from your previous session?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Form Core Container */}
          <div className="relative grow flex flex-col justify-center my-6 z-10">
            
            {/* Interactive Auth Alerts */}
            {authError && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-start gap-3 shadow-lg shadow-red-950/20">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-sans">{authError}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              
              {/* ==============================
                  LOGIN PANEL CARD
                  ============================== */}
              {mode === "login" && (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  onSubmit={handleLoginSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  {/* Email address field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                      Email address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                      <input 
                        type="email"
                        placeholder="you@example.com"
                        {...registerLogin("email")}
                        className={`w-full py-3.5 pl-12 pr-4 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all duration-300 focus:bg-[#525871]/20 focus:shadow-md focus:shadow-[#CD9FA0]/5 ${
                          loginErrors.email ? "border-red-500/40 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/20" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                        }`}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-[10px] text-red-400 pl-1 font-sans">{loginErrors.email.message}</p>
                    )}
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                        Password
                      </label>
                      <button 
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-xs font-serif text-[#F2C1A3] hover:text-[#F8CCAA] transition-colors focus:outline-none"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...registerLogin("password")}
                        className={`w-full py-3.5 pl-12 pr-12 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all duration-300 focus:bg-[#525871]/20 focus:shadow-md focus:shadow-[#CD9FA0]/5 ${
                          loginErrors.password ? "border-red-500/40 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/20" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#857C91] hover:text-white transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-[10px] text-red-400 pl-1 font-sans">{loginErrors.password.message}</p>
                    )}
                  </div>

                  {/* Main submission button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full relative py-3.5 rounded-xl font-serif text-sm tracking-wider uppercase font-semibold text-white shadow-xl shadow-[#CD9FA0]/10 border border-[#CD9FA0]/20 bg-gradient-to-r from-[#CD9FA0] via-[#F2C1A3] to-[#F8CCAA] overflow-hidden group hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {/* Hover lighting sweep */}
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-sweep pointer-events-none" />
                      
                      {formLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Validating Credentials...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Log In</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Divider line */}
                  <div className="flex items-center gap-4 my-6">
                    <div className="h-[1px] grow bg-[#525871]/20" />
                    <span className="text-[10px] font-serif uppercase tracking-widest text-[#857C91]">
                      or continue with
                    </span>
                    <div className="h-[1px] grow bg-[#525871]/20" />
                  </div>

                  {/* Social Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="flex items-center justify-center gap-3 py-3 rounded-xl border border-[#525871]/30 bg-[#525871]/5 hover:bg-[#525871]/15 text-xs text-[#F8CCAA] tracking-wide transition-all focus:outline-none"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2a6.375 6.375 0 0 1-6.375-6.375c0-3.52 2.855-6.375 6.375-6.375 1.536 0 2.943.548 4.043 1.458l2.973-2.973C18.23 2.186 15.385 1.25 12.24 1.25 6.136 1.25 1.25 6.136 1.25 12.24s4.886 10.99 10.99 10.99c6.438 0 11.238-4.52 11.238-11.24 0-.61-.06-1.2-.17-1.705H12.24Z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGitHubAuth}
                      className="flex items-center justify-center gap-3 py-3 rounded-xl border border-[#525871]/30 bg-[#525871]/5 hover:bg-[#525871]/15 text-xs text-[#F8CCAA] tracking-wide transition-all focus:outline-none"
                    >
                      <Github className="w-4 h-4 text-white" />
                      <span>Continue with GitHub</span>
                    </button>
                  </div>

                  {/* Switch trigger */}
                  <div className="text-center pt-6">
                    <p className="text-xs text-[#857C91] tracking-wide">
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className="text-[#F2C1A3] hover:text-[#F8CCAA] font-serif transition-colors underline underline-offset-4 focus:outline-none"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </motion.form>
              )}

              {/* ==============================
                  SIGN UP PANEL CARD
                  ============================== */}
              {mode === "signup" && (
                <motion.form
                  key="signup-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  onSubmit={handleSignUpSubmit(onSignUpSubmit)}
                  className="space-y-4"
                >
                  {/* Full Name field */}
                  <div className="space-y-1">
                    <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                      <input 
                        type="text"
                        placeholder="Enter your full name"
                        {...registerSignUp("fullName")}
                        className={`w-full py-3 pl-12 pr-4 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                          signUpErrors.fullName ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                        }`}
                      />
                    </div>
                    {signUpErrors.fullName && (
                      <p className="text-[10px] text-red-400 pl-1 font-sans">{signUpErrors.fullName.message}</p>
                    )}
                  </div>

                  {/* Grid for Email & University */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email address field */}
                    <div className="space-y-1">
                      <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                        Email Address
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                        <input 
                          type="email"
                          placeholder="you@example.com"
                          {...registerSignUp("email")}
                          className={`w-full py-3 pl-12 pr-4 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                            signUpErrors.email ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                          }`}
                        />
                      </div>
                      {signUpErrors.email && (
                        <p className="text-[10px] text-red-400 pl-1 font-sans">{signUpErrors.email.message}</p>
                      )}
                    </div>

                    {/* University Name field */}
                    <div className="space-y-1">
                      <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                        University Name
                      </label>
                      <div className="relative group">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                        <input 
                          type="text"
                          placeholder="Harvard University"
                          {...registerSignUp("university")}
                          className={`w-full py-3 pl-12 pr-4 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                            signUpErrors.university ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                          }`}
                        />
                      </div>
                      {signUpErrors.university && (
                        <p className="text-[10px] text-red-400 pl-1 font-sans">{signUpErrors.university.message}</p>
                      )}
                    </div>
                  </div>

                  {/* GitHub Username input */}
                  <div className="space-y-1">
                    <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                      GitHub Username
                    </label>
                    <div className="relative group">
                      <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                      <input 
                        type="text"
                        placeholder="github_username"
                        {...registerSignUp("githubUsername")}
                        className={`w-full py-3 pl-12 pr-4 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                          signUpErrors.githubUsername ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                        }`}
                      />
                    </div>
                    {signUpErrors.githubUsername && (
                      <p className="text-[10px] text-red-400 pl-1 font-sans">{signUpErrors.githubUsername.message}</p>
                    )}
                  </div>

                  {/* Password Strength validation checklist card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Password input */}
                    <div className="space-y-1">
                      <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          {...registerSignUp("password")}
                          className={`w-full py-3 pl-12 pr-12 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                            signUpErrors.password ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#857C91] hover:text-white transition-colors focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signUpErrors.password && (
                        <p className="text-[10px] text-red-400 pl-1 font-sans">{signUpErrors.password.message}</p>
                      )}
                    </div>

                    {/* Confirm Password input */}
                    <div className="space-y-1">
                      <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...registerSignUp("confirmPassword")}
                          className={`w-full py-3 pl-12 pr-12 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                            signUpErrors.confirmPassword ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(prev => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#857C91] hover:text-white transition-colors focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signUpErrors.confirmPassword && (
                        <p className="text-[10px] text-red-400 pl-1 font-sans">{signUpErrors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Password strength indicators & checklist */}
                  {signUpPassword.length > 0 && (
                    <div className="p-4 rounded-xl border border-[#525871]/20 bg-[#525871]/5 space-y-3 shadow-inner shadow-[#11121d]/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-serif uppercase tracking-widest text-[#857C91]">
                          Password strength
                        </span>
                        <span className={`text-[10px] font-serif tracking-wider ${
                          strengthScore <= 2 ? "text-[#CD9FA0]" : strengthScore === 3 ? "text-[#F2C1A3]" : "text-emerald-400"
                        }`}>
                          {strengthLabels[strengthScore]}
                        </span>
                      </div>

                      {/* Pill bars dynamic indicator */}
                      <div className="grid grid-cols-4 gap-1.5 h-1">
                        {[1, 2, 3, 4].map((barIdx) => (
                          <div 
                            key={barIdx} 
                            className={`rounded-full transition-all duration-500 h-full ${
                              strengthScore >= barIdx ? strengthColors[strengthScore] : "bg-[#525871]/30"
                            }`} 
                          />
                        ))}
                      </div>

                      {/* Real-time Checklist items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                        {[
                          { rule: checks.length, label: "At least 8 characters" },
                          { rule: checks.upper, label: "One uppercase letter" },
                          { rule: checks.lower, label: "One lowercase letter" },
                          { rule: checks.number, label: "One number" },
                          { rule: checks.special, label: "One special character" },
                          { rule: passwordsMatch, label: "Passwords match" }
                        ].map((chk, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              chk.rule ? "text-emerald-400" : "text-[#857C91]/30"
                            }`} />
                            <span className={`text-[10px] font-sans transition-colors ${
                              chk.rule ? "text-[#F8CCAA]" : "text-[#857C91]"
                            }`}>
                              {chk.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create Account Submission button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full relative py-3 rounded-xl font-serif text-sm tracking-wider uppercase font-semibold text-white shadow-xl shadow-[#CD9FA0]/10 border border-[#CD9FA0]/20 bg-gradient-to-r from-[#CD9FA0] via-[#F2C1A3] to-[#F8CCAA] overflow-hidden group hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {/* Hover lighting sweep */}
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-sweep pointer-events-none" />
                      
                      {formLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Creating Profile...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Divider line */}
                  <div className="flex items-center gap-4 my-4">
                    <div className="h-[1px] grow bg-[#525871]/20" />
                    <span className="text-[10px] font-serif uppercase tracking-widest text-[#857C91]">
                      or continue with
                    </span>
                    <div className="h-[1px] grow bg-[#525871]/20" />
                  </div>

                  {/* Social Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="flex items-center justify-center gap-3 py-3 rounded-xl border border-[#525871]/30 bg-[#525871]/5 hover:bg-[#525871]/15 text-xs text-[#F8CCAA] tracking-wide transition-all focus:outline-none"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2a6.375 6.375 0 0 1-6.375-6.375c0-3.52 2.855-6.375 6.375-6.375 1.536 0 2.943.548 4.043 1.458l2.973-2.973C18.23 2.186 15.385 1.25 12.24 1.25 6.136 1.25 1.25 6.136 1.25 1.25 6.136 1.25 1.25 6.136 1.25 12.24s4.886 10.99 10.99 10.99c6.438 0 11.238-4.52 11.238-11.24 0-.61-.06-1.2-.17-1.705H12.24Z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGitHubAuth}
                      className="flex items-center justify-center gap-3 py-3 rounded-xl border border-[#525871]/30 bg-[#525871]/5 hover:bg-[#525871]/15 text-xs text-[#F8CCAA] tracking-wide transition-all focus:outline-none"
                    >
                      <Github className="w-4 h-4 text-white" />
                      <span>Continue with GitHub</span>
                    </button>
                  </div>

                  {/* Switch trigger */}
                  <div className="text-center pt-4">
                    <p className="text-xs text-[#857C91] tracking-wide">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="text-[#F2C1A3] hover:text-[#F8CCAA] font-serif transition-colors underline underline-offset-4 focus:outline-none"
                      >
                        Log in
                      </button>
                    </p>
                  </div>
                </motion.form>
              )}

              {/* ==============================
                  FORGOT PASSWORD PANEL CARD
                  ============================== */}
              {mode === "forgot" && (
                <motion.form
                  key="forgot-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  onSubmit={handleForgotSubmit(onForgotSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-serif text-[#857C91] uppercase tracking-wider">
                      Email address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91] group-focus-within:text-[#F2C1A3] transition-colors" />
                      <input 
                        type="email"
                        placeholder="you@example.com"
                        {...registerForgot("email")}
                        className={`w-full py-3.5 pl-12 pr-4 rounded-xl border bg-[#525871]/10 text-sm tracking-wide text-white placeholder-[#857C91] outline-none transition-all focus:bg-[#525871]/20 ${
                          forgotErrors.email ? "border-red-500/40 focus:border-red-500/80" : "border-[#525871]/30 focus:border-[#CD9FA0]/80"
                        }`}
                      />
                    </div>
                    {forgotErrors.email && (
                      <p className="text-[10px] text-red-400 pl-1 font-sans">{forgotErrors.email.message}</p>
                    )}
                  </div>

                  {/* Submission button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full relative py-3.5 rounded-xl font-serif text-sm tracking-wider uppercase font-semibold text-white shadow-xl shadow-[#CD9FA0]/10 border border-[#CD9FA0]/20 bg-gradient-to-r from-[#CD9FA0] via-[#F2C1A3] to-[#F8CCAA] overflow-hidden group hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {/* Hover lighting sweep */}
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-sweep pointer-events-none" />
                      
                      {formLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Sending Recovery Mail...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Send Recovery Link</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Switch triggers */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-xs text-[#F2C1A3] hover:text-[#F8CCAA] font-serif transition-colors underline underline-offset-4 focus:outline-none"
                    >
                      Return to login page
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ==============================
                  EMAIL VERIFICATION PANEL CARD
                  ============================== */}
              {mode === "verify" && (
                <motion.div
                  key="verify-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8 text-center py-4"
                >
                  {/* Floating envelope mockup */}
                  <div className="relative flex items-center justify-center py-6">
                    <div className="absolute w-24 h-24 rounded-full bg-[#CD9FA0]/15 blur-xl animate-pulse" />
                    <div className="w-20 h-20 rounded-2xl border border-[#CD9FA0]/30 bg-gradient-to-br from-[#525871]/40 to-[#161725]/85 flex items-center justify-center shadow-2xl backdrop-blur-md">
                      <Mail className="w-8 h-8 text-[#F2C1A3] animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-sm mx-auto">
                    <h4 className="text-lg font-serif text-[#F8CCAA] tracking-wide">
                      Confirm Verification E-mail
                    </h4>
                    <p className="text-xs font-sans text-[#857C91] leading-relaxed tracking-wide">
                      We have transmitted a secure confirmation link to <span className="text-[#F2C1A3]">{user?.email}</span>. Click the link inside the mail to verify your account profile and enter the team workspace.
                    </p>
                  </div>

                  {/* Status Checking spinner */}
                  <div className="p-3 rounded-xl border border-[#525871]/20 bg-[#525871]/5 max-w-xs mx-auto flex items-center justify-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full border border-t-transparent border-[#CD9FA0] animate-spin shrink-0" />
                    <span className="text-[10px] font-serif text-[#857C91] uppercase tracking-widest">
                      Awaiting verification confirmation...
                    </span>
                  </div>

                  {/* Resend actions */}
                  <div className="space-y-4 pt-4 border-t border-[#525871]/25">
                    <button
                      type="button"
                      disabled={!canResend}
                      onClick={handleResendClick}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#525871]/30 bg-[#525871]/10 text-xs font-serif text-[#F8CCAA] tracking-wider uppercase font-semibold hover:bg-[#525871]/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {canResend ? (
                        <span>Resend Verification E-mail</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Resend mail in {verifyCountdown}s</span>
                        </span>
                      )}
                    </button>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#F2C1A3]/40 bg-[#F2C1A3]/20 text-xs font-serif text-[#F8CCAA] tracking-wider uppercase font-semibold hover:bg-[#F2C1A3]/30 transition-all cursor-pointer shadow-lg"
                      >
                        <span>Proceed to Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          switchMode("login");
                        }}
                        className="text-xs font-serif text-[#CD9FA0] hover:text-[#F2C1A3] transition-colors underline underline-offset-4 focus:outline-none"
                      >
                        Cancel and logout
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==============================
                  SUCCESS PANEL
                  ============================== */}
              {mode === "success" && (
                <motion.div
                  key="success-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8 text-center py-6"
                >
                  {/* Glowing dynamic check illustration */}
                  <div className="relative flex items-center justify-center py-6">
                    <div className="absolute w-28 h-28 rounded-full bg-emerald-500/15 blur-xl animate-pulse" />
                    <div className="w-20 h-20 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-[#161725]/85 flex items-center justify-center shadow-2xl backdrop-blur-md">
                      <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-sm mx-auto">
                    <h4 className="text-lg font-serif text-emerald-400 tracking-wider">
                      Welcome to ContriTrack!
                    </h4>
                    <p className="text-xs font-sans text-[#857C91] leading-relaxed tracking-wide">
                      Your identity profile has been successfully calibrated and synchronized. Preparing secure team dashboard environments...
                    </p>
                  </div>

                  {/* Redirecting Progress */}
                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-serif text-xs tracking-wider uppercase font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/10 hover:opacity-95 transition-all"
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* Secure encryption validation text at bottom */}
          <div className="pt-6 border-t border-[#525871]/15 text-center flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#CD9FA0]" />
            <span className="text-[10px] font-sans text-[#857C91] uppercase tracking-wider">
              Your data is secure with enterprise-grade encryption
            </span>
          </div>
          </>
          )}

        </div>

      </div>

    </div>
  );
}
