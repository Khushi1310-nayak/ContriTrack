"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  Shield, 
  Key, 
  Activity, 
  Github, 
  Code,
  Lock,
  Layers,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ApiModalContentProps {
  onClose: () => void;
}

export default function ApiModalContent({ onClose }: ApiModalContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("github-webhooks");
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "github-webhooks", label: "GitHub Webhooks", icon: Github },
    { id: "rest-api", label: "REST API Access", icon: Layers },
    { id: "oauth-auth", label: "OAuth Auth", icon: Lock },
    { id: "websocket-events", label: "WebSockets", icon: Activity },
    { id: "export-apis", label: "Export APIs", icon: Code }
  ];

  const codeBlocks: Record<string, { title: string; lang: string; curl: string; ts: string; details: string }> = {
    "github-webhooks": {
      title: "GitHub Webhook Receiver Endpoint",
      lang: "TypeScript (Next.js App Route)",
      curl: `curl -X POST "https://api.contritrack.com/v1/webhooks/github" \\
  -H "X-Hub-Signature-256: sha256=e3b0c442..." \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"refs/heads/main","commits":[{"id":"a1b2c3d","message":"feat: support presence updates","added":["src/app/actions/team-actions.ts"]}]}'`,
      ts: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    
    // Webhook secret cryptographic hmac sha256 validation
    const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET || "");
    const digest = "sha256=" + hmac.update(rawBody).digest("hex");
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = req.headers.get("x-github-event");

    if (event === "push") {
      const repoName = payload.repository.full_name;
      const commits = payload.commits || [];

      for (const commit of commits) {
        await prisma.commit.create({
          data: {
            hash: commit.id,
            message: commit.message,
            authorName: commit.author.username || commit.author.name,
            additions: commit.added.length * 10 + 5, // Estimate additions
            deletions: commit.removed.length * 5,
            authoredAt: new Date(commit.timestamp),
            repo: { connect: { fullName: repoName } }
          }
        });
      }
      return NextResponse.json({ success: true, commitsImported: commits.length });
    }

    return NextResponse.json({ success: true, msg: "Event ignored" });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`,
      details: "Configures real-time repository ingestion. Listens to 'push', 'pull_request', and 'issues' events to calculate accurate contribution parity."
    },
    "rest-api": {
      title: "REST API Integration Guide",
      lang: "TypeScript & cURL REST Reference",
      curl: `curl -X GET "https://api.contritrack.com/v1/tasks?status=completed" \\
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" \\
  -H "X-Workspace-Id: ws_7281c"`,
      ts: `import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const workspaceId = req.headers.get("X-Workspace-Id");

  if (!token || token !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized access token" }, { status: 401 });
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header is required" }, { status: 400 });
  }

  // Fetch all tasks tied exclusively to this workspace isolation
  const tasks = await prisma.task.findMany({
    where: { workspaceId },
    include: { assignee: true }
  });

  return NextResponse.json({ success: true, tasks });
}`,
      details: "Query workspace tasks, pull requests, and telemetry. Fully isolates data vectors per workspace to enforce secure academic limits."
    },
    "oauth-auth": {
      title: "OAuth Account Linking Flow",
      lang: "NextAuth + Firebase User Link",
      curl: `curl -X POST "https://api.contritrack.com/v1/auth/link" \\
  -H "Content-Type: application/json" \\
  -d '{"uid":"firebase_uid_821","githubUsername":"git_partner"}'`,
      ts: `import { prisma } from "@/lib/db";
import { db } from "@/lib/firebase-admin"; // server-side SDK
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { uid, githubUsername } = await req.json();

  if (!uid || !githubUsername) {
    return NextResponse.json({ error: "Missing required auth fields" }, { status: 400 });
  }

  // 1. Sync Supabase PostgreSQL database via Prisma
  const user = await prisma.user.update({
    where: { id: uid },
    data: { githubUsername }
  });

  // 2. Sync Realtime Firebase Firestore user profile
  await db.collection("users").doc(uid).set({
    githubUsername,
    linkedAt: new Date().toISOString()
  }, { merge: true });

  return NextResponse.json({ success: true, user: { id: user.id, githubUsername } });
}`,
      details: "Links GitHub telemetry with Firebase authentications. Encrypts workspace connection tokens to preserve zero trust security models."
    },
    "websocket-events": {
      title: "WebSocket Real-time Client",
      lang: "Supabase Realtime Streamer",
      curl: `wscat -c "wss://api.contritrack.com/realtime/v1?apikey=ct_live_8f3d..."`,
      ts: `import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Subscribe to real-time changes in task and workspace metrics
export function subscribeToTaskChanges(workspaceId: string, onUpdate: (payload: any) => void) {
  const channel = supabase
    .channel("realtime-tasks")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "Task",
        filter: \`workspaceId=eq.\${workspaceId}\`
      },
      (payload) => {
        console.log("Real-time task update registered:", payload);
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}`,
      details: "Broadcasting workspace events. Uses WebSocket hooks to sync peer presence, active metrics, and task board changes instantaneously."
    },
    "export-apis": {
      title: "Auditable Reports Exporter API",
      lang: "Node.js Stream Exporter",
      curl: `curl -X GET "https://api.contritrack.com/v1/reports/pdf?workspaceId=ws_7281" \\
  -H "Authorization: Bearer YOUR_API_TOKEN_HERE" -o report.pdf`,
      ts: `import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit"; // real library

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId query parameter" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { tasks: true, members: { include: { user: true } } }
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Create a real memory pdf doc buffer stream
  const doc = new PDFDocument({ margin: 40 });
  const buffers: Buffer[] = [];
  
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  doc.font("Helvetica-Bold").fontSize(18).text(\`TeamTrace Audit: \${workspace.name}\`, 40, 50);
  doc.fontSize(10).font("Helvetica").text(\`Generated: \${new Date().toLocaleDateString()}\`, 40, 75);
  doc.moveDown();

  doc.fontSize(12).font("Helvetica-Bold").text("Roster Peer Parity Contributions");
  workspace.members.forEach((m) => {
    doc.fontSize(10).font("Helvetica").text(\`- \${m.user.fullName} (\${m.role})\`);
  });

  doc.end();

  const pdfBuffer = Buffer.concat(buffers);
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": \`attachment; filename="\${workspaceId}-audit.pdf"\`
    }
  });
}`,
      details: "Compiles evidence metrics. Spawns audited records to generate proof of workload distribution for group assessments."
    }
  };

  const currentSnippet = codeBlocks[activeTab];

  return (
    <div className="flex flex-col gap-6 select-none max-w-full">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-[#F8CCAA] font-light flex items-center gap-1">
          <Sparkles size={11} className="text-[#F8CCAA] animate-pulse" /> Developer Ecosystem
        </span>
        <h2 className="text-2xl md:text-4xl font-light text-white font-serif tracking-tight leading-tight">
          Enterprise <span className="text-[#F8CCAA] italic">Developer</span> Gateway
        </h2>
        <p className="text-[#857C91] text-xs font-light max-w-xl leading-relaxed mt-1">
          Hook into automated workflow loops, query contribution databases, track OAuth session keys, and download certified academic telemetry with full API SDK references.
        </p>
      </div>

      {/* Responsive Horizontal Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-white/[0.01] border border-white/5 rounded-2xl scrollbar-none shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-mono tracking-wider uppercase transition cursor-pointer whitespace-nowrap ${
                isActive 
                  ? "bg-[#F8CCAA]/10 border border-[#F8CCAA]/20 text-[#F8CCAA] shadow-inner" 
                  : "border border-transparent text-[#857C91] hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <Icon size={12} className={isActive ? "text-[#F8CCAA]" : "text-[#857C91]"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Split Screen Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2">
        
        {/* Left Side Tab description & mini guides (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-3xl border border-white/5 bg-white/[0.01] backdrop-blur-md text-left">
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-mono text-[#F2C1A3] uppercase tracking-wider block font-semibold">API Details</span>
            <h3 className="text-white text-base font-serif font-light">{currentSnippet.title}</h3>
            
            <p className="text-[#857C91] text-xs font-light leading-relaxed">
              {currentSnippet.details}
            </p>

            <div className="border-t border-white/5 my-2" />

            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider">Gateway Telemetry</span>
              <div className="flex items-center gap-2 text-[10px] text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="font-mono text-emerald-400">api.contritrack.com</span>
                <span className="text-[#857C91] font-mono">/v1</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-6 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-[#857C91] text-[10px] font-light">
              <Shield size={12} className="text-[#F2C1A3]" />
              <span>Cryptographic signatures validated (HMAC SHA-256)</span>
            </div>
            <div className="flex items-center gap-2 text-[#857C91] text-[10px] font-light">
              <Key size={12} className="text-[#F8CCAA]" />
              <span>Rate limits: 10,000 reqs/min per token key</span>
            </div>
          </div>
        </div>

        {/* Right Side Code Terminal Screen (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-white/5 bg-[#12131e]/90 overflow-hidden shadow-inner flex flex-col text-left">
          
          {/* Code Tabs Selector */}
          <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-[#857C91] font-mono">
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-[#F8CCAA]" />
              <span className="text-white text-[10px]">{currentSnippet.lang}</span>
            </div>
            <button
              onClick={() => handleCopy(currentSnippet.ts)}
              className="p-1 px-2.5 rounded bg-white/5 border border-white/5 hover:border-[#F8CCAA]/20 text-[#857C91] hover:text-white transition flex items-center gap-1 cursor-pointer text-[10px]"
              title="Copy snippet"
            >
              {copied ? (
                <>
                  <Check size={10} className="text-emerald-400" />
                  <span className="text-emerald-400 font-mono">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={10} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Live Playground Container */}
          <div className="p-5 font-mono text-[10.5px] leading-relaxed overflow-y-auto max-h-[290px] scrollbar-thin scrollbar-thumb-white/5 flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="whitespace-pre overflow-x-auto"
              >
                {/* Simulated Syntax Highlighting with curate color blocks */}
                {currentSnippet.ts.split("\n").map((line, idx) => {
                  let highlighted = <span className="text-white">{line}</span>;
                  if (line.startsWith("import") || line.startsWith("export")) {
                    highlighted = <span className="text-[#CD9FA0]">{line}</span>;
                  } else if (line.trim().startsWith("const") || line.trim().startsWith("let") || line.trim().startsWith("var")) {
                    highlighted = (
                      <span>
                        <span className="text-[#F8CCAA]">{line.match(/^\s*(const|let|var)/)?.[0]}</span>
                        {line.replace(/^\s*(const|let|var)/, "")}
                      </span>
                    );
                  } else if (line.includes("prisma") || line.includes("db.")) {
                    highlighted = <span className="text-[#F2C1A3]">{line}</span>;
                  } else if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
                    highlighted = <span className="text-[#857C91] italic">{line}</span>;
                  } else if (line.includes("NextResponse") || line.includes("return")) {
                    highlighted = <span className="text-[#CD9FA0]">{line}</span>;
                  }
                  return (
                    <div key={idx} className="flex gap-4">
                      <span className="text-[#857C91]/30 text-right select-none w-5 pr-2 border-r border-white/5">{idx + 1}</span>
                      {highlighted}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* curl preview block at the footer of the terminal */}
          <div className="p-4 bg-white/[0.01] border-t border-white/5 flex flex-col gap-1.5">
            <span className="text-[8px] font-mono uppercase tracking-wider text-[#857C91]">Test with cURL</span>
            <div className="p-2 rounded-xl bg-black/40 text-[9.5px] font-mono text-white/90 overflow-x-auto flex items-center justify-between gap-3">
              <span className="whitespace-nowrap scrollbar-none overflow-x-auto">{currentSnippet.curl}</span>
              <button 
                onClick={() => handleCopy(currentSnippet.curl)} 
                className="shrink-0 p-1 hover:bg-white/5 rounded text-[#857C91] hover:text-white transition cursor-pointer"
                title="Copy Curl Command"
              >
                <Copy size={10} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Footer view documentation triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2 border-t border-white/5 pt-4 shrink-0">
        <span className="text-[10px] font-mono text-[#857C91] text-left">
          TeamTrace SDK available for: Node.js, JavaScript, TypeScript, Go.
        </span>
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-white text-[11px] font-light transition cursor-pointer"
          >
            Close Explorer
          </button>
          <button 
            onClick={() => {
              onClose();
              router.push("/docs");
            }}
            className="px-5 py-2.5 rounded-full bg-[#F8CCAA] hover:bg-[#fad8bb] text-[#12131e] text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-lg hover:shadow-[#F8CCAA]/10"
          >
            <span>View Full Documentation</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
