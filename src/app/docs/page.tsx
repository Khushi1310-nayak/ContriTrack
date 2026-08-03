"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Terminal,
  Key,
  Copy,
  Check,
  RefreshCw,
  Send,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  Play,
  Phone,
  MessageCircle,
  Mail,
  FileText,
  Activity,
  AlertTriangle,
  X,
  ShieldAlert,
  Sliders,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  createApiKeyAction, 
  getApiKeysAction, 
  revokeApiKeyAction, 
  ApiKeyMetadata 
} from "@/app/actions/api-key-actions";
import { fetchUserWorkspaces } from "@/app/actions/team-actions";
import { runSystemDiagnosticsAction } from "@/app/actions/github-actions";
import { Workspace } from "@prisma/client";

// Technical documentation categories & sections index
const docStructure = [
  {
    category: "Getting Started",
    items: [
      { id: "Introduction", label: "1. Platform Overview" },
      { id: "Authentication", label: "2. Bearer Authentication" },
      { id: "Rate Limits", label: "3. Gateway Rate Limits" }
    ]
  },
  {
    category: "REST API Reference",
    items: [
      { id: "Workspaces API", label: "4. Workspaces" },
      { id: "Tasks API", label: "5. Tasks Deliverables" },
      { id: "Analytics API", label: "6. Contribution Telemetry" },
      { id: "Meetings API", label: "7. Meetings Tracker" }
    ]
  },
  {
    category: "Ecosystem & Toolkits",
    items: [
      { id: "Webhooks", label: "8. Webhook Ingestion" },
      { id: "SDK", label: "9. Node / TS SDK" },
      { id: "CLI", label: "10. Command Line Interface" },
      { id: "Database Schema", label: "11. Database Model" }
    ]
  },
  {
    category: "Security & Trust",
    items: [
      { id: "RLS", label: "12. Postgres RLS & JWT" },
      { id: "Security Scopes", label: "13. API Authorization Scopes" }
    ]
  }
];

export default function DocsPage() {
  const { user } = useAuth();
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"docs" | "console" | "diagnostics" | "support">("docs");
  const [activeSection, setActiveSection] = useState<string>("Introduction");
  
  // Search & Command Palette
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  // Developer Console state
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [apiKeyName, setApiKeyName] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["read"]);
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [apiKeys, setApiKeys] = useState<ApiKeyMetadata[]>([]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [isFetchingKeys, setIsFetchingKeys] = useState<boolean>(false);
  
  // Interactive REST API Playground state
  const [playgroundKey, setPlaygroundKey] = useState<string>("");
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<string>("GET /api/developer/workspaces");
  const [playgroundResponse, setPlaygroundResponse] = useState<string>(`{\n  "info": "Provide your bearer token to execute live query against the database."\n}`);
  const [isPlayinggroundLoading, setIsPlayinggroundLoading] = useState<boolean>(false);
  const [playgroundPayload, setPlaygroundPayload] = useState<string>(`{\n  "title": "API Test Deliverable",\n  "description": "Created from live explorer docs",\n  "priority": "high"\n}`);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  
  // Support and env details
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91 7077780027";
  const supportWhatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+91 7077780027";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "khushinayak127@gmail.com";

  // System Diagnostics status
  const [diagnosticProgress, setDiagnosticProgress] = useState<number>(0);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<Array<{ name: string; status: "loading" | "pass" | "fail"; detail: string }>>([
    { name: "Firebase Authentication Gateway", status: "loading", detail: "Resolving secure user session state." },
    { name: "PostgreSQL Database Engine", status: "loading", detail: "Verifying relational transaction latency." },
    { name: "GitHub Sync Telemetry", status: "loading", detail: "Probing oauth integrations." },
    { name: "WebSocket Parity Pipeline", status: "loading", detail: "Asserting realtime stream endpoints." },
    { name: "API Rate Limiter Cluster", status: "loading", detail: "Checking memory allocation counters." }
  ]);

  // Code Playground code snippets tabs
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Keyboard shortcut listener (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch workspaces & API keys when authenticated user loads
  useEffect(() => {
    if (user) {
      // 1. Fetch user workspaces
      fetchUserWorkspaces(user.uid).then((res: { success: boolean; workspaces?: Workspace[]; error?: string }) => {
        if (res.success && res.workspaces) {
          setUserWorkspaces(res.workspaces);
          if (res.workspaces.length > 0) {
            setSelectedWorkspaceId(res.workspaces[0].id);
          }
        }
      });
    }
  }, [user]);

  // Fetch API keys whenever selected workspace changes
  useEffect(() => {
    if (user && selectedWorkspaceId) {
      Promise.resolve().then(() => {
        setIsFetchingKeys(true);
      });
      getApiKeysAction(user.uid, selectedWorkspaceId).then((res) => {
        setApiKeys(res);
        setIsFetchingKeys(false);
      });
    }
  }, [user, selectedWorkspaceId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate a new secure database API Key
  const handleGenerateKey = async () => {
    if (!user || !selectedWorkspaceId || !apiKeyName) return;
    setIsCreatingKey(true);
    try {
      const res = await createApiKeyAction(
        user.uid,
        selectedWorkspaceId,
        apiKeyName,
        selectedPermissions,
        expirationDays
      );
      if (res.success && res.rawKey && res.key) {
        setNewlyCreatedKey(res.rawKey);
        setApiKeys(prev => [res.key!, ...prev]);
        setPlaygroundKey(res.rawKey); // Auto-fill in playground!
        setApiKeyName("");
      } else {
        alert(res.error || "Failed to generate API Key");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Revoke an API Key
  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you absolute sure you want to revoke this API Key? It will immediately stop authenticating telemetry integrations.")) return;
    try {
      const res = await revokeApiKeyAction(id);
      if (res.success) {
        setApiKeys(prev => prev.filter(k => k.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Execute actual API calls through playground sandbox
  const handlePlaygroundSend = async () => {
    setIsPlayinggroundLoading(true);
    setResponseStatus(null);
    setPlaygroundResponse("// Connecting to API gateway pipeline...");
    
    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${playgroundKey}`,
        "Content-Type": "application/json"
      };
      
      let method = "GET";
      let path = "/api/developer/workspaces";

      if (playgroundEndpoint.startsWith("POST")) {
        method = "POST";
        path = playgroundEndpoint.substring(5);
      } else {
        path = playgroundEndpoint.substring(4);
      }

      const options: RequestInit = {
        method,
        headers
      };

      if (method === "POST") {
        options.body = playgroundPayload;
      }

      const res = await fetch(path, options);
      setResponseStatus(res.status);
      const data = await res.json();
      
      setPlaygroundResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to establish telemetry tunnel.";
      setPlaygroundResponse(JSON.stringify({
        success: false,
        error: "Connection Refused",
        message: errMsg
      }, null, 2));
    } finally {
      setIsPlayinggroundLoading(false);
    }
  };

  // Run Live System Diagnostics Check against PostgreSQL database & session
  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticProgress(15);
    
    // Set loading state initially
    setDiagnosticLogs(prev => prev.map(log => ({ ...log, status: "loading" })));

    try {
      setDiagnosticProgress(45);
      const res = await runSystemDiagnosticsAction(user?.uid || null);
      setDiagnosticProgress(85);

      if (res.success && res.diagnostics) {
        setDiagnosticLogs(prev =>
          prev.map((log, idx) => {
            const item = res.diagnostics[idx];
            if (item) {
              return {
                ...log,
                status: item.status as "loading" | "pass" | "fail",
                detail: item.detail
              };
            }
            return log;
          })
        );
      }
    } catch (error) {
      console.error("Live System Diagnostics failed:", error);
      const errMsg = error instanceof Error ? error.message : "System check failed";
      setDiagnosticLogs(prev =>
        prev.map(log => ({
          ...log,
          status: "fail",
          detail: `Diagnostic execution error: ${errMsg}`
        }))
      );
    } finally {
      setDiagnosticProgress(100);
      setIsDiagnosticRunning(false);
    }
  };

  // Fuzzy search index logic
  const filteredDocItems = useMemo(() => {
    if (!searchQuery) return docStructure;
    return docStructure.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(cat => cat.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="relative min-h-screen bg-[#07080b] text-[#8e94a0] overflow-x-hidden select-none flex flex-col font-sans antialiased">
      
      {/* Absolute high-end champagne/rose visual glows */}
      <div className="absolute top-[-200px] right-[-100px] w-[800px] h-[800px] rounded-full bg-[#F2C1A3]/[0.025] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-200px] w-[800px] h-[800px] rounded-full bg-[#CD9FA0]/[0.015] blur-[220px] pointer-events-none" />

      {/* DYNAMIC TOP HEADER BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.04] bg-[#07080b]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-end gap-[3px] h-6 w-6 rounded-lg bg-[#F8CCAA]/10 border border-[#F8CCAA]/20 p-1.5 justify-center">
              <span className="w-[3px] h-1.5 bg-[#CD9FA0] rounded-full"></span>
              <span className="w-[3px] h-3.5 bg-[#F2C1A3] rounded-full"></span>
              <span className="w-[3px] h-2.5 bg-[#F8CCAA] rounded-full"></span>
            </div>
            <span className="font-semibold text-white tracking-wider text-sm font-serif">
              ContriTrack <span className="text-[#F8CCAA] font-mono text-[8px] font-light border border-[#F8CCAA]/20 px-1.5 py-0.5 rounded ml-1 bg-[#F8CCAA]/5">CONSOLE</span>
            </span>
          </Link>
          <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
          
          {/* Main Top Navigation Toggles */}
          <nav className="hidden md:flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.05] p-1 rounded-full text-[11px] font-mono">
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-4 py-1.5 rounded-full transition duration-300 cursor-pointer ${
                activeTab === "docs" ? "bg-white/10 text-white font-medium" : "text-[#8e94a0] hover:text-white"
              }`}
            >
              API Reference
            </button>
            <button
              onClick={() => setActiveTab("console")}
              className={`px-4 py-1.5 rounded-full transition duration-300 cursor-pointer ${
                activeTab === "console" ? "bg-white/10 text-white font-medium" : "text-[#8e94a0] hover:text-white"
              }`}
            >
              Developer Console
            </button>
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`px-4 py-1.5 rounded-full transition duration-300 cursor-pointer ${
                activeTab === "diagnostics" ? "bg-white/10 text-white font-medium" : "text-[#8e94a0] hover:text-white"
              }`}
            >
              Diagnostics
            </button>
            <button
              onClick={() => setActiveTab("support")}
              className={`px-4 py-1.5 rounded-full transition duration-300 cursor-pointer ${
                activeTab === "support" ? "bg-white/10 text-white font-medium" : "text-[#8e94a0] hover:text-white"
              }`}
            >
              Support Center
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Instant Fuzzy Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-[10px] font-mono text-[#8e94a0] hover:border-white/15 transition cursor-pointer"
          >
            <Search size={12} />
            <span>Search docs...</span>
            <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-[8px]">⌘K</kbd>
          </button>
          
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#F2C1A3]/20 to-[#F8CCAA]/20 border border-[#F8CCAA]/30 hover:border-[#F8CCAA]/50 text-white text-[10px] font-mono tracking-wider transition"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* MOBILE TAB BAR */}
      <div className="flex md:hidden bg-white/[0.01] border-b border-white/5 p-2 justify-around text-[10px] font-mono">
        <button onClick={() => setActiveTab("docs")} className={activeTab === "docs" ? "text-[#F8CCAA]" : ""}>Docs</button>
        <button onClick={() => setActiveTab("console")} className={activeTab === "console" ? "text-[#F8CCAA]" : ""}>Console</button>
        <button onClick={() => setActiveTab("diagnostics")} className={activeTab === "diagnostics" ? "text-[#F8CCAA]" : ""}>Diagnostics</button>
        <button onClick={() => setActiveTab("support")} className={activeTab === "support" ? "text-[#F8CCAA]" : ""}>Support</button>
      </div>

      {/* TAB 1: MAIN WRITTEN DOCUMENTATION AND PLAYGROUND EXPLORER */}
      {activeTab === "docs" && (
        <div className="flex-1 w-full max-w-8xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 items-start gap-8 py-10">
          
          {/* 1.1 DOCUMENTATION SIDEBAR INDEX */}
          <aside className="lg:col-span-3 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-none flex flex-col gap-6 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#F2C1A3] font-semibold">Documentation Index</span>
              <p className="text-[10px] text-[#8e94a0]">API schemas, SDK blocks, webhooks, and security specifications.</p>
            </div>
            
            <div className="flex flex-col gap-5 mt-2">
              {docStructure.map((cat) => (
                <div key={cat.category} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/80 font-bold">{cat.category}</span>
                  <div className="flex flex-col gap-1 pl-2 border-l border-white/5 ml-1">
                    {cat.items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveSection(item.id);
                            document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`text-left text-xs py-1.5 px-2 rounded-lg transition duration-200 cursor-pointer ${
                            isActive 
                              ? "bg-[#F8CCAA]/10 text-[#F8CCAA] font-medium border-l-2 border-[#F8CCAA]" 
                              : "text-[#8e94a0] hover:text-white hover:bg-white/[0.02]"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* 1.2 MAIN TECHNICAL WRITTEN SPECIFICATIONS */}
          <main className="lg:col-span-5 flex flex-col gap-20 text-left border-r border-white/[0.04] pr-8 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none">
            
            {/* OVERVIEW SECTION */}
            <section id="Introduction" className="scroll-mt-28 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 px-2 py-0.5 rounded text-[#F2C1A3]">SPEC v1.2</span>
                <span className="text-[10px] text-[#8e94a0] font-mono">ACADEMIC PARITY TELEMETRY</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif text-white font-light tracking-tight">
                Developer <span className="text-[#F2C1A3] italic">Ecosystem</span>
              </h1>
              <p className="text-sm font-light leading-relaxed text-[#8e94a0]">
                Integrate, evaluate, and sync team deliverables securely. ContriTrack offers granular JSON API gateway structures, cryptographic webhook triggers, relational database access models, and certified evaluation export scripts.
              </p>
              
              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.06] text-xs leading-relaxed text-[#8e94a0] flex items-start gap-3">
                <Sparkles size={16} className="text-[#F8CCAA] shrink-0 mt-0.5" />
                <span>
                  <strong>Stripe-Style Sandbox Integration:</strong> Use your actual generated credential keys in the right pane to probe active workspace tables. Real database inputs generate real telemetry outputs.
                </span>
              </div>
            </section>

            {/* BEARER AUTHENTICATION */}
            <section id="Authentication" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">Bearer Authentication</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                All REST payloads directed at our API gateway require secure authorization signatures. Declare your live bearer credential token key inside the standard HTTP headers:
              </p>
              <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-[10.5px] font-mono text-white flex justify-between items-center">
                <span>Authorization: Bearer YOUR_API_TOKEN_HERE</span>
                <button 
                  onClick={() => handleCopy("auth-header", "Authorization: Bearer YOUR_API_TOKEN_HERE")}
                  className="p-1 hover:bg-white/5 rounded text-[#8e94a0] hover:text-white transition"
                  title="Copy Header Signature"
                >
                  {copiedId === "auth-header" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              </div>
              <p className="text-[10px] text-[#8e94a0] leading-relaxed">
                <span className="text-[#F8CCAA] font-bold">Note:</span> Plaintext tokens are cryptographically hashed using sha256 before storage in PostgreSQL. Ensure credentials remain private.
              </p>
            </section>

            {/* GATEWAY RATE LIMITS */}
            <section id="Rate Limits" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">Gateway Rate Limits</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                To maintain high availability across university student workspaces, rate limiting checks evaluate all live token queues. Limits allow up to <strong>60 requests per minute</strong> per key. Throttled threads receive standard HTTP 429 payloads containing details on when queries resume:
              </p>
            </section>

            {/* WORKSPACES API */}
            <section id="Workspaces API" className="scroll-mt-28 flex flex-col gap-4">
              <h3 className="text-lg font-serif text-white font-light">4. Workspaces API</h3>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Fetch multi-tenant isolation scopes, members role metrics, and active invites.
              </p>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono">
                <span className="text-emerald-400">GET</span> /api/developer/workspaces
              </div>
            </section>

            {/* TASKS API */}
            <section id="Tasks API" className="scroll-mt-28 flex flex-col gap-4">
              <h3 className="text-lg font-serif text-white font-light">5. Tasks Deliverables</h3>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Query active Kanban deliverables, estimated sprint velocities, or assign tasks to teammates.
              </p>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono flex flex-col gap-1.5">
                <div><span className="text-emerald-400">GET</span> /api/developer/tasks</div>
                <div><span className="text-[#F8CCAA]">POST</span> /api/developer/tasks</div>
              </div>
            </section>

            {/* ANALYTICS API */}
            <section id="Analytics API" className="scroll-mt-28 flex flex-col gap-4">
              <h3 className="text-lg font-serif text-white font-light">6. Contribution Telemetry</h3>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Extract raw contributor shares, aggregated lines of code changed, commit velocities, and team collaborative score matrix profiles.
              </p>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono">
                <span className="text-emerald-400">GET</span> /api/developer/analytics
              </div>
            </section>

            {/* MEETINGS API */}
            <section id="Meetings API" className="scroll-mt-28 flex flex-col gap-4">
              <h3 className="text-lg font-serif text-white font-light">7. Meetings Tracker</h3>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Log retro actions, schedule sprints, or audit peer attendance records.
              </p>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono flex flex-col gap-1.5">
                <div><span className="text-emerald-400">GET</span> /api/developer/meetings</div>
                <div><span className="text-[#F8CCAA]">POST</span> /api/developer/meetings</div>
              </div>
            </section>

            {/* WEBHOOK INGESTION */}
            <section id="Webhooks" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">Webhook Ingestion</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Set up automated real-time loops. The ContriTrack gateway triggers POST requests directed at your university sync servers on teammate changes:
              </p>
              <div className="p-4 rounded-xl border border-white/5 bg-black/60 text-[9.5px] font-mono text-white/90 leading-relaxed overflow-x-auto">
                <span className="text-[#8e94a0]">{"// Cryptographic signature payload verification"}</span><br />
                const computed = crypto.createHmac(&apos;sha256&apos;, secret).update(body).digest(&apos;hex&apos;);<br />
                if (signature !== computed) throw new Error(&apos;Invalid payload signature&apos;);
              </div>
            </section>

            {/* NODE / TS SDK */}
            <section id="SDK" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">Node / TS SDK</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Deeply integrate TeamTrace metrics using our official npm package within Node, JavaScript, or TypeScript environments:
              </p>
              <div className="p-4 rounded-xl border border-white/5 bg-black/60 text-[10px] font-mono text-[#F2C1A3]">
                import {"{ TeamTrace }"} from &apos;@contritrack/sdk&apos;;<br />
                const client = new TeamTrace({"{"} apiKey: &apos;ct_live_...&apos; {"}"});<br />
                const tasks = await client.tasks.list();
              </div>
            </section>

            {/* CLI COMMAND LINE INTERFACE */}
            <section id="CLI" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">Command Line Interface</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Quickly audit, initialize, and orchestrate telemetry bridges directly from your global terminal toolkit.
              </p>
              <div className="p-4 rounded-xl bg-black/70 border border-white/5 text-[10px] font-mono text-emerald-400">
                npm i -g @contritrack/cli<br />
                contritrack init --workspace ws_7281c<br />
                contritrack telemetry sync
              </div>
            </section>

            {/* DATABASE SCHEMA */}
            <section id="Database Schema" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">Prisma Database Model</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Our operational PostgreSQL relational mappings structure:
              </p>
              <div className="p-4 rounded-xl border border-white/5 bg-black/60 text-[9px] font-mono text-white/80 leading-relaxed max-h-[300px] overflow-y-auto">
                <span className="text-[#857C91]">model ApiKey {"{"}</span><br />
                &nbsp;&nbsp;id &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String &nbsp;&nbsp;@id @default(uuid())<br />
                &nbsp;&nbsp;userId &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String<br />
                &nbsp;&nbsp;workspaceId String<br />
                &nbsp;&nbsp;hashedKey &nbsp;&nbsp;String &nbsp;&nbsp;@unique<br />
                &nbsp;&nbsp;permissions String[]<br />
                &nbsp;&nbsp;revoked &nbsp;&nbsp;&nbsp;&nbsp;Boolean @default(false)<br />
                <span className="text-[#857C91]">{"}"}</span>
              </div>
            </section>

            {/* SECURITY & TRUST - POSTGRES RLS & JWT */}
            <section id="RLS" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">12. Postgres RLS & JWT</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                To maintain cryptographic tenant isolation across university student workspaces, ContriTrack deploys PostgreSQL <strong>Row Level Security (RLS)</strong> policies.
              </p>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Every connection executes transactions signed using standard JWT bearer claim variables. Database gateways dynamically enforce isolation boundaries:
              </p>
              <div className="p-4 rounded-xl border border-white/5 bg-black/60 text-[9px] font-mono text-white/80 leading-relaxed overflow-x-auto">
                <span className="text-[#857C91]">{"-- Configure active isolation scopes"}</span><br />
                ALTER TABLE &quot;ContributionSummary&quot; ENABLE ROW LEVEL SECURITY;<br /><br />
                CREATE POLICY workspace_isolation ON &quot;ContributionSummary&quot;<br />
                &nbsp;&nbsp;FOR ALL<br />
                &nbsp;&nbsp;USING (workspaceId = current_setting(&apos;request.jwt.claim.workspaceId&apos;, true));
              </div>
            </section>

            {/* SECURITY & TRUST - API AUTHORIZATION SCOPES */}
            <section id="Security Scopes" className="scroll-mt-28 flex flex-col gap-4">
              <h2 className="text-xl md:text-2xl font-serif text-white font-light">13. API Authorization Scopes</h2>
              <p className="text-xs font-light leading-relaxed text-[#8e94a0]">
                Access permissions are restricted using granular scopes that map exactly to student and professor workspace operations:
              </p>
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] text-[#8e94a0] font-mono border-b border-white/5">
                    <tr>
                      <th className="p-3 font-semibold text-[9px] uppercase">Scope</th>
                      <th className="p-3 font-semibold text-[9px] uppercase">Permissions</th>
                      <th className="p-3 font-semibold text-[9px] uppercase">Constraints</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80 leading-relaxed font-sans text-[10.5px]">
                    <tr className="border-b border-white/5 hover:bg-white/[0.01]">
                      <td className="p-3 font-mono text-[#F8CCAA]">read</td>
                      <td className="p-3">Query active deliverables, fetch contribution metrics, list retro sync meetings.</td>
                      <td className="p-3 text-[#8e94a0]">Read-only. Cannot write deliverables.</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="p-3 font-mono text-[#F8CCAA]">write</td>
                      <td className="p-3">Schedule new meetings, log team retrospects, add Kanban items.</td>
                      <td className="p-3 text-[#8e94a0]">Cannot revoke lead owner tokens.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

          </main>

          {/* 1.3 RIGHT SIDEBAR - THE STRIPE LIVE API EXPLORER */}
          <aside className="lg:col-span-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none flex flex-col gap-6 text-left">
            <div className="p-5 rounded-3xl border border-white/10 bg-[#0e1017]/95 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-[#F8CCAA]" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#F8CCAA] font-bold">Live API Playground</span>
                </div>
                {responseStatus && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    responseStatus === 200 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {responseStatus} {responseStatus === 200 ? "OK" : "ERROR"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                
                {/* 1. Live key injector */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="play-key" className="text-[9px] font-mono uppercase text-[#8e94a0]">API Secret Key Credentials</label>
                  <div className="relative">
                    <input
                      id="play-key"
                      type="password"
                      value={playgroundKey}
                      onChange={(e) => setPlaygroundKey(e.target.value)}
                      placeholder="ct_live_..."
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-white focus:outline-none focus:border-[#F8CCAA]/30"
                    />
                    <Key size={10} className="absolute right-3 top-3 text-[#8e94a0]" />
                  </div>
                </div>

                {/* 2. Endpoint selector */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="play-endpoint" className="text-[9px] font-mono uppercase text-[#8e94a0]">Select Action Target</label>
                  <select
                    id="play-endpoint"
                    value={playgroundEndpoint}
                    onChange={(e) => setPlaygroundEndpoint(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="GET /api/developer/workspaces">GET /workspaces</option>
                    <option value="GET /api/developer/tasks">GET /tasks</option>
                    <option value="POST /api/developer/tasks">POST /tasks (Create Task)</option>
                    <option value="GET /api/developer/analytics">GET /analytics</option>
                    <option value="GET /api/developer/meetings">GET /meetings</option>
                    <option value="POST /api/developer/meetings">POST /meetings (Register Sync)</option>
                  </select>
                </div>

                {/* 3. Conditional POST payload payload view */}
                {playgroundEndpoint.startsWith("POST") && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="play-payload" className="text-[9px] font-mono uppercase text-[#8e94a0]">JSON request payload</label>
                    <textarea
                      id="play-payload"
                      rows={4}
                      value={playgroundPayload}
                      onChange={(e) => setPlaygroundPayload(e.target.value)}
                      className="w-full p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[9px] text-[#F8CCAA] focus:outline-none focus:border-[#F8CCAA]/30"
                    />
                  </div>
                )}

                <button
                  onClick={handlePlaygroundSend}
                  disabled={isPlayinggroundLoading || !playgroundKey}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {isPlayinggroundLoading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-[#12131e]" />
                      <span>gateway querying...</span>
                    </>
                  ) : (
                    <>
                      <Send size={11} className="text-[#12131e]" />
                      <span>Execute Sandbox Request</span>
                    </>
                  )}
                </button>
              </div>

              {/* RESPONSE METADATA & DATA VIEWER */}
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <div className="text-[8px] font-mono text-[#8e94a0] uppercase tracking-wider">Gateway Response Output</div>
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 font-mono text-[9px] text-[#F8CCAA] overflow-x-auto max-h-[220px] scrollbar-thin whitespace-pre leading-relaxed">
                  {playgroundResponse}
                </div>
              </div>
            </div>
          </aside>

        </div>
      )}

      {/* TAB 2: DEVELOPER CONSOLE - REAL API KEY MANAGEMENT SYSTEM */}
      {activeTab === "console" && (
        <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8 text-left">
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F2C1A3] font-semibold">Dev Credentials Gateway</span>
            <h1 className="text-2xl md:text-4xl font-serif text-white font-light">Developer Console</h1>
            <p className="text-xs text-[#8e94a0]">
              Create, revoke, and manage secure relational API keys. Keys belong cleanly to workspace clusters.
            </p>
          </div>

          {!user ? (
            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] text-center flex flex-col items-center gap-4">
              <ShieldAlert className="text-[#F8CCAA]" size={36} />
              <h3 className="text-white font-serif font-light">Developer Authorization Required</h3>
              <p className="text-xs text-[#8e94a0] max-w-md">
                Please log in to your ContriTrack student/organization account inside the dashboard to generate and manage secure access keys.
              </p>
              <Link href="/auth" className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] text-xs font-mono font-bold tracking-wider">
                Authenticate Session
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 2.1 CREATE NEW CREDENTIALS INTERFACE */}
              <div className="lg:col-span-4 p-6 rounded-3xl border border-white/10 bg-[#0e1017] shadow-xl flex flex-col gap-5">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Sliders size={14} className="text-[#F8CCAA]" />
                  <h3 className="text-sm font-mono uppercase tracking-wider text-white font-bold">Create Credentials Token</h3>
                </div>

                {/* Workspace Select */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="workspace-select" className="text-[9px] font-mono uppercase text-[#8e94a0]">Bind to Workspace</label>
                  <select
                    id="workspace-select"
                    value={selectedWorkspaceId}
                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-white focus:outline-none cursor-pointer"
                  >
                    {userWorkspaces.length === 0 ? (
                      <option value="">No Active Workspaces Found</option>
                    ) : (
                      userWorkspaces.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Key Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="key-name" className="text-[9px] font-mono uppercase text-[#8e94a0]">Key Reference Name</label>
                  <input
                    id="key-name"
                    type="text"
                    placeholder="e.g. CLI Production, Webhook sync"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-white focus:outline-none focus:border-[#F8CCAA]/30"
                  />
                </div>

                {/* Scopes Toggles */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-mono uppercase text-[#8e94a0] block mb-1">Authorization Scopes</span>
                  <div className="flex gap-4 text-xs font-mono text-white">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedPermissions.includes("read")} 
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPermissions(prev => [...prev, "read"]);
                          else setSelectedPermissions(prev => prev.filter(p => p !== "read"));
                        }}
                        className="rounded border-white/10 accent-[#F8CCAA]" 
                      />
                      <span>read</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedPermissions.includes("write")} 
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPermissions(prev => [...prev, "write"]);
                          else setSelectedPermissions(prev => prev.filter(p => p !== "write"));
                        }}
                        className="rounded border-white/10 accent-[#F8CCAA]" 
                      />
                      <span>write</span>
                    </label>
                  </div>
                </div>

                {/* Token Expiration select */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="expiration-select" className="text-[9px] font-mono uppercase text-[#8e94a0]">Token Expiry Term</label>
                  <select
                    id="expiration-select"
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value={7}>7 Days (Transient Test)</option>
                    <option value={30}>30 Days (Standard Sprint)</option>
                    <option value={90}>90 Days (Full Semester)</option>
                    <option value={365}>365 Days (Long-term Bridge)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateKey}
                  disabled={isCreatingKey || !apiKeyName || !selectedWorkspaceId}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {isCreatingKey ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-[#12131e]" />
                      <span>hashing credentials...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={12} className="text-[#12131e]" />
                      <span>Generate Live API Key</span>
                    </>
                  )}
                </button>
              </div>

              {/* 2.2 CREDENTIALS POP-UP & ACTIVE KEYS MATRIX */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* ONE-TIME VISIBLE RAW SECRET POP-UP */}
                <AnimatePresence>
                  {newlyCreatedKey && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="p-5 rounded-3xl border border-[#F8CCAA]/40 bg-[#121010] shadow-2xl flex flex-col gap-3.5 text-left relative"
                    >
                      <button 
                        onClick={() => setNewlyCreatedKey(null)}
                        className="absolute right-4 top-4 p-1 rounded hover:bg-white/5 text-[#8e94a0]"
                        title="Dismiss Warning"
                      >
                        <X size={14} />
                      </button>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-400" size={16} />
                        <h4 className="text-white text-xs font-mono font-bold uppercase tracking-wider">Secret Key Generated - One Time Display!</h4>
                      </div>
                      <p className="text-[11px] text-[#8e94a0] leading-relaxed">
                        Copy this secret key credentials now. For security purposes, you will <strong className="text-white">not be able to see this key again</strong> once you navigate away or close this box.
                      </p>
                      
                      <div className="p-3.5 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-white flex justify-between items-center gap-4">
                        <span className="text-[#F8CCAA] tracking-wider select-all">{newlyCreatedKey}</span>
                        <button
                          onClick={() => handleCopy("new-key", newlyCreatedKey)}
                          className="p-1.5 hover:bg-white/5 rounded text-[#8e94a0] hover:text-white transition"
                          title="Copy generated API key"
                        >
                          {copiedId === "new-key" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ACTIVE KEYS TABLE CONTAINER */}
                <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#F8CCAA] uppercase tracking-widest font-semibold">Active Key Mappings</span>
                    {isFetchingKeys && <RefreshCw size={12} className="animate-spin text-[#F8CCAA]" />}
                  </div>

                  {apiKeys.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#8e94a0]">
                      No active credential tokens found for this workspace. Use the panel on the left to initialize a token key.
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-white/[0.02] text-[#8e94a0] font-mono border-b border-white/5">
                          <tr>
                            <th className="p-4">Key Descriptor</th>
                            <th className="p-4">Preview</th>
                            <th className="p-4">Scopes</th>
                            <th className="p-4">Last Sync Used</th>
                            <th className="p-4">Revoke</th>
                          </tr>
                        </thead>
                        <tbody className="text-white/80">
                          {apiKeys.map(k => (
                            <tr key={k.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                              <td className="p-4 font-medium text-white">{k.name}</td>
                              <td className="p-4 font-mono text-[10.5px] text-[#F8CCAA]">{k.previewKey}</td>
                              <td className="p-4">
                                <div className="flex gap-1.5">
                                  {k.permissions.map(p => (
                                    <span key={p} className="text-[8px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase text-white/80">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-[10px] text-[#8e94a0]">
                                {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleRevokeKey(k.id)}
                                  className="p-1.5 hover:bg-red-500/10 text-[#8e94a0] hover:text-red-400 rounded transition cursor-pointer"
                                  title="Revoke Credentials Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 3: SYSTEM DIAGNOSTICS - LIVE INTERACTIVE RUNNER */}
      {activeTab === "diagnostics" && (
        <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8 text-left">
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F2C1A3] font-semibold">Security Auditing & telemetry Checks</span>
            <h1 className="text-2xl md:text-4xl font-serif text-white font-light">Interactive Diagnostics</h1>
            <p className="text-xs text-[#8e94a0]">
              Query active database, firebase state, and gateway webhooks triggers inside your workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Control panel */}
            <div className="md:col-span-4 p-6 rounded-3xl border border-white/10 bg-[#0e1017] flex flex-col gap-4 text-center">
              <Activity className="mx-auto text-[#F8CCAA]" size={32} />
              <h3 className="text-white font-serif font-light text-sm">System Health Analyzer</h3>
              <p className="text-[10.5px] text-[#8e94a0] leading-relaxed">
                Analyze response thresholds, database connectivity, and active sync webhook statuses.
              </p>

              <button
                onClick={runDiagnostics}
                disabled={isDiagnosticRunning}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                {isDiagnosticRunning ? (
                  <>
                    <RefreshCw size={12} className="animate-spin text-[#12131e]" />
                    <span>Analyzing... {diagnosticProgress}%</span>
                  </>
                ) : (
                  <>
                    <Play size={12} className="text-[#12131e]" />
                    <span>Run System Diagnostics</span>
                  </>
                )}
              </button>
            </div>

            {/* Diagnostic Logs */}
            <div className="md:col-span-8 p-6 rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col gap-4">
              <span className="text-xs font-mono text-[#F2C1A3] uppercase tracking-widest font-semibold">Diagnostic Logs</span>
              
              <div className="flex flex-col gap-3">
                {diagnosticLogs.map((log, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-4 justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-white text-xs font-semibold">{log.name}</span>
                      <span className="text-[10px] text-[#8e94a0]">{log.detail}</span>
                    </div>
                    <div>
                      {isDiagnosticRunning && diagnosticProgress < (idx + 1) * 20 ? (
                        <RefreshCw size={14} className="animate-spin text-[#F8CCAA]" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: SUPPORT CENTER & DIALER COORDINATOR */}
      {activeTab === "support" && (
        <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8 text-left">
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F2C1A3] font-semibold">Technical Assistance Desk</span>
            <h1 className="text-2xl md:text-4xl font-serif text-white font-light">Developer Support</h1>
            <p className="text-xs text-[#8e94a0]">
              Get direct coordinator assistance for OAuth mappings, Git hooks, database synchronization bottlenecks, or custom enterprise configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* CALL DIALER CARD */}
            <div className="p-5 rounded-3xl border border-white/10 bg-[#0e1017] flex flex-col gap-4 text-center hover:border-white/15 transition-all">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 flex items-center justify-center">
                <Phone className="text-[#F2C1A3]" size={18} />
              </div>
              <h3 className="text-white font-serif font-light text-sm">Dial Coordinator Support</h3>
              <p className="text-[10.5px] text-[#8e94a0] leading-normal">
                Direct phone pipeline for critical deployment checks and integration questions.
              </p>
              <a
                href={`tel:${supportPhone}`}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white font-mono text-[10px] uppercase tracking-wider block"
              >
                Call Support Phone
              </a>
            </div>

            {/* WHATSAPP CARD */}
            <div className="p-5 rounded-3xl border border-white/10 bg-[#0e1017] flex flex-col gap-4 text-center hover:border-white/15 transition-all">
              <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MessageCircle className="text-emerald-400" size={18} />
              </div>
              <h3 className="text-white font-serif font-light text-sm">WhatsApp Developer Sync</h3>
              <p className="text-[10.5px] text-[#8e94a0] leading-normal">
                Text your workspace diagnostics output directly to coordination handlers.
              </p>
              <a
                href={`https://wa.me/${supportWhatsapp.replace(/[^0-9]/g, "")}?text=Hello%20TeamTrace%20Coordinator,%20I%20have%20an%20integration%20query.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] text-emerald-400 font-mono text-[10px] uppercase tracking-wider block"
              >
                Open WhatsApp Chat
              </a>
            </div>

            {/* EMAIL HELP CARD */}
            <div className="p-5 rounded-3xl border border-white/10 bg-[#0e1017] flex flex-col gap-4 text-center hover:border-white/15 transition-all">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#CD9FA0]/10 border border-[#CD9FA0]/20 flex items-center justify-center">
                <Mail className="text-[#CD9FA0]" size={18} />
              </div>
              <h3 className="text-white font-serif font-light text-sm">Email Academic Support</h3>
              <p className="text-[10.5px] text-[#8e94a0] leading-normal">
                Submit formal audit reviews, evaluation certification requests, or custom database templates.
              </p>
              <a
                href={`mailto:${supportEmail}?subject=ContriTrack%20Integration%20Assistance`}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white font-mono text-[10px] uppercase tracking-wider block"
              >
                Send Support Email
              </a>
            </div>

          </div>

          {/* Quick FAQ / Technical reference logs */}
          <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col gap-3">
            <h4 className="text-white font-serif font-light text-sm mb-1">Direct diagnostics log extract</h4>
            <p className="text-xs text-[#8e94a0]">
              To assist support coordinators, download or export your localized browser session telemetry data directly to provide accurate trace contexts.
            </p>
            <button
              onClick={() => {
                const logs = `Browser session telemetry logs:\nUserUID: ${user?.uid || "Anonymous"}\nWorkspaceID: ${selectedWorkspaceId || "None"}\nTimestamp: ${new Date().toISOString()}`;
                const blob = new Blob([logs], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `contritrack-diagnostics-${new Date().getTime()}.txt`;
                a.click();
              }}
              className="text-xs text-[#F8CCAA] font-mono flex items-center gap-1 hover:underline cursor-pointer"
            >
              <FileText size={12} />
              <span>Download Debug Diagnostics Log File</span>
            </button>
          </div>

        </div>
      )}

      {/* DYNAMIC INSTANT SEARCH OVERLAY MODAL */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0e1017] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-left"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <Search size={14} className="text-[#8e94a0]" />
                <input
                  type="text"
                  placeholder="Search developer specifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white text-xs focus:outline-none focus:ring-0 placeholder-[#8e94a0]"
                  autoFocus
                />
                <button onClick={() => setIsSearchOpen(false)} className="text-[#8e94a0] hover:text-white" title="Close Search">
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
                {filteredDocItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8e94a0]">No specs matched your query.</div>
                ) : (
                  filteredDocItems.map(cat => (
                    <div key={cat.category} className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-[#F2C1A3] px-2 py-1 block">{cat.category}</span>
                      {cat.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveSection(item.id);
                            setActiveTab("docs");
                            setIsSearchOpen(false);
                            setTimeout(() => {
                              document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 100);
                          }}
                          className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/5 text-white/90 transition flex items-center justify-between"
                        >
                          <span>{item.label}</span>
                          <ChevronRight size={10} className="text-[#8e94a0]" />
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/[0.04] bg-[#07080b] py-8 px-6 text-center text-xs text-[#8e94a0] font-light mt-auto">
        <span>© {new Date().getFullYear()} ContriTrack Developer ecosystem. Backed by Relational Database Mappings.</span>
      </footer>

    </div>
  );
}
