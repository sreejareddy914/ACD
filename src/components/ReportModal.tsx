import React, { useState } from 'react';
import { AnalysisResult } from '../analysis/types';
import { generateTextReport, copyReportToClipboard, downloadJsonReport, downloadTextReport } from '../services/report-export';
import { X, Copy, Download, Check, FileText } from 'lucide-react';

interface ReportModalProps {
  result: AnalysisResult;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false);
  const textReport = generateTextReport(result);

  const handleCopy = async () => {
    const success = await copyReportToClipboard(result);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJson = () => {
    downloadJsonReport(result);
  };

  const handleDownloadText = () => {
    downloadTextReport(result);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm tracking-tight">ClearChoice AI Evidence Audit Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report Content */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed text-slate-800 bg-slate-50 whitespace-pre-wrap select-all border-b border-slate-200">
          {textReport}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-2 bg-white flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleDownloadText}
              className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export TXT</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className={`px-3.5 py-1.5 font-semibold text-white rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              copied ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
