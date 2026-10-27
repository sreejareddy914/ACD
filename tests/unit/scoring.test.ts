import { describe, it, expect } from 'vitest';
import { calculateRiskScore, getRiskLevel, SEVERITY_WEIGHTS } from '../../src/analysis/risk-scorer';
import { DarkPatternFinding } from '../../src/analysis/types';

describe('Risk Scoring Engine', () => {
  it('correctly maps score ranges to RiskLevel thresholds', () => {
    expect(getRiskLevel(0)).toBe('LOW RISK');
    expect(getRiskLevel(19)).toBe('LOW RISK');
    expect(getRiskLevel(20)).toBe('MODERATE RISK');
    expect(getRiskLevel(39)).toBe('MODERATE RISK');
    expect(getRiskLevel(40)).toBe('HIGH RISK');
    expect(getRiskLevel(69)).toBe('HIGH RISK');
    expect(getRiskLevel(70)).toBe('VERY HIGH RISK');
    expect(getRiskLevel(100)).toBe('VERY HIGH RISK');
  });

  it('returns a zero score and LOW RISK when there are no findings', () => {
    const res = calculateRiskScore([]);
    expect(res.score).toBe(0);
    expect(res.level).toBe('LOW RISK');
    expect(res.majorContributors).toHaveLength(0);
  });

  it('calculates score with severity weights and confidence', () => {
    const singleFinding: DarkPatternFinding = {
      id: 'f1',
      category: 'urgency',
      categoryName: 'Fake Urgency',
      title: 'Countdown timer pressure',
      severity: 'high', // base 30
      confidence: 100,
      evidence: '04:59',
      whyFlagged: 'Fake timer',
      detectionMethod: 'rule',
      recommendedAction: 'Take time'
    };

    const res = calculateRiskScore([singleFinding]);
    expect(res.score).toBe(30); // 30 * 1.0 * 1.0 = 30
    expect(res.level).toBe('MODERATE RISK');
  });

  it('applies diminishing returns for multiple findings to prevent unbounded growth', () => {
    const makeFinding = (id: string, severity: 'critical' | 'high'): DarkPatternFinding => ({
      id,
      category: 'urgency',
      categoryName: 'Fake Urgency',
      title: `Finding ${id}`,
      severity,
      confidence: 90,
      evidence: 'evidence text',
      whyFlagged: 'why',
      detectionMethod: 'rule',
      recommendedAction: 'action'
    });

    const findings = [
      makeFinding('1', 'critical'), // 40 * 0.9 = 36 * 1.0 = 36
      makeFinding('2', 'critical'), // 36 * 0.75 = 27
      makeFinding('3', 'high'),     // 27 * 0.55 = 14.85
      makeFinding('4', 'high')      // 27 * 0.35 = 9.45
    ];

    const res = calculateRiskScore(findings);
    expect(res.score).toBeGreaterThan(60);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.level).toBe('VERY HIGH RISK');
  });

  it('dynamically excludes dismissed and false-positive findings', () => {
    const finding1: DarkPatternFinding = {
      id: 'f1',
      category: 'urgency',
      categoryName: 'Fake Urgency',
      title: 'Timer',
      severity: 'critical',
      confidence: 100,
      evidence: 'Timer',
      whyFlagged: 'Timer',
      detectionMethod: 'rule',
      recommendedAction: 'None'
    };

    const finding2: DarkPatternFinding = {
      ...finding1,
      id: 'f2',
      dismissed: true // dismissed!
    };

    const scoreWithBoth = calculateRiskScore([finding1, { ...finding1, id: 'f2_active' }]);
    const scoreWithDismissed = calculateRiskScore([finding1, finding2]);

    expect(scoreWithDismissed.score).toBeLessThan(scoreWithBoth.score);
  });
});
