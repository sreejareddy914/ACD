import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AnalysisSummaryProps {
  summary: string;
  detailedExplanation?: string;
  limitations?: string[];
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  summary,
  detailedExplanation,
  limitations
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          ANALYSIS
        </h3>
        {(detailedExplanation || (limitations && limitations.length > 0)) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
          >
            <span>{expanded ? 'Show Less' : 'Details'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-700 leading-relaxed font-normal">
        {summary}
      </p>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
          {detailedExplanation && (
            <div>
              <strong className="text-slate-800 font-semibold block mb-0.5">Assessment Rationale:</strong>
              <p className="leading-relaxed">{detailedExplanation}</p>
            </div>
          )}

          {limitations && limitations.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-md p-2.5 text-[11px] text-amber-900">
              <strong className="font-semibold block mb-0.5">Notice & Constraints:</strong>
              <ul className="list-disc list-inside space-y-0.5">
                {limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
