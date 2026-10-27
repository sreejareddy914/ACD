import React from 'react';
import { ShieldCheck, Info, FileQuestion, AlertTriangle, Cpu } from 'lucide-react';
import { ScanStatus } from '../analysis/types';

interface EmptyStateProps {
  onRescan: () => void;
  elementsInspected?: number;
  scanStatus?: ScanStatus;
  aiAvailable?: boolean;
  scanId?: string;
  limitations?: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onRescan,
  elementsInspected = 0,
  scanStatus = 'completed',
  aiAvailable = false,
  scanId,
  limitations = []
}) => {
  const isInsufficient = elementsInspected < 5 || scanStatus === 'insufficient_evidence';
  const isPartial = scanStatus === 'partial' || (!aiAvailable && elementsInspected >= 5);

  // State 1: Insufficient Evidence (< 5 elements or blocked/blank)
  if (isInsufficient) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-xs text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
          <FileQuestion className="w-6 h-6 stroke-[2.2]" />
        </div>

        <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider border border-amber-200">
          INSUFFICIENT EVIDENCE • {elementsInspected} ELEMENT{elementsInspected === 1 ? '' : 'S'}
        </div>

        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          LIMITED READABLE CONTENT EXTRACTED
        </h3>

        <p className="text-xs text-slate-600 max-w-[280px] mx-auto leading-relaxed">
          The scanner extracted only {elementsInspected} readable text element{elementsInspected === 1 ? '' : 's'}. This page may still be loading, rendered inside a canvas or iframe, or protected by anti-scraping.
        </p>

        {scanId && (
          <div className="text-[10px] font-mono text-slate-400">
            Scan ID: {scanId}
          </div>
        )}

        <button
          onClick={onRescan}
          className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          Rescan Page
        </button>
      </div>
    );
  }

  // State 2: Partial Analysis (Local Rules clean, but AI was offline or quota limited)
  if (isPartial) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
          <Cpu className="w-6 h-6 stroke-[2.2]" />
        </div>

        <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold uppercase tracking-wider border border-blue-200">
          PARTIAL SCAN • DETERMINISTIC RULES ONLY
        </div>

        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          NO PATTERNS DETECTED BY LOCAL RULES
        </h3>

        <p className="text-xs text-slate-600 max-w-[290px] mx-auto leading-relaxed">
          All 6 local deterministic detectors ran across {elementsInspected.toLocaleString()} elements without finding deceptive countdowns, price inversions, or hidden fees.
        </p>

        <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 text-[11px] text-amber-800 text-left flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-normal">
            Note: Contextual Gemini AI analysis was offline or quota-limited for this session. Nuanced linguistic nudges could not be AI-audited.
          </p>
        </div>

        {scanId && (
          <div className="text-[10px] font-mono text-slate-400">
            Scan ID: {scanId}
          </div>
        )}

        <button
          onClick={onRescan}
          className="w-full py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          Rescan Page
        </button>
      </div>
    );
  }

  // State 3: Completed Scan (Fully clean)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
        <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
      </div>

      <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider border border-emerald-200">
        LOW RISK • 0/100
      </div>

      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
        NO SIGNIFICANT DARK PATTERNS DETECTED
      </h3>

      <p className="text-xs text-slate-600 max-w-[280px] mx-auto leading-relaxed">
        The examined visible interface elements ({elementsInspected.toLocaleString()} elements analyzed) do not show evidence of artificial urgency, drip pricing, or deceptive opt-out choices.
      </p>

      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px] text-slate-500 text-left flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-normal">
          This result applies only to the analyzed visible content on this page and does not guarantee that the entire website or business is completely safe. Always verify vendor reputation before making payments.
        </p>
      </div>

      {scanId && (
        <div className="text-[10px] font-mono text-slate-400">
          Scan ID: {scanId}
        </div>
      )}

      <button
        onClick={onRescan}
        className="w-full py-2 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
      >
        Rescan Page
      </button>
    </div>
  );
};
