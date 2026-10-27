import { describe, it, expect } from 'vitest';
import { runAllRules } from '../../src/analysis/rules';
import { calculateRiskScore } from '../../src/analysis/risk-scorer';
import { ExtractedContent } from '../../src/analysis/types';

interface EvaluationCase {
  id: string;
  isDeceptive: boolean;
  expectedCategory?: string;
  content: ExtractedContent;
}

const EVALUATION_DATASET: EvaluationCase[] = [
  // Deceptive cases (Ground Truth: Positive)
  {
    id: 'd1_urgency',
    isDeceptive: true,
    expectedCategory: 'urgency',
    content: {
      url: 'https://test.com/1',
      domain: 'test.com',
      title: 'Sale',
      timestamp: Date.now(),
      visibleTexts: [{ id: '1', tag: 'p', text: 'Hurry, offer expires soon!' }],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [{ id: 't1', text: '02:30' }],
      modals: []
    }
  },
  {
    id: 'd2_scarcity',
    isDeceptive: true,
    expectedCategory: 'scarcity',
    content: {
      url: 'https://test.com/2',
      domain: 'test.com',
      title: 'Boutique',
      timestamp: Date.now(),
      visibleTexts: [{ id: '1', tag: 'span', text: 'Only 2 left in stock — almost sold out!' }],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  },
  {
    id: 'd3_discount',
    isDeceptive: true,
    expectedCategory: 'discounts',
    content: {
      url: 'https://test.com/3',
      domain: 'test.com',
      title: 'Discounts',
      timestamp: Date.now(),
      visibleTexts: [],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [{ id: '1', text: 'Save 50%!', claimedPercent: 50, originalPrice: 100, salePrice: 85 }],
      timers: [],
      modals: []
    }
  },
  {
    id: 'd4_confirmshaming',
    isDeceptive: true,
    expectedCategory: 'confirmshaming',
    content: {
      url: 'https://test.com/4',
      domain: 'test.com',
      title: 'Newsletter',
      timestamp: Date.now(),
      visibleTexts: [],
      buttons: [{ id: '1', text: 'No thanks, I hate discounts and prefer paying full price' }],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  },
  {
    id: 'd5_preselected',
    isDeceptive: true,
    expectedCategory: 'preselected_options',
    content: {
      url: 'https://test.com/5',
      domain: 'test.com',
      title: 'Cart',
      timestamp: Date.now(),
      visibleTexts: [],
      buttons: [],
      links: [],
      formControls: [{ id: '1', type: 'checkbox', label: 'Add 2-Year Extended Protection for $25.00', checked: true, isPreselected: true }],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  },
  {
    id: 'd6_cancellation',
    isDeceptive: true,
    expectedCategory: 'cancellation',
    content: {
      url: 'https://test.com/6',
      domain: 'test.com',
      title: 'Settings',
      timestamp: Date.now(),
      visibleTexts: [{ id: '1', tag: 'p', text: 'To cancel your membership, you must call to cancel between 9am-11am EST.' }],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  },

  // Legitimate cases (Ground Truth: Negative)
  {
    id: 'legit1_calendar',
    isDeceptive: false,
    content: {
      url: 'https://test.com/l1',
      domain: 'test.com',
      title: 'Developer Conference',
      timestamp: Date.now(),
      visibleTexts: [
        { id: '1', tag: 'h1', text: 'Open Source Summit 2026' },
        { id: '2', tag: 'p', text: 'Registration opens in October. Join our community keynote.' }
      ],
      buttons: [{ id: '1', text: 'Add to Calendar' }],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  },
  {
    id: 'legit2_accurate_discount',
    isDeceptive: false,
    content: {
      url: 'https://test.com/l2',
      domain: 'test.com',
      title: 'Accurate Sale',
      timestamp: Date.now(),
      visibleTexts: [],
      buttons: [],
      links: [],
      formControls: [],
      prices: [],
      discounts: [{ id: '1', text: 'Save 30%', claimedPercent: 30, originalPrice: 100, salePrice: 70 }],
      timers: [],
      modals: []
    }
  },
  {
    id: 'legit3_optional_box',
    isDeceptive: false,
    content: {
      url: 'https://test.com/l3',
      domain: 'test.com',
      title: 'Preferences',
      timestamp: Date.now(),
      visibleTexts: [],
      buttons: [],
      links: [],
      formControls: [{ id: '1', type: 'checkbox', label: 'Send me monthly security newsletter (optional)', checked: false }],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  },
  {
    id: 'legit4_article',
    isDeceptive: false,
    content: {
      url: 'https://test.com/l4',
      domain: 'test.com',
      title: 'Scientific Research',
      timestamp: Date.now(),
      visibleTexts: [
        { id: '1', tag: 'h1', text: 'Principles of Thermodynamics' },
        { id: '2', tag: 'p', text: 'The second law states that the total entropy of an isolated system can never decrease.' }
      ],
      buttons: [{ id: '1', text: 'Download PDF' }],
      links: [],
      formControls: [],
      prices: [],
      discounts: [],
      timers: [],
      modals: []
    }
  }
];

describe('Empirical Model Evaluation & Benchmark', () => {
  it('measures precision, recall, F1, false positive rate, and latency', () => {
    let tp = 0; // True Positive: deceptive flagged as deceptive
    let fp = 0; // False Positive: legitimate flagged as deceptive
    let tn = 0; // True Negative: legitimate correctly clean
    let fn = 0; // False Negative: deceptive missed

    const startTime = performance.now();

    for (const testCase of EVALUATION_DATASET) {
      const findings = runAllRules(testCase.content);
      const score = calculateRiskScore(findings);
      const flaggedAsDeceptive = score.score >= 20 || findings.length > 0;

      if (testCase.isDeceptive) {
        if (flaggedAsDeceptive) {
          tp++;
          if (testCase.expectedCategory) {
            expect(findings.some(f => f.category === testCase.expectedCategory)).toBe(true);
          }
        } else {
          fn++;
        }
      } else {
        if (flaggedAsDeceptive) {
          fp++;
        } else {
          tn++;
        }
      }
    }

    const elapsedMs = performance.now() - startTime;
    const avgLatencyMs = elapsedMs / EVALUATION_DATASET.length;

    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const f1 = (2 * precision * recall) / (precision + recall);
    const fpr = fp / (fp + tn);

    console.log(`\n========================================`);
    console.log(`MODEL EVALUATION METRICS REPORT`);
    console.log(`========================================`);
    console.log(`Total Benchmark Cases: ${EVALUATION_DATASET.length}`);
    console.log(`True Positives (TP):  ${tp}`);
    console.log(`False Positives (FP): ${fp}`);
    console.log(`True Negatives (TN):  ${tn}`);
    console.log(`False Negatives (FN): ${fn}`);
    console.log(`Precision:            ${(precision * 100).toFixed(1)}%`);
    console.log(`Recall:               ${(recall * 100).toFixed(1)}%`);
    console.log(`F1 Score:             ${f1.toFixed(3)}`);
    console.log(`False-Positive Rate:  ${(fpr * 100).toFixed(1)}%`);
    console.log(`Avg Scan Latency:     ${avgLatencyMs.toFixed(2)} ms/page`);
    console.log(`========================================\n`);

    // Quality thresholds
    expect(precision).toBeGreaterThanOrEqual(0.9);
    expect(recall).toBeGreaterThanOrEqual(0.9);
    expect(f1).toBeGreaterThanOrEqual(0.9);
    expect(fpr).toBeLessThanOrEqual(0.1);
    expect(avgLatencyMs).toBeLessThan(10); // deterministic checks must be blazingly fast
  });
});
