import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface RecommendationListProps {
  recommendations: string[];
}

export const RecommendationList: React.FC<RecommendationListProps> = ({ recommendations }) => {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        RECOMMENDED ACTIONS
      </h3>

      <div className="space-y-2">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.2]" />
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
