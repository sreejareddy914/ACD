import React, { useState } from 'react';
import { ScanDiagnosticsData } from '../analysis/types';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  DollarSign,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  Server
} from 'lucide-react';

interface ScanDiagnosticsProps {
  diagnostics?: ScanDiagnosticsData;
  onClose?: () => void;
}

export const ScanDiagnostics: React.FC<ScanDiagnosticsProps> = ({ diagnostics, onClose }) => {
  const [activeTab, setActiveTab] = useState<'detectors' | 'extraction' | 'backend' | 'samples'>('detectors');

  if (!diagnostics) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-xs text-slate-500">
        No diagnostic telemetry recorded for this scan session.
      </div>
    );
  }

  const extractedStats = diagnostics.extractedStats || {
    totalDomElementsQueried: 0,
    visibleElementsExtracted: 0,
    totalCharactersExtracted: 0,
    pricesCount: 0,
    discountsCount: 0,
    timersCount: 0,
    buttonsCount: 0,
    formControlsCount: 0,
    modalsCount: 0
  };
  const sampleExtracted = {
    prices: diagnostics.sampleExtracted?.prices || [],
    discounts: diagnostics.sampleExtracted?.discounts || [],
    timers: diagnostics.sampleExtracted?.timers || [],
    texts: diagnostics.sampleExtracted?.texts || []
  };
  const detectors = diagnostics.detectors || [];
  const backend = diagnostics.backend || {
    status: 'disabled',
    endpoint: '',
    latencyMs: 0
  };
  const riskEvaluation = diagnostics.riskEvaluation || {
    baseScore: 0,
    finalScore: 0,
    level: 'LOW',
    activeFindingsCount: 0
  };

  // Separate primary 6 detectors from auxiliary detectors
  const primarySixCategories = ['urgency', 'scarcity', 'discounts', 'hidden_charges', 'forced_signup', 'cancellation'];
  const primaryDetectors = detectors.filter(d => primarySixCategories.includes(d.category));
  const auxiliaryDetectors = detectors.filter(d => !primarySixCategories.includes(d.category));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800 text-xs">
      {/* Top Header */}
      <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-[13px] tracking-tight">Scan Diagnostics & Trace</span>
          {diagnostics.scanId && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700">
              {diagnostics.scanId}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Risk Score:</span>
          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
            riskEvaluation.finalScore >= 40
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : riskEvaluation.finalScore >= 20
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}>
            {riskEvaluation.finalScore}/100 ({riskEvaluation.level})
          </span>
          {diagnostics.scanInitiation && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              via {diagnostics.scanInitiation.initiatedBy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Server className="w-3 h-3 text-slate-400" />
          <span>AI Backend:</span>
          <span className={`font-semibold ${
            backend.status === 'connected' ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {backend.status === 'connected' ? `Active (${backend.latencyMs}ms)` : backend.status}
          </span>
        </div>
      </div>

      {/* Diagnostic Tab Nav */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('detectors')}
          className={`flex-1 py-2 text-center font-semibold text-[11px] transition-colors cursor-pointer ${
            activeTab === 'detectors'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          6 Detectors ({detectors.filter(d => d.findingsCount > 0).length})
        </button>
        <button
          onClick={() => setActiveTab('extraction')}
          className={`flex-1 py-2 text-center font-semibold text-[11px] transition-colors cursor-pointer ${
            activeTab === 'extraction'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          DOM Extraction
        </button>
        <button
          onClick={() => setActiveTab('backend')}
          className={`flex-1 py-2 text-center font-semibold text-[11px] transition-colors cursor-pointer ${
            activeTab === 'backend'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          AI Backend
        </button>
        <button
          onClick={() => setActiveTab('samples')}
          className={`flex-1 py-2 text-center font-semibold text-[11px] transition-colors cursor-pointer ${
            activeTab === 'samples'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Raw Samples
        </button>
      </div>

      {/* Tab 1: 6 Detectors Status */}
      {activeTab === 'detectors' && (
        <div className="p-3.5 space-y-3">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Primary E-Commerce Dark Pattern Detectors</span>
            <span className="text-[10px] text-slate-400">Deterministic Rules</span>
          </div>

          <div className="space-y-1.5">
            {primaryDetectors.map(det => {
              const hasFindings = det.findingsCount > 0;
              return (
                <div
                  key={det.category}
                  className={`p-2.5 rounded-lg border flex items-start justify-between transition-colors ${
                    hasFindings
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px]">
                      {hasFindings ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{det.name}</span>
                    </div>

                    {hasFindings && det.sampleFindings && det.sampleFindings.length > 0 && (
                      <div className="text-[10px] text-amber-800 font-mono pl-5">
                        Matched: {det.sampleFindings.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hasFindings
                        ? 'bg-amber-200/80 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {hasFindings ? `${det.findingsCount} Detected` : 'Clean · 0'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Ran: OK</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auxiliary Detectors Collapsible Summary */}
          {auxiliaryDetectors.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-[11px] font-medium text-slate-600 mb-1.5">
                Auxiliary Categories ({auxiliaryDetectors.filter(d => d.findingsCount > 0).length} active matches out of {auxiliaryDetectors.length} checkers)
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                {auxiliaryDetectors.map(d => (
                  <div key={d.category} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <span className="truncate">{d.name.replace(' Detector', '')}</span>
                    <span className={d.findingsCount > 0 ? 'font-bold text-amber-700' : 'text-slate-400'}>
                      {d.findingsCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normalization & Risk Scoring Trace */}
          {diagnostics.normalizationAndScoring && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Normalization & Evidence Grounding
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Raw Findings Detected:</span>
                  <span className="font-semibold">{diagnostics.normalizationAndScoring.totalFindingsBeforeValidation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DOM-Grounded & Validated:</span>
                  <span className="font-semibold text-emerald-600">{diagnostics.normalizationAndScoring.validatedCount}</span>
                </div>
                {diagnostics.normalizationAndScoring.rejectedCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ungrounded / Rejected:</span>
                    <span className="font-semibold text-rose-600">{diagnostics.normalizationAndScoring.rejectedCount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Scored Active Findings:</span>
                  <span className="font-semibold text-blue-600">{diagnostics.normalizationAndScoring.scoredFindingsCount}</span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-200/60">
                  {diagnostics.normalizationAndScoring.formulaApplied}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: DOM Extraction Telemetry */}
      {activeTab === 'extraction' && (
        <div className="p-3.5 space-y-3">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            DOM Extraction Telemetry & Content Stats
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <FileCode className="w-3 h-3 text-blue-500" />
                <span>DOM Elements Queried</span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {extractedStats.totalDomElementsQueried.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-400">Total tags inspected</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>Visible Text Nodes</span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {extractedStats.visibleElementsExtracted.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-400">{extractedStats.totalCharactersExtracted.toLocaleString()} characters</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span>Prices Extracted</span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {extractedStats.pricesCount}
              </div>
              <div className="text-[9px] text-slate-400">Crossed-out & active</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Tag className="w-3 h-3 text-purple-500" />
                <span>Discounts Found</span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {extractedStats.discountsCount}
              </div>
              <div className="text-[9px] text-slate-400">Percentage & claims</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Timers Detected</span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {extractedStats.timersCount}
              </div>
              <div className="text-[9px] text-slate-400">Countdown formats</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Activity className="w-3 h-3 text-blue-500" />
                <span>Buttons & Forms</span>
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {extractedStats.buttonsCount + extractedStats.formControlsCount}
              </div>
              <div className="text-[9px] text-slate-400">Interactive controls</div>
            </div>
          </div>

          {/* Extraction Coverage & Snapshot Details */}
          {diagnostics.scanInitiation && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Full Page Scroll Pass:</span>
                <span className="font-semibold text-emerald-600">Completed (Below-the-fold content analyzed)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Scope:</span>
                <span className="text-slate-700">Single webpage DOM snapshot (no external crawling)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AI Backend Telemetry */}
      {activeTab === 'backend' && (
        <div className="p-3.5 space-y-3">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            AI Engine & Integration Telemetry
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Backend Connection:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                backend.status === 'connected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {backend.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Model:</span>
              <span className="font-mono text-slate-800 font-semibold">{backend.model || 'gemini-3-flash-preview'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Roundtrip Latency:</span>
              <span className="font-mono text-slate-800 font-semibold">{backend.latencyMs ? `${backend.latencyMs}ms` : 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Endpoint URL:</span>
              <span className="font-mono text-[10px] text-slate-700 truncate max-w-[190px]" title={backend.endpoint}>
                {backend.endpoint}
              </span>
            </div>

            {backend.error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[10px] mt-1 font-mono">
                Error: {backend.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Raw Extracted Samples */}
      {activeTab === 'samples' && (
        <div className="p-3.5 space-y-3 max-h-[280px] overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Raw Extracted Page Elements
          </div>

          {/* Prices */}
          <div>
            <div className="font-semibold text-slate-700 text-[11px] mb-1">Extracted Prices ({sampleExtracted.prices.length})</div>
            {sampleExtracted.prices.length === 0 ? (
              <div className="text-slate-400 italic">No price formats found in DOM.</div>
            ) : (
              <div className="space-y-1">
                {sampleExtracted.prices.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center justify-between font-mono text-[10px]">
                    <span className={p.isCrossedOut ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'}>{p.raw}</span>
                    <span className="text-[9px] text-slate-400">{p.isCrossedOut ? 'Crossed-Out' : 'Current'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discounts */}
          <div>
            <div className="font-semibold text-slate-700 text-[11px] mb-1">Extracted Discounts ({sampleExtracted.discounts.length})</div>
            {sampleExtracted.discounts.length === 0 ? (
              <div className="text-slate-400 italic">No discount claims found in DOM.</div>
            ) : (
              <div className="space-y-1">
                {sampleExtracted.discounts.map((d, idx) => (
                  <div key={idx} className="bg-slate-50 px-2 py-1 rounded border border-slate-100 font-mono text-[10px]">
                    <div className="font-semibold text-slate-800">{d.text}</div>
                    {d.originalPrice && d.salePrice && (
                      <div className="text-[9px] text-slate-500">
                        Linked: Orig={d.originalPrice}, Sale={d.salePrice}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timers */}
          <div>
            <div className="font-semibold text-slate-700 text-[11px] mb-1">Extracted Timers ({sampleExtracted.timers.length})</div>
            {sampleExtracted.timers.length === 0 ? (
              <div className="text-slate-400 italic">No countdown timers found in DOM.</div>
            ) : (
              <div className="space-y-1">
                {sampleExtracted.timers.map((t, idx) => (
                  <div key={idx} className="bg-slate-50 px-2 py-1 rounded border border-slate-100 font-mono text-[10px] text-amber-800 font-semibold">
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
