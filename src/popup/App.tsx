import React, { useState } from 'react';
import { SidePanel } from '../sidepanel/SidePanel';
import { getActiveTab } from '../services/messaging';
import { LayoutGrid, Check } from 'lucide-react';

export const App: React.FC = () => {
  const [toggledFeedback, setToggledFeedback] = useState(false);

  const handleToggleOnPage = async () => {
    const tab = await getActiveTab();
    if (tab && tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL' });
        setToggledFeedback(true);
        setTimeout(() => setToggledFeedback(false), 1500);
      } catch {
        // Tab might need page refresh
      }
    }
  };

  return (
    <div className="w-[380px] h-[590px] max-h-[600px] overflow-hidden flex flex-col bg-slate-50 font-sans">
      {/* Top utility quick bar */}
      <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-medium shadow-xs">
        <span className="text-slate-300">Toolbar Popup View</span>
        <button
          onClick={handleToggleOnPage}
          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          title="Toggle on-page top-right floating panel"
        >
          {toggledFeedback ? <Check className="w-3 h-3 text-emerald-300" /> : <LayoutGrid className="w-3 h-3" />}
          <span>{toggledFeedback ? 'Toggled!' : 'Toggle On-Page Panel'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <SidePanel />
      </div>
    </div>
  );
};
