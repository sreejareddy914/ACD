import React, { useState, useEffect, useCallback } from 'react';
import { AnalysisResult, UserSettings, ScanHistoryItem, DarkPatternFinding } from '../analysis/types';
import { getSettings, saveSettings, getHistory, addHistoryItem, deleteHistoryItem, clearAllHistory, DEFAULT_SETTINGS } from '../services/storage';
import { extractContentFromActiveTab, triggerHighlight, triggerRemoveHighlight, getActiveTab } from '../services/messaging';
import { analyzeWebpageContent } from '../analysis/analyzer';
import { calculateRiskScore } from '../analysis/risk-scorer';

import { Header } from '../components/Header';
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
import { FileText, RefreshCw, Activity } from 'lucide-react';

export const SidePanel: React.FC = () => {
  const [status, setStatus] = useState<'ready' | 'analyzing' | 'completed' | 'partial' | 'error'>('ready');
  const [stage, setStage] = useState<string>('Extracting webpage content');
  const [stageProgress, setStageProgress] = useState<number>(10);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [activeTabInfo, setActiveTabInfo] = useState<{ title?: string; domain?: string }>({});

  // Load initial settings and active tab
  useEffect(() => {
    async function init() {
      const s = await getSettings();
      setSettings(s);
      const h = await getHistory();
      setHistory(h);

      const tab = await getActiveTab();
      if (tab) {
        try {
          const u = new URL(tab.url || 'http://localhost');
          setActiveTabInfo({ title: tab.title, domain: u.hostname });
        } catch {
          setActiveTabInfo({ title: tab.title, domain: tab.url });
        }
      }

      // If auto-scan is enabled, start analysis automatically
      if (s.autoScan) {
        runAnalysis(s);
      }
    }
    init();
  }, []);

  const runAnalysis = useCallback(async (currentSettings = settings, forceFresh = false) => {
    setStatus('analyzing');
    setStage('Extracting webpage content');
    setStageProgress(15);
    setErrorMessage('');
    setActiveCategoryFilter(null);
    setHighlightedElementId(null);
    triggerRemoveHighlight();

    try {
      // 1. Extract content (using full-page bounded scroll-and-collect)
      const content = await extractContentFromActiveTab();

      // 2. Analyze with deterministic caching & aligned timeouts
      const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const analysisResult = await analyzeWebpageContent(content, {
        settings: currentSettings,
        scanId,
        initiatedBy: 'side_panel',
        contentScriptAvailable: true,
        forceFresh,
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
          id: scanId,
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
        chrome.runtime.sendMessage({
          type: 'UPDATE_BADGE',
          score: analysisResult.riskScore,
          level: analysisResult.riskLevel
        });
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to analyze page content.');
    }
  }, [settings]);

  // Handle highlighting
  const handleHighlight = async (finding: DarkPatternFinding) => {
    if (!finding.elementId) return;

    if (highlightedElementId === finding.elementId) {
      await triggerRemoveHighlight();
      setHighlightedElementId(null);
    } else {
      const resp = await triggerHighlight(finding.elementId, finding.title, finding.categoryName);
      if (resp.success) {
        setHighlightedElementId(finding.elementId);
      } else {
        alert(resp.message || 'Element is no longer available on the page.');
        setHighlightedElementId(null);
      }
    }
  };

  // Handle dismissing a finding
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

  // Handle false positive report
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

  // Filter findings based on active category badge
  const filteredFindings = result?.findings.filter(f => {
    if (activeCategoryFilter && f.category !== activeCategoryFilter) {
      return false;
    }
    return true;
  }) || [];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 select-none">
      <Header
        onRescan={() => runAnalysis(settings, true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isScanning={status === 'analyzing'}
      />

      <main className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {status === 'ready' && (
          <ReadyCard
            onAnalyze={() => runAnalysis()}
            pageTitle={activeTabInfo.title}
            domain={activeTabInfo.domain}
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
            onRetry={() => runAnalysis(settings, true)}
          />
        )}

        {(status === 'completed' || status === 'partial' || status === 'insufficient_evidence') && result && (
          <>
            {/* If result is from cached snapshot */}
            {result.isCached && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-semibold text-[11px]">DETERMINISTIC CACHE • UNCHANGED SNAPSHOT</span>
                </div>
                <button
                  onClick={() => runAnalysis(settings, true)}
                  className="text-[10px] text-blue-700 underline font-semibold hover:text-blue-900 cursor-pointer"
                >
                  Force Fresh Scan
                </button>
              </div>
            )}

            {/* If AI failed but local rules ran, show Partial notice banner */}
            {status === 'partial' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-center justify-between">
                <div>
                  <strong>PARTIAL ANALYSIS — AI UNAVAILABLE</strong>
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    Operating on deterministic local rule checks.
                  </div>
                </div>
              </div>
            )}

            {result.findings.length === 0 ? (
              <EmptyState
                onRescan={() => runAnalysis(settings, true)}
                elementsInspected={result.diagnostics?.extractedStats.visibleElementsExtracted ?? 0}
                scanStatus={result.scanStatus}
                aiAvailable={result.aiAvailable}
                scanId={result.scanId}
                limitations={result.limitations}
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

                {/* Individual Finding Cards */}
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

                {/* Bottom Report & Rescan Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Evidence Report</span>
                  </button>

                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Toggle Scan Diagnostics"
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>Diagnostics</span>
                  </button>

                  <button
                    onClick={() => runAnalysis(settings, true)}
                    className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
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

      {/* Modals */}
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
