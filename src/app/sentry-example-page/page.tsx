"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen bg-[#12131e] flex flex-col items-center justify-center text-white relative">
      <Navbar hide={false} />
      
      <div className="z-10 flex flex-col items-center max-w-lg text-center p-8 glass-card rounded-2xl border border-red-500/20">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="text-red-400 w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-serif mb-4">Test Sentry Integration</h1>
        
        <p className="text-[#857C91] mb-8">
          Click the button below to throw a deliberate error. Sentry will catch this error and it will appear in your Sentry dashboard.
        </p>

        <button
          onClick={() => {
            throw new Error("Sentry Test Error from ContriTrack!");
          }}
          className="px-6 py-3 rounded-full font-medium bg-red-500 hover:bg-red-600 transition-colors duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
        >
          Throw Test Error
        </button>
      </div>
      
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
}
