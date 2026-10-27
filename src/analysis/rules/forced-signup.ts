import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from '../types';
import { evaluateFindingClassification } from '../classification-service';

export function checkForcedSignup(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // 1. Broken Guest Checkout Promise Check:
  // Site advertises guest checkout, but form subsequently enforces registration
  const hasGuestPromise = content.visibleTexts.some(t => /guest\s+checkout\s+available|continue\s+as\s+guest/i.test(t.text)) ||
                          content.buttons.some(b => /continue\s+as\s+guest|guest\s+checkout/i.test(b.text)) ||
                          content.links.some(l => /continue\s+as\s+guest|guest\s+checkout/i.test(l.text));
  const hasEnforcedRegistration = content.visibleTexts.some(t => /must\s+create\s+(?:a\s+)?password|account\s+creation\s+is\s+mandatory|password\s+required\s+to\s+complete|create\s+a\s+password\s+to\s+continue/i.test(t.text));

  if (hasGuestPromise && hasEnforcedRegistration) {
    const evRecord: EvidenceRecord = {
      id: 'ev-broken-guest-promise',
      pattern: 'forced_signup',
      origin: content.domain,
      pageUrl: content.url,
      observedAt: content.timestamp,
      evidenceType: 'broken_guest_checkout_promise',
      description: 'Website offered a "Guest Checkout" option, but subsequently blocked checkout with mandatory password creation.',
      observedValue: 'Guest Checkout advertised, but password creation enforced',
      provenance: 'direct_observation',
      verificationStatus: 'verified',
      limitations: ['Account requirements may be mandated for specific digital goods or regulated subscriptions.'],
      isDemoData: false
    };

    const evalResult = evaluateFindingClassification({
      category: 'forced_signup',
      evidenceRecords: [evRecord],
      brokenGuestPromise: true
    });

    findings.push({
      id: 'forced-signup-broken-guest',
      category: 'forced_signup',
      categoryName: 'Forced Sign-Up',
      title: 'Misleading Guest Checkout Barrier',
      severity: 'high',
      confidence: 90,
      evidence: 'Site offered guest flow but blocks purchase without password creation.',
      whyFlagged: 'Promising a guest checkout flow but forcing mandatory account registration tricks users into starting checkout only to face an unexpected registration wall.',
      detectionMethod: 'rule',
      recommendedAction: 'Verify if a true guest or express payment method (like Apple Pay or PayPal Guest) is available before entering credentials.',
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

  // 2. Blocking Registration Modal Wall without Close Button
  for (const modal of content.modals) {
    const isSignupModal = /(?:create\s+an\s+account\s+to\s+continue|sign\s+up\s+to\s+view|must\s+register\s+to\s+read|register\s+now\s+to\s+proceed)/i.test(
      modal.title + ' ' + modal.content
    );

    if (isSignupModal && !modal.hasCloseButton) {
      const evRecord: EvidenceRecord = {
        id: `ev-forced-signup-${modal.id}`,
        pattern: 'forced_signup',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'blocking_registration_wall',
        description: `Full-screen modal wall: "${modal.title}" (${modal.content.slice(0, 80)}...) without close or dismiss control.`,
        observedValue: modal.title,
        elementSelector: `#${modal.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: [
          'Publisher paywalls and membership-exclusive communities legitimately restrict content to registered members.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'forced_signup',
        evidenceRecords: [evRecord],
        brokenGuestPromise: false
      });

      findings.push({
        id: `forced-signup-${modal.id}`,
        category: 'forced_signup',
        categoryName: 'Forced Sign-Up',
        title: 'Blocking Registration Wall Without Skip Option',
        severity: 'medium',
        confidence: 85,
        evidence: `Modal: "${modal.title}" without dismiss/close control`,
        whyFlagged: 'The website blocks users from viewing public content unless they create an account and share personal details.',
        detectionMethod: 'rule',
        recommendedAction: 'Check if you can use an alternative service, private browsing mode, or a throwaway email.',
        elementId: modal.id,
        elementSelector: `#${modal.id}`,
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
  }

  return findings;
}
