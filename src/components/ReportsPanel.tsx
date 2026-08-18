"use client";

import React, { useState, useEffect, startTransition } from "react";
import { 
  FileText, 
  Sparkles, 
  Trash2, 
  FileDown, 
  RefreshCw, 
  Loader2, 
  Award, 
  Activity, 
  Calendar,
  UserCheck
} from "lucide-react";
import { 
  fetchWorkspaceReports, 
  deleteReport, 
  generateContributionReport, 
  generateSprintReport, 
  generateMeetingReport,
  generateReport
} from "@/app/actions/report-actions";
import { fetchWorkspaceAnalyticsData } from "@/app/actions/analytics-actions";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip
} from "recharts";

interface CertifiedReport {
  id: string;
  type: string;
  reportUrl: string;
  generatedBy: string;
  createdAt: string | Date;
}

interface Collaborator {
  id: string;
  fullName: string;
  email: string;
  githubUsername?: string | null;
}

interface ReportsPanelProps {
  workspaceId: string;
  workspaceName: string;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
  collaborators: Collaborator[];
}

interface ContributorStat {
  id: string;
  fullName: string;
  email?: string;
  githubUsername: string;
  commits: number;
  pullRequests: number;
  issuesClosed: number;
  linesAdded: number;
  linesDeleted: number;
  completedTasks: number;
  contributionScore: number;
}

interface AnalyticsData {
  totalCommits: number;
  activeContributors: number;
  sprintCompletionPct: number;
  fairnessScore: number;
  overdueRatio: number;
  openPRs: number;
  mergedPRs: number;
  openIssues: number;
  closedIssues: number;
  contributorStats: ContributorStat[];
  insights: string[];
}

export default function ReportsPanel({ workspaceId, workspaceName, user, collaborators }: ReportsPanelProps) {
  // Analytical and database reports states
  const [reports, setReports] = useState<CertifiedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  // Filters
  const [selectedSprint, setSelectedSprint] = useState("Sprint 3");
  const [selectedMember, setSelectedMember] = useState(user?.uid || "all");

  // Dynamic Telemetry states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Load certified reports from DB
  const loadReportsList = React.useCallback(async () => {
    setLoadingReports(true);
    const res = await fetchWorkspaceReports(workspaceId);
    if (res.success && res.reports) {
      setReports(res.reports as unknown as CertifiedReport[]);
    }
    setLoadingReports(false);
  }, [workspaceId]);

  // Load analytical telemetry values
  const loadAnalyticsData = React.useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetchWorkspaceAnalyticsData(workspaceName, {
        memberId: selectedMember === "all" ? null : selectedMember,
        sprintName: selectedSprint
      });
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error("Failed to load analytics telemetry:", err);
    }
    setLoadingAnalytics(false);
  }, [workspaceName, selectedMember, selectedSprint]);

  useEffect(() => {
    startTransition(() => {
      void loadReportsList();
      void loadAnalyticsData();
    });
  }, [loadReportsList, loadAnalyticsData]);

  // Trigger real database report compiles
  const handleCompileReport = React.useCallback(async (type: string) => {
    if (!user?.uid) return;
    setGeneratingType(type);

    try {
      let reportRes: { success: boolean; report?: { id: string } | null; error?: string } | null = null;

      if (type === "contribution") {
        const targetUserId = selectedMember === "all" ? user.uid : selectedMember;
        reportRes = await generateContributionReport(workspaceId, targetUserId);
      } else if (type === "sprint") {
        reportRes = await generateSprintReport(workspaceId, selectedSprint);
      } else {
        reportRes = await generateMeetingReport(workspaceId);
      }

      if (reportRes.success && reportRes.report) {
        // Save certified certificate record inside Report database table
        const certifiedRes = await generateReport({
          workspaceId,
          type,
          generatedBy: user.uid,
          snapshotId: reportRes.report.id
        });

        if (certifiedRes.success && certifiedRes.report) {
          setReports(prev => [certifiedRes.report as unknown as CertifiedReport, ...prev]);
        }
      }
    } catch (err) {
      console.error("Compilation error:", err);
    }

    setGeneratingType(null);
  }, [user, selectedMember, selectedSprint, workspaceId]);

  // Archive / Delete reports
  const handleDeleteReport = React.useCallback(async (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    await deleteReport(id);
  }, []);

  // CSV Export utility
  const handleExportCSV = React.useCallback(() => {
    if (!analyticsData || !analyticsData.contributorStats) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Teammate Candidate,GitHub Username,Commits Pushed,PRs Audited,Issues Solved,Workplace Tasks,Impact Score\n";

    analyticsData.contributorStats.forEach((c: ContributorStat) => {
      csvContent += `"${c.fullName}","${c.githubUsername}",${c.commits},${c.pullRequests},${c.issuesClosed},${c.completedTasks},${c.contributionScore}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ContriTrack_Academic_Report_${selectedSprint}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [analyticsData, selectedSprint]);

  // Heuristic diagnostic evaluator observations
  const professorInsights = React.useMemo(() => {
    if (!analyticsData || !analyticsData.contributorStats || analyticsData.contributorStats.length === 0) {
      return ["All collaborative telemetry sources are fully balanced."];
    }

    const stats = analyticsData.contributorStats;
    const sorted = [...stats].sort((a, b) => b.contributionScore - a.contributionScore);
    const topPerformer = sorted[0];
    const lowestPerformer = sorted[sorted.length - 1];

    const insights = [
      `Teammate candidate **${topPerformer.fullName}** has driven **${topPerformer.commits} commits** and completed **${topPerformer.completedTasks} tasks**, leading telemetry workload impact at **${Math.round(topPerformer.contributionScore)} points**.`
    ];

    if (sorted.length > 1 && topPerformer.contributionScore > lowestPerformer.contributionScore * 2) {
      insights.push(
        `Imbalance variance detected: Workload deviance flags **${lowestPerformer.fullName}** at ${Math.round(lowestPerformer.contributionScore)} points. Consider auto-redistributing upcoming sprint tasks.`
      );
    } else {
      insights.push("Workload fairness distribution index satisfies perfect project parity guidelines.");
    }

    return insights;
  }, [analyticsData]);

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl w-full">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[#F2C1A3] font-mono">Academic Proof Ledger</span>
          <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">Certified Group Project Reports</h2>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#F2C1A3] cursor-pointer flex items-center gap-1"
          >
            <FileDown size={12} /> Export CSV
          </button>
          <button 
            onClick={loadAnalyticsData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#857C91] hover:text-white transition cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={loadingAnalytics ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Selector Filters Row */}
      <div className="flex flex-wrap items-center gap-3 bg-[#111221]/50 border border-white/5 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#857C91] uppercase">Sprint:</span>
          <select 
            value={selectedSprint} 
            onChange={e => setSelectedSprint(e.target.value)}
            className="bg-[#12131e] border border-white/5 rounded-xl px-2 py-1 text-xs text-[#857C91] outline-none"
            aria-label="Filter by Sprint"
          >
            <option value="Sprint 1">Sprint 1</option>
            <option value="Sprint 2">Sprint 2</option>
            <option value="Sprint 3">Sprint 3</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#857C91] uppercase">Teammate Focus:</span>
          <select 
            value={selectedMember} 
            onChange={e => setSelectedMember(e.target.value)}
            className="bg-[#12131e] border border-white/5 rounded-xl px-2 py-1 text-xs text-[#857C91] outline-none max-w-[150px]"
            aria-label="Filter by Teammate Focus"
          >
            <option value="all">All Members</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Recharts Grid */}
      {loadingAnalytics ? (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-3 border border-white/5 rounded-3xl bg-[#111221]/20 min-h-[300px]">
          <Loader2 size={32} className="animate-spin text-[#F2C1A3]" />
          <span className="text-[#857C91] text-xs font-mono font-light">Querying workspace database telemetry...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Workload Radar Chart */}
          <div className="md:col-span-6 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
            <span className="text-xs text-white font-serif font-light">Peer Parity Workload Radar</span>
            <div className="h-56 w-full flex items-center justify-center">
              {analyticsData && analyticsData.contributorStats && analyticsData.contributorStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.contributorStats}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="fullName" stroke="#857C91" fontSize={8} />
                    <PolarRadiusAxis stroke="rgba(255,255,255,0.1)" />
                    <Radar name="GitHub Commits" dataKey="commits" stroke="#F2C1A3" fill="#F2C1A3" fillOpacity={0.2} />
                    <Radar name="Kanban Tasks" dataKey="completedTasks" stroke="#CD9FA0" fill="#CD9FA0" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: "8px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-[#857C91] text-xs">No active sprint statistics recorded</span>
              )}
            </div>
          </div>

          {/* PR & Merge Efficiency Balance Bar Chart */}
          <div className="md:col-span-6 p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
            <span className="text-xs text-white font-serif font-light">PR & Issues Sync Balance</span>
            <div className="h-56 w-full">
              {analyticsData && analyticsData.contributorStats && analyticsData.contributorStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.contributorStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="fullName" stroke="#857C91" fontSize={8} />
                    <YAxis stroke="#857C91" fontSize={8} />
                    <Tooltip contentStyle={{ backgroundColor: "#111221", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                    <Bar dataKey="pullRequests" name="Pull Requests" fill="#F2C1A3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="issuesClosed" name="Issues Closed" fill="#CD9FA0" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: "8px" }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#857C91] text-xs">
                  No active Git integrations
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Heuristic local AI diagnostics observations block */}
      <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Sparkles size={16} className="text-[#F2C1A3]" />
          <h4 className="text-white text-sm font-serif font-light">Professor-Ready Diagnostic Evaluator</h4>
        </div>
        <div className="flex flex-col gap-3">
          {professorInsights.map((ins, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#F2C1A3]/5 border border-[#F2C1A3]/10 text-[#F2C1A3] shrink-0">
                <UserCheck size={12} />
              </div>
              <p className="text-white/80 text-xs font-light leading-relaxed m-0" dangerouslySetInnerHTML={{ __html: ins }} />
            </div>
          ))}
        </div>
      </div>

      {/* Academic certified PDF documents compiling widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: "contribution", label: "Contribution Certificate", desc: "Verifies personal commits, fairness, and tasks", icon: Award },
          { key: "sprint", label: "Sprint Speed Record", desc: "Detailed velocity metrics and backlog counters", icon: Activity },
          { key: "meeting", label: "Attendance speaking logs", desc: "Speaking participation and presence metrics", icon: Calendar }
        ].map((rep) => {
          const RepIcon = rep.icon;
          const isCompiling = generatingType === rep.key;
          return (
            <button 
              key={rep.key}
              onClick={() => handleCompileReport(rep.key)}
              disabled={!!generatingType}
              className="p-5 rounded-2xl border border-white/5 hover:border-[#F2C1A3]/25 bg-white/[0.01] hover:bg-[#141523]/60 transition duration-300 text-left flex flex-col justify-between gap-3 cursor-pointer group disabled:opacity-50"
            >
              <div className="flex justify-between items-start w-full">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-[#F2C1A3] group-hover:text-[#F8CCAA]">
                  <RepIcon size={16} />
                </div>
                <div className="text-[9px] font-mono text-[#F2C1A3] uppercase tracking-wider">
                  Compile
                </div>
              </div>
              <div className="flex flex-col gap-1 leading-snug">
                <span className="text-white text-xs font-medium">{rep.label}</span>
                <span className="text-[#857C91] text-[10px] font-light mt-0.5">{rep.desc}</span>
              </div>
              {isCompiling && (
                <div className="flex items-center gap-1.5 text-[9px] text-[#F2C1A3] font-mono mt-1">
                  <Loader2 size={10} className="animate-spin" /> Compiling...
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Generated Certificates ledger database log */}
      <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4 mt-2">
        <h4 className="text-white text-sm font-serif font-light border-b border-white/5 pb-2">Academic certified archive</h4>

        {loadingReports ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={24} className="animate-spin text-[#F2C1A3]" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-6 text-[#857C91] text-xs font-light">
            No certified academic certificates generated yet for this workspace. Click compile above.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {reports.map((rep) => (
              <div 
                key={rep.id}
                className="p-3.5 rounded-2xl bg-white/[0.005] border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-[#F2C1A3]" />
                  <div className="flex flex-col text-left leading-snug">
                    <span className="text-xs text-white capitalize">{rep.type} Certified Academic Evaluation</span>
                    <span className="text-[#857C91] text-[9px] font-mono mt-0.5">
                      Certificate ID: {rep.id.substring(0, 8).toUpperCase()} | {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href={rep.reportUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-[10px] font-bold font-mono transition flex items-center gap-1"
                  >
                    <FileDown size={10} /> View PDF
                  </a>
                  <button 
                    onClick={() => handleDeleteReport(rep.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-[#857C91] hover:text-red-400 transition cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
