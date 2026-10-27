import { DarkPatternFinding } from './types';

/**
 * Deduplicates findings based on category, target element, and textual evidence overlap.
 */
export function deduplicateFindings(findings: DarkPatternFinding[]): DarkPatternFinding[] {
  const unique: DarkPatternFinding[] = [];
  const seenKeys = new Set<string>();

  for (const f of findings) {
    // Generate key based on category and elementId or normalized evidence excerpt
    const evidenceKey = f.evidence
      ? f.evidence.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
      : '';
    const key = `${f.category}:${f.elementId || ''}:${evidenceKey}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      unique.push(f);
    }
  }

  return unique;
}
