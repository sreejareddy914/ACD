import React from 'react';
import { ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

interface ReadyCardProps {
  onAnalyze: () => void;
  pageTitle?: string;
  domain?: string;
}

export const ReadyCard: React.FC<ReadyCardProps> = ({ onAnalyze, pageTitle, domain }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 border border-blue-100">
        <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">
        CLEARCHOICE AI
      </div>

      <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1.5">
        Ready to analyze this page
      </h2>

      <p className="text-xs text-slate-600 leading-relaxed max-w-[280px] mx-auto mb-4">
        Check this website for potentially manipulative interface designs, fake urgency, and sneaky fees.
      </p>

      {domain && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono font-medium max-w-[260px] truncate">
          <span>Target:</span>
          <span className="text-slate-900 font-semibold truncate">{domain}</span>
        </div>
      )}

      <button
        onClick={onAnalyze}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer group"
      >
        <Sparkles className="w-4 h-4 text-blue-200 group-hover:rotate-12 transition-transform" />
        <span>Scan This Page</span>
        <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
      </button>

      <p className="text-[11px] text-slate-400 mt-3 font-normal">
        Rule-based checks and AI-assisted analysis when available.
      </p>
    </div>
  );
};
