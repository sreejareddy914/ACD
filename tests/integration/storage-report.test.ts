import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  saveSettings,
  getHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
  DEFAULT_SETTINGS
} from '../../src/services/storage';
import { generateTextReport, generateJsonReport } from '../../src/services/report-export';
import { AnalysisResult } from '../../src/analysis/types';

// Mock localStorage for Node test runner
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};
(globalThis as any).localStorage = mockLocalStorage;

describe('Storage and Report Integration', () => {
  beforeEach(async () => {
    mockLocalStorage.clear();
  });

  it('saves and loads user settings', async () => {
    const custom = { ...DEFAULT_SETTINGS, autoScan: true, aiAssisted: true };
    await saveSettings(custom);
    const loaded = await getSettings();
    expect(loaded.autoScan).toBe(true);
    expect(loaded.aiAssisted).toBe(true);
  });

  it('manages local scan history items', async () => {
    await clearAllHistory();
    expect(await getHistory()).toHaveLength(0);

    const item1 = {
      id: 'scan-1',
      domain: 'shop.com',
      url: 'https://shop.com',
      pageTitle: 'Shop',
      timestamp: Date.now(),
      score: 65,
      riskLevel: 'HIGH RISK' as const,
      findingsCount: 3,
      categoriesSummary: ['Fake Urgency']
    };

    await addHistoryItem(item1);
    let hist = await getHistory();
    expect(hist).toHaveLength(1);
    expect(hist[0].id).toBe('scan-1');

    await deleteHistoryItem('scan-1');
    hist = await getHistory();
    expect(hist).toHaveLength(0);
  });

  it('generates complete, structured audit reports with all required fields', () => {
    const mockResult: AnalysisResult = {
      scanStatus: 'completed',
      analysisMode: 'combined',
      pageUrl: 'https://deceptive-store.test/cart',
      pageDomain: 'deceptive-store.test',
      pageTitle: 'Cart Review',
      timestamp: 1700000000000,
      riskScore: 74,
      riskLevel: 'VERY HIGH RISK',
      summary: 'Multiple manipulative tactics detected.',
      findings: [
        {
          id: 'f1',
          category: 'urgency',
          categoryName: 'Fake Urgency',
          title: 'Fake countdown',
          severity: 'high',
          confidence: 85,
          evidence: '04:59',
          whyFlagged: 'Artificial urgency',
          detectionMethod: 'rule',
          recommendedAction: 'Compare prices'
        }
      ],
      categoriesDetected: ['Fake Urgency'],
      recommendations: ['Check prices elsewhere before buying.'],
      limitations: ['Some iframe elements could not be inspected.'],
      aiAvailable: true
    };

    const textReport = generateTextReport(mockResult);
    expect(textReport).toContain('deceptive-store.test');
    expect(textReport).toContain('74/100 [VERY HIGH RISK]');
    expect(textReport).toContain('FAKE URGENCY');
    expect(textReport).toContain('04:59');
    expect(textReport).toContain('Check prices elsewhere');

    const jsonReport = generateJsonReport(mockResult);
    const parsed = JSON.parse(jsonReport);
    expect(parsed.riskScore).toBe(74);
    expect(parsed.pageDomain).toBe('deceptive-store.test');
  });
});
