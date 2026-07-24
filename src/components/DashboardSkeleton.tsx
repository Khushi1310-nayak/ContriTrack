"use client";

import React from "react";


export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full h-full animate-pulse">
      {/* Top Stats Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="p-5 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 w-20 bg-white/5 rounded-full" />
              <div className="w-8 h-8 rounded-xl bg-white/5 shrink-0" />
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="h-8 w-16 bg-white/10 rounded-lg" />
              <div className="h-2 w-24 bg-white/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Middle Charts Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
        <div className="col-span-1 lg:col-span-8 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 min-h-[350px] flex flex-col">
          <div className="border-b border-white/5 pb-4 mb-6">
            <div className="h-2 w-32 bg-white/5 rounded-full mb-2" />
            <div className="h-4 w-48 bg-white/10 rounded-full" />
          </div>
          <div className="flex-1 flex items-end justify-between gap-4 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full bg-white/5 rounded-t-xl" style={{ height: `${20 + i * 10}px` }} />
                <div className="w-6 h-6 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 lg:col-span-4 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col">
          <div className="border-b border-white/5 pb-4 mb-6">
            <div className="h-2 w-24 bg-white/5 rounded-full mb-2" />
            <div className="h-4 w-32 bg-white/10 rounded-full" />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2 w-6 bg-white/5 rounded-full" />
                <div className="flex-1 h-3 bg-white/5 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
        <div className="col-span-1 lg:col-span-5 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 h-[220px]">
          <div className="h-4 w-32 bg-white/10 rounded-full mb-6" />
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 w-full bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="col-span-1 lg:col-span-4 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 h-[220px]">
          <div className="h-4 w-32 bg-white/10 rounded-full mb-6" />
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-4">
              <div className="h-3 w-full bg-white/5 rounded-full" />
              <div className="h-3 w-full bg-white/5 rounded-full" />
              <div className="h-3 w-full bg-white/5 rounded-full" />
            </div>
            <div className="w-20 h-20 rounded-full bg-white/5 shrink-0" />
          </div>
        </div>
        <div className="col-span-1 lg:col-span-3 p-6 rounded-3xl border border-white/5 bg-[#141523]/45 h-[220px]">
          <div className="h-4 w-24 bg-white/10 rounded-full mb-6" />
          <div className="h-2 w-full bg-white/5 rounded-full mb-4" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="h-12 bg-white/5 rounded-xl" />
            <div className="h-12 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
