import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-5 shadow-xs text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
        <AlertOctagon className="w-6 h-6 stroke-[2.2]" />
      </div>

      <div className="inline-block px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider border border-red-200">
        SCAN ERROR
      </div>

      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
        Unable to Complete Page Scan
      </h3>

      <p className="text-xs text-slate-600 max-w-[280px] mx-auto leading-relaxed">
        {message || 'An unexpected error occurred while analyzing webpage content.'}
      </p>

      <button
        onClick={onRetry}
        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Again</span>
      </button>
    </div>
  );
};
