import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkNagging(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const naggingRegex = /(?:still\s+haven't\s+signed\s+up|remind\s+me\s+later\s+instead\s+of\s+no|we\s+noticed\s+you\s+didn't\s+subscribe|don't\s+leave\s+yet!|wait!\s+before\s+you\s+go|are\s+you\s+still\s+there\?.*sign\s+up)/i;

  for (const item of content.visibleTexts) {
    if (naggingRegex.test(item.text)) {
      findings.push({
        id: `nagging-${item.id}`,
        category: 'nagging',
        categoryName: 'Nagging',
        title: 'Repetitive Nagging Prompt / Exit-Intent Interruption',
        severity: 'low',
        confidence: 82,
        evidence: `"${item.text.trim().slice(0, 80)}"`,
        whyFlagged: 'Nagging repeatedly interrupts the user\'s focus with pop-ups and requests to subscribe or turn on push notifications.',
        detectionMethod: 'rule',
        recommendedAction: 'Close the prompt or use content-blocking settings to prevent repetitive interruptions.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
