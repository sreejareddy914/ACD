import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from '../types';
import { evaluateFindingClassification } from '../classification-service';

export function checkCancellation(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // 1. Offline-only / Asymmetric Cancellation Barrier (Roach Motel)
  const cancellationBlockRegex = /(?:call\s+(?:us\s+)?to\s+cancel|cancellation\s+only\s+by\s+phone|speak\s+with\s+a\s+representative\s+to\s+cancel|cancel\s+button\s+disabled|mail\s+in\s+written\s+notice\s+to\s+cancel|contact\s+support\s+to\s+(?:terminate|cancel)|cancellations?\s+(?:must\s+be\s+done|must\s+call)|chat\s+with\s+an\s+agent\s+to\s+cancel|cannot\s+cancel\s+online)/i;

  for (const item of content.visibleTexts) {
    if (cancellationBlockRegex.test(item.text)) {
      const evRecord: EvidenceRecord = {
        id: `ev-cancellation-barrier-${item.id}`,
        pattern: 'cancellation',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'offline_cancellation_barrier',
        description: `Mandatory offline cancellation hurdle: "${item.text.trim()}"`,
        observedValue: item.text.trim(),
        elementSelector: `#${item.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'verified',
        limitations: [
          'Under consumer protection regulations (e.g. FTC click-to-cancel rules, EU consumer rights), digital signups must offer online cancellation parity.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'cancellation',
        evidenceRecords: [evRecord],
        offlineCancellationOnly: true
      });

      findings.push({
        id: `cancellation-barrier-${item.id}`,
        category: 'cancellation',
        categoryName: 'Difficult Cancellation (Roach Motel)',
        title: 'Asymmetric Cancellation Obstacle (Call / Mail to Cancel)',
        severity: 'critical',
        confidence: 95,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Online sign-up combined with offline-only cancellation barriers is a classic Roach Motel pattern designed to lock users into paying by introducing artificial friction.',
        detectionMethod: 'rule',
        recommendedAction: 'Document this barrier. In many jurisdictions, services that let you subscribe online must legally allow you to cancel online with equal ease.',
        elementId: item.id,
        elementSelector: `#${item.id}`,
        classification: evalResult.classification,
        evidenceStrength: evalResult.evidenceStrength,
        verificationStatus: evalResult.verificationStatus,
        evidenceRecords: [evRecord],
        supportingEvidence: evalResult.supportingEvidence,
        contradictoryEvidence: evalResult.contradictoryEvidence,
        missingEvidence: evalResult.missingEvidence,
        limitations: evalResult.limitations
      });
      break;
    }
  }

  // 2. Confusing / Inverted Cancellation Buttons (Double Negatives)
  const confusingButtonRegex = /(?:don't\s+cancel|keep\s+my\s+membership|no,\s+i\s+want\s+to\s+lose|stay\s+subscribed|continue\s+paying|nevermind,\s+keep|i\s+changed\s+my\s+mind)/i;
  const interactiveCandidates = [
    ...content.buttons.map(b => ({ id: b.id, text: b.text, type: 'button' })),
    ...content.links.map(l => ({ id: l.id, text: l.text, type: 'link' }))
  ];
  for (const btn of interactiveCandidates) {
    if (confusingButtonRegex.test(btn.text)) {
      const evRecord: EvidenceRecord = {
        id: `ev-cancellation-btn-${btn.id}`,
        pattern: 'cancellation',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'inverted_cancellation_dialog_control',
        description: `Confusing confirmation button label: "${btn.text.trim()}"`,
        observedValue: btn.text.trim(),
        elementSelector: `#${btn.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: ['Dialog button labels can be ambiguous; visual styling (primary vs secondary) also affects comprehension.'],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'cancellation',
        evidenceRecords: [evRecord],
        offlineCancellationOnly: false
      });

      findings.push({
        id: `cancellation-btn-${btn.id}`,
        category: 'cancellation',
        categoryName: 'Difficult Cancellation (Roach Motel)',
        title: 'Confusing Cancellation Dialog Buttons',
        severity: 'high',
        confidence: 82,
        evidence: `Button text: "${btn.text.trim()}"`,
        whyFlagged: 'Using inverted labels or double negatives during cancellation misleads users into accidentally keeping their subscription active.',
        detectionMethod: 'rule',
        recommendedAction: 'Carefully read the exact prompt before clicking to verify whether the button confirms or rejects cancellation.',
        elementId: btn.id,
        elementSelector: `#${btn.id}`,
        classification: evalResult.classification,
        evidenceStrength: evalResult.evidenceStrength,
        verificationStatus: evalResult.verificationStatus,
        evidenceRecords: [evRecord],
        supportingEvidence: evalResult.supportingEvidence,
        contradictoryEvidence: evalResult.contradictoryEvidence,
        missingEvidence: evalResult.missingEvidence,
        limitations: evalResult.limitations
      });
      break;
    }
  }

  return findings;
}
