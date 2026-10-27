import { describe, it, expect } from 'vitest';
import { validateEvidence } from '../../src/analysis/evidence-validator';
import { ExtractedContent, DarkPatternFinding } from '../../src/analysis/types';

describe('Evidence Validation Engine', () => {
  const mockContent: ExtractedContent = {
    url: 'https://example.com/checkout',
    domain: 'example.com',
    title: 'Checkout Page - TechStore',
    timestamp: Date.now(),
    visibleTexts: [
      { id: 't1', tag: 'p', text: 'Hurry, offer expires in 5 minutes!' },
      { id: 't2', tag: 'span', text: 'Only 2 items left in stock.' }
    ],
    buttons: [
      { id: 'b1', text: 'Confirm Order' },
      { id: 'b2', text: 'No thanks, I hate discounts' }
    ],
    links: [],
    formControls: [
      { id: 'c1', type: 'checkbox', label: 'Add 2-Year Warranty for $19.99', checked: true }
    ],
    prices: [{ id: 'p1', raw: '$49.99', value: 49.99, currency: 'USD' }],
    discounts: [],
    timers: [{ id: 'tm1', text: '04:59' }],
    modals: []
  };

  it('accepts findings whose evidence is grounded in extracted DOM content', () => {
    const groundedFinding: DarkPatternFinding = {
      id: 'ai-1',
      category: 'urgency',
      categoryName: 'Fake Urgency',
      title: 'Urgency Pressure',
      severity: 'medium',
      confidence: 85,
      evidence: 'Hurry, offer expires in 5 minutes!',
      whyFlagged: 'Creates artificial hurry',
      detectionMethod: 'ai',
      recommendedAction: 'Take time'
    };

    const res = validateEvidence([groundedFinding], mockContent);
    expect(res.validatedFindings).toHaveLength(1);
    expect(res.rejectedFindings).toHaveLength(0);
  });

  it('rejects fabricated or hallucinated evidence not present in DOM content', () => {
    const fabricatedFinding: DarkPatternFinding = {
      id: 'ai-fake',
      category: 'hidden_charges',
      categoryName: 'Hidden Charges',
      title: 'Fabricated Surcharge',
      severity: 'high',
      confidence: 90,
      evidence: 'Mandatory $50 processing fee applied secretly to all users',
      whyFlagged: 'Invented fee',
      detectionMethod: 'ai',
      recommendedAction: 'Review fees'
    };

    const res = validateEvidence([fabricatedFinding], mockContent);
    expect(res.validatedFindings).toHaveLength(0);
    expect(res.rejectedFindings).toHaveLength(1);
    expect(res.rejectedFindings[0].reason).toContain('not found in extracted webpage DOM');
  });

  it('deduplicates identical findings', () => {
    const findingA: DarkPatternFinding = {
      id: 'f-a',
      category: 'confirmshaming',
      categoryName: 'Confirmshaming',
      title: 'Guilt opt-out',
      severity: 'high',
      confidence: 90,
      evidence: 'No thanks, I hate discounts',
      whyFlagged: 'Emotional manipulation',
      detectionMethod: 'rule',
      recommendedAction: 'Decline freely'
    };

    const findingB = { ...findingA, id: 'f-b' }; // duplicate

    const res = validateEvidence([findingA, findingB], mockContent);
    expect(res.validatedFindings).toHaveLength(1);
  });
});
