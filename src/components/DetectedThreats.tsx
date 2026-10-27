import React from 'react';
import { DarkPatternFinding } from '../analysis/types';

interface DetectedThreatsProps {
  findings: DarkPatternFinding[];
  activeCategoryFilter: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const DetectedThreats: React.FC<DetectedThreatsProps> = ({
  findings,
  activeCategoryFilter,
  onSelectCategory
}) => {
  if (findings.length === 0) return null;

  // Group count by category
  const categoryCounts = findings.reduce<Record<string, { name: string; count: number; category: string }>>((acc, f) => {
    if (!acc[f.category]) {
      acc[f.category] = { name: f.categoryName, count: 0, category: f.category };
    }
    acc[f.category].count++;
    return acc;
  }, {});

  const categories = Object.values(categoryCounts);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          DETECTED DARK PATTERNS
        </h3>
        {activeCategoryFilter && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            Show All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => {
          const isSelected = activeCategoryFilter === cat.category;
          return (
            <button
              key={cat.category}
              onClick={() => onSelectCategory(isSelected ? null : cat.category)}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
