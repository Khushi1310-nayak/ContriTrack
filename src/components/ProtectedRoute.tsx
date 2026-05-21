"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#525871]/10 backdrop-blur-3xl z-50">
        <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl border border-[#CD9FA0]/30 bg-[#525871]/45 backdrop-blur-2xl shadow-2xl max-w-sm w-full mx-4 text-center">
          {/* Ambient Glowing Spotlights */}
          <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-[#CD9FA0]/25 blur-2xl animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full bg-[#F2C1A3]/25 blur-2xl animate-pulse" />

          {/* Animated Spinner with ContriTrack Accent Colors */}
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#525871]/30" />
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-[#CD9FA0] animate-spin" />
            <div className="absolute inset-2 rounded-full border border-dashed border-[#F2C1A3]/40 animate-pulse" />
          </div>

          <h2 className="text-xl font-serif text-[#F8CCAA] tracking-wider mb-2 animate-pulse">
            Authenticating
          </h2>
          <p className="text-sm font-sans text-[#857C91] tracking-wide leading-relaxed">
            Securing team workspace and synchronization rules...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
