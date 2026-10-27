import { ExtractedContent, DarkPatternFinding, EvidenceRecord, DetectorDiagnostic, DarkPatternCategory } from '../types';
import { checkUrgency } from './urgency';
import { checkScarcity } from './scarcity';
import { checkDiscounts } from './discounts';
import { checkHiddenCharges } from './hidden-charges';
import { checkForcedSignup } from './forced-signup';
import { checkCancellation } from './cancellation';
import { checkSubscriptions } from './subscriptions';
import { checkConfirmshaming } from './confirmshaming';
import { checkSneaking } from './sneaking';
import { checkPreselectedOptions } from './preselected-options';
import { checkBaitSwitch } from './bait-switch';
import { checkObstruction } from './obstruction';
import { checkPrivacyManipulation } from './privacy-manipulation';
import { checkDisguisedAds } from './disguised-ads';
import { checkVisualInterference } from './visual-interference';
import { checkNagging } from './nagging';
import { checkInterfaceInterference } from './interface-interference';
import { checkHiddenInformation } from './hidden-information';
import { checkSocialProof } from './social-proof';
import { checkEcommerce } from './ecommerce';
import { checkTravelBooking } from './travel-booking';
import { checkJobInternship } from './job-internship';
import { checkOtherPatterns } from './other-patterns';

export interface CheckerDefinition {
  name: string;
  category: DarkPatternCategory;
  isPrimarySix: boolean;
  fn: (content: ExtractedContent) => DarkPatternFinding[];
}

export const REGISTERED_CHECKERS: CheckerDefinition[] = [
  { name: 'Fake Urgency Detector', category: 'urgency', isPrimarySix: true, fn: checkUrgency },
  { name: 'Fake Scarcity Detector', category: 'scarcity', isPrimarySix: true, fn: checkScarcity },
  { name: 'Misleading Discounts Detector', category: 'discounts', isPrimarySix: true, fn: checkDiscounts },
  { name: 'Hidden Charges & Drip Pricing Detector', category: 'hidden_charges', isPrimarySix: true, fn: checkHiddenCharges },
  { name: 'Forced Sign-Up Detector', category: 'forced_signup', isPrimarySix: true, fn: checkForcedSignup },
  { name: 'Difficult Cancellation (Roach Motel) Detector', category: 'cancellation', isPrimarySix: true, fn: checkCancellation },
  { name: 'Recurring Subscriptions Detector', category: 'subscriptions', isPrimarySix: false, fn: checkSubscriptions },
  { name: 'Confirmshaming Detector', category: 'confirmshaming', isPrimarySix: false, fn: checkConfirmshaming },
  { name: 'Sneaking Detector', category: 'sneaking', isPrimarySix: false, fn: checkSneaking },
  { name: 'Preselected Options Detector', category: 'preselected_options', isPrimarySix: false, fn: checkPreselectedOptions },
  { name: 'Bait and Switch Detector', category: 'bait_and_switch', isPrimarySix: false, fn: checkBaitSwitch },
  { name: 'Obstruction Detector', category: 'obstruction', isPrimarySix: false, fn: checkObstruction },
  { name: 'Privacy Manipulation Detector', category: 'privacy_manipulation', isPrimarySix: false, fn: checkPrivacyManipulation },
  { name: 'Disguised Ads Detector', category: 'disguised_ads', isPrimarySix: false, fn: checkDisguisedAds },
  { name: 'Visual Interference Detector', category: 'visual_interference', isPrimarySix: false, fn: checkVisualInterference },
  { name: 'Nagging Detector', category: 'nagging', isPrimarySix: false, fn: checkNagging },
  { name: 'Interface Interference Detector', category: 'interface_interference', isPrimarySix: false, fn: checkInterfaceInterference },
  { name: 'Hidden Information Detector', category: 'hidden_information', isPrimarySix: false, fn: checkHiddenInformation },
  { name: 'Social Proof Detector', category: 'social_proof', isPrimarySix: false, fn: checkSocialProof },
  { name: 'E-commerce Nudges Detector', category: 'ecommerce', isPrimarySix: false, fn: checkEcommerce },
  { name: 'Travel Booking Traps Detector', category: 'travel_booking', isPrimarySix: false, fn: checkTravelBooking },
  { name: 'Job & Internship Traps Detector', category: 'job_internship', isPrimarySix: false, fn: checkJobInternship },
  { name: 'Other Design Patterns Detector', category: 'other_patterns', isPrimarySix: false, fn: checkOtherPatterns }
];

export function runAllRulesWithDiagnostics(content: ExtractedContent): {
  findings: DarkPatternFinding[];
  detectorDiagnostics: DetectorDiagnostic[];
} {
  const allFindings: DarkPatternFinding[] = [];
  const detectorDiagnostics: DetectorDiagnostic[] = [];

  for (const checker of REGISTERED_CHECKERS) {
    try {
      const findings = checker.fn(content);
      const diagnostic: DetectorDiagnostic = {
        name: checker.name,
        category: checker.category,
        ran: true,
        findingsCount: findings.length,
        status: findings.length > 0 ? 'detected' : 'clean',
        sampleFindings: findings.slice(0, 3).map(f => f.title)
      };
      detectorDiagnostics.push(diagnostic);

      console.log(`[ClearChoice AI Trace] Detector "${checker.name}" (${checker.category}) ran: ${findings.length} finding(s) returned.`);

      for (const f of findings) {
        // Ensure evidenceRecords array is properly populated
        const records: EvidenceRecord[] = (f.evidenceRecords && f.evidenceRecords.length > 0)
          ? f.evidenceRecords
          : [
              {
                id: `ev-${f.id}`,
                pattern: f.category,
                origin: content.domain,
                pageUrl: content.url,
                observedAt: content.timestamp,
                evidenceType: 'dom_pattern_match',
                description: f.evidence,
                observedValue: f.evidence,
                elementSelector: f.elementSelector || (f.elementId ? `#${f.elementId}` : undefined),
                provenance: 'direct_observation',
                verificationStatus: f.verificationStatus || 'observed',
                limitations: f.limitations || ['Observed directly from webpage DOM.'],
                isDemoData: false
              }
            ];

        allFindings.push({
          ...f,
          classification: f.classification || 'potential_dark_pattern',
          evidenceStrength: f.evidenceStrength || 'limited',
          verificationStatus: f.verificationStatus || 'observed',
          evidenceRecords: records,
          supportingEvidence: f.supportingEvidence || [f.evidence],
          contradictoryEvidence: f.contradictoryEvidence || [],
          missingEvidence: f.missingEvidence || [],
          limitations: f.limitations || ['Contextual intent cannot be verified solely from DOM markup.']
        });
      }
    } catch (err: any) {
      console.warn(`[ClearChoice AI Trace] Error running rule checker "${checker.name}":`, err);
      detectorDiagnostics.push({
        name: checker.name,
        category: checker.category,
        ran: true,
        findingsCount: 0,
        status: 'error',
        sampleFindings: [`Error: ${err.message || String(err)}`]
      });
    }
  }

  return { findings: allFindings, detectorDiagnostics };
}

export function runAllRules(content: ExtractedContent): DarkPatternFinding[] {
  return runAllRulesWithDiagnostics(content).findings;
}
