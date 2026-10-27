import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkInterfaceInterference(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const ambiguousButtonRegex = /(?:continue\s+to\s+next\s+step\s*\(places\s+order\)|agree\s+&\s+subscribe\s+labeled\s+as\s+continue|next\s+step\s+charges\s+card)/i;

  for (const btn of content.buttons) {
    if (ambiguousButtonRegex.test(btn.text)) {
      findings.push({
        id: `interface-interference-${btn.id}`,
        category: 'interface_interference',
        categoryName: 'Interface Interference',
        title: 'Ambiguous or Misleading Action Button Label',
        severity: 'high',
        confidence: 85,
        evidence: `Button text: "${btn.text.trim()}"`,
        whyFlagged: 'Using ambiguous labels like "Continue" or "Next" when clicking actually commits to an immediate charge obscures the financial consequence.',
        detectionMethod: 'rule',
        recommendedAction: 'Verify whether clicking will open another review screen or charge your payment method immediately.',
        elementId: btn.id
      });
    }
  }

  return findings;
}
