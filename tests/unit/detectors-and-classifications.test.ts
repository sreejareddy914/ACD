import { describe, it, expect, beforeEach } from 'vitest';
import { checkUrgency } from '../../src/analysis/rules/urgency';
import { checkScarcity } from '../../src/analysis/rules/scarcity';
import { checkDiscounts } from '../../src/analysis/rules/discounts';
import { checkHiddenCharges } from '../../src/analysis/rules/hidden-charges';
import { checkForcedSignup } from '../../src/analysis/rules/forced-signup';
import { checkCancellation } from '../../src/analysis/rules/cancellation';
import { evaluateFindingClassification } from '../../src/analysis/classification-service';
import { validateEvidence } from '../../src/analysis/evidence-validator';
import {
  recordTimerObservation,
  recordScarcityObservation,
  recordPriceObservation,
  clearObservationHistory
} from '../../src/services/evidence-history';
import { ExtractedContent, DarkPatternFinding } from '../../src/analysis/types';

function createMockContent(overrides: Partial<ExtractedContent> = {}): ExtractedContent {
  return {
    url: 'https://teststore.com/item',
    domain: 'teststore.com',
    title: 'Product Page',
    timestamp: Date.now(),
    visibleTexts: [],
    buttons: [],
    links: [],
    formControls: [],
    prices: [],
    discounts: [],
    timers: [],
    modals: [],
    ...overrides
  };
}

describe('Master Specification: 6 Dedicated Detectors & Central Classifications', () => {
  beforeEach(async () => {
    await clearObservationHistory();
  });

  // ==========================================
  // DETECTOR 1: FAKE URGENCY
  // ==========================================
  describe('Detector 1: Fake Urgency & Behavioral Timer Observation', () => {
    it('flags unverified sales countdown timer as potential_dark_pattern with explicit limitations', () => {
      const content = createMockContent({
        timers: [{ id: 't-sale', text: '04:59', secondsRemaining: 299, isTicking: true }]
      });
      const findings = checkUrgency(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.category).toBe('urgency');
      expect(f.classification).toBe('potential_dark_pattern');
      expect(f.evidenceStrength).toBe('limited');
      expect(f.evidenceRecords[0].evidenceType).toBe('timer_observation');
      expect(f.limitations.some(l => l.includes('single visit') || l.includes('promotional calendar'))).toBe(true);
    });

    it('does NOT falsely flag legitimate conference/event countdown schedules as fake urgency', () => {
      const content = createMockContent({
        title: 'International Computing Symposium 2026',
        visibleTexts: [
          { id: 'v1', tag: 'h1', text: 'Annual Computing Conference Registration' },
          { id: 'v2', tag: 'p', text: 'Paper submission deadline opens on Nov 15' }
        ],
        timers: [{ id: 't-conf', text: 'Conference registration deadline in 48:00:00', isTicking: true }]
      });
      const findings = checkUrgency(content);
      expect(findings.some(f => f.title.includes('Countdown Timer'))).toBe(false);
    });

    it('detects timer reset across visits using local evidence observation history', async () => {
      const origin = 'https://deals.example.com';
      const pageUrl = 'https://deals.example.com/flash-sale';

      // Visit 1: Timer running low
      const obs1 = await recordTimerObservation(origin, pageUrl, '00:15', 15);
      expect(obs1.resetDetected).toBe(false);

      // Visit 2: Timer reset back up to 05:00
      const obs2 = await recordTimerObservation(origin, pageUrl, '05:00', 300);
      expect(obs2.resetDetected).toBe(true);

      const classificationEval = evaluateFindingClassification({
        category: 'urgency',
        evidenceRecords: [
          {
            id: 'ev-reset-1',
            pattern: 'urgency',
            origin,
            pageUrl,
            observedAt: Date.now(),
            evidenceType: 'timer_reset_detected',
            description: 'Timer was recorded at 00:15 and restarted to 05:00 upon reload.',
            observedValue: '00:15 -> 05:00 reset',
            provenance: 'historical_record',
            verificationStatus: 'verified',
            limitations: ['Recurring promotions may exist.']
          }
        ],
        timerResetDetected: true
      });

      expect(classificationEval.classification).toBe('strong_evidence');
      expect(classificationEval.evidenceStrength).toBe('strong');
    });
  });

  // ==========================================
  // DETECTOR 2: FAKE SCARCITY
  // ==========================================
  describe('Detector 2: Fake Scarcity & Inventory Limitations', () => {
    it('classifies stock claims as potential_dark_pattern and explicitly notes inventory limitation', () => {
      const content = createMockContent({
        visibleTexts: [{ id: 's1', tag: 'span', text: 'Hurry, only 2 left in stock!' }]
      });
      const findings = checkScarcity(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.category).toBe('scarcity');
      expect(f.classification).toBe('potential_dark_pattern');
      expect(f.evidenceStrength).toBe('limited');
      expect(f.limitations.some(l => l.includes('actual live inventory cannot be independently verified'))).toBe(true);
    });

    it('tracks repeated scarcity claims across multiple visits in local history', async () => {
      const origin = 'https://boutique.example.com';
      const pageUrl = 'https://boutique.example.com/shoes';

      const obs1 = await recordScarcityObservation(origin, pageUrl, 'Only 2 items left!');
      expect(obs1.repeatedOccurrences).toBe(1);

      const obs2 = await recordScarcityObservation(origin, pageUrl, 'Only 2 items left!');
      expect(obs2.repeatedOccurrences).toBe(2);
      expect(obs2.observationTimestamps).toHaveLength(2);
    });
  });

  // ==========================================
  // DETECTOR 3: MISLEADING DISCOUNTS
  // ==========================================
  describe('Detector 3: Misleading Discounts & Arithmetic Verification', () => {
    it('classifies mathematical discount discrepancy as verified_deceptive with conclusive evidence', () => {
      const content = createMockContent({
        discounts: [{
          id: 'd1',
          text: 'Save 60% Today!',
          claimedPercent: 60,
          originalPrice: 5000,
          salePrice: 4000 // actual discount is 20%, claimed is 60%
        }]
      });
      const findings = checkDiscounts(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.category).toBe('discounts');
      expect(f.classification).toBe('verified_deceptive');
      expect(f.evidenceStrength).toBe('conclusive');
      expect(f.verificationStatus).toBe('verified');
      expect(f.evidence).toContain('Claimed: 60% off, but calculated: 20% off');
    });

    it('does NOT flag legitimate, mathematically accurate discounts as misleading', () => {
      const content = createMockContent({
        discounts: [{
          id: 'd-legit',
          text: '30% Off Regular Price',
          claimedPercent: 30,
          originalPrice: 100,
          salePrice: 70 // Exactly 30% off
        }]
      });
      const findings = checkDiscounts(content);
      expect(findings.some(f => f.title === 'Incorrect Discount Arithmetic')).toBe(false);
    });

    it('flags inverted reference prices (crossed-out price <= sale price) as verified_deceptive', () => {
      const content = createMockContent({
        prices: [
          { id: 'p1', raw: '$50.00', value: 50, currency: 'USD', isCrossedOut: true },
          { id: 'p2', raw: '$80.00', value: 80, currency: 'USD', isCrossedOut: false }
        ]
      });
      const findings = checkDiscounts(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.classification).toBe('verified_deceptive');
      expect(f.title).toContain('Contradictory Crossed-Out Reference Price');
    });
  });

  // ==========================================
  // DETECTOR 4: HIDDEN CHARGES
  // ==========================================
  describe('Detector 4: Hidden Charges & Drip Pricing', () => {
    it('flags mandatory undisclosed checkout fees as strong_evidence', () => {
      const content = createMockContent({
        visibleTexts: [
          { id: 'h1', tag: 'div', text: 'Mandatory service fee added: $14.99 at checkout' }
        ]
      });
      const findings = checkHiddenCharges(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.category).toBe('hidden_charges');
      expect(f.classification).toBe('strong_evidence');
      expect(f.evidenceStrength).toBe('strong');
    });
  });

  // ==========================================
  // DETECTOR 5: FORCED SIGN-UP
  // ==========================================
  describe('Detector 5: Forced Sign-Up & Broken Guest Checkout Promise', () => {
    it('flags broken guest checkout promise as strong_evidence', () => {
      const content = createMockContent({
        visibleTexts: [
          { id: 't1', tag: 'h2', text: 'Guest checkout available here' },
          { id: 't2', tag: 'p', text: 'Account creation is mandatory to complete purchase. Must create password.' }
        ]
      });
      const findings = checkForcedSignup(content);
      expect(findings.some(f => f.title === 'Misleading Guest Checkout Barrier')).toBe(true);
      const f = findings.find(x => x.title === 'Misleading Guest Checkout Barrier')!;
      expect(f.classification).toBe('strong_evidence');
      expect(f.evidenceStrength).toBe('strong');
    });

    it('flags blocking modal wall without close control as potential_dark_pattern with limitation', () => {
      const content = createMockContent({
        modals: [{
          id: 'm1',
          title: 'Sign up to view this article',
          content: 'You must register now to proceed reading.',
          hasCloseButton: false
        }]
      });
      const findings = checkForcedSignup(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.classification).toBe('potential_dark_pattern');
      expect(f.limitations.some(l => l.includes('Publisher paywalls'))).toBe(true);
    });
  });

  // ==========================================
  // DETECTOR 6: DIFFICULT CANCELLATION
  // ==========================================
  describe('Detector 6: Difficult Cancellation (Roach Motel)', () => {
    it('flags offline-only cancellation barrier (call to cancel) as verified_deceptive with conclusive evidence', () => {
      const content = createMockContent({
        visibleTexts: [{
          id: 'c1',
          tag: 'p',
          text: 'To cancel your subscription, you must call to cancel during business hours.'
        }]
      });
      const findings = checkCancellation(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.category).toBe('cancellation');
      expect(f.classification).toBe('verified_deceptive');
      expect(f.evidenceStrength).toBe('conclusive');
      expect(f.severity).toBe('critical');
    });

    it('flags confusing double-negative cancellation button as potential_dark_pattern', () => {
      const content = createMockContent({
        buttons: [{
          id: 'btn-cancel',
          text: "Don't cancel, keep my membership"
        }]
      });
      const findings = checkCancellation(content);
      expect(findings).toHaveLength(1);
      const f = findings[0];
      expect(f.title).toBe('Confusing Cancellation Dialog Buttons');
      expect(f.classification).toBe('potential_dark_pattern');
    });
  });

  // ==========================================
  // EVIDENCE VALIDATION & UNKNOWN ID REJECTION
  // ==========================================
  describe('Evidence Validation & Unknown Evidence ID Rejection', () => {
    it('rejects AI findings referencing unknown evidence IDs that do not exist in submitted evidence set', () => {
      const content = createMockContent({
        visibleTexts: [{ id: 'v1', tag: 'p', text: 'Normal product description.' }]
      });

      const knownEvidenceIds = new Set<string>(['ev-valid-1', 'ev-valid-2']);

      const bogusAiFinding: DarkPatternFinding = {
        id: 'ai-bogus-1',
        category: 'urgency',
        categoryName: 'Fake Urgency',
        title: 'Invented Urgency',
        severity: 'high',
        confidence: 85,
        evidence: 'Normal product description',
        whyFlagged: 'Hallucination',
        detectionMethod: 'ai',
        recommendedAction: 'Careful',
        classification: 'strong_evidence',
        evidenceStrength: 'strong',
        verificationStatus: 'verified',
        evidenceRecords: [{
          id: 'ev-INVENTED-1234', // Does NOT exist in knownEvidenceIds!
          pattern: 'urgency',
          origin: content.domain,
          pageUrl: content.url,
          observedAt: Date.now(),
          evidenceType: 'hallucinated_timer',
          description: 'Non-existent timer',
          observedValue: '00:00',
          provenance: 'inferred',
          verificationStatus: 'unverified',
          limitations: []
        }],
        supportingEvidence: [],
        contradictoryEvidence: [],
        missingEvidence: [],
        limitations: []
      };

      const report = validateEvidence([bogusAiFinding], content, knownEvidenceIds);
      expect(report.validatedFindings).toHaveLength(0);
      expect(report.rejectedFindings).toHaveLength(1);
      expect(report.rejectedFindings[0].reason).toContain('AI referred to unknown evidence IDs');
    });
  });
});
