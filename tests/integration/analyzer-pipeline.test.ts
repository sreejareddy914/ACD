import { describe, it, expect, vi } from 'vitest';
import { analyzeWebpageContent } from '../../src/analysis/analyzer';
import { DEFAULT_SETTINGS } from '../../src/services/storage';
import { ExtractedContent } from '../../src/analysis/types';

describe('Analyzer Integration Pipeline', () => {
  it('runs complete analysis pipeline and reports processing stages', async () => {
    const stagesReported: string[] = [];

    const mockContent: ExtractedContent = {
      url: 'https://shop.example.com/item',
      domain: 'shop.example.com',
      title: 'Mega Deals Store',
      timestamp: Date.now(),
      visibleTexts: [
        { id: 'v1', tag: 'p', text: 'Hurry, offer expires soon!' },
        { id: 'v2', tag: 'span', text: 'Only 1 room remaining at this price!' }
      ],
      buttons: [
        { id: 'b1', text: 'Buy Now' },
        { id: 'b2', text: 'No thanks, I hate discounts' }
      ],
      links: [],
      formControls: [
        { id: 'fc1', type: 'checkbox', label: 'Add Extended Warranty for $15', checked: true }
      ],
      prices: [{ id: 'p1', raw: '$89.00', value: 89, currency: 'USD' }],
      discounts: [],
      timers: [{ id: 'tm1', text: '04:12', isTicking: true }],
      modals: []
    };

    const res = await analyzeWebpageContent(mockContent, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false },
      onStageUpdate: (stg) => stagesReported.push(stg)
    });

    expect(stagesReported.length).toBeGreaterThanOrEqual(4);
    expect(res.scanStatus).toBe('completed');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.riskScore).toBeGreaterThan(40);
    expect(['HIGH RISK', 'VERY HIGH RISK']).toContain(res.riskLevel);
    expect(res.categoriesDetected.length).toBeGreaterThanOrEqual(3);
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it('outputs score 0 and LOW RISK on clean page without dark patterns', async () => {
    const cleanContent: ExtractedContent = {
      url: 'https://cleanencyclopedia.org/solar',
      domain: 'cleanencyclopedia.org',
      title: 'Renewable Solar Power',
      timestamp: Date.now(),
      visibleTexts: [
        { id: 't1', tag: 'h1', text: 'Solar Energy Basics' },
        { id: 't2', tag: 'p', text: 'Solar panels convert light from the sun into electricity.' }
      ],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    };

    const res = await analyzeWebpageContent(cleanContent, {
      settings: { ...DEFAULT_SETTINGS, aiAssisted: false }
    });

    expect(res.riskScore).toBe(0);
    expect(res.riskLevel).toBe('LOW RISK');
    expect(res.findings).toHaveLength(0);
    expect(res.summary).toContain('No significant dark patterns');
  });
});
