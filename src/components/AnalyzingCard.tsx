import React from 'react';
import { Loader2 } from 'lucide-react';

interface AnalyzingCardProps {
  currentStage: string;
  stageProgress: number;
}

export const AnalyzingCard: React.FC<AnalyzingCardProps> = ({ currentStage, stageProgress }) => {
  return (
    <div className="space-y-4">
      {/* Prominent bordered card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center relative overflow-hidden">
        {/* Progress bar line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(10, stageProgress)}%` }}
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold uppercase tracking-wider mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
          ANALYZING
        </div>

        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50/80 text-blue-600 flex items-center justify-center mb-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 stroke-[2.2]" />
        </div>

        <h3 className="text-sm font-bold text-slate-900 mb-1 tracking-tight">
          {currentStage || 'Extracting webpage content...'}
        </h3>

        <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed">
          Scanning interface elements, price arithmetic, countdown timers, and opt-out choices.
        </p>

        {/* Real stages timeline */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
          <span className={stageProgress >= 20 ? 'text-blue-600 font-semibold' : ''}>1. Extract</span>
          <span>→</span>
          <span className={stageProgress >= 40 ? 'text-blue-600 font-semibold' : ''}>2. Check</span>
          <span>→</span>
          <span className={stageProgress >= 60 ? 'text-blue-600 font-semibold' : ''}>3. Evaluate</span>
          <span>→</span>
          <span className={stageProgress >= 80 ? 'text-blue-600 font-semibold' : ''}>4. Validate</span>
          <span>→</span>
          <span className={stageProgress >= 95 ? 'text-blue-600 font-semibold' : ''}>5. Result</span>
        </div>
      </div>

      {/* Analysis section beneath the card */}
      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          ANALYSIS IN PROGRESS
        </div>
        <p className="text-xs text-slate-600 leading-normal">
          Inspecting visible DOM elements, computing price differences, and evaluating contextual manipulation signals. Results will appear as soon as validation finishes.
        </p>
      </div>
    </div>
  );
};
