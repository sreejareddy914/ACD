import React from 'react';
import { ScanHistoryItem } from '../analysis/types';
import { X, History, Trash2, ExternalLink } from 'lucide-react';

interface HistoryModalProps {
  history: ScanHistoryItem[];
  onClose: () => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  onClose,
  onDeleteItem,
  onClearAll
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Recent Scans</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* History List */}
        <div className="p-4 overflow-y-auto space-y-2.5 text-xs flex-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No past scans recorded.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Scans will appear here as you analyze pages.</p>
            </div>
          ) : (
            history.map(item => {
              const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (item.riskLevel === 'MODERATE RISK') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
              else if (item.riskLevel === 'HIGH RISK') badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
              else if (item.riskLevel === 'VERY HIGH RISK') badgeColor = 'bg-red-50 text-red-700 border-red-200';

              return (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 truncate max-w-[160px] text-xs">
                        {item.domain}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${badgeColor}`}>
                        {item.score}/100
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate">
                      {item.pageTitle}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{item.findingsCount} findings</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Delete record"
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/80">
            <span className="text-[11px] text-slate-500">{history.length} records</span>
            <button
              onClick={() => {
                if (window.confirm('Delete all scan records?')) {
                  onClearAll();
                }
              }}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
