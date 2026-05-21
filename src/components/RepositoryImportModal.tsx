import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, Lock, Star, GitFork, RefreshCw, X, FolderGit2, Check } from "lucide-react";
import { fetchAvailableRepositories, linkRepository } from "@/app/actions/github-actions";

interface Repo {
  id: string;
  name: string;
  owner: string;
  description: string;
  url: string;
  visibility: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
}

interface RepositoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onLinkedSuccess: () => void;
}

export function RepositoryImportModal({
  isOpen,
  onClose,
  userId,
  onLinkedSuccess
}: RepositoryImportModalProps) {
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [visFilter, setVisFilter] = useState<"all" | "public" | "private">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen]);

  const loadRepositories = async () => {
    setLoading(true);
    setError("");
    setSelectedIds(new Set());
    const res = await fetchAvailableRepositories(userId);
    if (res.success && res.repositories) {
      setRepos(res.repositories as Repo[]);
    } else {
      setError(res.error || "Failed to retrieve repositories from your GitHub account.");
    }
    setLoading(false);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLinkSelected = async () => {
    if (selectedIds.size === 0) return;
    setLinking(true);
    setError("");

    try {
      const selectedRepos = repos.filter((r) => selectedIds.has(r.id));
      for (const repo of selectedRepos) {
        await linkRepository(userId, {
          githubId: repo.id,
          owner: repo.owner,
          name: repo.name,
          description: repo.description,
          url: repo.url,
          visibility: repo.visibility,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          openIssues: repo.openIssues,
        });
      }
      onLinkedSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to link select repositories.");
    } finally {
      setLinking(false);
    }
  };

  const filteredRepos = repos.filter((repo) => {
    const matchesSearch = repo.name.toLowerCase().includes(search.toLowerCase()) || 
      repo.owner.toLowerCase().includes(search.toLowerCase());
    const matchesVis = visFilter === "all" || repo.visibility === visFilter;
    return matchesSearch && matchesVis;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#06070a]/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0e0f17]/90 p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-hidden"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full border border-white/5 bg-white/[0.02] text-[#857C91] hover:text-white hover:bg-white/5 transition"
              title="Close modal"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]">
                <FolderGit2 size={24} />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xl font-semibold font-serif text-white">Bridge GitHub Repositories</h3>
                <span className="text-xs text-[#857C91] font-light mt-0.5">Link your active projects to sync parity telemetry.</span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#857C91]" />
                <input 
                  type="text"
                  placeholder="Search repository name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 focus:border-[#F2C1A3] outline-none text-xs text-white placeholder-[#857C91] transition"
                />
              </div>

              <div className="flex rounded-2xl bg-white/[0.02] border border-white/5 p-1 shrink-0 self-start sm:self-center">
                {(["all", "public", "private"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setVisFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition ${
                      visFilter === filter 
                        ? "bg-[#F2C1A3] text-[#12131e] font-bold" 
                        : "text-[#857C91] hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Panel */}
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-left font-sans">
                {error}
              </div>
            )}

            {/* Repositories Scrollable area */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[250px]">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="w-8 h-8 text-[#F2C1A3] animate-spin" />
                  <span className="text-xs text-[#857C91] font-mono tracking-widest uppercase">Fetching user repositories...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-xs text-[#857C91] font-light">No repositories matched search criteria.</span>
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const isSelected = selectedIds.has(repo.id);
                  return (
                    <motion.div
                      key={repo.id}
                      onClick={() => handleToggleSelect(repo.id)}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      className={`p-4 rounded-2xl border transition duration-300 flex items-center justify-between gap-4 cursor-pointer text-left ${
                        isSelected 
                          ? "bg-[#F2C1A3]/5 border-[#F2C1A3]/40" 
                          : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Selector checkcircle */}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition shrink-0 ${
                          isSelected 
                            ? "bg-[#F2C1A3] border-[#F2C1A3] text-[#12131e]" 
                            : "border-white/20 bg-transparent"
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="flex flex-col">
                          <span className="text-white text-xs font-semibold flex items-center gap-2">
                            {repo.name}
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#857C91] text-[8px] font-mono">
                              {repo.visibility}
                            </span>
                          </span>
                          <span className="text-[#857C91] text-[10px] font-light line-clamp-1 mt-1 pr-6">
                            {repo.description || "No repository description provided."}
                          </span>
                        </div>
                      </div>

                      {/* Info badges */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="hidden sm:inline-flex px-2 py-1 rounded bg-[#CD9FA0]/15 text-[#CD9FA0] border border-[#CD9FA0]/20 text-[9px] font-mono uppercase tracking-wide">
                          {repo.language}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-white/60 text-[10px] font-mono flex items-center gap-1">
                            <Star size={11} className="text-[#F2C1A3]" /> {repo.stars}
                          </span>
                          <span className="text-white/60 text-[10px] font-mono flex items-center gap-1">
                            <GitFork size={11} className="text-[#CD9FA0]" /> {repo.forks}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-[10px] font-mono text-[#857C91] uppercase tracking-wider">
                {selectedIds.size} selected for bridging
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full border border-white/5 bg-white/[0.02] text-xs text-white hover:bg-white/5 hover:border-white/10 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={selectedIds.size === 0 || linking}
                  onClick={handleLinkSelected}
                  className="px-6 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold tracking-wide transition shadow-lg flex items-center gap-2"
                >
                  {linking ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Bridging Repos...</span>
                    </>
                  ) : (
                    <span>Initialize Bridging</span>
                  )}
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
