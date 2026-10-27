import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkOtherPatterns(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const genericDeceptiveRegex = /(?:you\s+must\s+share\s+to\s+5\s+friends\s+to\s+claim|spin\s+the\s+wheel\s+to\s+claim\s+your\s+cash\s+prize|congratulations!\s+you\s+are\s+the\s+1,000,000th\s+visitor)/i;

  for (const item of content.visibleTexts) {
    if (genericDeceptiveRegex.test(item.text)) {
      findings.push({
        id: `other-pattern-${item.id}`,
        category: 'other_patterns',
        categoryName: 'Other Pattern (Needs Review)',
        title: 'Other Potential Manipulative Solicitations',
        severity: 'high',
        confidence: 80,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Viral sharing gates or lottery wheels mimic prize wins to harvest user contacts or spread malware.',
        detectionMethod: 'rule',
        recommendedAction: 'Do not share personal details or contacts to claim unrequested prize notifications.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
