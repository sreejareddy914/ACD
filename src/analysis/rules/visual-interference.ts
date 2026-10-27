import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkVisualInterference(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // Look for pairs of primary and secondary buttons where the decline/cancel button has tiny font or low contrast
  const primaryButtons = content.buttons.filter(b => b.isPrimary || /accept|agree|continue|upgrade|yes/i.test(b.text));
  const declineButtons = content.buttons.filter(b => /cancel|decline|no thanks|reject|skip/i.test(b.text));

  for (const dec of declineButtons) {
    if (dec.computedStyle) {
      const opacity = parseFloat(dec.computedStyle.opacity || '1');
      const fontSize = parseFloat(dec.computedStyle.fontSize || '16');

      if (opacity <= 0.6 || fontSize <= 11) {
        findings.push({
          id: `visual-imbalance-${dec.id}`,
          category: 'visual_interference',
          categoryName: 'Visual Interference',
          title: 'Asymmetric Visual Hierarchy on Refusal Action',
          severity: 'medium',
          confidence: 85,
          evidence: `Action "${dec.text}" styled with low prominence (opacity: ${opacity}, font-size: ${fontSize}px)`,
          whyFlagged: 'Visual interference uses contrasting styles, subdued colors, and diminished sizing to hide opt-out actions while accentuating the preferred choice.',
          detectionMethod: 'rule',
          recommendedAction: 'Look closely for subtle, low-contrast text links or gray buttons to exercise your preferred option.',
          elementId: dec.id
        });
      }
    }
  }

  // Also check tiny fine print hiding disclaimer
  for (const item of content.visibleTexts) {
    if (item.fontSize && item.fontSize <= 9 && /fee|charge|autorenew|recurring|terms/i.test(item.text)) {
      findings.push({
        id: `visual-tiny-${item.id}`,
        category: 'visual_interference',
        categoryName: 'Visual Interference',
        title: 'Micro-Typography Hiding Critical Disclaimers',
        severity: 'medium',
        confidence: 80,
        evidence: `Text at ${item.fontSize}px: "${item.text.slice(0, 70)}..."`,
        whyFlagged: 'Using microscopic font sizes discourages consumers from reading terms and financial commitments.',
        detectionMethod: 'rule',
        recommendedAction: 'Zoom in or read the full terms before agreeing.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
