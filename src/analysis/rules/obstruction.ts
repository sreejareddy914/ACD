import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkObstruction(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const obstructionRegex = /(?:are\s+you\s+really\s+sure\s+you\s+want\s+to\s+leave|step\s+[4-9]\s+of\s+[4-9].*cancellation|please\s+complete\s+all\s+\d+\s+survey\s+questions\s+to\s+unsubscribe|cannot\s+unsubscribe\s+until\s+feedback\s+is\s+submitted)/i;

  for (const item of content.visibleTexts) {
    if (obstructionRegex.test(item.text)) {
      findings.push({
        id: `obstruction-${item.id}`,
        category: 'obstruction',
        categoryName: 'Obstruction',
        title: 'Deliberate Obstacle or Friction Loop',
        severity: 'high',
        confidence: 84,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Obstruction inserts needless friction, surveys, and multi-step hurdles into simple tasks like opting out or canceling.',
        detectionMethod: 'rule',
        recommendedAction: 'Persist through the unnecessary prompts or contact support directly to complete your request.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
