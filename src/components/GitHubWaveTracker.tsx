import React, { useState } from "react";
import { motion } from "framer-motion";
import { FolderGit2, RefreshCw, Layers, Database, Gauge, Radio, Trash2 } from "lucide-react";
import { triggerRepositorySync, deleteRepository } from "@/app/actions/github-actions";

interface Member {
  username: string;
  avatar: string | null;
  role: string;
}

interface Analytics {
  username: string;
  commitShare: number;
  codeChangeShare: number;
  fairness: number;
  burnout: number;
  activeDays: number;
}

export interface LinkedRepo {
  id: string;
  githubId: string;
  owner: string;
  name: string;
  description: string | null;
  url: string;
  visibility: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  branchesCount: number;
  lastCommitAt: string | null;
  lastSyncedAt: string | null;
  webhookActive: boolean;
  collaboratorCount: number;
  members: Member[];
  analytics: Analytics[];
  lastSyncStatus: string;
  lastSyncMessage: string | null;
  rateLimit?: number;
}

interface GitHubWaveTrackerProps {
  repositories: LinkedRepo[];
  userId: string;
  onSyncCompleted: () => void;
  onSelectRepo: (repo: LinkedRepo) => void;
}

export function GitHubWaveTracker({
  repositories,
  userId,
  onSyncCompleted,
  onSelectRepo
}: GitHubWaveTrackerProps) {
  const [localRepos, setLocalRepos] = useState<LinkedRepo[]>(repositories);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState("");

  React.useEffect(() => {
    setLocalRepos(repositories);
  }, [repositories]);

  const handleTriggerSync = async (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation(); // Avoid triggering open drawer
    setSyncingId(repoId);
    setSyncError("");
    try {
      const res = await triggerRepositorySync(repoId, userId);
      if (res.success) {
        onSyncCompleted();
      } else {
        setSyncError(res.error || "Failed to finalize telemetry sync.");
      }
    } catch (err) {
      const error = err as Error;
      setSyncError(error.message || "Failed to trigger sync.");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteRepo = async (e: React.MouseEvent, repoId: string, repoName: string) => {
    e.stopPropagation(); // Avoid triggering open drawer
    if (!confirm(`Are you sure you want to completely delete "${repoName}" from ContriTrack and permanently purge all associated telemetry logs? This action is irreversible.`)) {
      return;
    }

    // INSTANT OPTIMISTIC UI REMOVAL: Remove immediately from screen with 0 delay
    setLocalRepos((prev) => prev.filter((r) => r.id !== repoId));
    setSyncError("");

    try {
      const res = await deleteRepository(repoId);
      if (res.success) {
        onSyncCompleted();
      } else {
        setSyncError(res.error || "Failed to fully delete repository.");
        setLocalRepos(repositories); // Revert on failure
      }
    } catch (err) {
      const error = err as Error;
      setSyncError(error.message || "Failed to trigger repository deletion.");
      setLocalRepos(repositories); // Revert on failure
    }
  };

  // Compute aggregate system telemetry metrics
  const totalRepos = localRepos.length;
  const averageParity = totalRepos > 0 
    ? Math.round(localRepos.reduce((acc, r) => acc + (r.analytics[0]?.fairness || 100), 0) / totalRepos) 
    : 100;
  const latestRateRemaining = localRepos.find((r) => r.rateLimit !== undefined)?.rateLimit ?? 4950;

  return (
    <div className="flex flex-col gap-6 text-left max-w-4xl w-full">
      {/* Visual Analytics Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Total repos */}
        <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Bridged Projects</span>
            <span className="text-3xl font-serif text-white font-light">{totalRepos}</span>
            <span className="text-[9px] text-[#F2C1A3] font-mono uppercase mt-1">active octokit links</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-white">
            <Layers size={20} />
          </div>
        </div>

        {/* Global parity index */}
        <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Average Parity</span>
            <span className={`text-3xl font-serif font-light ${
              averageParity >= 80 ? "text-emerald-400" : "text-[#F2C1A3]"
            }`}>
              {averageParity}%
            </span>
            <span className="text-[9px] text-[#857C91] font-mono uppercase mt-1">Jain&apos;s Fairness Ratio</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[#F2C1A3]">
            <Gauge size={20} />
          </div>
        </div>

        {/* Sync Rate Monitor */}
        <div className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[#857C91] text-[9px] font-mono uppercase tracking-wider">Git API Rates</span>
            <span className="text-3xl font-serif text-white font-light">{latestRateRemaining.toLocaleString()}</span>
            <span className="text-[9px] text-emerald-400 font-mono uppercase mt-1">/ 5,000 remaining</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[#CD9FA0]">
            <Database size={20} />
          </div>
        </div>

      </div>

      {/* Sync Error Display */}
      {syncError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-sans">
          {syncError}
        </div>
      )}

      {/* Repositories Card Grid */}
      <div className="flex flex-col gap-4">
        {localRepos.map((repo) => (
          <motion.div
            key={repo.id}
            onClick={() => onSelectRepo(repo)}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 hover:border-white/10 hover:bg-[#141523]/60 transition duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer text-left"
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Glowing Indicator Circle */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-white shrink-0">
                <FolderGit2 size={22} className="text-[#F2C1A3]" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-semibold">{repo.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#857C91] text-[8px] font-mono font-bold uppercase tracking-wider">
                    {repo.visibility}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-mono flex items-center gap-1">
                    <Radio size={8} className="animate-pulse" /> Live
                  </span>
                </div>
                <span className="text-[#857C91] text-xs font-light mt-1 line-clamp-1 pr-4">
                  {repo.description || "No repository description mapped."}
                </span>

                {/* Internal collaborator profiles bubble list */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex -space-x-2">
                    {repo.members.slice(0, 4).map((m, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        key={i} 
                        src={m.avatar || "https://avatars.githubusercontent.com/u/583231?v=4"} 
                        alt={m.username} 
                        className="w-5 h-5 rounded-full border border-[#111221] shrink-0" 
                        title={`${m.username} (${m.role})`}
                      />
                    ))}
                    {repo.members.length > 4 && (
                      <div className="w-5 h-5 rounded-full bg-white/5 border border-[#111221] text-[8px] font-bold text-white flex items-center justify-center font-mono">
                        +{repo.members.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#857C91] font-mono uppercase tracking-wide">
                    {repo.collaboratorCount} active peers
                  </span>
                  
                  {repo.language && (
                    <span className="px-2 py-0.5 rounded bg-[#CD9FA0]/15 text-[#CD9FA0] border border-[#CD9FA0]/20 text-[8px] font-mono uppercase tracking-widest hidden sm:inline-block">
                      {repo.language}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sync telemetry metadata and control */}
            <div className="flex items-center gap-5 justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
              
              <div className="flex flex-col text-left md:text-right font-mono">
                <span className="text-[#857C91] text-[8px] uppercase tracking-wider">Sync Telemetry</span>
                <span className={`text-[10px] font-semibold mt-0.5 ${
                  repo.lastSyncStatus === "success" ? "text-emerald-400" : repo.lastSyncStatus === "failed" ? "text-red-400" : "text-[#857C91]"
                }`}>
                  {repo.lastSyncStatus === "success" ? "Active" : repo.lastSyncStatus === "failed" ? "Failed" : "Sync Pending"}
                </span>
                <span className="text-[#857C91] text-[8px] font-light mt-0.5 max-w-[150px] truncate" title={repo.lastSyncMessage ?? undefined}>
                  {repo.lastSyncMessage}
                </span>
              </div>

              {/* Sync Trigger button */}
              <button
                disabled={syncingId === repo.id}
                onClick={(e) => handleTriggerSync(e, repo.id)}
                className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[#857C91] hover:text-white hover:border-white/10 hover:bg-white/5 transition disabled:opacity-40"
                title="Synchronize repository telemetry now"
              >
                <RefreshCw size={13} className={syncingId === repo.id ? "animate-spin text-[#F2C1A3]" : ""} />
              </button>

              {/* Retrieve & Delete Repository button */}
              <button
                disabled={syncingId === repo.id}
                onClick={(e) => handleDeleteRepo(e, repo.id, repo.name)}
                className="p-2.5 rounded-xl border border-red-500/15 bg-red-500/5 text-red-400 hover:text-white hover:border-red-500/35 hover:bg-red-500/25 transition disabled:opacity-40 cursor-pointer"
                title="Retrieve telemetry and permanently purge repository data"
              >
                <Trash2 size={13} />
              </button>

            </div>
          </motion.div>
        ))}

        {localRepos.length === 0 && (
          <div className="py-12 border border-dashed border-white/5 rounded-3xl text-center flex flex-col items-center justify-center p-6 gap-3 bg-white/[0.01]">
            <Layers className="w-8 h-8 text-[#857C91]/65" />
            <span className="text-xs text-[#857C91] font-light">No connected GitHub repositories found in this workspace.</span>
          </div>
        )}
      </div>

    </div>
  );
}
