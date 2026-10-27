import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from '../types';
import { evaluateFindingClassification } from '../classification-service';

export function checkHiddenCharges(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // 1. Mandatory late-disclosed fee regex
  const dripFeeRegex = /(?:(?:mandatory\s+)?service\s+(?:fee|charge)|convenience\s+fee|platform\s+fee|handling\s+(?:fee|charge)|processing\s+fee|checkout\s+fee|resort\s+fee|packaging\s+fee|order\s+processing\s+fee|undisclosed\s+convenience\s+fee|platform\s+fee\s+added|handling\s+fee\s+applied|unexpected\s+processing\s+fee|cleaning\s+fee|facility\s+fee|booking\s+fee|destination\s+fee)/i;
  const negatedFeeRegex = /(?:no|free|zero|waived|without|inclusive\s+of|includes?\s+all)\s+(?:platform|convenience|handling|service|processing|booking)\s+(?:fee|charge|fees)/i;

  for (const item of content.visibleTexts) {
    if (dripFeeRegex.test(item.text) && !negatedFeeRegex.test(item.text)) {
      const evRecord: EvidenceRecord = {
        id: `ev-hidden-fee-${item.id}`,
        pattern: 'hidden_charges',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'mandatory_checkout_fee_detected',
        description: `Mandatory checkout surcharge detected: "${item.text.trim()}"`,
        observedValue: item.text.trim(),
        elementSelector: `#${item.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: [
          'Inspection did not determine whether this fee was disclosed on preceding product description pages.',
          'Applicable municipal taxes and regulated tariffs are excluded from dark pattern classifications.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'hidden_charges',
        evidenceRecords: [evRecord],
        undisclosedMandatoryFee: true
      });

      findings.push({
        id: `hidden-charge-${item.id}`,
        category: 'hidden_charges',
        categoryName: 'Hidden Charges & Drip Pricing',
        title: 'Late-Disclosed Mandatory Fee or Surcharge',
        severity: 'high',
        confidence: 85,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Drip pricing reveals mandatory fees gradually during the checkout process instead of upfront in the advertised base price.',
        detectionMethod: 'rule',
        recommendedAction: 'Inspect the itemized breakdown before payment to ensure no unannounced fees have been tacked on.',
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

  // 2. Preselected Paid Add-on Checkbox (Sneak into Basket)
  for (const control of content.formControls) {
    if (control.type === 'checkbox' && control.isPreselected) {
      if (/(?:warranty|insurance|protection|donation|priority\s+delivery|carbon\s+offset|gift\s+wrap|\+\s*(?:[$€£₹¥]|\d))/i.test(control.label)) {
        const evRecord: EvidenceRecord = {
          id: `ev-preselected-addon-${control.id}`,
          pattern: 'hidden_charges',
          origin: content.domain,
          pageUrl: content.url,
          observedAt: content.timestamp,
          evidenceType: 'preselected_addon',
          description: `Pre-ticked optional paid add-on checkbox: "${control.label}"`,
          observedValue: control.label,
          elementSelector: `#${control.id}`,
          provenance: 'direct_observation',
          verificationStatus: 'verified',
          limitations: ['Preselected optional fees require affirmative user consent under modern e-commerce regulations.'],
          isDemoData: false
        };

        const evalResult = evaluateFindingClassification({
          category: 'hidden_charges',
          evidenceRecords: [evRecord],
          undisclosedMandatoryFee: false
        });

        findings.push({
          id: `hidden-charge-addon-${control.id}`,
          category: 'hidden_charges',
          categoryName: 'Hidden Charges & Drip Pricing',
          title: 'Pre-selected Optional Paid Add-on (Sneak into Basket)',
          severity: 'high',
          confidence: 90,
          evidence: `Pre-checked checkbox: "${control.label}"`,
          whyFlagged: 'Pre-selecting optional charges assumes consumer consent and adds unwanted costs to the final bill.',
          detectionMethod: 'rule',
          recommendedAction: 'Uncheck this option if you do not explicitly wish to purchase this add-on or service.',
          elementId: control.id,
          elementSelector: `#${control.id}`,
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
  }

  // 3. Disclosed vs Advertised Total Discrepancy
  const feeTexts = content.visibleTexts.filter(t => /fee|charge|surcharge|service/i.test(t.text));
  const hasUnexpectedTotal = content.visibleTexts.some(t => /final\s+total\s+differs|unexpected\s+amount/i.test(t.text));

  if (feeTexts.length > 0 && hasUnexpectedTotal) {
    const primaryFee = feeTexts[0];
    const evRecord: EvidenceRecord = {
      id: `ev-charge-discrepancy`,
      pattern: 'hidden_charges',
      origin: content.domain,
      pageUrl: content.url,
      observedAt: content.timestamp,
      evidenceType: 'total_price_discrepancy',
      description: `Discrepancy detected between advertised item total and final checkout charge: "${primaryFee.text.trim()}"`,
      observedValue: primaryFee.text.trim(),
      elementSelector: `#${primaryFee.id}`,
      provenance: 'direct_observation',
      verificationStatus: 'observed',
      limitations: ['Itemized tax and shipping calculations were not fully reconciled.'],
      isDemoData: false
    };

    const evalResult = evaluateFindingClassification({
      category: 'hidden_charges',
      evidenceRecords: [evRecord],
      undisclosedMandatoryFee: false
    });

    findings.push({
      id: `hidden-charge-discrepancy`,
      category: 'hidden_charges',
      categoryName: 'Hidden Charges & Drip Pricing',
      title: 'Disclosed vs Advertised Total Discrepancy',
      severity: 'high',
      confidence: 80,
      evidence: primaryFee.text,
      whyFlagged: 'The price appears to have inflated between initial selection and checkout.',
      detectionMethod: 'rule',
      recommendedAction: 'Compare the initial advertised price with the final charge on the payment screen.',
      elementId: primaryFee.id,
      elementSelector: `#${primaryFee.id}`,
      classification: evalResult.classification,
      evidenceStrength: evalResult.evidenceStrength,
      verificationStatus: evalResult.verificationStatus,
      evidenceRecords: [evRecord],
      supportingEvidence: evalResult.supportingEvidence,
      contradictoryEvidence: evalResult.contradictoryEvidence,
      missingEvidence: evalResult.missingEvidence,
      limitations: evalResult.limitations
    });
  }

  return findings;
}
