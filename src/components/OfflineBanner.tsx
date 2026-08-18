"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { OfflineSyncEngine } from "@/lib/offline-sync";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export default function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
  const isOffline = !isOnline;
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (isOnline) {
      const runSync = async () => {
        setSyncing(true);
        try {
          await OfflineSyncEngine.processQueue();
        } catch (err) {
          console.error("Failed to process offline queue", err);
        } finally {
          setSyncing(false);
        }
      };
      runSync();
    }
  }, [isOnline]);

  useEffect(() => {
    const handleSyncComplete = () => {
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    };

    window.addEventListener("contritrack:sync:complete", handleSyncComplete);
    return () => {
      window.removeEventListener("contritrack:sync:complete", handleSyncComplete);
    };
  }, []);

  if (!isOffline && !syncing && !synced) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 backdrop-blur-xl rounded-full shadow-2xl animate-in slide-in-from-bottom-5 pointer-events-auto">
          <WifiOff size={14} className="text-red-400" />
          <span className="text-xs font-mono text-red-200">You are offline. Changes are saved locally.</span>
        </div>
      )}

      {syncing && !isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 backdrop-blur-xl rounded-full shadow-2xl animate-in slide-in-from-bottom-5 pointer-events-auto">
          <RefreshCw size={14} className="text-blue-400 animate-spin" />
          <span className="text-xs font-mono text-blue-200">Syncing local changes...</span>
        </div>
      )}

      {synced && !syncing && !isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-out duration-1000 pointer-events-auto">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-xs font-mono text-emerald-200">All offline changes synced!</span>
        </div>
      )}
    </div>
  );
}
