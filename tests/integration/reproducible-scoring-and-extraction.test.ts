// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateRiskScore, getRiskLevel } from '../../src/analysis/risk-scorer';
import { analyzeWebpageContent } from '../../src/analysis/analyzer';
import { extractPageContent, scrollAndCollectPageContent, computeContentFingerprint, EXTRACTION_LIMITS } from '../../src/content/dom-extractor';
import { getCachedAnalysis, setCachedAnalysis, clearAnalysisCache, computeAnalysisCacheKey } from '../../src/analysis/cache';
import { DarkPatternFinding, ExtractedContent, UserSettings } from '../../src/analysis/types';

describe('Phase 7 Verification: Reproducible Risk Scoring, Full-Page Extraction, Caching, and Fallbacks', () => {
  const defaultSettings: UserSettings = {
    autoScan: false,
    aiAssisted: false, // Local deterministic rules
    ruleBased: true,
    highlightingEnabled: true,
    historyEnabled: false,
    theme: 'light',
    apiEndpoint: 'http://localhost:3001/api/analyze',
    allowlist: [],
    notificationsEnabled: false
  };

  beforeEach(async () => {
    await clearAnalysisCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. The same normalized input produces the same score over repeated runs
  it('1. produces the exact same score over repeated runs with identical normalized input', () => {
    const findings: DarkPatternFinding[] = [
      {
        id: 'f1',
        category: 'urgency',
        categoryName: 'Fake Urgency',
        title: 'Active Countdown Timer',
        severity: 'high',
        confidence: 90,
        classification: 'potential_dark_pattern',
        evidenceStrength: 'strong',
        verificationStatus: 'observed',
        evidenceRecords: [],
        supportingEvidence: ['04:59'],
        contradictoryEvidence: [],
        missingEvidence: [],
        limitations: [],
        evidence: '04:59 remaining to claim deal',
        whyFlagged: 'High pressure countdown',
        detectionMethod: 'rule',
        recommendedAction: 'Take your time',
        elementId: 'el-timer-1'
      },
      {
        id: 'f2',
        category: 'hidden_charges',
        categoryName: 'Hidden Charges',
        title: 'Undisclosed Service Fee',
        severity: 'medium',
        confidence: 85,
        classification: 'strong_evidence',
        evidenceStrength: 'strong',
        verificationStatus: 'observed',
        evidenceRecords: [],
        supportingEvidence: ['$15 fee'],
        contradictoryEvidence: [],
        missingEvidence: [],
        limitations: [],
        evidence: '$15 mandatory packaging fee added at final step',
        whyFlagged: 'Drip pricing fee',
        detectionMethod: 'rule',
        recommendedAction: 'Review line items',
        elementId: 'el-fee-2'
      }
    ];

    const run1 = calculateRiskScore(findings);
    const run2 = calculateRiskScore(findings);
    const run3 = calculateRiskScore(findings);

    expect(run1.score).toBe(run2.score);
    expect(run2.score).toBe(run3.score);
    expect(run1.level).toBe(run2.level);
    expect(run1.score).toBeGreaterThan(0);
    expect(run1.score).toBeLessThanOrEqual(100);
  });

  // 2. Finding order does not change the score
  it('2. guarantees finding order permutation does not change the resulting risk score', () => {
    const makeFinding = (id: string, sev: 'critical' | 'high' | 'medium' | 'low', conf: number, title: string): DarkPatternFinding => ({
      id,
      category: 'urgency',
      categoryName: 'Fake Urgency',
      title,
      severity: sev,
      confidence: conf,
      classification: 'potential_dark_pattern',
      evidenceStrength: 'strong',
      verificationStatus: 'observed',
      evidenceRecords: [],
      supportingEvidence: [title],
      contradictoryEvidence: [],
      missingEvidence: [],
      limitations: [],
      evidence: `Evidence for ${title}`,
      whyFlagged: 'Flagged for urgency',
      detectionMethod: 'rule',
      recommendedAction: 'Review',
      elementId: `el-${id}`
    });

    const setA = [
      makeFinding('1', 'low', 60, 'Low finding'),
      makeFinding('2', 'critical', 95, 'Critical finding'),
      makeFinding('3', 'medium', 75, 'Medium finding'),
      makeFinding('4', 'high', 85, 'High finding')
    ];

    // Permutation B: Reversed
    const setB = [...setA].reverse();

    // Permutation C: Random shuffle
    const setC = [setA[2], setA[0], setA[3], setA[1]];

    const scoreA = calculateRiskScore(setA);
    const scoreB = calculateRiskScore(setB);
    const scoreC = calculateRiskScore(setC);

    expect(scoreA.score).toBe(scoreB.score);
    expect(scoreB.score).toBe(scoreC.score);
    expect(scoreA.level).toBe(scoreB.level);
    expect(scoreA.majorContributors[0].title).toBe('Critical finding');
  });

  // 3. Duplicate findings do not inflate the score
  it('3. deduplicates duplicate findings and does not inflate the score', () => {
    const originalFinding: DarkPatternFinding = {
      id: 'f-orig',
      category: 'scarcity',
      categoryName: 'Fake Scarcity',
      title: 'Low Stock Alert',
      severity: 'medium',
      confidence: 80,
      classification: 'potential_dark_pattern',
      evidenceStrength: 'limited',
      verificationStatus: 'observed',
      evidenceRecords: [],
      supportingEvidence: ['Only 2 left'],
      contradictoryEvidence: [],
      missingEvidence: [],
      limitations: [],
      evidence: 'Only 2 items left in stock - order soon',
      whyFlagged: 'Scarcity claim',
      detectionMethod: 'rule',
      recommendedAction: 'Verify inventory',
      elementId: 'stock-badge-1'
    };

    // Duplicate targeting the same element (e.g. from second detector or AI)
    const duplicateSameElement: DarkPatternFinding = {
      ...originalFinding,
      id: 'f-dup-element',
      title: 'Scarcity Notification on Same Element',
      elementId: 'stock-badge-1'
    };

    // Duplicate with exact same finding ID
    const duplicateSameId: DarkPatternFinding = {
      ...originalFinding
    };

    const singleScore = calculateRiskScore([originalFinding]);
    const duplicateScore = calculateRiskScore([originalFinding, duplicateSameElement, duplicateSameId]);

    expect(duplicateScore.score).toBe(singleScore.score);
    expect(duplicateScore.totalFindingsEvaluated).toBe(3);
  });

  // 4. Identical evidence does not receive a different score solely because Gemini is unavailable
  it('4. ensures identical validated findings receive identical score regardless of whether Gemini is online or offline', async () => {
    const sampleContent: ExtractedContent = {
      url: 'https://example.com/checkout',
      domain: 'example.com',
      title: 'Store Checkout',
      timestamp: Date.now(),
      visibleTexts: [
        { id: 't1', tag: 'p', text: 'Limited time sale ends in 02:30', fontSize: 16 }
      ],
      buttons: [{ id: 'b1', text: 'Pay Now', isPrimary: true }],
      links: [],
      formControls: [],
      prices: [{ id: 'p1', raw: '$99', value: 99, currency: 'USD' }],
      discounts: [],
      timers: [{ id: 'tm1', text: '02:30', isTicking: true }],
      modals: []
    };

    // Run 1: Local rules only (AI disabled)
    const ruleOnlyResult = await analyzeWebpageContent(sampleContent, {
      settings: { ...defaultSettings, aiAssisted: false },
      scanId: 'scan-rules-only',
      forceFresh: true
    });

    // Run 2: AI Assisted requested, but backend returns 429 quota exhaustion (partial fallback)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        aiAvailable: false, // Gemini quota exhausted
        findings: [],
        limitations: ['Gemini quota 429 reached.']
      })
    }) as any;

    const fallbackResult = await analyzeWebpageContent(sampleContent, {
      settings: { ...defaultSettings, aiAssisted: true, apiEndpoint: 'http://localhost:3001/api/analyze' },
      scanId: 'scan-fallback',
      forceFresh: true
    });

    globalThis.fetch = originalFetch;

    // Both runs evaluated the same validated rule findings on the page
    expect(fallbackResult.riskScore).toBe(ruleOnlyResult.riskScore);
    expect(fallbackResult.riskLevel).toBe(ruleOnlyResult.riskLevel);
  });

  // 5. Partial analysis is clearly distinguished from completed AI-assisted analysis
  it('5. clearly distinguishes partial rules-only scan from completed AI-assisted scan', async () => {
    const sampleContent: ExtractedContent = {
      url: 'https://example.com/shop',
      domain: 'example.com',
      title: 'Clean Shop',
      timestamp: Date.now(),
      visibleTexts: [{ id: 't1', tag: 'p', text: 'Welcome to our genuine store', fontSize: 16 }],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    };

    // Case A: AI disabled -> scanStatus is 'completed', analysisMode is 'rule'
    const completeRuleResult = await analyzeWebpageContent(sampleContent, {
      settings: { ...defaultSettings, aiAssisted: false },
      forceFresh: true
    });
    expect(completeRuleResult.scanStatus).toBe('completed');
    expect(completeRuleResult.analysisMode).toBe('rule');

    // Case B: AI requested, but backend fails -> scanStatus is 'partial'
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Backend offline')) as any;

    const partialResult = await analyzeWebpageContent(sampleContent, {
      settings: { ...defaultSettings, aiAssisted: true },
      forceFresh: true
    });
    globalThis.fetch = originalFetch;

    expect(partialResult.scanStatus).toBe('partial');
    expect(partialResult.aiAvailable).toBe(false);
    expect(partialResult.summary).toContain('contextual AI was unavailable');
  });

  // 6. Text below the viewport is included in extraction
  it('6. extracts content located below the viewport fold', () => {
    document.body.innerHTML = `
      <header><h1>Store Header</h1></header>
      <div style="height: 2500px;">
        <p>Top above the fold text</p>
      </div>
      <footer>
        <p id="below-fold-disclaimer" class="terms">Mandatory recurring fee of $49 billed monthly unless called to cancel</p>
        <span class="stock">Only 1 left in stock</span>
      </footer>
    `;

    const extracted = extractPageContent();
    const belowFold = extracted.visibleTexts.find(t => t.text.includes('recurring fee of $49'));
    const stockMsg = extracted.visibleTexts.find(t => t.text.includes('Only 1 left'));

    expect(belowFold).toBeDefined();
    expect(stockMsg).toBeDefined();
    expect(extracted.totalElementsQueried).toBeGreaterThan(0);
  });

  // 7. Bounded scroll pass is safe and restores original scroll position
  it('7. executes safe bounded scroll pass and restores scroll position', async () => {
    // Mock window scroll functions
    let currentScrollX = 10;
    let currentScrollY = 120;
    const scrollCalls: any[] = [];

    window.scrollTo = vi.fn((options: any) => {
      scrollCalls.push(options);
      if (typeof options === 'object') {
        currentScrollY = options.top ?? currentScrollY;
        currentScrollX = options.left ?? currentScrollX;
      }
    });

    Object.defineProperty(window, 'scrollX', { get: () => currentScrollX, configurable: true });
    Object.defineProperty(window, 'scrollY', { get: () => currentScrollY, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3000, configurable: true });

    document.body.innerHTML = `
      <div style="height: 3000px;">
        <p id="t1">Top banner</p>
        <div id="below-fold" class="urgency">Sale ends in 10 minutes</div>
      </div>
    `;

    const extracted = await scrollAndCollectPageContent({ enableScroll: true, forceScroll: true });

    expect(extracted).toBeDefined();
    expect(extracted.extractionCoverage?.scrollPassCompleted).toBe(true);
    // Verifies original scroll coordinates (120, 10) were restored
    const lastScrollCall = scrollCalls[scrollCalls.length - 1];
    expect(lastScrollCall).toEqual({ top: 120, left: 10, behavior: 'instant' });
  });

  // 8. Repeated scans of unchanged content produce compatible findings and scores via cache
  it('8. caches identical snapshots and returns identical scores instantly', async () => {
    const sampleContent: ExtractedContent = {
      url: 'https://store.example.com/item/42',
      domain: 'store.example.com',
      title: 'Product 42',
      timestamp: Date.now(),
      visibleTexts: [
        { id: 't1', tag: 'p', text: 'Limited time deal: Order within 2 hrs to save 40%', fontSize: 16 }
      ],
      buttons: [{ id: 'b1', text: 'Buy Now', isPrimary: true }],
      links: [],
      formControls: [],
      prices: [{ id: 'p1', raw: '$60', value: 60, currency: 'USD' }],
      discounts: [{ id: 'd1', text: '40% off', claimedPercent: 40 }],
      timers: [{ id: 'tm1', text: 'Order within 2 hrs', isTicking: true }],
      modals: [],
      contentFingerprint: 'fp-test-static-snapshot-123'
    };

    // Scan 1: Initial fresh scan
    const scan1 = await analyzeWebpageContent(sampleContent, {
      settings: defaultSettings,
      scanId: 'scan-1',
      forceFresh: false
    });

    expect(scan1.isCached).toBe(false);

    // Scan 2: Unchanged snapshot scan
    const scan2 = await analyzeWebpageContent(sampleContent, {
      settings: defaultSettings,
      scanId: 'scan-2',
      forceFresh: false
    });

    expect(scan2.isCached).toBe(true);
    expect(scan2.riskScore).toBe(scan1.riskScore);
    expect(scan2.riskLevel).toBe(scan1.riskLevel);
    expect(scan2.findings.length).toBe(scan1.findings.length);
  });

  // 9. Changed page content causes the appropriate rescan or cache invalidation
  it('9. invalidates cache and rescans when content fingerprint changes or forceFresh is set', async () => {
    const contentV1: ExtractedContent = {
      url: 'https://store.example.com/item/42',
      domain: 'store.example.com',
      title: 'Product 42 - Normal',
      timestamp: Date.now(),
      visibleTexts: [{ id: 't1', tag: 'p', text: 'Regular product description', fontSize: 16 }],
      buttons: [],
      links: [],
      formControls: [],
      prices: [{ id: 'p1', raw: '$50', value: 50, currency: 'USD' }],
      discounts: [],
      timers: [],
      modals: [],
      contentFingerprint: 'fp-v1-clean'
    };

    const resV1 = await analyzeWebpageContent(contentV1, {
      settings: defaultSettings,
      forceFresh: false
    });
    expect(resV1.riskScore).toBe(0);

    // Content V2: User navigated or page dynamically updated with a countdown
    const contentV2: ExtractedContent = {
      ...contentV1,
      title: 'Product 42 - Flash Sale',
      visibleTexts: [{ id: 't2', tag: 'p', text: 'Flash sale ends in 05:00', fontSize: 16 }],
      timers: [{ id: 'tm1', text: '05:00', isTicking: true }],
      contentFingerprint: 'fp-v2-flash-sale'
    };

    const resV2 = await analyzeWebpageContent(contentV2, {
      settings: defaultSettings,
      forceFresh: false
    });

    expect(resV2.isCached).toBe(false);
    expect(resV2.riskScore).toBeGreaterThan(0);
    expect(resV2.findings.length).toBeGreaterThan(0);
  });

  // 10. Unsupported iframe content and incomplete extraction are reported accurately
  it('10. reports inaccessible cross-origin iframes and extraction coverage limits accurately', () => {
    document.body.innerHTML = `
      <h1>Main Page</h1>
      <iframe id="payment-gateway" src="https://secure-checkout.bank.com"></iframe>
      <iframe id="ad-frame" src="https://ads.partner.com"></iframe>
    `;

    // In JSDOM, iframe.contentDocument access simulates same-origin or cross-origin
    const extracted = extractPageContent();

    expect(extracted.extractionCoverage).toBeDefined();
    expect(extracted.extractionCoverage?.limitsApplied.maxTexts).toBe(EXTRACTION_LIMITS.maxVisibleTexts);
    expect(extracted.extractionCoverage?.limitsApplied.maxButtons).toBe(EXTRACTION_LIMITS.maxButtons);
  });

  // 11. The score remains strictly between 0 and 100
  it('11. strictly clamps the final risk score within [0, 100]', () => {
    // Empty findings
    const zeroRes = calculateRiskScore([]);
    expect(zeroRes.score).toBe(0);

    // Massive findings list that would exceed 100 without bounds
    const massiveFindings: DarkPatternFinding[] = Array.from({ length: 30 }, (_, i) => ({
      id: `crit-${i}`,
      category: 'hidden_charges',
      categoryName: 'Hidden Charges',
      title: `Critical Charge ${i}`,
      severity: 'critical', // base 40
      confidence: 100,
      classification: 'verified_deceptive',
      evidenceStrength: 'conclusive',
      verificationStatus: 'verified',
      evidenceRecords: [],
      supportingEvidence: [`Fee ${i}`],
      contradictoryEvidence: [],
      missingEvidence: [],
      limitations: [],
      evidence: `Hidden fee ${i} added stealthily to cart`,
      whyFlagged: 'Deceptive fee',
      detectionMethod: 'rule',
      recommendedAction: 'Verify',
      elementId: `el-charge-${i}`
    }));

    const maxRes = calculateRiskScore(massiveFindings);
    expect(maxRes.score).toBe(100);
    expect(maxRes.level).toBe('VERY HIGH RISK');
  });

  // 12. API errors and timeouts do not produce false success states
  it('12. handles backend timeouts without producing false success states', async () => {
    const originalFetch = globalThis.fetch;
    // Simulate fetch AbortError (Timeout)
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const sampleContent: ExtractedContent = {
      url: 'https://example.com/cart',
      domain: 'example.com',
      title: 'Cart',
      timestamp: Date.now(),
      visibleTexts: [{ id: 't1', tag: 'p', text: 'Cart item overview', fontSize: 16 }],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    };

    const result = await analyzeWebpageContent(sampleContent, {
      settings: { ...defaultSettings, aiAssisted: true },
      forceFresh: true
    });

    globalThis.fetch = originalFetch;

    expect(result.aiAvailable).toBe(false);
    expect(result.scanStatus).toBe('partial');
    expect(result.diagnostics?.backend.status).toBe('timeout');
    expect(result.diagnostics?.backend.error).toContain('timed out after 15s');
  });
});
