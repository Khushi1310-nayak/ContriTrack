"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Sparkles, Loader2 } from "lucide-react";
import { createWorkspace } from "@/app/actions/team-actions";

interface WorkspaceInitializerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onWorkspaceCreated: (workspaceId: string, workspaceName: string) => void;
}

export default function WorkspaceInitializer({
  isOpen,
  onClose,
  userId,
  onWorkspaceCreated
}: WorkspaceInitializerProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError("Workspace name cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createWorkspace(workspaceName.trim(), userId);
      if (res.success && res.workspace) {
        onWorkspaceCreated(res.workspace.id, res.workspace.name);
        setWorkspaceName("");
        onClose();
      } else {
        setError(res.error || "Failed to create workspace.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0c0d15]/75 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="w-full max-w-md bg-[#111221]/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden cursor-default z-10"
          >
            {/* Ambient sunset glow rings */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#CD9FA0]/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-[#F2C1A3]/5 blur-xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5 relative pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F2C1A3]/10 border border-[#F2C1A3]/25 flex items-center justify-center text-[#F2C1A3]">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-white text-sm font-serif font-medium">Create Workspace</h3>
                  <p className="text-[#857C91] text-[10px] font-light">Set up a new workspace environment</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ws-name" className="text-white font-mono text-[10px] uppercase tracking-wider font-light">
                  Workspace Title
                </label>
                <input
                  id="ws-name"
                  type="text"
                  placeholder="e.g. Acme Engineering or Delta Studio"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/15 focus:border-[#F2C1A3] outline-none text-xs font-light text-white transition duration-300"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-[#CD9FA0] text-[10px] font-mono leading-relaxed bg-[#CD9FA0]/5 border border-[#CD9FA0]/15 px-3 py-2 rounded-xl">
                  {error}
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-light text-white/60 hover:text-white bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] hover:opacity-95 transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(242,193,163,0.15)]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      <span>Create Workspace</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
