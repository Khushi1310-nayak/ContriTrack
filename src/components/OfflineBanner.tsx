"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { OfflineSyncEngine } from "@/lib/offline-sync";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    
    const handleOnline = async () => {
      setIsOffline(false);
      setSyncing(true);
      await OfflineSyncEngine.processQueue();
      setSyncing(false);
    };

    const handleSyncComplete = () => {
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("contritrack:sync:complete", handleSyncComplete);

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("contritrack:sync:complete", handleSyncComplete);
    };
  }, []);

  if (!isOffline && !syncing && !synced) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-full shadow-2xl animate-in slide-in-from-bottom-5">
          <WifiOff size={14} className="text-red-400" />
          <span className="text-xs font-mono text-red-200">You are offline. Changes are saved locally.</span>
        </div>
      )}

      {syncing && !isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 backdrop-blur-md rounded-full shadow-2xl animate-in slide-in-from-bottom-5">
          <RefreshCw size={14} className="text-blue-400 animate-spin" />
          <span className="text-xs font-mono text-blue-200">Syncing local changes...</span>
        </div>
      )}

      {synced && !syncing && !isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-out duration-1000">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-xs font-mono text-emerald-200">All offline changes synced!</span>
        </div>
      )}
    </div>
  );
}
