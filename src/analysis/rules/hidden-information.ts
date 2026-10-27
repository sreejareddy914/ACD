import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkHiddenInformation(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const hiddenInfoRegex = /(?:\*\s*terms\s+apply,\s+see\s+clause\s+\d+|non-refundable\s+under\s+any\s+circumstances.*hidden|subject\s+to\s+hidden\s+terms|restrictions\s+apply\s+unspecified)/i;

  for (const item of content.visibleTexts) {
    if (hiddenInfoRegex.test(item.text)) {
      findings.push({
        id: `hidden-info-${item.id}`,
        category: 'hidden_information',
        categoryName: 'Hidden Information',
        title: 'Buried Restrictions or Fine-Print Disclaimer',
        severity: 'medium',
        confidence: 82,
        evidence: `"${item.text.trim().slice(0, 80)}"`,
        whyFlagged: 'Key contractual caveats or exclusions are obscured or relegated to cryptic fine print while advertising unqualified benefits.',
        detectionMethod: 'rule',
        recommendedAction: 'Locate and review the specific conditions referenced by the asterisk or footnote.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
