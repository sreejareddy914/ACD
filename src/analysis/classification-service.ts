import {
  ClassificationType,
  DarkPatternCategory,
  EvidenceRecord,
  EvidenceStrength,
  VerificationStatus
} from './types';

export interface ClassificationEvaluation {
  classification: ClassificationType;
  evidenceStrength: EvidenceStrength;
  verificationStatus: VerificationStatus;
  reasons: string[];
  limitations: string[];
  supportingEvidence: string[];
  contradictoryEvidence: string[];
  missingEvidence: string[];
}

/**
 * Central Classification Policy Service
 *
 * Enforces strict, evidence-grounded classification rules across both rule-based
 * and AI-assisted detection. Ensures that the strength of the conclusion NEVER
 * exceeds the strength of the available evidence.
 */
export function evaluateFindingClassification(params: {
  category: DarkPatternCategory;
  evidenceRecords: EvidenceRecord[];
  isMathDiscrepancy?: boolean;
  timerResetDetected?: boolean;
  isLegitimateSchedule?: boolean;
  inventoryVerified?: boolean;
  brokenGuestPromise?: boolean;
  offlineCancellationOnly?: boolean;
  undisclosedMandatoryFee?: boolean;
  aiRecommendation?: ClassificationType;
  contradictoryObservations?: string[];
}): ClassificationEvaluation {
  const {
    category,
    evidenceRecords,
    isMathDiscrepancy,
    timerResetDetected,
    isLegitimateSchedule,
    inventoryVerified,
    brokenGuestPromise,
    offlineCancellationOnly,
    undisclosedMandatoryFee,
    aiRecommendation,
    contradictoryObservations = []
  } = params;

  const reasons: string[] = [];
  const limitations: string[] = [];
  const supportingEvidence: string[] = [];
  const contradictoryEvidence: string[] = [...contradictoryObservations];
  const missingEvidence: string[] = [];

  // Collect text from evidence records
  for (const rec of evidenceRecords) {
    supportingEvidence.push(rec.description);
    if (rec.limitations) {
      limitations.push(...rec.limitations);
    }
  }

  // 1. Check for Legitimate or Contradicted Scenarios
  if (isLegitimateSchedule) {
    reasons.push('Event deadline or conference schedule appears legitimate and fixed.');
    contradictoryEvidence.push('Displayed countdown corresponds to a scheduled calendar date rather than an artificial sales gimmick.');
    return {
      classification: 'insufficient_evidence',
      evidenceStrength: 'insufficient',
      verificationStatus: 'contradicted',
      reasons,
      limitations: ['Legitimate deadlines are valid commercial communication and do not constitute dark patterns.'],
      supportingEvidence: [],
      contradictoryEvidence,
      missingEvidence: ['Evidence of artificial timer manipulation']
    };
  }

  // 2. Pattern-Specific Deterministic Evaluations
  switch (category) {
    case 'discounts': {
      if (isMathDiscrepancy) {
        reasons.push('Observable arithmetic mismatch between stated discount percentage and reference prices on the same product.');
        return {
          classification: 'verified_deceptive',
          evidenceStrength: 'conclusive',
          verificationStatus: 'verified',
          reasons,
          limitations: ['The authenticity of the merchant’s original reference price itself remains unverified without historical retail logs.'],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: []
        };
      }
      // Stated MSRP or crossed price without math error
      reasons.push('Crossed-out reference price or markdown claimed, but historic selling prices are unverified.');
      missingEvidence.push('Third-party verified historical price log for this SKU');
      limitations.push('Browser extensions cannot independently verify whether the reference price was a genuine prior selling price.');
      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'unverified',
        reasons,
        limitations,
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence
      };
    }

    case 'urgency': {
      if (timerResetDetected) {
        reasons.push('Countdown timer was directly observed resetting to an earlier duration after reaching zero or upon navigation.');
        return {
          classification: 'strong_evidence',
          evidenceStrength: 'strong',
          verificationStatus: 'verified',
          reasons,
          limitations: ['Observations do not independently establish whether the merchant legitimately operates continuous rolling promotions.'],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: ['Merchant internal promotion policy documentation']
        };
      }
      // Static or single-view countdown timer
      reasons.push('Active countdown timer observed, but timer deadline validity has not been tested over repeated visits.');
      missingEvidence.push('Repeated observation across reloads to verify if deadline moves forward');
      limitations.push('A countdown timer alone does not confirm deception; genuine sales also utilize deadlines.');
      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'unverified',
        reasons,
        limitations,
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence
      };
    }

    case 'scarcity': {
      if (inventoryVerified === true) {
        reasons.push('Inventory data directly contradicts the displayed scarcity claim.');
        return {
          classification: 'verified_deceptive',
          evidenceStrength: 'conclusive',
          verificationStatus: 'verified',
          reasons,
          limitations: [],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: []
        };
      }
      reasons.push('Scarcity claim observed (e.g. "Only X left!"), but backend merchant inventory is private.');
      missingEvidence.push('Direct access to authorized inventory system (private merchant API)');
      limitations.push('The merchant’s actual live inventory cannot be independently verified via client-side inspection.');
      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'unverified',
        reasons,
        limitations,
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence
      };
    }

    case 'hidden_charges': {
      if (undisclosedMandatoryFee) {
        reasons.push('Mandatory checkout fee introduced at final stage that was not disclosed in upfront product pricing.');
        return {
          classification: 'strong_evidence',
          evidenceStrength: 'strong',
          verificationStatus: 'verified',
          reasons,
          limitations: ['Inspection covered observed cart stages; cannot verify if fee was listed on unvisited terms pages.'],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: []
        };
      }
      reasons.push('Late disclosed or ambiguous fees observed in checkout breakdown.');
      limitations.push('Taxes, shipping, and payment processing fees may be legitimate if clearly disclosed before final authorization.');
      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'unverified',
        reasons,
        limitations,
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence: ['Prior stage disclosure verification']
      };
    }

    case 'forced_signup': {
      if (brokenGuestPromise) {
        reasons.push('Website promised guest checkout or access without registration, but subsequently blocked the flow with mandatory account creation.');
        return {
          classification: 'strong_evidence',
          evidenceStrength: 'strong',
          verificationStatus: 'verified',
          reasons,
          limitations: ['The extension cannot assume all account requirements are illegitimate for security-sensitive actions.'],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: []
        };
      }
      reasons.push('Registration wall observed with no clear guest alternative.');
      limitations.push('Services may legitimately require accounts for security, personalized content, or regulatory compliance.');
      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'unverified',
        reasons,
        limitations,
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence: ['User intention context']
      };
    }

    case 'cancellation': {
      if (offlineCancellationOnly) {
        reasons.push('Service permits instant online subscription, but mandates offline phone call or postal letter to cancel (Roach Motel).');
        return {
          classification: 'verified_deceptive',
          evidenceStrength: 'conclusive',
          verificationStatus: 'verified',
          reasons,
          limitations: [],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: []
        };
      }
      reasons.push('Multi-step retention prompts or ambiguous cancellation dialog buttons observed.');
      limitations.push('Identity verification and reasonable cancellation confirmations can be legitimate.');
      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'unverified',
        reasons,
        limitations,
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence: ['Full execution of cancellation flow']
      };
    }

    default: {
      // General fallthrough for other categories (confirmshaming, sneaking, etc.)
      if (evidenceRecords.length === 0) {
        return {
          classification: 'insufficient_evidence',
          evidenceStrength: 'insufficient',
          verificationStatus: 'unsupported',
          reasons: ['No grounded DOM observations available to support this pattern.'],
          limitations: ['Findings without grounded DOM excerpts cannot be verified.'],
          supportingEvidence: [],
          contradictoryEvidence,
          missingEvidence: ['DOM excerpt']
        };
      }

      // If AI recommends something, validate against grounding
      if (aiRecommendation && aiRecommendation !== 'insufficient_evidence') {
        // AI can upgrade to potential_dark_pattern or strong_evidence if multiple records exist
        const finalClass = evidenceRecords.length >= 2 ? 'strong_evidence' : 'potential_dark_pattern';
        return {
          classification: finalClass,
          evidenceStrength: evidenceRecords.length >= 2 ? 'strong' : 'limited',
          verificationStatus: 'observed',
          reasons: ['Observable pattern matches known deceptive design criteria.'],
          limitations: ['Automated heuristic assessment; user should verify contextual terms.'],
          supportingEvidence,
          contradictoryEvidence,
          missingEvidence: []
        };
      }

      return {
        classification: 'potential_dark_pattern',
        evidenceStrength: 'limited',
        verificationStatus: 'observed',
        reasons: ['Interface element matches deceptive pattern heuristics.'],
        limitations: ['Contextual intent cannot be verified solely from DOM markup.'],
        supportingEvidence,
        contradictoryEvidence,
        missingEvidence: []
      };
    }
  }
}
