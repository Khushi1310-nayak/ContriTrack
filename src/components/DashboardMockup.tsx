"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Sparkles, 
  ChevronDown, 
  TrendingUp 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";

// Custom Mock Data for Recharts
const graphData = [
  { name: "May 10", Aanya: 30, Rohan: 20, Ishita: 15, Kunal: 10 },
  { name: "May 11", Aanya: 45, Rohan: 35, Ishita: 25, Kunal: 18 },
  { name: "May 12", Aanya: 60, Rohan: 42, Ishita: 35, Kunal: 30 },
  { name: "May 13", Aanya: 55, Rohan: 58, Ishita: 48, Kunal: 42 },
  { name: "May 14", Aanya: 72, Rohan: 65, Ishita: 60, Kunal: 48 },
  { name: "May 15", Aanya: 85, Rohan: 78, Ishita: 68, Kunal: 55 },
  { name: "May 16", Aanya: 92, Rohan: 87, Ishita: 76, Kunal: 62 },
];

const emptySubscribe = () => () => {};

export default function DashboardMockup() {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    // Return a beautiful glassmorphic skeleton while mounting on client
    return (
      <div className="w-full aspect-[4/3] rounded-2xl border border-white/10 bg-white/5 animate-pulse flex items-center justify-center">
        <span className="text-[#857C91] text-sm font-light">Loading Analytics Engine...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      whileHover={{ y: -5 }}
      className="relative w-full rounded-2xl border border-white/10 bg-[#12131e]/85 p-5 md:p-6 shadow-2xl backdrop-blur-xl"
    >
      {/* Soft Dashboard Radial Overlay Glow */}
      <div className="absolute -top-10 -right-10 -z-10 h-40 w-40 rounded-full bg-[#F2C1A3] opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 -z-10 h-40 w-40 rounded-full bg-[#CD9FA0] opacity-10 blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
        <div className="flex items-center gap-3">
          {/* Logo icon */}
          <div className="flex items-end gap-[3px] h-7 w-7 rounded bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 p-1.5 justify-center">
            <span className="w-[3px] h-2 bg-[#CD9FA0] rounded-full animate-bounce"></span>
            <span className="w-[3px] h-4 bg-[#F2C1A3] rounded-full animate-bounce delay-200ms"></span>
            <span className="w-[3px] h-3 bg-[#F8CCAA] rounded-full animate-bounce delay-400ms"></span>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm leading-tight flex items-center gap-1.5">
              Dashboard
            </h4>
            <p className="text-[#857C91] text-xs font-light">Overview of your project</p>
          </div>
        </div>
        
        {/* Date Selector */}
        <div className="flex items-center self-start sm:self-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[#f3f4f6] font-light cursor-pointer hover:bg-white/10 transition">
          <span>This Week</span>
          <ChevronDown size={14} className="text-[#857C91]" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-5">
        {/* Stat 1 */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 md:p-4 text-left">
          <span className="text-[#857C91] text-[10px] md:text-xs font-light block mb-1">Total Projects</span>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-base md:text-xl font-semibold">4</span>
            <span className="text-[#F8CCAA] text-[10px] font-medium flex items-center gap-0.5 leading-none">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
        </div>
        {/* Stat 2 */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 md:p-4 text-left">
          <span className="text-[#857C91] text-[10px] md:text-xs font-light block mb-1">Tasks Completed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-base md:text-xl font-semibold">32</span>
            <span className="text-[#F2C1A3] text-[10px] font-medium flex items-center gap-0.5 leading-none">
              <TrendingUp size={10} /> +23%
            </span>
          </div>
        </div>
        {/* Stat 3 */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 md:p-4 text-left">
          <span className="text-[#857C91] text-[10px] md:text-xs font-light block mb-1">Contribution Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-base md:text-xl font-semibold">87%</span>
            <span className="text-[#CD9FA0] text-[10px] font-medium flex items-center gap-0.5 leading-none">
              <TrendingUp size={10} /> +15%
            </span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Chart + Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">
        {/* Recharts Chart */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 md:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white text-xs md:text-sm font-medium">Team Contribution</span>
            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-[#857C91] font-light">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F2C1A3]"></span>Aanya</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F8CCAA]"></span>Rohan</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#CD9FA0]"></span>Ishita</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#857C91]"></span>Kunal</span>
            </div>
          </div>
          
          <div className="w-full h-44 md:h-52 text-[10px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
              <LineChart data={graphData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#525871" 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#525871" 
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "#12131e", 
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#f3f4f6"
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Aanya" 
                  stroke="#F2C1A3" 
                  strokeWidth={2} 
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Rohan" 
                  stroke="#F8CCAA" 
                  strokeWidth={1.5} 
                  dot={{ r: 1 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Ishita" 
                  stroke="#CD9FA0" 
                  strokeWidth={1.5} 
                  dot={{ r: 1 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Kunal" 
                  stroke="#857C91" 
                  strokeWidth={1.5} 
                  dot={{ r: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Contributors list */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-white text-xs md:text-sm font-medium block mb-3 text-left">Top Contributors</span>
          
          <div className="space-y-3.5 flex-grow">
            {/* Contributor 1 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#F2C1A3] text-[#12131e] font-semibold text-[10px] flex items-center justify-center shadow-inner">AS</div>
                  <span className="text-white font-light">Aanya Sharma</span>
                </div>
                <span className="text-[#F2C1A3] font-medium">92%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#F2C1A3] rounded-full w-[92%]" />
              </div>
            </div>
            
            {/* Contributor 2 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#F8CCAA] text-[#12131e] font-semibold text-[10px] flex items-center justify-center shadow-inner">RM</div>
                  <span className="text-white font-light">Rohan Mehta</span>
                </div>
                <span className="text-[#F8CCAA] font-medium">87%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#F8CCAA] rounded-full w-[87%]" />
              </div>
            </div>

            {/* Contributor 3 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#CD9FA0] text-[#12131e] font-semibold text-[10px] flex items-center justify-center shadow-inner">IV</div>
                  <span className="text-white font-light">Ishita Verma</span>
                </div>
                <span className="text-[#CD9FA0] font-medium">76%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#CD9FA0] rounded-full w-[76%]" />
              </div>
            </div>

            {/* Contributor 4 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#857C91] text-[#12131e] font-semibold text-[10px] flex items-center justify-center shadow-inner">KS</div>
                  <span className="text-white font-light">Kunal Singh</span>
                </div>
                <span className="text-[#857C91] font-medium">62%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#857C91] rounded-full w-[62%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom suggestions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Deadline */}
        <div className="flex items-start gap-3 bg-[#CD9FA0]/5 border border-[#CD9FA0]/15 rounded-xl p-3 text-left">
          <div className="p-2 rounded-lg bg-[#CD9FA0]/10 text-[#CD9FA0] mt-0.5">
            <Calendar size={15} />
          </div>
          <div>
            <span className="text-[#CD9FA0] text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Upcoming Deadline</span>
            <h5 className="text-white font-medium text-xs">Final Year Project Report</h5>
            <p className="text-[#857C91] text-[10px] font-light">Due in 5 days</p>
          </div>
        </div>

        {/* AI suggestions */}
        <div className="flex items-start gap-3 bg-[#F2C1A3]/5 border border-[#F2C1A3]/15 rounded-xl p-3 text-left">
          <div className="p-2 rounded-lg bg-[#F2C1A3]/10 text-[#F2C1A3] mt-0.5 animate-pulse-gentle">
            <Sparkles size={15} />
          </div>
          <div>
            <span className="text-[#F2C1A3] text-[10px] uppercase tracking-wider font-semibold block mb-0.5">AI Suggestions</span>
            <p className="text-white font-light text-xs leading-relaxed">
              You&apos;re on track! Keep up the great work.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
