import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalysisResult,
  UserSettings,
  ScanHistoryItem,
  DarkPatternFinding
} from '../analysis/types';
import {
  getSettings,
  saveSettings,
  getHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
  DEFAULT_SETTINGS
} from '../services/storage';
import { extractPageContent } from './dom-extractor';
import { highlightElementOnPage, removeActiveHighlight } from './element-highlighter';
import { startMutationMonitoring, stopMutationMonitoring } from './mutation-monitor';
import { analyzeWebpageContent } from '../analysis/analyzer';
import { calculateRiskScore } from '../analysis/risk-scorer';

import { ReadyCard } from '../components/ReadyCard';
import { AnalyzingCard } from '../components/AnalyzingCard';
import { RiskSummaryCard } from '../components/RiskSummaryCard';
import { AnalysisSummary } from '../components/AnalysisSummary';
import { DetectedThreats } from '../components/DetectedThreats';
import { FindingCard } from '../components/FindingCard';
import { RecommendationList } from '../components/RecommendationList';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { SettingsModal } from '../settings/SettingsModal';
import { HistoryModal } from '../history/HistoryModal';
import { ReportModal } from '../components/ReportModal';
import { ScanDiagnostics } from '../components/ScanDiagnostics';

import {
  Shield,
  RefreshCw,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Minus,
  Maximize2,
  X,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Activity
} from 'lucide-react';

interface FloatingPanelProps {
  onClosePanel: () => void;
  pageUrl?: string;
}

const STORAGE_MINIMIZED_KEY = 'clearchoice_panel_minimized';

export const FloatingPanel: React.FC<FloatingPanelProps> = ({ onClosePanel, pageUrl }) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [status, setStatus] = useState<'ready' | 'analyzing' | 'completed' | 'partial' | 'error'>('ready');
  const [stage, setStage] = useState<string>('Extracting webpage content');
  const [stageProgress, setStageProgress] = useState<number>(10);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Load minimized preference
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_MINIMIZED_KEY], (res) => {
        if (res[STORAGE_MINIMIZED_KEY] !== undefined) {
          setIsMinimized(Boolean(res[STORAGE_MINIMIZED_KEY]));
        }
      });
    }
  }, []);

  const handleToggleMinimize = (newVal?: boolean) => {
    const nextVal = newVal !== undefined ? newVal : !isMinimized;
    setIsMinimized(nextVal);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_MINIMIZED_KEY]: nextVal });
    }
  };

  const runAnalysis = useCallback(async (currentSettings = settings) => {
    setStatus('analyzing');
    setStage('Extracting webpage content');
    setStageProgress(15);
    setErrorMessage('');
    setActiveCategoryFilter(null);
    setHighlightedElementId(null);
    removeActiveHighlight();

    try {
      // 1. Extract content directly from the live webpage DOM
      const content = extractPageContent();

      // 2. Run analysis pipeline
      const analysisResult = await analyzeWebpageContent(content, {
        settings: currentSettings,
        onStageUpdate: (stg, prog) => {
          setStage(stg);
          setStageProgress(prog);
        }
      });

      setResult(analysisResult);
      setStatus(analysisResult.scanStatus);

      // 3. Save to history if enabled
      if (currentSettings.historyEnabled) {
        const historyItem: ScanHistoryItem = {
          id: `scan-${Date.now()}`,
          domain: analysisResult.pageDomain,
          url: analysisResult.pageUrl,
          pageTitle: analysisResult.pageTitle,
          timestamp: analysisResult.timestamp,
          score: analysisResult.riskScore,
          riskLevel: analysisResult.riskLevel,
          findingsCount: analysisResult.findings.length,
          categoriesSummary: analysisResult.categoriesDetected
        };
        await addHistoryItem(historyItem);
        const updatedHistory = await getHistory();
        setHistory(updatedHistory);
      }

      // 4. Update badge
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            type: 'UPDATE_BADGE',
            score: analysisResult.riskScore,
            level: analysisResult.riskLevel
          });
        } catch {
          // ignore extension context disconnects
        }
      }
    } catch (err: any) {
      console.error('ClearChoice AI live scan error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to analyze page content.');
    }
  }, [settings]);

  // Initial auto-scan on mount & whenever pageUrl changes (e.g. SPA navigation)
  useEffect(() => {
    async function init() {
      const s = await getSettings();
      setSettings(s);
      const h = await getHistory();
      setHistory(h);

      // Auto-scan is enabled by default on normal pages
      if (s.autoScan) {
        runAnalysis(s);
      }
    }
    init();
  }, [pageUrl, runAnalysis]);

  // Monitor DOM mutations dynamically with debouncing
  useEffect(() => {
    if (settings.autoScan) {
      startMutationMonitoring(() => {
        setStatus(currentStatus => {
          if (currentStatus !== 'analyzing') {
            runAnalysis(settings);
          }
          return currentStatus;
        });
      });
    } else {
      stopMutationMonitoring();
    }

    return () => {
      stopMutationMonitoring();
    };
  }, [settings.autoScan, settings, runAnalysis]);

  // Handle on-page element highlighting
  const handleHighlight = (finding: DarkPatternFinding) => {
    if (!finding.elementId) return;

    if (highlightedElementId === finding.elementId) {
      removeActiveHighlight();
      setHighlightedElementId(null);
    } else {
      const resp = highlightElementOnPage(finding.elementId, finding.title, finding.categoryName);
      if (resp.success) {
        setHighlightedElementId(finding.elementId);
      } else {
        alert(resp.message || 'Element is no longer available on this page.');
        setHighlightedElementId(null);
      }
    }
  };

  // Handle dismiss finding
  const handleDismiss = (findingId: string) => {
    if (!result) return;
    const updatedFindings = result.findings.map(f => {
      if (f.id === findingId) return { ...f, dismissed: !f.dismissed };
      return f;
    });

    const newScore = calculateRiskScore(updatedFindings);
    const updatedResult: AnalysisResult = {
      ...result,
      findings: updatedFindings,
      riskScore: newScore.score,
      riskLevel: newScore.level
    };
    setResult(updatedResult);
  };

  // Handle mark as false positive
  const handleFalsePositive = (findingId: string) => {
    if (!result) return;
    const updatedFindings = result.findings.map(f => {
      if (f.id === findingId) return { ...f, falsePositive: !f.falsePositive };
      return f;
    });

    const newScore = calculateRiskScore(updatedFindings);
    const updatedResult: AnalysisResult = {
      ...result,
      findings: updatedFindings,
      riskScore: newScore.score,
      riskLevel: newScore.level
    };
    setResult(updatedResult);
  };

  const filteredFindings = result?.findings.filter(f => {
    if (activeCategoryFilter && f.category !== activeCategoryFilter) {
      return false;
    }
    return true;
  }) || [];

  // ==========================================
  // MINIMIZED FLOATING PILL VIEW
  // ==========================================
  if (isMinimized) {
    let pillBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let pillIcon = <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.2]" />;

    if (status === 'analyzing') {
      pillBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
      pillIcon = <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />;
    } else if (result) {
      if (result.riskLevel === 'VERY HIGH RISK') {
        pillBadgeColor = 'bg-red-50 text-red-700 border-red-200';
        pillIcon = <ShieldAlert className="w-4 h-4 text-red-600 stroke-[2.2]" />;
      } else if (result.riskLevel === 'HIGH RISK') {
        pillBadgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
        pillIcon = <ShieldAlert className="w-4 h-4 text-orange-600 stroke-[2.2]" />;
      } else if (result.riskLevel === 'MODERATE RISK') {
        pillBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
        pillIcon = <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.2]" />;
      }
    }

    return (
      <div
        className="fixed top-4 right-4 z-[2147483640] select-none font-sans antialiased animate-in fade-in slide-in-from-top-2 duration-200"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 p-1 pl-2.5 pr-1.5 flex items-center gap-2 transition-all hover:shadow-xl hover:scale-102">
          {/* Status pill trigger */}
          <button
            onClick={() => handleToggleMinimize(false)}
            className="flex items-center gap-2 cursor-pointer text-left py-0.5"
            title="Expand ClearChoice AI Panel"
          >
            <div className="flex items-center gap-1.5">
              {pillIcon}
              <span className="text-xs font-bold text-slate-800 tracking-tight">ClearChoice</span>
            </div>

            {status === 'analyzing' ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                Scanning...
              </span>
            ) : result ? (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${pillBadgeColor}`}>
                {result.riskScore}/100 {result.riskLevel.replace(' RISK', '')}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Ready
              </span>
            )}
          </button>

          {/* Quick Expand button */}
          <button
            onClick={() => handleToggleMinimize(false)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Expand Panel"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close button */}
          <button
            onClick={onClosePanel}
            className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Hide Floating Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // FULL FLOATING PANEL VIEW
  // ==========================================
  return (
    <div
      className="fixed top-4 right-4 z-[2147483640] w-[370px] max-h-[min(640px,calc(100vh-32px))] flex flex-col bg-slate-50 text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden font-sans antialiased selection:bg-blue-100 selection:text-blue-900 select-none animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* Floating Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Shield className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-xs tracking-tight text-slate-900 leading-none">
                CLEARCHOICE AI
              </h1>
              <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60 leading-none">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
              Dark Pattern Detection
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => runAnalysis()}
            disabled={status === 'analyzing'}
            title="Rescan current webpage"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'analyzing' ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            title="Scan history"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <HistoryIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleToggleMinimize(true)}
            title="Minimize to floating badge"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClosePanel}
            title="Hide panel (reopen via extension icon)"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Body */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {status === 'ready' && (
          <ReadyCard
            onAnalyze={() => runAnalysis()}
            pageTitle={document.title}
            domain={window.location.hostname}
          />
        )}

        {status === 'analyzing' && (
          <AnalyzingCard
            currentStage={stage}
            stageProgress={stageProgress}
          />
        )}

        {status === 'error' && (
          <ErrorState
            message={errorMessage}
            onRetry={() => runAnalysis()}
          />
        )}

        {(status === 'completed' || status === 'partial') && result && (
          <>
            {status === 'partial' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex items-center justify-between">
                <div>
                  <strong className="text-[11px]">PARTIAL ANALYSIS — AI UNAVAILABLE</strong>
                  <div className="text-[10px] text-amber-700">
                    Operating on deterministic local rule checks.
                  </div>
                </div>
              </div>
            )}

            {result.findings.length === 0 ? (
              <EmptyState
                onRescan={() => runAnalysis()}
                elementsInspected={result.diagnostics?.extractedStats.visibleElementsExtracted ?? 0}
              />
            ) : (
              <>
                <RiskSummaryCard
                  score={result.riskScore}
                  level={result.riskLevel}
                  findingsCount={result.findings.length}
                  categoriesCount={result.categoriesDetected.length}
                  verifiedCount={result.verifiedCount}
                  potentialCount={result.potentialCount + result.strongCount}
                  domain={result.pageDomain}
                  timestamp={result.timestamp}
                  analysisMode={result.analysisMode}
                  aiAvailable={result.aiAvailable}
                />

                {/* Scan Diagnostics Toggle Card */}
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>Scan Diagnostics & 6 Detectors Trace</span>
                  </div>
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                      showDiagnostics
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {showDiagnostics ? 'Hide Diagnostics' : 'View Diagnostics'}
                  </button>
                </div>

                {/* Expanded Scan Diagnostics View */}
                {showDiagnostics && (
                  <ScanDiagnostics
                    diagnostics={result.diagnostics}
                    onClose={() => setShowDiagnostics(false)}
                  />
                )}

                <AnalysisSummary
                  summary={result.summary}
                  detailedExplanation={result.detailedExplanation}
                  limitations={result.limitations}
                />

                <DetectedThreats
                  findings={result.findings}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectCategory={setActiveCategoryFilter}
                />

                {/* Finding Cards */}
                <div className="space-y-2">
                  {filteredFindings.map(f => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      onHighlight={handleHighlight}
                      onDismiss={handleDismiss}
                      onFalsePositive={handleFalsePositive}
                      isHighlighted={highlightedElementId === f.elementId}
                    />
                  ))}
                </div>

                <RecommendationList recommendations={result.recommendations} />

                {/* Bottom Actions */}
                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Evidence Report</span>
                  </button>

                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Toggle Scan Diagnostics"
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>Diagnostics</span>
                  </button>

                  <button
                    onClick={() => runAnalysis()}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rescan</span>
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Modals embedded directly in panel container */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={async (newSettings) => {
            await saveSettings(newSettings);
            setSettings(newSettings);
          }}
          onClose={() => setIsSettingsOpen(false)}
          onClearHistory={async () => {
            await clearAllHistory();
            setHistory([]);
          }}
        />
      )}

      {isHistoryOpen && (
        <HistoryModal
          history={history}
          onClose={() => setIsHistoryOpen(false)}
          onDeleteItem={async (id) => {
            await deleteHistoryItem(id);
            const updated = await getHistory();
            setHistory(updated);
          }}
          onClearAll={async () => {
            await clearAllHistory();
            setHistory([]);
          }}
        />
      )}

      {isReportOpen && result && (
        <ReportModal
          result={result}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
};
