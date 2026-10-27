import React, { useState } from 'react';
import { SCENARIOS, Scenario } from './scenarios';
import { SidePanel } from '../src/sidepanel/SidePanel';
import { Shield, Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const DemoApp: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Left Sidebar: Scenario Selector */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">ClearChoice AI</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">Dark Pattern Testbed & Scenarios</p>
        </div>

        <div className="p-2 border-b border-slate-100 bg-slate-50/40 text-[11px] text-slate-500 font-medium px-4">
          Select any of the 20 test cases to render its DOM:
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {SCENARIOS.map(s => {
            const isSelected = selectedScenario.id === s.id;
            let badgeClass = 'bg-red-50 text-red-700 border-red-200';
            if (s.type === 'legitimate') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            else if (s.type === 'clean') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';

            return (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {s.title}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border shrink-0 ${badgeClass}`}>
                    {s.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {s.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Live Rendered Page */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
              Scenario #{selectedScenario.id}
            </span>
            <h2 className="text-sm font-bold text-slate-900">{selectedScenario.title}</h2>
          </div>

          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-blue-300" />
            <span>{panelOpen ? 'Hide Extension Panel' : 'Open Extension Panel'}</span>
          </button>
        </header>

        {/* Viewport where scenario HTML is rendered */}
        <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center">
          <div className="w-full max-w-xl space-y-4">
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 shadow-2xs flex items-center justify-between">
              <span className="font-semibold text-slate-800">Target URL: <code className="font-mono text-blue-600">https://demo.clearchoice.ai/{selectedScenario.slug}</code></span>
              <span className="text-[10px] text-slate-400">Live Rendered DOM</span>
            </div>

            {/* Injected HTML */}
            <div
              id="scenario-content-root"
              dangerouslySetInnerHTML={{ __html: selectedScenario.renderHtml }}
            />
          </div>
        </div>
      </div>

      {/* Right Drawer: Live ClearChoice AI Extension Panel */}
      {panelOpen && (
        <aside className="w-[380px] h-full border-l border-slate-200 bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-200 z-20">
          <SidePanel />
        </aside>
      )}
    </div>
  );
};
