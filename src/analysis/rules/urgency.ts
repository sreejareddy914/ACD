import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from '../types';
import { evaluateFindingClassification } from '../classification-service';

export function checkUrgency(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // Check for legitimate fixed event dates or schedules
  const isLegitimateSchedule = content.visibleTexts.some(t =>
    /(?:conference|webinar|symposium|annual\s+meeting|paper\s+submission|registration\s+opens\s+on|event\s+starts|class\s+schedule)/i.test(t.text)
  );

  // 1. Check countdown timers
  if (content.timers && content.timers.length > 0) {
    let timerCount = 0;
    const MAX_TIMER_FINDINGS = 2;
    const seenTimerTexts = new Set<string>();

    for (const timer of content.timers) {
      if (timerCount >= MAX_TIMER_FINDINGS) break;

      // If it's a legitimate conference/event schedule, do not flag as fake urgency
      if (isLegitimateSchedule && /(?:conference|webinar|event|deadline)/i.test(timer.text)) {
        continue;
      }

      const normalizedTimer = timer.text.trim().toLowerCase();
      if (seenTimerTexts.has(normalizedTimer)) continue;
      seenTimerTexts.add(normalizedTimer);

      const evRecord: EvidenceRecord = {
        id: `ev-timer-${timer.id}`,
        pattern: 'urgency',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'timer_observation',
        description: `Countdown timer displayed: "${timer.text}" (seconds: ${timer.secondsRemaining ?? 'dynamic'})`,
        observedValue: timer.text,
        elementSelector: `#${timer.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: [
          'Browser extensions cannot verify the merchant promotional calendar from a single visit.',
          'Legitimate flash sales and limited promotions also utilize countdown timers.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'urgency',
        evidenceRecords: [evRecord],
        isLegitimateSchedule
      });

      if (evalResult.classification !== 'insufficient_evidence') {
        timerCount++;
        findings.push({
          id: `urgency-timer-${timer.id}`,
          category: 'urgency',
          categoryName: 'Fake Urgency',
          title: 'Active Countdown Timer Creating Purchasing Pressure',
          severity: 'medium',
          confidence: 75,
          evidence: `Countdown timer detected: "${timer.text}"`,
          whyFlagged: 'Countdown timers can induce artificial pressure and rush consumers into completing transactions without adequate product comparison.',
          detectionMethod: 'rule',
          recommendedAction: 'Take time to evaluate if you genuinely need the item. Compare prices on other platforms before checkout.',
          elementId: timer.id,
          elementSelector: `#${timer.id}`,
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
  }

  // 2. Check urgency phrases in visible texts
  const urgencyRegex = /(?:offer\s+(?:expires|ends)\s*(?:soon|today|in\b)|buy\s+now\s+before\s+time\s+runs\s+out|deal\s+ends\s+in|hurry[,\s!]+(?:limited|only|almost|act\s+fast)|flash\s+(?:sale|deal)|order\s+within\s+(?:the\s+next\s+)?\d+\s*(?:hrs?|hours?|mins?|minutes?)|last\s+chance\s+to\s+(?:save|buy|order)|ending\s+today|sale\s+ends\s+in|ends\s+in\s+\d+\s*(?:hrs?|hours?|mins?|minutes?|days?)|special\s+price\s+ends|limited[\s-]period\s+(?:deal|offer)|limited[\s-]time\s+(?:deal|offer|sale|discount|price)|deal\s+of\s+the\s+day|lightning\s+deal|midnight\s+deal|price\s+(?:goes\s+up|increases)\s+in|today\s+only\s+deal)/i;

  for (const item of content.visibleTexts) {
    if (isLegitimateSchedule) continue;

    if (urgencyRegex.test(item.text) && item.text.length < 120) {
      const evRecord: EvidenceRecord = {
        id: `ev-urgency-text-${item.id}`,
        pattern: 'urgency',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'urgency_claim',
        description: `Urgency text observed: "${item.text.trim()}"`,
        observedValue: item.text.trim(),
        elementSelector: `#${item.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: ['Promotional expiration policies cannot be independently audited in real time.'],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'urgency',
        evidenceRecords: [evRecord]
      });

      findings.push({
        id: `urgency-text-${item.id}`,
        category: 'urgency',
        categoryName: 'Fake Urgency',
        title: 'High-Pressure Urgency Claim',
        severity: 'medium',
        confidence: 70,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Phrases like "Offer expires soon" or "Hurry, limited time" are frequently deployed to trigger fear of missing out (FOMO).',
        detectionMethod: 'rule',
        recommendedAction: 'Verify whether the offer actually expires or if the merchant runs continuous rolling discounts.',
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
      break; // one text claim is sufficient to avoid flooding
    }
  }

  return findings;
}
