import React, { useState } from 'react';
import { UserSettings } from '../analysis/types';
import { X, Shield, Lock, Trash2, Check } from 'lucide-react';

interface SettingsModalProps {
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onClose: () => void;
  onClearHistory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
  onClearHistory
}) => {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleToggle = (key: keyof UserSettings) => {
    setCurrent(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
  };

  const handleSave = () => {
    onSave(current);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Extension Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Scanning preferences */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              SCANNING ENGINES
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Rule-Based Detection</div>
                  <div className="text-[11px] text-slate-500">Local deterministic checks (Instant & offline)</div>
                </div>
                <input
                  type="checkbox"
                  checked={current.ruleBased}
                  onChange={() => handleToggle('ruleBased')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">AI-Assisted Analysis</div>
                  <div className="text-[11px] text-slate-500">Contextual pattern evaluation (Local backend)</div>
                </div>
                <input
                  type="checkbox"
                  checked={current.aiAssisted}
                  onChange={() => handleToggle('aiAssisted')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Automatic Page Scanning</div>
                  <div className="text-[11px] text-slate-500">Automatically inspect supported pages on load</div>
                </div>
                <input
                  type="checkbox"
                  checked={current.autoScan}
                  onChange={() => handleToggle('autoScan')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Interface preferences */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              INTERFACE & PRIVACY
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Element Highlighting</div>
                  <div className="text-[11px] text-slate-500">Highlight deceptive elements on active webpage</div>
                </div>
                <input
                  type="checkbox"
                  checked={current.highlightingEnabled}
                  onChange={() => handleToggle('highlightingEnabled')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-800">Save Local Scan History</div>
                  <div className="text-[11px] text-slate-500">Store domain and scores locally on this device</div>
                </div>
                <input
                  type="checkbox"
                  checked={current.historyEnabled}
                  onChange={() => handleToggle('historyEnabled')}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* AI Backend URL */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              AI BACKEND ENDPOINT
            </div>
            <input
              type="text"
              value={current.apiEndpoint}
              onChange={e => setCurrent({ ...current, apiEndpoint: e.target.value })}
              placeholder="http://localhost:3001/api/analyze"
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Clear history */}
          <div className="pt-1">
            <button
              onClick={() => {
                if (window.confirm('Clear all local scan history?')) {
                  onClearHistory();
                }
              }}
              className="w-full py-2 px-3 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Scan History</span>
            </button>
          </div>

          {/* Privacy disclosure */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              Privacy & Data Policy
            </div>
            <p>
              ClearChoice AI never reads or collects passwords, payment cards, CVVs, tokens, or personal identifiers. Text analysis runs locally or via your configured private backend.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedFeedback ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
