import React from 'react';
import { RiskLevel } from '../analysis/types';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Globe } from 'lucide-react';

interface RiskSummaryCardProps {
  score: number;
  level: RiskLevel;
  findingsCount: number;
  categoriesCount: number;
  verifiedCount?: number;
  potentialCount?: number;
  domain?: string;
  timestamp?: number;
  analysisMode: 'rule' | 'ai' | 'combined';
  aiAvailable: boolean;
}

export const RiskSummaryCard: React.FC<RiskSummaryCardProps> = ({
  score,
  level,
  findingsCount,
  categoriesCount,
  verifiedCount = 0,
  potentialCount = 0,
  domain,
  timestamp,
  analysisMode,
  aiAvailable
}) => {
  // Styles based on risk level
  const isLow = level === 'LOW RISK';
  const isModerate = level === 'MODERATE RISK';
  const isHigh = level === 'HIGH RISK';
  const isVeryHigh = level === 'VERY HIGH RISK';

  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let scoreColor = 'text-emerald-400';
  let icon = <ShieldCheck className="w-5 h-5 text-emerald-400 stroke-[2.2]" />;

  if (isModerate) {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    scoreColor = 'text-amber-400';
    icon = <AlertTriangle className="w-5 h-5 text-amber-400 stroke-[2.2]" />;
  } else if (isHigh) {
    badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    scoreColor = 'text-orange-400';
    icon = <ShieldAlert className="w-5 h-5 text-orange-400 stroke-[2.2]" />;
  } else if (isVeryHigh) {
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    scoreColor = 'text-rose-400';
    icon = <ShieldAlert className="w-5 h-5 text-rose-400 stroke-[2.2]" />;
  }

  const modeLabel = analysisMode === 'combined'
    ? 'Combined (Rules + Gemini AI)'
    : analysisMode === 'ai'
    ? 'Gemini Contextual'
    : 'Local Deterministic Rules';

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div className="bg-[#172036] rounded-2xl border border-slate-700/60 p-4 shadow-lg text-slate-100">
      {/* Top Origin and Status row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate">
            {domain || 'Active Webpage'}
          </span>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${badgeColor}`}>
          {level}
        </span>
      </div>

      {/* Main Score & Icon */}
      <div className="flex items-center justify-between my-2 pb-3 border-b border-slate-700/50">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-black tracking-tight ${scoreColor}`}>
              {score}
            </span>
            <span className="text-slate-400 font-bold text-sm">/100</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Evidence-Based Risk Score
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-inner">
          {icon}
        </div>
      </div>

      {/* Verification Metrics Breakdown */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40 text-center">
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Candidates</div>
          <div className="text-base font-bold text-white mt-0.5">
            {findingsCount}
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40 text-center">
          <div className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Verified</div>
          <div className="text-base font-bold text-emerald-300 mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{verifiedCount}</span>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/40 text-center">
          <div className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Awaiting</div>
          <div className="text-base font-bold text-amber-300 mt-0.5 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{potentialCount}</span>
          </div>
        </div>
      </div>

      {/* Footer metadata */}
      <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">Engine: <strong className="text-slate-300 font-semibold">{modeLabel}</strong></span>
        <span className="shrink-0 text-slate-400">Scanned at: {formattedTime}</span>
      </div>
    </div>
  );
};
