import {
  ExtractedContent,
  AnalysisResult,
  DarkPatternFinding,
  UserSettings,
  ScanDiagnosticsData,
  DetectorDiagnostic,
  BackendDiagnostic
} from './types';
import { runAllRulesWithDiagnostics } from './rules';
import { validateEvidence } from './evidence-validator';
import { calculateRiskScore } from './risk-scorer';
import { getCachedAnalysis, setCachedAnalysis } from './cache';

export interface AnalyzerOptions {
  settings: UserSettings;
  onStageUpdate?: (stage: string, progress: number) => void;
  scanId?: string;
  initiatedBy?: 'side_panel' | 'floating_panel' | 'popup' | 'auto_scan' | 'direct';
  contentScriptAvailable?: boolean;
  forceFresh?: boolean;
}

/**
 * Main analysis pipeline:
 * Cache Check -> Local Deterministic Rules -> Bounded AI Analysis -> Evidence Grounding Validation
 * -> Canonical Sorting & Deduplication -> Deterministic Risk Scoring -> Snapshot Cache Save
 */
export async function analyzeWebpageContent(
  content: ExtractedContent,
  options: AnalyzerOptions
): Promise<AnalysisResult> {
  const { settings, onStageUpdate } = options;
  const scanId = options.scanId || `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const initiatedBy = options.initiatedBy || 'side_panel';
  const contentScriptAvailable = options.contentScriptAvailable ?? true;
  const fingerprint = content.contentFingerprint || content.extractionCoverage?.contentFingerprint;

  // 0. Cache Check for Identical Snapshots (Repeatability & Gemini call minimization)
  if (fingerprint && !options.forceFresh) {
    const cached = await getCachedAnalysis(content.url, fingerprint, settings, options.forceFresh);
    if (cached) {
      console.log(`[ClearChoice AI Trace] Returning identical cached analysis for ${content.url} [fingerprint: ${fingerprint}]`);
      onStageUpdate?.('Deterministic cached analysis restored for unchanged snapshot', 100);
      return {
        ...cached,
        scanId // Assign current scan ID
      };
    }
  }

  console.log(`[ClearChoice AI Trace] Starting Scan Analysis [${scanId}] on "${content.domain}" (${content.url})`);
  console.log(`[ClearChoice AI Trace] Extracted content: ${content.visibleTexts.length} texts, ${content.prices.length} prices, ${content.discounts.length} discounts, ${content.timers.length} timers`);

  onStageUpdate?.('Scanning DOM and detecting candidate patterns', 20);
  // 1. Run local deterministic rule-based checks
  let findings: DarkPatternFinding[] = [];
  let detectorDiagnostics: DetectorDiagnostic[] = [];

  if (settings.ruleBased) {
    const rulesResult = runAllRulesWithDiagnostics(content);
    findings = rulesResult.findings;
    detectorDiagnostics = rulesResult.detectorDiagnostics;
  }

  onStageUpdate?.('Collecting structured evidence and verifying observations', 45);
  let aiAvailable = false;
  let analysisMode: 'rule' | 'ai' | 'combined' = 'rule';

  // Set of known valid evidence IDs collected from local deterministic rules
  const knownEvidenceIds = new Set<string>();
  for (const f of findings) {
    if (f.evidenceRecords) {
      for (const r of f.evidenceRecords) {
        knownEvidenceIds.add(r.id);
      }
    }
  }

  let backendDiag: BackendDiagnostic = {
    status: settings.aiAssisted ? 'partial_fallback' : 'disabled',
    endpoint: settings.apiEndpoint || 'http://localhost:3001/api/analyze',
    latencyMs: 0
  };

  // 2. Optional AI analysis if enabled
  if (settings.aiAssisted) {
    const startTime = Date.now();
    onStageUpdate?.('Consulting Gemini AI contextual engine', 65);
    const aiEndpoint = settings.apiEndpoint || 'http://localhost:3001/api/analyze';
    console.log(`[ClearChoice AI Trace] Calling AI backend at ${aiEndpoint}...`);

    // Bounded 15s timeout on client fetch (backend model cascade is bounded at 12s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const requestPayload = {
        pageTitle: content.title,
        pageUrl: content.url,
        extractedContent: {
          visibleTexts: content.visibleTexts.slice(0, 40),
          buttons: content.buttons.slice(0, 20),
          prices: content.prices.slice(0, 15),
          formControls: content.formControls.slice(0, 15)
        },
        observedSignals: findings.map(f => ({
          id: f.id,
          category: f.category,
          title: f.title,
          evidence: f.evidence,
          classification: f.classification
        }))
      };

      let fetchSucceeded = false;
      let aiData: any = null;
      let errText = '';
      let httpStatus = 200;

      // Use background service worker proxy if in Chrome extension context to avoid Mixed Content / PNA blocks
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        try {
          const bgResp: any = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve({ success: false, error: 'Background proxy timeout' }), 14000);
            chrome.runtime.sendMessage(
              { type: 'CALL_AI_BACKEND', endpoint: aiEndpoint, payload: requestPayload },
              (resp) => {
                clearTimeout(timer);
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  resolve(resp || { success: false });
                }
              }
            );
          });

          if (bgResp && bgResp.success && bgResp.ok) {
            fetchSucceeded = true;
            aiData = bgResp.data;
          } else if (bgResp && bgResp.success && !bgResp.ok) {
            httpStatus = bgResp.status || 500;
            errText = bgResp.errorText || 'Backend request rejected';
          }
        } catch {
          // Fall back to direct fetch below
        }
      }

      if (!fetchSucceeded && !errText) {
        // Direct fetch fallback for test environments or standalone web demo
        const res = await fetch(aiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        if (res.ok) {
          aiData = await res.json();
          fetchSucceeded = true;
        } else {
          httpStatus = res.status;
          errText = await res.text().catch(() => '');
        }
      }

      const latencyMs = Date.now() - startTime;

      if (fetchSucceeded) {
        if (aiData && aiData.aiAvailable && Array.isArray(aiData.findings)) {
          aiAvailable = true;
          analysisMode = settings.ruleBased ? 'combined' : 'ai';
          findings.push(...aiData.findings);

          for (const f of aiData.findings) {
            if (f.evidenceRecords) {
              for (const r of f.evidenceRecords) {
                knownEvidenceIds.add(r.id);
              }
            }
          }

          backendDiag = {
            status: 'connected',
            endpoint: aiEndpoint,
            latencyMs,
            model: aiData.model || 'gemini-3.5-flash-lite',
            responseCount: aiData.findings.length
          };
          console.log(`[ClearChoice AI Trace] AI Backend responded successfully in ${latencyMs}ms with ${aiData.findings.length} finding(s).`);
        } else {
          // Backend returned graceful rule fallback (e.g. Gemini quota exhausted or AI unconfigured)
          aiAvailable = false;
          analysisMode = 'rule';
          backendDiag = {
            status: 'partial_fallback',
            endpoint: aiEndpoint,
            latencyMs,
            error: aiData?.limitations?.[0] || aiData?.summary || 'AI quota reached or model unavailable. Operating on local rule checks.'
          };
          console.warn(`[ClearChoice AI Trace] AI Backend operating in partial fallback: ${backendDiag.error}`);
        }
      } else {
        console.warn(`[ClearChoice AI Trace] AI Backend returned HTTP ${httpStatus}: ${errText.slice(0, 150)}`);
        backendDiag = {
          status: 'error',
          endpoint: aiEndpoint,
          latencyMs,
          error: `HTTP ${httpStatus}: ${errText.slice(0, 80)}`
        };
      }
    } catch (aiErr: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = aiErr.name === 'AbortError';
      console.warn(`[ClearChoice AI Trace] AI Backend call failed (${isTimeout ? 'Timeout after 15s' : 'Network/Offline'}): ${aiErr.message}`);
      aiAvailable = false;
      analysisMode = 'rule';
      backendDiag = {
        status: isTimeout ? 'timeout' : 'error',
        endpoint: settings.apiEndpoint || 'http://localhost:3001/api/analyze',
        latencyMs,
        error: isTimeout ? 'Request timed out after 15s' : (aiErr.message || 'Service unavailable')
      };
    } finally {
      clearTimeout(timeoutId); // Guaranteed cleanup of timeout timer
    }
  }

  onStageUpdate?.('Validating evidence grounding and checking limitations', 80);
  // 3. Evidence validation (grounding check, unknown evidence ID rejection)
  const validation = validateEvidence(findings, content, knownEvidenceIds);
  const validatedFindings = validation.validatedFindings;

  console.log(`[ClearChoice AI Trace] Evidence Validation complete: ${validatedFindings.length} findings accepted, ${validation.rejectedFindings.length} rejected.`);
  if (validation.rejectedFindings.length > 0) {
    console.log('[ClearChoice AI Trace] Rejected ungrounded findings:', validation.rejectedFindings.map(r => `${r.finding.title} (${r.reason})`));
  }

  onStageUpdate?.('Calculating evidence-based risk score', 92);
  // 4. Calculate Risk Score with strictly deterministic canonical sorting and deduplication
  const scoreResult = calculateRiskScore(validatedFindings);

  console.log(`[ClearChoice AI Trace] Risk Score calculation: Score = ${scoreResult.score}/100 [${scoreResult.level}]`);
  console.log('[ClearChoice AI Trace] Major contributors:', scoreResult.majorContributors);

  // 5. Calculate breakdown counts across the 4 required classifications
  let verifiedCount = 0;
  let strongCount = 0;
  let potentialCount = 0;
  let insufficientCount = 0;

  for (const f of validatedFindings) {
    if (f.classification === 'verified_deceptive') verifiedCount++;
    else if (f.classification === 'strong_evidence') strongCount++;
    else if (f.classification === 'potential_dark_pattern') potentialCount++;
    else if (f.classification === 'insufficient_evidence') insufficientCount++;
  }

  const categoriesDetected = Array.from(new Set(validatedFindings.map(f => f.categoryName)));

  // 6. Determine Scan Status and build transparent summary
  const totalElements = content.visibleTexts.length + content.buttons.length + content.links.length + content.formControls.length + content.prices.length;
  const isInsufficient = totalElements === 0;
  let scanStatus: 'completed' | 'partial' | 'insufficient_evidence' = 'completed';

  if (isInsufficient) {
    scanStatus = 'insufficient_evidence';
  } else if (settings.aiAssisted && !aiAvailable) {
    scanStatus = 'partial';
  } else {
    scanStatus = 'completed';
  }

  let summary = '';
  if (isInsufficient) {
    summary = `Insufficient readable content extracted from this page (${content.visibleTexts.length} visible element${content.visibleTexts.length === 1 ? '' : 's'}). The page may be loading, behind a login barrier, or rendered inside an inaccessible canvas/iframe.`;
  } else if (validatedFindings.length === 0) {
    if (scanStatus === 'partial') {
      summary = 'No deceptive patterns detected by local deterministic rules. Note: contextual AI was unavailable for this scan.';
    } else {
      summary = 'No significant dark patterns were detected on this page. Interface elements appear standard.';
    }
  } else if (verifiedCount > 0) {
    summary = `Verified deceptive behavior detected (${verifiedCount} verified finding${verifiedCount > 1 ? 's' : ''}). Observable evidence confirms mathematical price discrepancies or asymmetric cancellation barriers.`;
  } else if (strongCount > 0) {
    summary = `Strong evidence of manipulative design detected across ${categoriesDetected.length} categories. Repeated patterns or broken checkout promises observed.`;
  } else if (scoreResult.score >= 40) {
    summary = `Multiple potential dark patterns detected. Review itemized checkout breakdowns and verify promotion terms before proceeding.`;
  } else {
    summary = `Informational or low-risk design patterns detected. Some interface choices may nudge behavior, but no severe traps were verified.`;
  }

  // 7. Practical consumer recommendations
  const recommendations: string[] = [];
  if (isInsufficient) {
    recommendations.push('Wait for the page to finish loading or log in, then click Rescan Page.');
    recommendations.push('If this site uses single-page application tabs, navigate directly to the product or checkout screen before scanning.');
  } else if (validatedFindings.length === 0) {
    recommendations.push('Continue normal browsing. As a general precaution, verify vendor legitimacy and review return policies before checkout.');
  } else {
    const recs = validatedFindings.map(f => f.recommendedAction);
    recommendations.push(...Array.from(new Set(recs)).slice(0, 5));
  }

  // Combine limitations with extraction coverage limitations
  const combinedLimitations = [...validation.limitations];
  if (content.extractionCoverage?.truncationReasons) {
    combinedLimitations.push(...content.extractionCoverage.truncationReasons);
  }
  combinedLimitations.push('Analyzed the current page DOM snapshot (including below-the-fold content). External checkout, terms, or account pages not visited in this tab were not scanned.');

  // 8. Compile Scan Diagnostics
  const diagnostics: ScanDiagnosticsData = {
    scanId,
    scanInitiation: {
      scanId,
      pageUrl: content.url,
      pageDomain: content.domain,
      timestamp: content.timestamp || Date.now(),
      initiatedBy,
      contentScriptAvailable
    },
    extractedStats: {
      totalDomElementsQueried: content.totalElementsQueried ?? (content.visibleTexts.length + content.buttons.length),
      visibleElementsExtracted: content.visibleTexts.length,
      totalCharactersExtracted: content.totalCharactersExtracted ?? content.visibleTexts.reduce((acc, t) => acc + t.text.length, 0),
      pricesCount: content.prices.length,
      discountsCount: content.discounts.length,
      timersCount: content.timers.length,
      buttonsCount: content.buttons.length,
      formControlsCount: content.formControls.length,
      modalsCount: content.modals.length
    },
    sampleExtracted: {
      prices: content.prices.slice(0, 8).map(p => ({ raw: p.raw, value: p.value, isCrossedOut: p.isCrossedOut })),
      discounts: content.discounts.slice(0, 6).map(d => ({ text: d.text, claimedPercent: d.claimedPercent, originalPrice: d.originalPrice, salePrice: d.salePrice })),
      timers: content.timers.slice(0, 6).map(t => ({ text: t.text })),
      texts: content.visibleTexts.slice(0, 10).map(t => t.text)
    },
    detectors: detectorDiagnostics,
    backend: backendDiag,
    normalizationAndScoring: {
      totalFindingsBeforeValidation: findings.length,
      validatedCount: validatedFindings.length,
      rejectedCount: validation.rejectedFindings.length,
      scoredFindingsCount: validatedFindings.filter(f => !f.dismissed && !f.falsePositive).length,
      formulaApplied: 'Fixed Severity Weights [critical:40, high:30, med:20, low:10, info:5] with canonical pre-sorting, DOM element deduplication, and diminishing returns decay (1.0, 0.75, 0.55, 0.35, 0.20).'
    },
    riskEvaluation: {
      baseScore: scoreResult.score,
      finalScore: scoreResult.score,
      level: scoreResult.level,
      activeFindingsCount: validatedFindings.filter(f => !f.dismissed && !f.falsePositive).length
    }
  };

  onStageUpdate?.('Analysis complete', 100);

  const finalResult: AnalysisResult = {
    scanId,
    scanStatus,
    stage: 'Analysis Complete',
    stageProgress: 100,
    analysisMode,
    pageUrl: content.url,
    pageDomain: content.domain,
    pageTitle: content.title,
    timestamp: Date.now(),
    riskScore: scoreResult.score,
    riskLevel: scoreResult.level,
    summary,
    detailedExplanation: scoreResult.majorContributors.length > 0
      ? `Main contributors: ${scoreResult.majorContributors.map(c => `${c.title} [${c.classification?.replace('_', ' ').toUpperCase() || 'POTENTIAL'}]`).join(', ')}.`
      : undefined,
    findings: validatedFindings,
    categoriesDetected,
    verifiedCount,
    strongCount,
    potentialCount,
    insufficientCount,
    recommendations,
    limitations: Array.from(new Set(combinedLimitations)),
    aiAvailable,
    diagnostics,
    isCached: false,
    extractionCoverage: content.extractionCoverage
  };

  // 9. Save to snapshot cache if analysis completed successfully
  if (fingerprint && (scanStatus === 'completed' || scanStatus === 'partial')) {
    setCachedAnalysis(content.url, fingerprint, settings, finalResult).catch(err => {
      console.warn('[ClearChoice AI Trace] Cache save error:', err);
    });
  }

  return finalResult;
}
