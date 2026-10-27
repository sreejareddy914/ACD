import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from '../types';
import { evaluateFindingClassification } from '../classification-service';

export function checkScarcity(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const scarcityRegex = /(?:only\s+(?:\d+|a\s+few|few|one)\s+(?:items?|units?|left|in\s+stock|remaining|tickets?|seats?|rooms?)|only\s+\d+\s+left\s+in\s+stock|only\s+few\s+left|few\s+items\s+left|few\s+units\s+left|low\s+stock|almost\s+(?:sold\s+out|gone)|last\s+one\s+left|selling\s+fast|selling\s+out\s+fast|high\s+demand|in\s+high\s+demand|hurry[,\s!]+only|limited\s+(?:stock|availability|quantity)|trending\s+item|order\s+soon(?:\s*-\s*only\s+\d+\s+left)?)/i;
  const viewerCounterRegex = /(?:(?:\d+[kK\+]?|\d+)\s*(?:people|shoppers|customers|travelers|guests|users)?\s*(?:are\s+)?(?:viewing|looking\s+at|booking|bought\s+(?:this|in\s+(?:the\s+)?past)|purchased)|in\s+\d+\s+people['’]s\s+carts?|\b\d+[kK\+]?\+?\s+bought\s+in\s+past\s+(?:month|week|day)|popular\s+pick\s*-\s*\d+)/i;

  let scarcityCount = 0;
  let viewerCount = 0;
  const MAX_SCARCITY_FINDINGS = 3;
  const MAX_VIEWER_FINDINGS = 2;
  const seenScarcityTexts = new Set<string>();

  for (const item of content.visibleTexts) {
    const norm = item.text.trim().toLowerCase();
    if (seenScarcityTexts.has(norm)) continue;

    if (scarcityCount < MAX_SCARCITY_FINDINGS && scarcityRegex.test(item.text) && item.text.length < 120) {
      scarcityCount++;
      seenScarcityTexts.add(norm);
      const evRecord: EvidenceRecord = {
        id: `ev-scarcity-${item.id}`,
        pattern: 'scarcity',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'scarcity_claim',
        description: `Page displayed stock scarcity claim: "${item.text.trim()}"`,
        observedValue: item.text.trim(),
        elementSelector: `#${item.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: [
          'The merchant’s actual live inventory could not be independently verified from client-side inspection.',
          'Physical retail items can legitimately have low inventory numbers.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'scarcity',
        evidenceRecords: [evRecord],
        inventoryVerified: false
      });

      findings.push({
        id: `scarcity-${item.id}`,
        category: 'scarcity',
        categoryName: 'Fake Scarcity',
        title: 'Unverified Stock Scarcity Claim',
        severity: 'medium',
        confidence: 70,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Scarcity indicators like "Only 2 left" are sometimes hardcoded or randomized to induce Fear Of Missing Out (FOMO).',
        detectionMethod: 'rule',
        recommendedAction: 'Treat low-stock warnings with skepticism. Check if the item remains available upon refresh or on other platforms.',
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
    }

    if (viewerCount < MAX_VIEWER_FINDINGS && viewerCounterRegex.test(item.text) && item.text.length < 120) {
      viewerCount++;
      seenScarcityTexts.add(norm);
      const evRecord: EvidenceRecord = {
        id: `ev-viewer-${item.id}`,
        pattern: 'scarcity',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'viewer_counter_observation',
        description: `Real-time activity counter claim: "${item.text.trim()}"`,
        observedValue: item.text.trim(),
        elementSelector: `#${item.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'observed',
        limitations: [
          'Live visitor telemetry cannot be audited from client-side JavaScript.',
          'Low traffic sites or legitimate analytics beacons may also present live visitor metrics.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'scarcity',
        evidenceRecords: [evRecord],
        inventoryVerified: false
      });

      findings.push({
        id: `scarcity-viewer-${item.id}`,
        category: 'scarcity',
        categoryName: 'Fake Scarcity',
        title: 'Unverified Real-Time Visitor Counter',
        severity: 'low',
        confidence: 65,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Viewer counters are often simulated or inflated with random integers to manufacture synthetic competition.',
        detectionMethod: 'rule',
        recommendedAction: 'Do not base purchasing urgency on viewer counters; focus on product specifications and price comparison.',
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
    }

    if (scarcityCount >= MAX_SCARCITY_FINDINGS && viewerCount >= MAX_VIEWER_FINDINGS) break;
  }

  return findings;
}
