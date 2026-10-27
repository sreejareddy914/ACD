import React from 'react';
import { Shield, Settings, RefreshCw, History } from 'lucide-react';

interface HeaderProps {
  onRescan: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRescan,
  onOpenSettings,
  onOpenHistory,
  isScanning
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#10172A] border-b border-slate-800/80 px-4 py-3 flex items-center justify-between text-white shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#22D3EE] flex items-center justify-center text-white shadow-md">
          <Shield className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-sm tracking-tight text-white leading-none">
              CLEARCHOICE AI
            </h1>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 leading-none">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
            Evidence-Driven Security & Dark Pattern Defense
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onRescan}
          disabled={isScanning}
          title="Rescan current page"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        <button
          onClick={onOpenHistory}
          title="Scan history"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
