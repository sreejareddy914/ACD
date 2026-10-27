import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from './types';
import { normalizeText } from './normalizer';
import { deduplicateFindings } from './deduplicator';

export interface ValidationReport {
  validatedFindings: DarkPatternFinding[];
  rejectedFindings: Array<{ finding: DarkPatternFinding; reason: string }>;
  limitations: string[];
}

/**
 * Validates findings against the extracted page content.
 * Checks that the evidence actually appears in the visible text, buttons, modals, or form controls,
 * and rejects ungrounded hallucinations or invented evidence IDs.
 */
export function validateEvidence(
  findings: DarkPatternFinding[],
  content: ExtractedContent,
  knownEvidenceIds?: Set<string>
): ValidationReport {
  const validatedFindings: DarkPatternFinding[] = [];
  const rejectedFindings: Array<{ finding: DarkPatternFinding; reason: string }> = [];
  const limitations: string[] = [];

  // Set of known element IDs in extracted DOM
  const knownElementIds = new Set<string>([
    ...content.visibleTexts.map(t => t.id),
    ...content.buttons.map(b => b.id),
    ...content.links.map(l => l.id),
    ...content.formControls.map(c => c.id),
    ...content.modals.map(m => m.id),
    ...content.prices.map(p => p.id),
    ...content.timers.map(t => t.id)
  ]);

  // Compile all visible text excerpts for grounding check
  const visibleCorpus = [
    content.title,
    ...content.visibleTexts.map(t => t.text),
    ...content.buttons.map(b => b.text),
    ...content.links.map(l => l.text),
    ...content.formControls.map(c => c.label),
    ...content.modals.map(m => `${m.title} ${m.content}`),
    ...content.prices.map(p => p.raw),
    ...content.timers.map(t => t.text)
  ]
    .map(normalizeText)
    .join(' ')
    .toLowerCase();

  for (const f of findings) {
    // 1. Verify elementId if present
    if (f.elementId && !knownElementIds.has(f.elementId) && f.detectionMethod === 'ai') {
      // If AI invented an element ID that doesn't exist, remove the invalid reference
      f.elementId = undefined;
    }

    // 2. Verify evidence text grounding in DOM corpus
    const evidenceSnippet = normalizeText(
      (f.evidence || '').replace(/["“”'‘’]/g, '').trim()
    ).toLowerCase();

    // Take a small distinctive subphrase (first 30 chars or full snippet if short)
    const searchSub = evidenceSnippet.slice(0, 30);

    if (searchSub && !visibleCorpus.includes(searchSub) && f.detectionMethod === 'ai') {
      // Evidence cannot be grounded in page content
      rejectedFindings.push({
        finding: f,
        reason: 'Evidence text not found in extracted webpage DOM (unverified hallucination).'
      });
      continue;
    }

    // 3. Check for unknown evidence IDs if knownEvidenceIds set is provided
    if (knownEvidenceIds && f.evidenceRecords && f.evidenceRecords.length > 0) {
      const invalidRecords = f.evidenceRecords.filter(r => !knownEvidenceIds.has(r.id));
      if (invalidRecords.length === f.evidenceRecords.length && f.detectionMethod === 'ai') {
        rejectedFindings.push({
          finding: f,
          reason: 'AI referred to unknown evidence IDs that do not exist in the submitted evidence set.'
        });
        continue;
      }
    }

    // 4. Verify confidence is within bounds [0, 100]
    const clampedConfidence = Math.max(0, Math.min(100, f.confidence || 70));

    // Ensure finding has complete evidence records
    const records: EvidenceRecord[] = (f.evidenceRecords && f.evidenceRecords.length > 0)
      ? f.evidenceRecords
      : [
          {
            id: `ev-${f.id}`,
            pattern: f.category,
            origin: content.domain,
            pageUrl: content.url,
            observedAt: content.timestamp,
            evidenceType: 'grounded_dom_observation',
            description: f.evidence,
            observedValue: f.evidence,
            elementSelector: f.elementSelector || (f.elementId ? `#${f.elementId}` : undefined),
            provenance: 'direct_observation',
            verificationStatus: f.verificationStatus || 'observed',
            limitations: f.limitations || ['Observed directly from webpage DOM.'],
            isDemoData: false
          }
        ];

    validatedFindings.push({
      ...f,
      confidence: clampedConfidence,
      classification: f.classification || 'potential_dark_pattern',
      evidenceStrength: f.evidenceStrength || 'limited',
      verificationStatus: f.verificationStatus || 'observed',
      evidenceRecords: records,
      supportingEvidence: f.supportingEvidence || [f.evidence],
      contradictoryEvidence: f.contradictoryEvidence || [],
      missingEvidence: f.missingEvidence || [],
      limitations: f.limitations || []
    });
  }

  // Deduplicate validated findings
  const deduped = deduplicateFindings(validatedFindings);

  if (content.isTruncated) {
    limitations.push('Page content exceeded extraction buffer size; some long-scroll sections were truncated.');
  }

  if (content.visibleTexts.length === 0) {
    limitations.push('Limited DOM text extracted. Webpage may render via canvas, iframe, or heavily obfuscated Shadow DOM.');
  }

  return {
    validatedFindings: deduped,
    rejectedFindings,
    limitations
  };
}
